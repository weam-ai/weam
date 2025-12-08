/**
 * n8n MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

const N8N_API_BASE = process.env.N8N_API_BASE || 'https://api.n8n.io/v1';

/**
 * Make a request to the n8n API
 * @param {string} endpoint - The API endpoint
 * @param {string} apiKey - n8n API key
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST/PUT requests
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @returns {Object|null} API response data
 */
async function makeN8nRequest(endpoint, apiKey, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        let response;
        const url = `${N8N_API_BASE}/${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params, timeout: 30000 });
        } else if (method === 'POST') {
            response = await axios.post(url, jsonData, { headers, params, timeout: 30000 });
        } else if (method === 'PUT') {
            response = await axios.put(url, jsonData, { headers, params, timeout: 30000 });
        } else if (method === 'DELETE') {
            response = await axios.delete(url, { headers, timeout: 30000 });
        } else if (method === 'PATCH') {
            response = await axios.patch(url, jsonData, { headers, params, timeout: 30000 });
        }

        console.log(`Successfully received response from n8n API: ${endpoint}`);
        return response.data;
    } catch (error) {
        console.error(`Error making request to n8n API: ${endpoint} - Error: ${error.message}`);
        return null;
    }
}

/**
 * Get n8n API key from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} n8n API key or null if not found
 */
async function getN8nApiKey(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.N8N || !user.mcpdata.N8N.api_key) {
            return null;
        }
        // Decrypt the API key before returning
        const decryptedKey = decryptedData(user.mcpdata.N8N.api_key);
        return decryptedKey;
    } catch (error) {
        console.error('Error fetching n8n API key:', error.message);
        return null;
    }
}

// =============================================================================
// WORKFLOW FUNCTIONS
// =============================================================================

/**
 * List all workflows in the n8n instance
 * @param {string} userId - User ID to get API key from
 * @param {number} limit - Maximum number of workflows to return
 * @returns {string} Formatted workflow list
 */
async function listN8nWorkflows(userId = null, limit = 100) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const params = { limit };
    const data = await makeN8nRequest('workflows', apiKey, params);
    
    if (!data) {
        return 'Failed to get workflows';
    }

    const workflows = data.data || [];
    if (workflows.length === 0) {
        return 'No workflows found';
    }

    let result = `Found ${workflows.length} workflows:\n\n`;
    for (const workflow of workflows) {
        const tags = workflow.tags ? workflow.tags.join(', ') : 'No tags';
        
        result += `• **${workflow.name || 'No name'}**\n`;
        result += `  ID: ${workflow.id || 'unknown'}\n`;
        result += `  Active: ${workflow.active || false}\n`;
        result += `  Created: ${workflow.createdAt || 'unknown'}\n`;
        result += `  Updated: ${workflow.updatedAt || 'unknown'}\n`;
        result += `  Tags: ${tags}\n\n`;
    }

    return result;
}

/**
 * Get details of a specific workflow
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - ID of the workflow to retrieve
 * @returns {string} Formatted workflow details
 */
async function getN8nWorkflow(userId = null, workflowId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest(`workflows/${workflowId}`, apiKey);
    
    if (!data) {
        return `Failed to get workflow: ${workflowId}`;
    }

    const tags = data.tags ? data.tags.join(', ') : 'No tags';
    const nodeCount = data.nodes ? data.nodes.length : 0;
    const connectionCount = data.connections ? Object.keys(data.connections).length : 0;

    let result = `**Workflow Details:**\n\n`;
    result += `• **ID:** ${data.id || 'unknown'}\n`;
    result += `• **Name:** ${data.name || 'No name'}\n`;
    result += `• **Active:** ${data.active || false}\n`;
    result += `• **Created:** ${data.createdAt || 'unknown'}\n`;
    result += `• **Updated:** ${data.updatedAt || 'unknown'}\n`;
    result += `• **Tags:** ${tags}\n`;
    result += `• **Nodes:** ${nodeCount} nodes\n`;
    result += `• **Connections:** ${connectionCount} connections\n`;

    return result;
}

/**
 * Create a new workflow
 * @param {string} userId - User ID to get API key from
 * @param {string} name - Name of the workflow
 * @param {Array} nodes - List of nodes in the workflow
 * @param {Object} connections - Connections between nodes
 * @param {boolean} active - Whether the workflow should be active
 * @returns {string} Formatted created workflow information
 */
async function createN8nWorkflow(userId = null, name, nodes, connections = null, active = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const workflowData = {
        name,
        nodes,
        connections: connections || {},
        active
    };

    const data = await makeN8nRequest('workflows', apiKey, null, workflowData, 'POST');
    
    if (!data) {
        return `Failed to create workflow: ${name}`;
    }

    let result = `**Created Workflow:**\n\n`;
    result += `• **ID:** ${data.id || 'unknown'}\n`;
    result += `• **Name:** ${data.name || 'No name'}\n`;
    result += `• **Active:** ${data.active || false}\n`;
    result += `• **Created:** ${data.createdAt || 'unknown'}\n`;

    return result;
}

/**
 * Update an existing workflow
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - ID of the workflow to update
 * @param {string} name - New name for the workflow
 * @param {Array} nodes - Updated list of nodes
 * @param {Object} connections - Updated connections
 * @param {boolean} active - Whether the workflow should be active
 * @returns {string} Formatted updated workflow information
 */
async function updateN8nWorkflow(userId = null, workflowId, name = null, nodes = null, connections = null, active = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const updateData = {};
    if (name !== null) updateData.name = name;
    if (nodes !== null) updateData.nodes = nodes;
    if (connections !== null) updateData.connections = connections;
    if (active !== null) updateData.active = active;

    const data = await makeN8nRequest(`workflows/${workflowId}`, apiKey, null, updateData, 'PUT');
    
    if (!data) {
        return `Failed to update workflow: ${workflowId}`;
    }

    let result = `**Updated Workflow:**\n\n`;
    result += `• **ID:** ${data.id || 'unknown'}\n`;
    result += `• **Name:** ${data.name || 'No name'}\n`;
    result += `• **Active:** ${data.active || false}\n`;
    result += `• **Updated:** ${data.updatedAt || 'unknown'}\n`;

    return result;
}

/**
 * Delete a workflow
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - ID of the workflow to delete
 * @returns {string} Confirmation message
 */
async function deleteN8nWorkflow(userId = null, workflowId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest(`workflows/${workflowId}`, apiKey, null, null, 'DELETE');
    
    if (data === null) {
        return `Failed to delete workflow: ${workflowId}`;
    }

    return `Successfully deleted workflow: ${workflowId}`;
}

/**
 * Activate a workflow
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - ID of the workflow to activate
 * @returns {string} Confirmation message
 */
async function activateN8nWorkflow(userId = null, workflowId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest(`workflows/${workflowId}/activate`, apiKey, null, null, 'POST');
    
    if (!data) {
        return `Failed to activate workflow: ${workflowId}`;
    }

    return `Successfully activated workflow: ${workflowId}`;
}

/**
 * Deactivate a workflow
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - ID of the workflow to deactivate
 * @returns {string} Confirmation message
 */
async function deactivateN8nWorkflow(userId = null, workflowId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest(`workflows/${workflowId}/deactivate`, apiKey, null, null, 'POST');
    
    if (!data) {
        return `Failed to deactivate workflow: ${workflowId}`;
    }

    return `Successfully deactivated workflow: ${workflowId}`;
}

// =============================================================================
// EXECUTION FUNCTIONS
// =============================================================================

/**
 * List workflow executions
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - Optional workflow ID to filter executions
 * @param {number} limit - Maximum number of executions to return
 * @returns {string} Formatted execution list
 */
async function listN8nExecutions(userId = null, workflowId = null, limit = 100) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const params = { limit };
    if (workflowId) {
        params.workflowId = workflowId;
    }

    const data = await makeN8nRequest('executions', apiKey, params);
    
    if (!data) {
        return 'Failed to get executions';
    }

    const executions = data.data || [];
    if (executions.length === 0) {
        return 'No executions found';
    }

    let result = `Found ${executions.length} executions:\n\n`;
    for (const execution of executions) {
        result += `• **Execution ID:** ${execution.id || 'unknown'}\n`;
        result += `  Workflow ID: ${execution.workflowId || 'unknown'}\n`;
        result += `  Status: ${execution.status || 'unknown'}\n`;
        result += `  Started: ${execution.startedAt || 'unknown'}\n`;
        result += `  Finished: ${execution.finishedAt || 'unknown'}\n`;
        result += `  Mode: ${execution.mode || 'unknown'}\n\n`;
    }

    return result;
}

/**
 * Get details of a specific execution
 * @param {string} userId - User ID to get API key from
 * @param {string} executionId - ID of the execution to retrieve
 * @returns {string} Formatted execution details
 */
async function getN8nExecution(userId = null, executionId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest(`executions/${executionId}`, apiKey);
    
    if (!data) {
        return `Failed to get execution: ${executionId}`;
    }

    const dataEntries = data.data ? Object.keys(data.data).length : 0;

    let result = `**Execution Details:**\n\n`;
    result += `• **Execution ID:** ${data.id || 'unknown'}\n`;
    result += `• **Workflow ID:** ${data.workflowId || 'unknown'}\n`;
    result += `• **Status:** ${data.status || 'unknown'}\n`;
    result += `• **Started:** ${data.startedAt || 'unknown'}\n`;
    result += `• **Finished:** ${data.finishedAt || 'unknown'}\n`;
    result += `• **Mode:** ${data.mode || 'unknown'}\n`;
    result += `• **Data:** ${dataEntries} data entries\n`;

    return result;
}

/**
 * Execute a workflow
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - ID of the workflow to execute
 * @param {Object} inputData - Optional input data for the workflow
 * @returns {string} Formatted execution information
 */
async function executeN8nWorkflow(userId = null, workflowId, inputData = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const executionData = {};
    if (inputData) {
        executionData.data = inputData;
    }

    const data = await makeN8nRequest(`workflows/${workflowId}/execute`, apiKey, null, executionData, 'POST');
    
    if (!data) {
        return `Failed to execute workflow: ${workflowId}`;
    }

    let result = `**Execution Started:**\n\n`;
    result += `• **Execution ID:** ${data.id || 'unknown'}\n`;
    result += `• **Workflow ID:** ${workflowId}\n`;
    result += `• **Status:** ${data.status || 'unknown'}\n`;
    result += `• **Started:** ${data.startedAt || 'unknown'}\n`;

    return result;
}

// =============================================================================
// CREDENTIAL FUNCTIONS
// =============================================================================

/**
 * List all credentials
 * @param {string} userId - User ID to get API key from
 * @returns {string} Formatted credential list
 */
async function listN8nCredentials(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest('credentials', apiKey);
    
    if (!data) {
        return 'Failed to get credentials';
    }

    const credentials = data.data || [];
    if (credentials.length === 0) {
        return 'No credentials found';
    }

    let result = `Found ${credentials.length} credentials:\n\n`;
    for (const credential of credentials) {
        result += `• **${credential.name || 'No name'}**\n`;
        result += `  ID: ${credential.id || 'unknown'}\n`;
        result += `  Type: ${credential.type || 'unknown'}\n`;
        result += `  Created: ${credential.createdAt || 'unknown'}\n`;
        result += `  Updated: ${credential.updatedAt || 'unknown'}\n\n`;
    }

    return result;
}

/**
 * Get details of a specific credential
 * @param {string} userId - User ID to get API key from
 * @param {string} credentialId - ID of the credential to retrieve
 * @returns {string} Formatted credential details
 */
async function getN8nCredential(userId = null, credentialId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest(`credentials/${credentialId}`, apiKey);
    
    if (!data) {
        return `Failed to get credential: ${credentialId}`;
    }

    let result = `**Credential Details:**\n\n`;
    result += `• **ID:** ${data.id || 'unknown'}\n`;
    result += `• **Name:** ${data.name || 'No name'}\n`;
    result += `• **Type:** ${data.type || 'unknown'}\n`;
    result += `• **Created:** ${data.createdAt || 'unknown'}\n`;
    result += `• **Updated:** ${data.updatedAt || 'unknown'}\n`;

    return result;
}

// =============================================================================
// USER FUNCTIONS
// =============================================================================

/**
 * Get current user information
 * @param {string} userId - User ID to get API key from
 * @returns {string} Formatted user information
 */
async function getN8nUserInfo(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest('users/me', apiKey);
    
    if (!data) {
        return 'Failed to get user info';
    }

    let result = `**User Information:**\n\n`;
    result += `• **ID:** ${data.id || 'unknown'}\n`;
    result += `• **Email:** ${data.email || 'No email'}\n`;
    result += `• **First Name:** ${data.firstName || 'No first name'}\n`;
    result += `• **Last Name:** ${data.lastName || 'No last name'}\n`;
    result += `• **Created:** ${data.createdAt || 'unknown'}\n`;

    return result;
}

// =============================================================================
// WEBHOOK FUNCTIONS
// =============================================================================

/**
 * List all webhooks
 * @param {string} userId - User ID to get API key from
 * @returns {string} Formatted webhook list
 */
async function listN8nWebhooks(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest('webhooks', apiKey);
    
    if (!data) {
        return 'Failed to get webhooks';
    }

    const webhooks = data.data || [];
    if (webhooks.length === 0) {
        return 'No webhooks found';
    }

    let result = `Found ${webhooks.length} webhooks:\n\n`;
    for (const webhook of webhooks) {
        result += `• **Webhook ID:** ${webhook.id || 'unknown'}\n`;
        result += `  Path: ${webhook.path || 'No path'}\n`;
        result += `  Method: ${webhook.method || 'unknown'}\n`;
        result += `  Workflow ID: ${webhook.workflowId || 'unknown'}\n`;
        result += `  Active: ${webhook.active || false}\n\n`;
    }

    return result;
}

// =============================================================================
// TAGS FUNCTIONS
// =============================================================================

/**
 * List all tags
 * @param {string} userId - User ID to get API key from
 * @returns {string} Formatted tag list
 */
async function listN8nTags(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest('tags', apiKey);
    
    if (!data) {
        return 'Failed to get tags';
    }

    const tags = data.data || [];
    if (tags.length === 0) {
        return 'No tags found';
    }

    let result = `Found ${tags.length} tags:\n\n`;
    for (const tag of tags) {
        result += `• **${tag.name || 'No name'}**\n`;
        result += `  ID: ${tag.id || 'unknown'}\n`;
        result += `  Created: ${tag.createdAt || 'unknown'}\n`;
        result += `  Updated: ${tag.updatedAt || 'unknown'}\n\n`;
    }

    return result;
}

/**
 * Create a new tag
 * @param {string} userId - User ID to get API key from
 * @param {string} name - Name of the tag
 * @returns {string} Formatted created tag information
 */
async function createN8nTag(userId = null, name) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const apiKey = await getN8nApiKey(userId);
    if (!apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const tagData = { name };
    const data = await makeN8nRequest('tags', apiKey, null, tagData, 'POST');
    
    if (!data) {
        return `Failed to create tag: ${name}`;
    }

    let result = `**Created Tag:**\n\n`;
    result += `• **ID:** ${data.id || 'unknown'}\n`;
    result += `• **Name:** ${data.name || 'No name'}\n`;
    result += `• **Created:** ${data.createdAt || 'unknown'}\n`;

    return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Core functions
    makeN8nRequest,
    getN8nApiKey,
    
    // Workflow functions
    listN8nWorkflows,
    getN8nWorkflow,
    createN8nWorkflow,
    updateN8nWorkflow,
    deleteN8nWorkflow,
    activateN8nWorkflow,
    deactivateN8nWorkflow,
    
    // Execution functions
    listN8nExecutions,
    getN8nExecution,
    executeN8nWorkflow,
    
    // Credential functions
    listN8nCredentials,
    getN8nCredential,
    
    // User functions
    getN8nUserInfo,
    
    // Webhook functions
    listN8nWebhooks,
    
    // Tag functions
    listN8nTags,
    createN8nTag
};