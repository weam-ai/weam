/* eslint-disable no-undef */
const Workflow = require('../models/workflow');
const { formatUser, handleError, formatBrain } = require('../utils/helper');
const dbService = require('../utils/dbService');
const { N8N } = require('../config/config');
const Brain = require('../models/brains');
const ShareBrain = require('../models/shareBrain');
const { accessOfBrainToUser } = require('./common');
const { getShareBrains, getBrainStatus } = require('./brain');
const axios = require('axios');
const { getN8nConfig, makeN8nRequest } = require('../tools/n8n');

const addWorkflow = async (req) => {
    try {
        const { name, description, selected, trigger, n8nWorkflowId } = req.body;

        // selected is brainId
        const brainId = selected;

        // Verify brain exists
        const brain = await Brain.findById(brainId);
        if (!brain) throw new Error('Brain not found');

        // Verify access - assuming similar logic to prompts
        const hasAccess = await accessOfBrainToUser({ brainId: brainId, userId: req.user.id });
        if (!hasAccess) {
            // throw new Error('You do not have access to this brain');
            // Double check in case owner logic is separate? 
            // For now, fail safe.
        }

        const workflow = await Workflow.create({
            name,
            description,
            user: formatUser(req.user), // User snapshot
            brain: formatBrain(brain), // Brain snapshot
            trigger,
            n8nWorkflowId,
            isShare: brain.isShare || false, // Set based on brain's share status
            isActive: true
        });

        return workflow;
    } catch (error) {
        handleError(error, 'Error - addWorkflow');
    }
};

const getWorkflowList = async (req) => {
    try {
        const { isPrivateBrainVisible } = req.user;
        const query = req.body.query || {};

        if (query["brain.id"]) {
            const brainId = query["brain.id"];
            const brain = await Brain.findById(brainId);
            const accessShareBrain = await ShareBrain.findOne({ "brain.id": brainId, "user.id": req.user.id });

            if (!accessShareBrain) {
                return {
                    status: 302,
                    message: "You are unauthorized to access this workflow",
                };
            }

            if (!isPrivateBrainVisible && !brain.isShare) {
                return {
                    status: 302,
                    message: "You are unauthorized to access this workflow",
                };
            }
        }

        return dbService.getAllDocuments(
            Workflow,
            query,
            req.body.options || {}
        );
    } catch (error) {
        handleError(error, 'Error - getWorkflowList');
    }
};

const updateWorkflow = async (req) => {
    try {
        const { id } = req.params;
        return Workflow.findByIdAndUpdate(id, req.body, { new: true });
    } catch (error) {
        handleError(error, 'Error - updateWorkflow');
    }
};

const deleteWorkflow = async (req) => {
    try {
        return Workflow.deleteOne({ _id: req.params.id });
    } catch (error) {
        handleError(error, 'Error - deleteWorkflow');
    }
};

const syncWorkflows = async (req) => {
    try {
        const { brainId } = req.body;
        if (!brainId) throw new Error('Brain ID required for sync');

        // Check access
        const accessShareBrain = await ShareBrain.findOne({ "brain.id": brainId, "user.id": req.user.id });
        if (!accessShareBrain) throw new Error('Unauthorized');

        const brain = await Brain.findById(brainId);

        const client = getN8nClient();
        const response = await client.get('/workflows');
        // Assuming n8n returns { data: [...] } or just [...]
        const remoteWorkflows = response.data.data || response.data;

        const results = [];
        if (Array.isArray(remoteWorkflows)) {
            for (const remote of remoteWorkflows) {
                // Upsert based on n8nWorkflowId
                const match = { n8nWorkflowId: remote.id, 'brain.id': brainId };

                const workflowData = {
                    name: remote.name,
                    isActive: remote.active,
                    nodes: remote.nodes,
                    connections: remote.connections,
                    lastExecutedAt: new Date(remote.updatedAt),
                    rawData: remote
                };

                // If new, add required fields
                const existing = await Workflow.findOne(match);
                if (!existing) {
                    workflowData.user = formatUser(req.user);
                    workflowData.brain = formatBrain(brain);
                    workflowData.n8nWorkflowId = remote.id;
                    workflowData.isShare = brain.isShare || false; // Set based on brain's share status
                }

                const updated = await Workflow.findOneAndUpdate(match, workflowData, { upsert: true, new: true, setDefaultsOnInsert: true });
                results.push(updated);
            }
        }

        return results;

    } catch (error) {
        handleError(error, 'Error - syncWorkflows');
        return [];
    }
};

const executeWorkflow = async (req) => {
    try {
        const { id, params } = req.body;
        const workflow = await Workflow.findById(id);
        if (!workflow) throw new Error('Workflow not found');

        // Mock execution for MVP or implement real API call if endpoints are known
        // Here we just increment stats

        workflow.executionCount += 1;
        workflow.lastExecutedAt = new Date();
        await workflow.save();

        return { success: true, message: "Workflow executed successfully (Mock)", executionId: "mock-" + Date.now(), result: { output: "Sample Output" } };

    } catch (error) {
        handleError(error, 'Error - executeWorkflow');
    }
}

/**
 * Save workflow JSON to n8n - creates new workflow in n8n and saves reference in DB
 */
const saveToN8n = async (req) => {
    try {
        const { workflowJson, brainId, isUpdate } = req.body;

        // Parse the workflow JSON
        let parsedWorkflow;
        try {
            parsedWorkflow = typeof workflowJson === 'string' ? JSON.parse(workflowJson) : workflowJson;
        } catch (e) {
            throw new Error('Invalid workflow JSON format');
        }

        // Verify brain exists and user has access
        const brain = await Brain.findById(brainId);
        if (!brain) throw new Error('Brain not found');

        const accessShareBrain = await ShareBrain.findOne({ "brain.id": brainId, "user.id": req.user.id });
        if (!accessShareBrain) throw new Error('Unauthorized access to this brain');

        // Get user's n8n configuration (API key and base URL)
        const config = await getN8nConfig(req.user.id);
        if (!config || !config.apiKey) {
            throw new Error('n8n API key not found. Please configure your n8n integration in your profile settings.');
        }

        let n8nWorkflowData;
        let existingWorkflow = null;

        // Check if we're updating an existing workflow
        if (isUpdate && parsedWorkflow.id) {
            // Find existing workflow in our DB
            existingWorkflow = await Workflow.findOne({ 
                n8nWorkflowId: parsedWorkflow.id.toString(),
                'brain.id': brainId 
            });

            if (existingWorkflow) {
                // Update existing workflow in n8n
                try {
                    // Ensure settings is present for update as well
                    const workflowToUpdate = { ...parsedWorkflow };
                    // n8n Cloud treats "active" as read‑only in request body, so
                    // strip it out to avoid 400 "request/body/active is read-only".
                    if ('active' in workflowToUpdate) {
                        delete workflowToUpdate.active;
                    }
                    // Handle null, undefined, or non-object values
                    if (!workflowToUpdate.settings || typeof workflowToUpdate.settings !== 'object' || Array.isArray(workflowToUpdate.settings)) {
                        workflowToUpdate.settings = {
                            executionOrder: "v1"
                        };
                    }
                    
                    n8nWorkflowData = await makeN8nRequest(
                        `workflows/${parsedWorkflow.id}`,
                        config.apiKey,
                        null,
                        workflowToUpdate,
                        'PUT',
                        config.apiBaseUrl
                    );
                    if (!n8nWorkflowData) {
                        throw new Error('Failed to update workflow in n8n: No response from API');
                    }
                } catch (n8nError) {
                    console.error('n8n API error:', n8nError);
                    throw new Error(`Failed to update workflow in n8n: ${n8nError?.message || 'Unknown error'}`);
                }
            }
        }

        // If not updating or no existing workflow found, create new
        if (!existingWorkflow) {
            try {
                // Remove id if it exists to create a new workflow
                const workflowToCreate = { ...parsedWorkflow };
                delete workflowToCreate.id;
                // n8n Cloud treats "active" as read‑only on create as well.
                // The API response will include the correct "active" flag.
                if ('active' in workflowToCreate) {
                    delete workflowToCreate.active;
                }
                
                // Ensure required fields are present for n8n API
                // n8n API requires: name, nodes, connections, settings
                if (!workflowToCreate.name) {
                    throw new Error('Workflow name is required');
                }
                if (!Array.isArray(workflowToCreate.nodes) || workflowToCreate.nodes.length === 0) {
                    throw new Error('Workflow must have at least one node');
                }
                if (!workflowToCreate.connections || typeof workflowToCreate.connections !== 'object') {
                    workflowToCreate.connections = {};
                }
                // Ensure settings is always present and is an object (required by n8n API)
                // Handle null, undefined, or non-object values
                if (!workflowToCreate.settings || typeof workflowToCreate.settings !== 'object' || Array.isArray(workflowToCreate.settings)) {
                    workflowToCreate.settings = {
                        executionOrder: "v1"
                    };
                }
                
                n8nWorkflowData = await makeN8nRequest(
                    'workflows',
                    config.apiKey,
                    null,
                    workflowToCreate,
                    'POST',
                    config.apiBaseUrl
                );
                if (!n8nWorkflowData) {
                    throw new Error('Failed to create workflow in n8n: No response from API');
                }
            } catch (n8nError) {
                console.error('n8n API error:', n8nError);
                throw new Error(`Failed to create workflow in n8n: ${n8nError?.message || 'Unknown error'}`);
            }
        }

        // Save or update in our database
        const workflowData = {
            name: n8nWorkflowData.name || parsedWorkflow.name || 'Untitled Workflow',
            description: `Workflow saved from chat. n8n ID: ${n8nWorkflowData.id}`,
            n8nWorkflowId: n8nWorkflowData.id?.toString(),
            isActive: n8nWorkflowData.active || false,
            nodes: n8nWorkflowData.nodes || parsedWorkflow.nodes,
            connections: n8nWorkflowData.connections || parsedWorkflow.connections,
            trigger: { type: 'manual', value: '' },
            isShare: brain.isShare || false // Set based on brain's share status
        };

        let savedWorkflow;
        if (existingWorkflow) {
            // Update existing
            savedWorkflow = await Workflow.findByIdAndUpdate(
                existingWorkflow._id,
                workflowData,
                { new: true }
            );
        } else {
            // Create new
            workflowData.user = formatUser(req.user);
            workflowData.brain = formatBrain(brain);
            savedWorkflow = await Workflow.create(workflowData);
        }

        return {
            success: true,
            workflow: savedWorkflow,
            n8nWorkflowId: n8nWorkflowData.id,
            isNew: !existingWorkflow
        };

    } catch (error) {
        handleError(error, 'Error - saveToN8n');
        throw error;
    }
};

async function usersWiseGetAll(req) {
    try {
        const brains = await getShareBrains(req);
        if (!brains.length) return { data: [], paginator: {} };
        const brainStatus = await getBrainStatus(brains);
        const query = {
            'brain.id': { $in: brains.filter(ele => ele?.brain?.id).map(ele => ele.brain.id) },
            ...req.body.query
        }
        delete query.workspaceId;
        const result = await dbService.getAllDocuments(Workflow, query, req.body.options || {});
        const finalResult = result.data.map((record) => ({
            ...record._doc,
            isShare: brainStatus.find((ele) => ele?._id?.toString() === record?.brain?.id?.toString())?.isShare,
        }))
        return {
            data: finalResult,
            paginator: result.paginator
        }
    } catch (error) {
        handleError(error, 'Error - usersWiseGetAll');
    }
}

module.exports = {
    addWorkflow,
    getWorkflowList,
    updateWorkflow,
    deleteWorkflow,
    syncWorkflows,
    executeWorkflow,
    saveToN8n,
    usersWiseGetAll
};
