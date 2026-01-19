/**
 * n8n MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY, N8N } = require('../config/config');

const DEFAULT_N8N_API_BASE = process.env.N8N_API_BASE || 'https://api.n8n.io/v1';

/**
 * Make a request to the n8n API
 * @param {string} endpoint - The API endpoint
 * @param {string} apiKey - n8n API key
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST/PUT requests
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {string} apiBaseUrl - Optional API base URL (defaults to https://api.n8n.io/v1)
 * @returns {Object|null} API response data
 */
async function makeN8nRequest(endpoint, apiKey, params = null, jsonData = null, method = 'GET', apiBaseUrl = null) {
    const headers = {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        let response;
        const baseUrl = apiBaseUrl || DEFAULT_N8N_API_BASE;
        // Ensure baseUrl doesn't have trailing slash and endpoint doesn't have leading slash
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const cleanEndpoint = endpoint.replace(/^\//, '');
        const url = `${cleanBaseUrl}/${cleanEndpoint}`;
        
        console.log(`Making ${method} request to n8n API: ${url}`);

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

        console.log(`Successfully received response from n8n API: ${endpoint}, url: ${url}`);
        return response.data;
    } catch (error) {
        const errorDetails = {
            endpoint,
            method,
            url: `${apiBaseUrl || DEFAULT_N8N_API_BASE}/${endpoint}`,
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: error.response?.data,
            message: error.message
        };
        console.error(`Error making request to n8n API: ${endpoint} - Error: ${error.message}`);
        console.error(`Error details:`, JSON.stringify(errorDetails, null, 2));
        if (error.response?.data) {
            console.error(`n8n API error response:`, JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

/**
 * Get n8n API key and base URL from user's MCP data
 * @param {string} userId - User ID
 * @returns {Object|null} Object containing apiKey and apiBaseUrl, or null if not found
 */
async function getN8nConfig(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.N8N || !user.mcpdata.N8N.api_key) {
            return null;
        }
        // Decrypt the API key before returning
        const decryptedKey = decryptedData(user.mcpdata.N8N.api_key);
        const apiBaseUrl = user.mcpdata.N8N.api_base_url || null;
        return {
            apiKey: decryptedKey,
            apiBaseUrl: apiBaseUrl
        };
    } catch (error) {
        console.error('Error fetching n8n config:', error.message);
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
    const config = await getN8nConfig(userId);
    if (!config || !config.apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const params = { limit };
    const data = await makeN8nRequest('workflows', config.apiKey, params, null, 'GET', config.apiBaseUrl);
    
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
    const config = await getN8nConfig(userId);
    if (!config || !config.apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const data = await makeN8nRequest(`workflows/${workflowId}`, config.apiKey, null, null, 'GET', config.apiBaseUrl);
    
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
 * Create a new workflow following n8n API specification
 * @param {string} userId - User ID to get API key from
 * @param {string} name - Name of the workflow (required)
 * @param {Array} nodes - List of nodes in the workflow (required)
 * @param {Object} connections - Connections between nodes (required)
 * @param {Object} settings - Workflow settings object (required)
 * @param {string|null} staticData - Static data as JSON string or null (optional)
 * @param {Array} shared - Array of shared workflow objects (optional)
 * @returns {string} Formatted created workflow information
 * 
 * API Reference: https://docs.n8n.io/api/api-reference/#tag/workflow/POST/workflows
 * Body schema: connections (required), name (required), nodes (required), settings (required), shared (optional), staticData (optional)
 */
async function createN8nWorkflow(userId = null, name, nodes, connections = null, settings = null, staticData = null, shared = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const config = await getN8nConfig(userId);
    if (!config || !config.apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    // Validate required fields per n8n API
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return 'Error: Workflow name is required and must be a non-empty string.';
    }

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
        return 'Error: At least one node is required. Provide an array of workflow nodes.';
    }

    // Validate node structure (per n8n API requirements)
    const invalidNodes = nodes.filter((node, index) => {
        if (!node || typeof node !== 'object') {
            console.warn(`Invalid node object at index ${index}:`, node);
            return true;
        }
        // Required: type, name, position
        if (!node.type || !node.name || !node.position || !Array.isArray(node.position) || node.position.length !== 2) {
            console.warn(`Invalid node structure at index ${index}. Missing type, name, or invalid position:`, node);
            return true;
        }
        // Ensure position elements are numbers
        if (typeof node.position[0] !== 'number' || typeof node.position[1] !== 'number') {
            console.warn(`Invalid node position at index ${index}. Position elements must be numbers:`, node.position);
            return true;
        }
        return false;
    });

    if (invalidNodes.length > 0) {
        return `Error: Invalid node structure. Each node must have: type, name, and position [x, y] (with numeric values). Found ${invalidNodes.length} invalid node(s).`;
    }

    // Build workflow data object EXACTLY as per n8n API documentation
    // Reference: https://docs.n8n.io/api/api-reference/#tag/workflow/POST/workflows
    // Required: connections, name, nodes, settings
    // Optional: shared, staticData
    // DO NOT include: active, tags, description (not in create workflow body)
    
    const workflowData = {
        name: name.trim(),
        nodes: nodes.map(node => {
            // Node properties per API schema
            const normalizedNode = {
                type: String(node.type),
                name: String(node.name),
                position: [Number(node.position[0]), Number(node.position[1])],
                typeVersion: node.typeVersion !== undefined ? Number(node.typeVersion) : 1
            };
            // Optional node fields per API
            if (node.parameters !== undefined && node.parameters !== null) {
                normalizedNode.parameters = node.parameters;
            }
            if (node.id !== undefined && node.id !== null && String(node.id).trim() !== '') {
                normalizedNode.id = String(node.id);
            }
            if (node.credentials !== undefined && node.credentials !== null) {
                normalizedNode.credentials = node.credentials;
            }
            if (node.disabled !== undefined) {
                normalizedNode.disabled = Boolean(node.disabled);
            }
            if (node.notes !== undefined && node.notes !== null) {
                normalizedNode.notes = String(node.notes);
            }
            if (node.notesInFlow !== undefined) {
                normalizedNode.notesInFlow = Boolean(node.notesInFlow);
            }
            if (node.onError !== undefined && node.onError !== null) {
                normalizedNode.onError = String(node.onError);
            }
            if (node.retryOnFail !== undefined) {
                normalizedNode.retryOnFail = Boolean(node.retryOnFail);
            }
            if (node.maxTries !== undefined) {
                normalizedNode.maxTries = Number(node.maxTries);
            }
            if (node.waitBetweenTries !== undefined) {
                normalizedNode.waitBetweenTries = Number(node.waitBetweenTries);
            }
            if (node.webhookId !== undefined && node.webhookId !== null) {
                normalizedNode.webhookId = String(node.webhookId);
            }
            if (node.executeOnce !== undefined) {
                normalizedNode.executeOnce = Boolean(node.executeOnce);
            }
            if (node.alwaysOutputData !== undefined) {
                normalizedNode.alwaysOutputData = Boolean(node.alwaysOutputData);
            }
            return normalizedNode;
        }),
        connections: connections || {},
        settings: settings || {}
    };

    // Optional fields per API - only add if provided
    if (staticData !== undefined && staticData !== null) {
        workflowData.staticData = staticData;
    }
    
    if (shared && Array.isArray(shared) && shared.length > 0) {
        workflowData.shared = shared;
    }

    // Log the actual payload being sent (for debugging)
    console.log(`Creating workflow with payload:`, JSON.stringify(workflowData, null, 2));

    const data = await makeN8nRequest('workflows', config.apiKey, null, workflowData, 'POST', config.apiBaseUrl);
    
    if (!data) {
        return `Failed to create workflow: ${name}. Please check the workflow structure and ensure all required fields are provided.`;
    }

    let result = `**Created Workflow:**\n\n`;
    result += `• **ID:** ${data.id || 'unknown'}\n`;
    result += `• **Name:** ${data.name || 'No name'}\n`;
    result += `• **Active:** ${data.active || false}\n`;
    result += `• **Nodes:** ${data.nodes ? data.nodes.length : nodes.length} node(s)\n`;
    result += `• **Created:** ${data.createdAt ? new Date(data.createdAt).toLocaleString() : 'unknown'}\n`;
    
    if (data.description) {
        result += `• **Description:** ${data.description}\n`;
    }
    
    if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        const tagNames = data.tags.map(tag => tag.name || tag.id || tag).join(', ');
        result += `• **Tags:** ${tagNames}\n`;
    }

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
    const config = await getN8nConfig(userId);
    if (!config || !config.apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    const updateData = {};
    if (name !== null) updateData.name = name;
    if (nodes !== null) updateData.nodes = nodes;
    if (connections !== null) updateData.connections = connections;
    if (active !== null) updateData.active = active;

    const data = await makeN8nRequest(`workflows/${workflowId}`, config.apiKey, null, updateData, 'PUT', config.apiBaseUrl);
    
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


// =============================================================================
// EXECUTION FUNCTIONS
// =============================================================================

/**
 * Extract form fields from form trigger node, checking multiple locations
 * @param {Object} formTriggerNode - The form trigger node from workflow
 * @param {Object} workflowData - Full workflow data (to check activeVersion)
 * @returns {Array} Array of form field objects
 */
function extractFormFields(formTriggerNode, workflowData = {}) {
    let formFields = [];
    
    // n8n form trigger stores fields in parameters.formFields.values array
    // Each field has: fieldLabel, placeholder, requiredField, fieldType, etc.
    if (formTriggerNode.parameters?.formFields?.values && Array.isArray(formTriggerNode.parameters.formFields.values)) {
        formFields = formTriggerNode.parameters.formFields.values.map(field => ({
            fieldLabel: field.fieldLabel,
            placeholder: field.placeholder,
            requiredField: field.requiredField !== false, // Default to true
            fieldType: field.fieldType || 'text',
            defaultValue: field.defaultValue,
            options: field.options || field.values || []
        }));
    }
    
    // If not found, try other locations
    if ((!formFields || formFields.length === 0)) {
        formFields = formTriggerNode.parameters?.fields || 
                    formTriggerNode.parameters?.options?.fields ||
                    formTriggerNode.parameters?.schema?.properties ||
                    formTriggerNode.parameters?.schema?.items?.properties ||
                    [];
    }
    
    // If not found in main node, check activeVersion
    if ((!formFields || formFields.length === 0) && workflowData.activeVersion) {
        const activeVersionTrigger = workflowData.activeVersion.nodes?.find(node => 
            node.type === 'n8n-nodes-base.formTrigger'
        );
        if (activeVersionTrigger) {
            // Check formFields.values first (n8n format)
            if (activeVersionTrigger.parameters?.formFields?.values && Array.isArray(activeVersionTrigger.parameters.formFields.values)) {
                formFields = activeVersionTrigger.parameters.formFields.values.map(field => ({
                    fieldLabel: field.fieldLabel,
                    placeholder: field.placeholder,
                    requiredField: field.requiredField !== false,
                    fieldType: field.fieldType || 'text',
                    defaultValue: field.defaultValue,
                    options: field.options || field.values || []
                }));
            } else {
                formFields = activeVersionTrigger.parameters?.fields || 
                            activeVersionTrigger.parameters?.options?.fields ||
                            activeVersionTrigger.parameters?.formFields ||
                            activeVersionTrigger.parameters?.schema?.properties ||
                            [];
            }
        }
    }
    
    // If still not found, check if fields are in a different structure
    if ((!formFields || formFields.length === 0) && formTriggerNode.parameters) {
        // Sometimes fields are stored as an object with field names as keys
        const params = formTriggerNode.parameters;
        if (params.schema && typeof params.schema === 'object') {
            // Try to extract from JSON schema structure
            if (params.schema.properties) {
                formFields = Object.keys(params.schema.properties).map(key => ({
                    fieldLabel: key,
                    ...params.schema.properties[key]
                }));
            }
        }
    }
    
    return Array.isArray(formFields) ? formFields : [];
}

/**
 * Generate intelligent form data based on form trigger node configuration
 * Uses field names, labels, and types to generate context-aware values
 * IMPORTANT: n8n forms use indexed field names (field-0, field-1, etc.) NOT field labels
 * @param {Object} formTriggerNode - The form trigger node from workflow
 * @param {Object} workflowData - Full workflow data for context (optional)
 * @returns {Object} Intelligent form data object with indexed field names (field-0, field-1, etc.)
 */
function generateDefaultFormData(formTriggerNode, workflowData = {}) {
    const defaultData = {};
    
    // Extract form fields using enhanced extraction
    const formFields = extractFormFields(formTriggerNode, workflowData);
    
    // Log extracted fields for debugging
    if (formFields.length > 0) {
    }
    
    if (formFields.length > 0) {
        formFields.forEach((field, index) => {
            // IMPORTANT: n8n forms use indexed field names (field-0, field-1, etc.), NOT field labels!
            // The field label is just for display. The actual form submission uses field-0, field-1, etc.
            const fieldKey = `field-${index}`;
            const fieldType = field.fieldType || field.type || 'text';
            const fieldLabel = (field.fieldLabel || field.label || field.title || field.description || '').toLowerCase();
            const placeholder = field.placeholder || '';
            
            // Log field extraction for debugging
            
            // Use defaultValue if provided, otherwise generate intelligent value
            if (field.defaultValue !== undefined && field.defaultValue !== null) {
                defaultData[fieldKey] = field.defaultValue;
            } else if (field.default !== undefined && field.default !== null) {
                defaultData[fieldKey] = field.default;
            } else {
                // Generate intelligent value based on field type and label/placeholder
                switch (fieldType?.toLowerCase()) {
                    case 'text':
                    case 'string':
                        // Context-aware text generation based on field label/placeholder
                        if (fieldLabel.includes('name') || fieldLabel.includes('title')) {
                            if (fieldLabel.includes('form') || fieldLabel.includes('google form') || placeholder.toLowerCase().includes('form')) {
                                defaultData[fieldKey] = `Form created via n8n MCP - ${new Date().toLocaleString()}`;
                            } else if (fieldLabel.includes('workflow')) {
                                defaultData[fieldKey] = workflowData.name || 'n8n Workflow';
                            } else {
                                defaultData[fieldKey] = placeholder || 'John Doe';
                            }
                        } else if (fieldLabel.includes('email')) {
                            defaultData[fieldKey] = placeholder || 'user@example.com';
                        } else if (fieldLabel.includes('company') || fieldLabel.includes('organization')) {
                            defaultData[fieldKey] = placeholder || 'Acme Corporation';
                        } else if (fieldLabel.includes('message') || fieldLabel.includes('comment') || fieldLabel.includes('description')) {
                            defaultData[fieldKey] = placeholder || `Automated submission from n8n MCP integration for workflow: ${workflowData.name || 'workflow'}`;
                        } else if (fieldLabel.includes('subject') || fieldLabel.includes('topic')) {
                            defaultData[fieldKey] = placeholder || `Form Submission - ${workflowData.name || 'n8n Workflow'}`;
                        } else {
                            // Use placeholder if available, otherwise generate based on field label
                            defaultData[fieldKey] = placeholder || (fieldLabel.includes('name') ? 'Sample Name' : 'Sample text');
                        }
                        break;
                    case 'textarea':
                        defaultData[fieldKey] = placeholder || `Automated form submission from n8n MCP integration.\nWorkflow: ${workflowData.name || 'Unknown'}\nTimestamp: ${new Date().toISOString()}`;
                        break;
                    case 'email':
                        defaultData[fieldKey] = placeholder || 'user@example.com';
                        break;
                    case 'number':
                    case 'integer':
                        defaultData[fieldKey] = field.min || 1;
                        break;
                    case 'boolean':
                    case 'checkbox':
                        defaultData[fieldKey] = true;
                        break;
                    case 'date':
                        defaultData[fieldKey] = new Date().toISOString().split('T')[0];
                        break;
                    case 'select':
                    case 'dropdown':
                        // Use first option if available
                        if (field.options && Array.isArray(field.options) && field.options.length > 0) {
                            defaultData[fieldKey] = field.options[0].value || field.options[0].label || field.options[0];
                        } else if (field.values && Array.isArray(field.values) && field.values.length > 0) {
                            defaultData[fieldKey] = field.values[0].value || field.values[0].label || field.values[0];
                        } else {
                            defaultData[fieldKey] = placeholder || '';
                        }
                        break;
                    case 'multiselect':
                        if (field.options && field.options.length > 0) {
                            defaultData[fieldKey] = [field.options[0].value || field.options[0]];
                        } else if (field.values && field.values.length > 0) {
                            defaultData[fieldKey] = [field.values[0].value || field.values[0]];
                        } else {
                            defaultData[fieldKey] = [];
                        }
                        break;
                    default:
                        defaultData[fieldKey] = placeholder || 'Default value';
                }
            }
        });
    } else {
        // If no fields defined, provide generic defaults
        defaultData.message = `Form submitted via n8n MCP integration for workflow: ${workflowData.name || 'workflow'}`;
        defaultData.timestamp = new Date().toISOString();
    }
    
    return defaultData;
}

/**
 * Detect workflow trigger type and extract trigger information
 * @param {Object} workflowData - Workflow data from API
 * @returns {Object} Trigger information with type and URL/path
 */
function detectWorkflowTrigger(workflowData) {
    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
        return { type: 'unknown', node: null, url: null };
    }

    // Find trigger nodes
    const triggerNodeTypes = {
        'n8n-nodes-base.webhook': 'webhook',
        'n8n-nodes-base.formTrigger': 'form',
        'n8n-nodes-base.scheduleTrigger': 'schedule',
        'n8n-nodes-base.chatTrigger': 'chat',
        'n8n-nodes-base.manualTrigger': 'manual'
    };

    // Find the first trigger node
    const triggerNode = workflowData.nodes.find(node => 
        Object.keys(triggerNodeTypes).includes(node.type)
    );

    if (!triggerNode) {
        return { type: 'unknown', node: null, url: null };
    }

    const triggerType = triggerNodeTypes[triggerNode.type] || 'unknown';
    let triggerPath = null;
    let httpMethod = 'POST';

    // Extract webhook path
    if (triggerType === 'webhook') {
        // Webhook path can be in different places
        triggerPath = triggerNode.parameters?.path || 
                       triggerNode.parameters?.pathPrefix || 
                       triggerNode.parameters?.options?.path || 
                       '';
        httpMethod = triggerNode.parameters?.httpMethod || 
                    triggerNode.parameters?.options?.httpMethod || 
                    'POST';
    }

    // Extract form ID
    if (triggerType === 'form') {
        // Form ID can be in different places:
        // 1. In the trigger node parameters (formId or id)
        // 2. In workflow settings
        // 3. In the workflow's staticData
        // 4. In the webhookId field (sometimes used for forms)
        // 5. Sometimes the workflow ID itself is used
        triggerPath = triggerNode.parameters?.formId || 
                      triggerNode.parameters?.id ||
                      triggerNode.webhookId ||
                      workflowData.settings?.formId ||
                      workflowData.staticData?.formId ||
                      workflowData.webhookId ||
                      workflowData.id; // Fallback to workflow ID
    }

    return {
        type: triggerType,
        node: triggerNode,
        path: triggerPath,
        httpMethod: httpMethod
    };
}

/**
 * Execute a workflow by calling the appropriate trigger URL
 * @param {string} userId - User ID to get API key from
 * @param {string} workflowId - ID of the workflow to execute
 * @param {Object} inputData - Optional input data for the workflow
 * @returns {string} Formatted execution information
 */
async function executeN8nWorkflow(userId = null, workflowId, inputData = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const config = await getN8nConfig(userId);
    if (!config || !config.apiKey) {
        return 'Error: n8n API key not found. Please configure your n8n integration in your profile settings.';
    }

    // First, get workflow details to check trigger type and get trigger URL
    const workflowData = await makeN8nRequest(`workflows/${workflowId}`, config.apiKey, null, null, 'GET', config.apiBaseUrl);
    if (!workflowData) {
        return `Error: Failed to retrieve workflow ${workflowId}. Please check if the workflow ID is correct.`;
    }

    if (!workflowData.active) {
        return `Error: Workflow "${workflowData.name || workflowId}" is not active. Please activate the workflow first using the activate_n8n_workflow tool.`;
    }

    // Detect trigger type FIRST (before using it)
    const trigger = detectWorkflowTrigger(workflowData);

    // For form workflows, check if workflow is published (required for form triggers)
    if (trigger.type === 'form') {
        // n8n form workflows need to be published, not just active
        // Check if workflow has activeVersionId (indicates it's published)
        if (!workflowData.activeVersionId) {
            return `Error: Workflow "${workflowData.name || workflowId}" is active but not published. Form workflows must be published to accept form submissions. Please publish the workflow in n8n.`;
        }
        
        // Additional validation: Check if form trigger node exists and is properly configured
        if (!trigger.node) {
            return `Error: Workflow "${workflowData.name || workflowId}" has a form trigger but the trigger node configuration could not be found. Please check the workflow configuration in n8n.`;
        }
        
        // Check if form has a valid path/ID
        if (!trigger.path) {
            return `Error: Workflow "${workflowData.name || workflowId}" form trigger is missing a form ID/path. Please check the form trigger configuration in n8n.`;
        }
        
    }
    
    // For form triggers, also check activeVersion if available
    if (trigger.type === 'form' && workflowData.activeVersion) {
        const activeVersionTrigger = workflowData.activeVersion.nodes?.find(node => 
            node.type === 'n8n-nodes-base.formTrigger'
        );
        if (activeVersionTrigger && (!trigger.node.parameters?.fields || trigger.node.parameters.fields.length === 0)) {
            // Use activeVersion trigger node if it has fields
            trigger.node = activeVersionTrigger;
        }
    }

    // Get base URL from API base URL
    let baseUrl = N8N.API_BASE_URL; // Default fallback
    if (config.apiBaseUrl) {
        try {
            const url = new URL(config.apiBaseUrl);
            baseUrl = `${url.protocol}//${url.host}`;
        } catch (e) {
            // If URL parsing fails, try string replacement
            baseUrl = config.apiBaseUrl.replace('/api/v1', '').replace(/\/$/, '');
        }
    }

    // Handle different trigger types
    if (trigger.type === 'webhook' && trigger.path) {
        try {
            // Construct webhook URL
            const webhookUrl = `${baseUrl}/webhook/${trigger.path}`;
            const httpMethod = trigger.httpMethod || 'POST';

            // Prepare request body
            const requestBody = inputData ? (Array.isArray(inputData) ? inputData : [inputData]) : null;


            // Call webhook URL directly
            let response;
            const headers = {
                'Content-Type': 'application/json'
            };

            if (httpMethod === 'GET') {
                response = await axios.get(webhookUrl, { 
                    headers, 
                    params: requestBody, 
                    timeout: 30000 
                });
            } else {
                response = await axios.post(webhookUrl, requestBody, { 
                    headers, 
                    timeout: 30000 
                });
            }

            let result = `**Webhook Workflow Triggered Successfully:**\n\n`;
            result += `• **Workflow:** ${workflowData.name || workflowId}\n`;
            result += `• **Trigger Type:** Webhook\n`;
            result += `• **Webhook URL:** ${webhookUrl}\n`;
            result += `• **Method:** ${httpMethod}\n`;
            result += `• **Status Code:** ${response.status}\n`;
            if (response.data) {
                result += `• **Response:** ${JSON.stringify(response.data, null, 2)}\n`;
            }

            return result;
        } catch (error) {
            return `Error triggering webhook workflow: ${error.response?.data?.message || error.message || 'Unknown error'}`;
        }
    }

    if (trigger.type === 'form' && trigger.path) {
        // Construct form URL (define outside try block so it's available in catch)
        const formUrl = `${baseUrl}/form/${trigger.path}`;
        
        // Also try the /rest/workflows/{id}/run endpoint as an alternative
        const restRunUrl = `${baseUrl}/rest/workflows/${workflowId}/run`;
        
        // Prepare form data - always generate defaults first, then merge with inputData if provided
        // This ensures all form fields have values, even if inputData has null/undefined/empty values
        let formData;
        let usedDefaults = false;
        
        try {

            // Always generate default form data first based on form fields
            const defaultFormData = generateDefaultFormData(trigger.node, workflowData);
            
            // Start with defaults
            formData = { ...defaultFormData };
            usedDefaults = true;
            
            // If inputData is provided, merge it with defaults (overriding defaults with non-null values)
            if (inputData && typeof inputData === 'object' && Object.keys(inputData).length > 0) {
                Object.keys(inputData).forEach(key => {
                    const value = inputData[key];
                    // Only override default if the provided value is not null/undefined/empty
                    if (value !== null && value !== undefined && value !== '') {
                        formData[key] = value;
                        usedDefaults = false; // We're using provided value, not default
                    }
                    // If value is null/undefined/empty, keep the default value (already set above)
                });
                
                // Also ensure all default fields are present (in case inputData only had some fields)
                Object.keys(defaultFormData).forEach(key => {
                    if (!(key in formData) || formData[key] === null || formData[key] === undefined || formData[key] === '') {
                        formData[key] = defaultFormData[key];
                        usedDefaults = true;
                    }
                });
            }
            
            
            // Try using /rest/workflows/{id}/run endpoint first (this is the correct endpoint for form workflows)
            const restRunUrl = `${baseUrl}/rest/workflows/${workflowId}/run`;
            try {
                
                // Prepare data for /rest/workflows/{id}/run endpoint
                // Format form data as array of items (n8n expects this format)
                const formDataArray = formData ? (Array.isArray(formData) ? formData : [formData]) : [{}];
                
                const runPayload = {
                    workflowData: {
                        name: workflowData.name,
                        nodes: workflowData.nodes || [],
                        connections: workflowData.connections || {},
                        settings: workflowData.settings || {},
                        active: workflowData.active,
                        pinData: workflowData.pinData || {},
                        tags: workflowData.tags || [],
                        versionId: workflowData.versionId || workflowData.activeVersionId,
                        meta: workflowData.meta || {},
                        id: workflowData.id
                    },
                    startNodes: [],
                    triggerToStartFrom: {
                        name: trigger.node?.name || 'On form submission'
                    },
                    // Add form data - n8n expects data in this format for form triggers
                    // The data should be an array where each item represents form field values
                    // For form triggers, the data structure should match the form field labels exactly
                    data: formDataArray
                };
                
                
                const runResponse = await axios.post(restRunUrl, runPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-N8N-API-KEY': config.apiKey,
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                });
                
                if (runResponse.status === 200) {
                    let result = `**Form Workflow Executed Successfully:**\n\n`;
                    result += `• **Workflow:** ${workflowData.name || workflowId}\n`;
                    result += `• **Trigger Type:** Form\n`;
                    result += `• **Execution Method:** /rest/workflows/{id}/run endpoint\n`;
                    result += `• **Status Code:** ${runResponse.status}\n`;
                    if (usedDefaults) {
                        result += `• **Note:** Automatically generated intelligent form data based on form fields\n`;
                        result += `• **Form Data Sent:**\n\`\`\`json\n${JSON.stringify(formData, null, 2)}\n\`\`\`\n`;
                    } else {
                        result += `• **Form Data Sent:**\n\`\`\`json\n${JSON.stringify(formData, null, 2)}\n\`\`\`\n`;
                    }
                    if (runResponse.data) {
                        result += `• **Response:**\n\`\`\`json\n${JSON.stringify(runResponse.data, null, 2)}\n\`\`\`\n`;
                    }
                    return result;
                }
            } catch (restRunError) {
                // Fall through to try form URL method
            }

            // Call form URL directly
            // n8n forms expect multipart/form-data (not application/x-www-form-urlencoded)
            // Use FormData for multipart encoding
            const FormData = require('form-data');
            const formDataMultipart = new FormData();
            
            Object.keys(formData).forEach(key => {
                const value = formData[key];
                if (value !== null && value !== undefined) {
                    // Handle arrays and objects by stringifying them
                    if (Array.isArray(value) || typeof value === 'object') {
                        formDataMultipart.append(key, JSON.stringify(value));
                    } else {
                        formDataMultipart.append(key, String(value));
                    }
                }
            });
            
            // Detailed logging for form API call - make it very visible
            console.log(`\n🚀 ========== FORM API CALL DETAILS ==========`);
            console.log(`🚀 Form URL: ${formUrl}`);
            console.log(`🚀 HTTP Method: POST`);
            console.log(`🚀 Content-Type: multipart/form-data`);
            console.log(`🚀 Form Data (Object):`, JSON.stringify(formData, null, 2));
            console.log(`🚀 Workflow Status:`, {
                active: workflowData.active,
                activeVersionId: workflowData.activeVersionId,
                workflowId: workflowId,
                workflowName: workflowData.name
            });
            console.log(`🚀 ===========================================\n`);
            
            // Try sending form data - use axios with multipart/form-data
            let response;
            try {
                // Send as multipart/form-data (n8n form triggers require this)
                response = await axios.post(formUrl, formDataMultipart, {
                    headers: {
                        ...formDataMultipart.getHeaders(),
                        'Accept': '*/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Origin': baseUrl,
                        'Referer': formUrl
                    },
                    timeout: 30000,
                    maxRedirects: 5,
                    validateStatus: (status) => status < 600 // Accept all status codes to handle errors manually
                });
                
                // Log response details
                
                // Check if response indicates an error
                if (response.status >= 400) {
                    const errorMsg = response.data?.message || response.data?.error || `HTTP ${response.status}`;
                    const errorCode = response.data?.code;
                    
                    // Log detailed error for debugging
                    
                    // Provide more helpful error message
                    if (errorMsg.includes('could not be started') || errorMsg.includes('Workflow Form Error')) {
                        let diagnosticMsg = `n8n form submission failed: ${errorMsg}\n\n`;
                        diagnosticMsg += `**Diagnostics:**\n`;
                        diagnosticMsg += `• Workflow: ${workflowData.name || workflowId}\n`;
                        diagnosticMsg += `• Active: ${workflowData.active}\n`;
                        diagnosticMsg += `• Published: ${!!workflowData.activeVersionId}\n`;
                        diagnosticMsg += `• Version ID: ${workflowData.activeVersionId || 'None'}\n`;
                        diagnosticMsg += `• Form ID: ${trigger.path || 'None'}\n`;
                        diagnosticMsg += `• Form URL: ${formUrl}\n\n`;
                        diagnosticMsg += `**Possible Solutions:**\n`;
                        diagnosticMsg += `1. Republish the workflow in n8n (even if it's already active)\n`;
                        diagnosticMsg += `2. Check for errors in the workflow nodes\n`;
                        diagnosticMsg += `3. Verify the form trigger is properly configured\n`;
                        diagnosticMsg += `4. Ensure the workflow execution settings allow form submissions\n`;
                        throw new Error(diagnosticMsg);
                    }
                    
                    throw new Error(`Form submission returned ${response.status}: ${errorMsg}`);
                }
            } catch (requestError) {
                // Log full error details for debugging
                
                // If it's a 500 error, provide more context
                if (requestError.response?.status === 500) {
                    const errorMsg = requestError.response?.data?.message || 'Unknown error';
                    throw new Error(`n8n form submission failed: ${errorMsg}. The workflow may need to be republished or there may be an issue with the form configuration.`);
                }
                throw requestError;
            }

            let result = `**Form Workflow Triggered Successfully:**\n\n`;
            result += `• **Workflow:** ${workflowData.name || workflowId}\n`;
            result += `• **Trigger Type:** Form\n`;
            result += `• **Form URL:** ${formUrl}\n`;
            if (usedDefaults) {
                result += `• **Note:** Automatically generated intelligent form data based on form fields\n`;
                result += `• **Form Data Sent:**\n\`\`\`json\n${JSON.stringify(formData, null, 2)}\n\`\`\`\n`;
            } else {
                result += `• **Form Data Sent:**\n\`\`\`json\n${JSON.stringify(formData, null, 2)}\n\`\`\`\n`;
            }
            result += `• **Status Code:** ${response.status}\n`;
            if (response.data) {
                result += `• **Response:** ${JSON.stringify(response.data, null, 2)}\n`;
            }

            return result;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            const errorData = error.response?.data;
            const statusCode = error.response?.status;
            
            // Ensure formUrl is defined (should be, but safety check)
            const formUrlSafe = typeof formUrl !== 'undefined' ? formUrl : `${baseUrl}/form/${trigger.path || 'unknown'}`;
            
            let errorResult = `Error triggering form workflow: ${errorMessage}\n\n`;
            
            // Check for specific error conditions
            if (errorMessage.includes('could not be started') || errorMessage.includes('Workflow Form Error')) {
                errorResult += `**Possible Causes:**\n`;
                errorResult += `• The workflow may not be published (form workflows must be published, not just active)\n`;
                errorResult += `• The workflow may have errors in its configuration\n`;
                errorResult += `• The form trigger may not be properly configured\n`;
                errorResult += `• Workflow Status: ${workflowData.active ? 'Active' : 'Inactive'}\n`;
                errorResult += `• Published Version ID: ${workflowData.activeVersionId || 'None (workflow not published)'}\n`;
                errorResult += `• Form URL: ${formUrlSafe}\n\n`;
                
                if (!workflowData.activeVersionId) {
                    errorResult += `**Action Required:** Please publish the workflow in n8n. Form workflows must be published to accept submissions.\n\n`;
                }
            }
            
            // If we used defaults and got an error, show what was sent for debugging
            if (usedDefaults) {
                errorResult += `**Form Data Sent:**\n\`\`\`json\n${JSON.stringify(formData, null, 2)}\n\`\`\`\n\n`;
            }
            
            if (errorData) {
                errorResult += `\n**Error Details:**\n\`\`\`json\n${JSON.stringify(errorData, null, 2)}\n\`\`\`\n`;
            }
            
            if (statusCode) {
                errorResult += `\n**HTTP Status:** ${statusCode}\n`;
            }
            
            return errorResult;
        }
    }

    // For schedule, chat, or manual triggers, use the /rest/workflows/{id}/run endpoint
    if (trigger.type === 'schedule' || trigger.type === 'chat' || trigger.type === 'manual') {
        try {
            // Get base URL from API base URL
            let baseUrl = N8N.API_BASE_URL; // Default fallback
            if (config.apiBaseUrl) {
                try {
                    const url = new URL(config.apiBaseUrl);
                    baseUrl = `${url.protocol}//${url.host}`;
                } catch (e) {
                    // If URL parsing fails, try string replacement
                    baseUrl = config.apiBaseUrl.replace('/api/v1', '').replace(/\/$/, '');
                }
            }
            
            const restRunUrl = `${baseUrl}/rest/workflows/${workflowId}/run`;
            
            // Prepare payload for /rest/workflows/{id}/run endpoint
            const runPayload = {
                workflowData: {
                    name: workflowData.name,
                    nodes: workflowData.nodes || [],
                    connections: workflowData.connections || {},
                    settings: workflowData.settings || {},
                    active: workflowData.active,
                    pinData: workflowData.pinData || {},
                    tags: workflowData.tags || [],
                    versionId: workflowData.versionId || workflowData.activeVersionId,
                    meta: workflowData.meta || {},
                    id: workflowData.id
                },
                startNodes: [],
                triggerToStartFrom: trigger.node ? {
                    name: trigger.node.name || 'Trigger'
                } : undefined
            };
            
            // Add input data if provided
            // For chat triggers, format the input as expected by n8n
            if (inputData) {
                if (trigger.type === 'chat') {
                    // Chat triggers expect data in a specific format
                    // Usually: { message: string } or { chatInput: string }
                    const chatInput = typeof inputData === 'string' 
                        ? { message: inputData, chatInput: inputData }
                        : inputData;
                    runPayload.data = [chatInput];
                } else {
                    const inputDataArray = Array.isArray(inputData) ? inputData : [inputData];
                    runPayload.data = inputDataArray;
                }
            } else if (trigger.type === 'chat') {
                // For chat triggers, provide a default message if none provided
                runPayload.data = [{ message: 'Workflow triggered via n8n MCP', chatInput: 'Workflow triggered via n8n MCP' }];
            }
            
            
            const runResponse = await axios.post(restRunUrl, runPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': config.apiKey,
                    'Accept': 'application/json'
                },
                timeout: 30000
            });
            
            if (runResponse.status === 200) {
                let result = `**Workflow Execution Started:**\n\n`;
                result += `• **Workflow:** ${workflowData.name || workflowId}\n`;
                result += `• **Trigger Type:** ${trigger.type}\n`;
                result += `• **Execution Method:** /rest/workflows/{id}/run endpoint\n`;
                result += `• **Status Code:** ${runResponse.status}\n`;
                if (runResponse.data) {
                    result += `• **Response:**\n\`\`\`json\n${JSON.stringify(runResponse.data, null, 2)}\n\`\`\`\n`;
                }
                return result;
            } else {
                return `Error: Workflow execution returned status ${runResponse.status}. Response: ${JSON.stringify(runResponse.data)}`;
            }
        } catch (error) {
            
            // If /rest/workflows/{id}/run fails, try the old execute endpoint as fallback
            try {
                const executionData = {};
                
                // Include versionId if available
                if (workflowData.activeVersionId) {
                    executionData.versionId = workflowData.activeVersionId;
                }
                
                // Add input data if provided
                if (inputData) {
                    executionData.data = Array.isArray(inputData) ? inputData : [inputData];
                }
                
                const data = await makeN8nRequest(`workflows/${workflowId}/execute`, config.apiKey, null, executionData, 'POST', config.apiBaseUrl);
                
                if (!data) {
                    return `Failed to execute workflow: ${workflowId}. Please ensure the workflow is active and has a valid version.`;
                }
                
                let result = `**Workflow Execution Started:**\n\n`;
                result += `• **Workflow:** ${workflowData.name || workflowId}\n`;
                result += `• **Trigger Type:** ${trigger.type}\n`;
                result += `• **Execution ID:** ${data.id || 'unknown'}\n`;
                result += `• **Workflow ID:** ${workflowId}\n`;
                result += `• **Status:** ${data.status || 'running'}\n`;
                if (data.startedAt) {
                    result += `• **Started:** ${new Date(data.startedAt).toLocaleString()}\n`;
                }
                if (data.finishedAt) {
                    result += `• **Finished:** ${new Date(data.finishedAt).toLocaleString()}\n`;
                }
                
                return result;
            } catch (fallbackError) {
                return `Error executing workflow ${workflowId}: ${error.response?.data?.message || error.message || 'Unknown error occurred'}. Fallback also failed: ${fallbackError.response?.data?.message || fallbackError.message}`;
            }
        }
    }

    // Unknown trigger type
    return `Error: Workflow "${workflowData.name || workflowId}" has an unsupported trigger type (${trigger.type}). Supported triggers: webhook, form, schedule, chat, manual.`;
}

module.exports = {
    // Core functions (needed for allowed tools)
    makeN8nRequest,
    getN8nConfig,

    // Only the allowed workflow functions from llm.js
    listN8nWorkflows,
    getN8nWorkflow,
    createN8nWorkflow,
    updateN8nWorkflow,
    executeN8nWorkflow
};