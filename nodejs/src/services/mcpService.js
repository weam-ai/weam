const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { MultiServerMCPClient } = require('@langchain/mcp-adapters');
const { webSearchTool, currentTimeTool, imageGenerationTool } = require('./langgraph');




// Initialize MCP client
let mcpClient = null;
let mcpTools = [];

// Convert Zod schema to JSON Schema for OpenAI function calling
function convertZodToJsonSchema(zodSchema, toolName) {
    try {
        // For Zod schemas, we can use the built-in JSON schema generation
        // or manually convert based on the schema type
        
        const jsonSchema = {
            type: 'object',
            properties: {},
            required: []
        };
        
        // Handle different Zod schema types
        if (zodSchema._def) {
            const def = zodSchema._def;
            
            if (def.typeName === 'ZodObject') {
                // Handle ZodObject - extract shape properties
                const shape = def.shape();
                
                for (const [key, fieldSchema] of Object.entries(shape)) {
                    const property = convertZodFieldToJsonSchema(fieldSchema, key, toolName);
                    jsonSchema.properties[key] = property;
                    
                    // Check if field is required (not optional)
                    if (!fieldSchema.isOptional()) {
                        jsonSchema.required.push(key);
                    }
                }
            } else {
                // Handle non-object schemas by creating a single input property
                jsonSchema.properties.input = convertZodFieldToJsonSchema(zodSchema, 'input', toolName);
                jsonSchema.required.push('input');
            }
        }
        
        // Ensure we have at least one property to avoid OpenAI "missing properties" error
        if (Object.keys(jsonSchema.properties).length === 0) {
            console.warn(`Tool ${toolName} has no properties, adding default parameter`);
            jsonSchema.properties.input = {
                type: 'string',
                description: `Input parameter for ${toolName}`,
                default: ''
            };
        }
        
        // console.log(`✅ [SCHEMA] Converted Zod to JSON Schema for ${toolName}:`, JSON.stringify(jsonSchema, null, 2));
        return jsonSchema;
        
    } catch (error) {
        console.error(`❌ [SCHEMA] Error converting Zod to JSON Schema for ${toolName}:`, error);
        // Fallback JSON Schema
        return {
            type: 'object',
            properties: {
                input: {
                    type: 'string',
                    description: `Input parameter for ${toolName} (fallback schema)`,
                    default: ''
                }
            },
            required: []
        };
    }
}

// Helper function to convert individual Zod fields to JSON Schema properties
function convertZodFieldToJsonSchema(zodField, fieldName, toolName) {
    const property = {
        description: zodField.description || `Parameter ${fieldName} for ${toolName}`
    };
    
    if (zodField._def) {
        const def = zodField._def;
        
        switch (def.typeName) {
            case 'ZodString':
                property.type = 'string';
                break;
            case 'ZodNumber':
                property.type = 'number';
                break;
            case 'ZodBoolean':
                property.type = 'boolean';
                break;
            case 'ZodArray':
                property.type = 'array';
                if (def.type) {
                    property.items = convertZodFieldToJsonSchema(def.type, 'item', toolName);
                } else {
                    property.items = { type: 'string' };
                }
                break;
            case 'ZodObject':
                property.type = 'object';
                break;
            case 'ZodOptional':
                // Handle optional fields by extracting the inner type
                return convertZodFieldToJsonSchema(def.innerType, fieldName, toolName);
            case 'ZodAny':
            case 'ZodUnknown':
                property.type = 'string'; // Default to string for any/unknown types
                break;
            default:
                property.type = 'string';
        }
    } else {
        property.type = 'string';
    }
    
    return property;
}


// Tool catalog with metadata for classification and scoring
const TOOL_CATALOG = {
    // Communication & Collaboration
    'slack': {
        domain: 'communication',
        keywords: ['slack', 'message', 'channel', 'chat', 'team', 'workspace', 'notification'],
        tools: ['list_slack_channels', 'send_slack_message', 'get_channel_id_by_name', 'get_channel_messages', 
               'list_workspace_users', 'get_slack_user_info', 'get_user_profile', 'get_channel_members',
               'create_slack_channel', 'set_channel_topic', 'set_channel_purpose', 'archive_channel',
               'invite_users_to_channel', 'kick_user_from_channel', 'open_direct_message', 'send_direct_message',
               'send_ephemeral_message', 'reply_to_thread', 'get_thread_messages', 'start_thread_with_message',
               'find_threads_in_channel', 'reply_to_thread_with_broadcast', 'get_thread_info']
    },
    // Development & Code Management
    'github': {
        domain: 'development',
        keywords: ['github', 'git', 'repository', 'code', 'branch', 'commit', 'pull request', 'issue', 'development'],
        tools: ['get_github_repositories', 'create_github_branch', 'get_git_commits', 'get_github_user_info',
               'get_github_repository_info', 'get_repository_branches', 'get_repository_issues',
               'create_pull_request', 'get_pull_request_details', 'get_pull_requests', 'get_tags_or_branches']
    },
    'jira': {
        domain: 'project_management',
        keywords: ['jira', 'issue', 'project', 'task', 'bug', 'story', 'ticket', 'workflow', 'sprint', 'board'],
        tools: ['get_jira_projects', 'get_jira_issues', 'create_jira_issue', 'update_jira_issue',
               'get_jira_issue', 'add_jira_comment', 'assign_jira_issue', 'transition_jira_issue',
               'get_jira_transitions', 'search_jira_issues']
    },
    // Project Management
    'asana': {
        domain: 'project_management',
        keywords: ['asana', 'project', 'task', 'assignment', 'team', 'workflow', 'management'],
        tools: ['create_asana_project', 'list_asana_projects', 'get_asana_project', 'update_asana_project',
               'create_asana_task', 'list_asana_tasks', 'get_asana_task', 'update_asana_task',
               'complete_asana_task', 'list_asana_sections', 'add_task_to_asana_section',
               'get_asana_user_info', 'get_asana_workspace_id', 'create_asana_team', 'list_asana_team_ids', 'get_asana_team']
    },
    // Database & Data Management
    'mongodb': {
        domain: 'database',
        keywords: ['mongodb', 'database', 'collection', 'document', 'query', 'data', 'storage'],
        tools: ['connect_to_mongodb', 'find_documents', 'aggregate_documents', 'count_documents',
               'insert_one_document', 'insert_many_documents', 'update_one_document', 'update_many_documents',
               'delete_one_document', 'delete_many_documents', 'list_databases', 'list_collections',
               'create_index', 'collection_indexes', 'drop_collection', 'db_stats']
    },
    // Payments & Finance
    'stripe': {
        domain: 'finance',
        keywords: ['stripe', 'payment', 'billing', 'invoice', 'subscription', 'customer', 'charge', 'refund'],
        tools: ['get_stripe_account_info', 'retrieve_balance', 'create_coupon', 'list_coupons',
               'create_customer', 'list_customers', 'list_disputes', 'update_dispute',
               'create_invoice', 'create_invoice_item', 'finalize_invoice', 'list_invoices',
               'create_payment_link', 'list_payment_intents', 'create_price', 'list_prices',
               'create_product', 'list_products', 'create_refund', 'cancel_subscription',
               'list_subscriptions', 'update_subscription', 'search_documentation',
               'create_payment_intent', 'retrieve_payment_intent', 'confirm_payment_intent',
               'cancel_payment_intent', 'retrieve_charge', 'list_charges', 'capture_charge',
               'create_payment_method', 'attach_payment_method', 'detach_payment_method',
               'list_payment_methods', 'retrieve_payment_method', 'list_events', 'retrieve_event']
    },
    // Video Conferencing
    'zoom': {
        domain: 'communication',
        keywords: ['zoom', 'meeting', 'video', 'conference', 'call', 'schedule', 'invite', 'invitation', 'add people', 'add participants'],
        tools: ['get_zoom_user_info', 'list_zoom_meetings', 'create_zoom_meeting',
               'get_zoom_meeting_info', 'update_zoom_meeting', 'delete_zoom_meeting',
               'generate_zoom_meeting_invitation', 'invite_to_zoom_meeting']
    },
    // Email Management
    'gmail': {
        domain: 'communication',
        keywords: ['gmail', 'email', 'message', 'thread', 'label', 'draft', 'send'],
        tools: ['search_gmail_messages', 'get_gmail_message_content', 'get_gmail_messages_content_batch',
               'send_gmail_message', 'draft_gmail_message', 'get_gmail_thread_content',
               'get_gmail_threads_content_batch', 'list_gmail_labels', 'manage_gmail_label',
               'modify_gmail_message_labels', 'batch_modify_gmail_message_labels']
    },
    // Google Drive
    'drive': {
        domain: 'storage',
        keywords: ['drive', 'google drive', 'file', 'folder', 'document', 'storage', 'upload', 'download', 'share'],
        tools: ['search_drive_files', 'get_drive_file_content', 'list_drive_items',
               'create_drive_file', 'list_drive_shared_drives', 'delete_drive_file']
    },
    // Google Calendar
    'calendar': {
        domain: 'scheduling',
        keywords: ['calendar', 'google calendar', 'event', 'meeting', 'appointment', 'schedule', 'time'],
        tools: ['list_calendars', 'get_calendar_events', 'create_calendar_event',
               'modify_calendar_event', 'delete_calendar_event', 'get_calendar_event', 'search_calendar_events']
    },
    // Search & Information
    'search': {
        domain: 'information',
        keywords: ['search', 'web', 'internet', 'find', 'lookup', 'information', 'browse'],
        tools: ['web_search', 'global_search']
    },
    // Image Generation
    'image': {
        domain: 'creative',
        keywords: ['image', 'generate', 'create', 'picture', 'visual', 'art', 'design'],
        tools: ['dall_e_3']
    },
    // Time & Date
    'time': {
        domain: 'utility',
        keywords: ['time', 'date', 'current', 'now', 'today', 'datetime', 'timestamp'],
        tools: ['get_current_time']
    }
};



// Enhanced tool selection with domain-specific filtering for MCP queries
async function selectRelevantTools(query, availableTools, maxTools = 30) {
    console.log('Starting enhanced tool selection for query:', query);
    const queryLower = query.toLowerCase();
    
    // Step 1: Detect if this is a domain-specific query
    const domainDetection = detectSpecificDomain(query);
    console.log('Domain detection result:', domainDetection);
    
    // Step 2: Handle domain-specific queries (Zoom, Slack, etc.)
    if (domainDetection.isSpecificDomain) {
        return handleDomainSpecificQuery(query, availableTools, domainDetection, maxTools);
    }
    
    // Step 3: Handle general queries with mixed tool selection
    return handleGeneralQuery(query, availableTools, maxTools);
}

// Detect if query is asking for a specific MCP domain
function detectSpecificDomain(query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Define strong domain indicators
    const domainIndicators = {
        'zoom': {
            strongKeywords: ['zoom', 'zoom meeting', 'video call', 'video conference'],
            contextKeywords: ['meeting', 'schedule', 'create meeting', 'join meeting'],
            domain: 'communication',
            catalog: 'zoom'
        },
        'slack': {
            strongKeywords: ['slack', 'slack channel', 'slack message'],
            contextKeywords: ['channel', 'message', 'workspace', 'team chat'],
            domain: 'communication', 
            catalog: 'slack'
        },
        'gmail': {
            strongKeywords: ['gmail', 'email', 'send email'],
            contextKeywords: ['message', 'draft', 'thread', 'label'],
            domain: 'communication',
            catalog: 'gmail'
        },
        'drive': {
            strongKeywords: ['google drive', 'drive', 'file storage'],
            contextKeywords: ['file', 'folder', 'document', 'upload', 'download'],
            domain: 'storage',
            catalog: 'drive'
        },
        'calendar': {
            strongKeywords: ['google calendar', 'calendar', 'schedule event'],
            contextKeywords: ['event', 'appointment', 'meeting', 'schedule'],
            domain: 'scheduling',
            catalog: 'calendar'
        },
        'asana': {
            strongKeywords: ['asana', 'asana project', 'asana task'],
            contextKeywords: ['project', 'task', 'assignment', 'team'],
            domain: 'project_management',
            catalog: 'asana'
        },
        'github': {
            strongKeywords: ['github', 'git', 'repository'],
            contextKeywords: ['code', 'branch', 'commit', 'pull request'],
            domain: 'development',
            catalog: 'github'
        },
        'stripe': {
            strongKeywords: ['stripe', 'payment', 'billing'],
            contextKeywords: ['invoice', 'subscription', 'customer', 'charge'],
            domain: 'finance',
            catalog: 'stripe'
        }
    };
    
    // Check for strong domain matches
    for (const [domainName, config] of Object.entries(domainIndicators)) {
        // Check for strong keywords (definitive indicators)
        const hasStrongKeyword = config.strongKeywords.some(keyword => 
            queryLower.includes(keyword.toLowerCase())
        );
        
        if (hasStrongKeyword) {
            // Check for context keywords to confirm intent
            const hasContext = config.contextKeywords.some(keyword =>
                queryLower.includes(keyword.toLowerCase())
            ) || config.strongKeywords.length > 1; // Multiple strong keywords = confirmed
            
            if (hasContext || hasStrongKeyword) {
                return {
                    isSpecificDomain: true,
                    domainName: domainName,
                    catalogKey: config.catalog,
                    confidence: hasStrongKeyword && hasContext ? 'high' : 'medium'
                };
            }
        }
    }
    
    return { isSpecificDomain: false };
}

// Handle domain-specific queries - only return tools for that domain
async function handleDomainSpecificQuery(query, availableTools, domainDetection, maxTools = 12) {
    const { domainName, catalogKey, confidence } = domainDetection;
    const queryLower = query.toLowerCase();
    console.log(`Handling ${domainName} specific query with ${confidence} confidence`);
    
    const catalogData = TOOL_CATALOG[catalogKey];
    if (!catalogData) {
        console.warn(`No catalog data found for domain: ${catalogKey}`);
        return handleGeneralQuery(query, availableTools, maxTools);
    }
    
    // Filter available tools to only include domain-specific tools
    const domainTools = availableTools.filter(tool => 
        tool && tool.name && catalogData.tools.includes(tool.name)
    );
    
    console.log(`Found ${domainTools.length} ${domainName} tools:`, domainTools.map(t => t && t.name ? t.name : 'undefined_tool'));
    
    // For high-confidence domain-specific queries, ONLY return domain tools (no core tools)
    if (confidence === 'high' && domainTools.length > 0) {
        // Score and rank the domain tools
        const toolScores = new Map();
        
        for (const tool of domainTools) {
            let score = 1; // Base score for being in the domain
            
            // Boost score based on tool name relevance
            const toolNameLower = tool.name ? tool.name.toLowerCase() : '';
            for (const keyword of catalogData.keywords) {
                if (toolNameLower.includes(keyword.toLowerCase()) || 
                    queryLower.includes(keyword.toLowerCase())) {
                    score += 2;
                }
            }
            
            // Boost based on description relevance
            if (tool.description) {
                const descLower = tool.description.toLowerCase();
                for (const keyword of catalogData.keywords) {
                    if (descLower.includes(keyword.toLowerCase())) {
                        score += 1;
                    }
                }
            }
            
            toolScores.set(tool.name || 'undefined_tool', score);
        }
        
        // Sort by score and return top tools
        const sortedDomainTools = domainTools
            .sort((a, b) => (toolScores.get(b.name || 'undefined_tool') || 0) - (toolScores.get(a.name || 'undefined_tool') || 0))
            .slice(0, Math.min(maxTools, domainTools.length));
        
        console.log(`Returning ${sortedDomainTools.length} ${domainName}-specific tools only`);
        return sortedDomainTools;
    }
    
    // For medium confidence, include some core tools but prioritize domain tools
    const selectedTools = [];
    
    // Add domain tools first (prioritized)
    const maxDomainTools = Math.min(maxTools - 2, domainTools.length); // Reserve 2 slots for core
    selectedTools.push(...domainTools.slice(0, maxDomainTools));
    
    // Add essential core tools if we have remaining slots
    const remainingSlots = maxTools - selectedTools.length;
    if (remainingSlots > 0) {
        // Only add most relevant core tools
        if (queryLower.includes('search') || queryLower.includes('find')) {
            selectedTools.push(webSearchTool);
        }
        if (queryLower.includes('time') || queryLower.includes('date')) {
            selectedTools.push(currentTimeTool);
        }
    }
    
    console.log(`Returning ${selectedTools.length} tools for ${domainName} query (mixed mode)`);
    return selectedTools;
}

// Handle general queries with the original mixed tool selection logic
async function handleGeneralQuery(query, availableTools, maxTools = 12) {
    console.log('Handling general query with mixed tool selection');
    
    // Always include core tools for general queries
    const coreTools = [webSearchTool, imageGenerationTool, currentTimeTool];
    const selectedTools = [...coreTools];
    const remainingSlots = maxTools - coreTools.length;
    
    if (remainingSlots <= 0 || !availableTools.length) {
        return selectedTools;
    }
    
    // Use the original scoring logic for general queries
    const toolScores = new Map();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Score tools based on keyword matching
    for (const [catalogKey, catalogData] of Object.entries(TOOL_CATALOG)) {
        let keywordScore = 0;
        
        // Check for exact keyword matches
        for (const keyword of catalogData.keywords) {
            if (queryLower.includes(keyword.toLowerCase())) {
                keywordScore += 2; // Higher weight for exact matches
            }
        }
        
        // Check for partial word matches
        for (const word of queryWords) {
            for (const keyword of catalogData.keywords) {
                if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
                    keywordScore += 1;
                }
            }
        }
        
        // Find matching tools from available MCP tools
        const matchingTools = availableTools.filter(tool => 
            tool && tool.name && catalogData.tools.includes(tool.name)
        );
        
        for (const tool of matchingTools) {
            const currentScore = toolScores.get(tool.name) || 0;
            toolScores.set(tool.name, currentScore + keywordScore);
        }
    }
    
    // Sort tools by score and select top K
    const sortedTools = Array.from(toolScores.entries())
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .slice(0, remainingSlots)
        .map(([toolName]) => toolName);
    
    // Add selected MCP tools to the result
    const selectedMcpTools = availableTools.filter(tool => 
        tool && tool.name && sortedTools.includes(tool.name)
    );
    
    selectedTools.push(...selectedMcpTools);
    
    console.log(`Returning ${selectedTools.length} tools for general query`);
    return selectedTools;
}



// Classification function to detect query intent and domains
function classifyQuery(query) {
    const queryLower = query.toLowerCase();
    const detectedDomains = new Set();
    
    for (const [catalogKey, catalogData] of Object.entries(TOOL_CATALOG)) {
        for (const keyword of catalogData.keywords) {
            if (queryLower.includes(keyword.toLowerCase())) {
                detectedDomains.add(catalogData.domain);
                break;
            }
        }
    }
    
    return {
        domains: Array.from(detectedDomains),
        intent: detectedDomains.size > 0 ? 'specific' : 'general'
    };
}

async function initializeMCPClient() {
    try {
        console.log('🔧 [MCP] Initializing MCP client...');
        const { MCP_HTTP_CONFIG } = require('../utils/http-client');

        mcpClient = new MultiServerMCPClient({
            mcpServers: {
                "weam-mcp": {
                    url: process.env.MCP_SERVER_URL ? `${process.env.MCP_SERVER_URL}/mcp-event` : "http://localhost:3006/mcp-event",
                    transport: "sse",
                    timeout: MCP_HTTP_CONFIG.timeout, // Use centralized timeout (90 seconds)
                    retryAttempts: MCP_HTTP_CONFIG.maxRetries,
                    retryDelay: MCP_HTTP_CONFIG.baseRetryDelay,
                    keepAlive: MCP_HTTP_CONFIG.keepAlive,
                    maxConnections: 100, // Increased from 10 to 20 for better connection pooling
                    connectionReuse: true, // Enable connection reuse
                    reconnectOnFailure: true, // Auto-reconnect on connection failure
                    heartbeatInterval: 30000 // 30 second heartbeat to keep connections alive
                }
            },
            globalTimeout: MCP_HTTP_CONFIG.timeout, // Use centralized global timeout
            connectionPooling: true,
            maxRetries: MCP_HTTP_CONFIG.maxRetries,
            // Enhanced connection pooling settings
            poolSettings: {
                maxConnections: 100,
                maxIdleConnections: 50,
                connectionTimeout: MCP_HTTP_CONFIG.timeout,
                keepAlive: true,
                reuseConnections: true
            }
        });

        console.log('🔧 [MCP] MCP client created, attempting to get tools...');
        
        // Retry logic for getting MCP tools
        let mcpToolsFromServer = [];
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                mcpToolsFromServer = await Promise.race([
                    mcpClient.getTools(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('MCP getTools timeout')), MCP_HTTP_CONFIG.timeout)
                    )
                ]);
                console.log(`🔧 [MCP] Retrieved ${mcpToolsFromServer ? mcpToolsFromServer.length : 0} tools from server`);
                break; // Success, exit retry loop
            } catch (error) {
                retryCount++;
                console.warn(`🚨 [MCP] getTools attempt ${retryCount} failed:`, error.message);
                
                if (retryCount >= maxRetries) {
                    console.error('Failed to get MCP tools after maximum retries');
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            }
        }

        // Convert MCP tools to LangChain tools
        mcpTools = mcpToolsFromServer.map(mcpTool => {
            // Create a simple Zod schema - handle cases where schema might be null/undefined
            let zodSchema;
            
            try {
                if (mcpTool.schema && mcpTool.schema.properties) {
                    const properties = mcpTool.schema.properties;
                    const required = mcpTool.schema.required || [];
                    
                    // Building schema for tool
                    
                    // Build Zod schema dynamically with proper error handling
                    const schemaFields = {};
                    for (const [key, prop] of Object.entries(properties)) {
                        let zodType;
                        
                        // Handle different data types based on the property type
                        switch (prop?.type) {
                            case 'string':
                                zodType = z.string();
                                break;
                            case 'integer':
                            case 'number':
                                zodType = z.number();
                                break;
                            case 'boolean':
                                zodType = z.boolean();
                                break;
                            case 'array':
                                // Handle array items properly for OpenAI function calling
                                if (prop.items && prop.items.type === 'string') {
                                    zodType = z.array(z.string());
                                } else if (prop.items && prop.items.type === 'number') {
                                    zodType = z.array(z.number());
                                } else if (prop.items && prop.items.type === 'boolean') {
                                    zodType = z.array(z.boolean());
                                } else {
                                    zodType = z.array(z.string()); // Default to string array
                                }
                                break;
                            case 'object':
                                zodType = z.record(z.any());
                                break;
                            default:
                                console.warn(`Unknown property type '${prop?.type}' for ${mcpTool.name}.${key}, defaulting to string`);
                                zodType = z.string();
                        }
                        
                        if (prop?.description) {
                            zodType = zodType.describe(prop.description);
                        }
                        
                        if (!required.includes(key)) {
                            zodType = zodType.optional();
                        }
                        
                        schemaFields[key] = zodType;
                    }
                    
                    // Ensure the schema has at least one property to avoid "missing properties" error
                    if (Object.keys(schemaFields).length === 0) {
                        console.warn(`Tool ${mcpTool.name} has no properties, adding default mcp_data parameter`);
                        schemaFields.mcp_data = z.any().optional().describe('Optional MCP data parameter');
                    }
                    
                    zodSchema = z.object(schemaFields);
                    // console.log(`Successfully built schema for tool: ${mcpTool.name}`);
                } else {
                    console.warn(`Tool ${mcpTool.name} has no schema, using fallback schema`);
                    // Fallback schema with at least one property to satisfy OpenAI's requirements
                    zodSchema = z.object({
                        mcp_data: z.any().optional().describe('Optional MCP data parameter')
                    });
                }
            } catch (error) {
                console.error(`Error building schema for tool ${mcpTool.name}:`, error);
                // Use fallback schema on error
                zodSchema = z.object({
                    mcp_data: z.any().optional().describe('Optional MCP data parameter'),
                    error_fallback: z.string().optional().describe('Fallback parameter due to schema error')
                });
            }
            
            // Convert Zod schema to JSON Schema for OpenAI function calling
            const jsonSchema = convertZodToJsonSchema(zodSchema, mcpTool.name);
            
            // Schema conversion completed
            
            return tool(
                async (input) => {
                    // Add timeout and retry logic at the MCP tool invoke level with improved error handling
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => {
                            const timeoutError = new Error(`MCP tool '${mcpTool.name || 'unknown'}' timed out after ${MCP_HTTP_CONFIG.timeout / 1000} seconds. This may be due to network issues or API delays.`);
                            timeoutError.code = 'MCP_TIMEOUT';
                            timeoutError.toolName = mcpTool.name;
                            reject(timeoutError);
                        }, MCP_HTTP_CONFIG.timeout);
                    });
                    
                    let lastError;
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            const toolPromise = mcpTool.invoke(input).catch(error => {
                                // Enhanced error handling for specific error types
                                if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
                                    const enhancedError = new Error(`Google API timeout: ${mcpTool.name} operation took too long. Please try again.`);
                                    enhancedError.code = 'GOOGLE_API_TIMEOUT';
                                    enhancedError.originalError = error;
                                    throw enhancedError;
                                }
                                throw error;
                            });
                            
                            const result = await Promise.race([
                                toolPromise,
                                timeoutPromise
                            ]);
                            return result;
                        } catch (error) {
                            lastError = error;
                            console.warn(`MCP tool '${mcpTool.name || 'unknown'}' attempt ${attempt} failed:`, error.message);
                            
                            // Enhanced error handling with specific error types
                            if (error.code === 'MCP_TIMEOUT') {
                                // Don't retry timeout errors, return immediately with helpful message
                                return `The ${mcpTool.name} operation timed out. This is often due to Google API delays or network issues. Please wait a moment and try again.`;
                            }
                            
                            if (error.code === 'GOOGLE_API_TIMEOUT') {
                                return error.message;
                            }
                            
                            // For authentication errors, don't retry
                            if (error.message?.includes('Authentication required') || 
                                error.message?.includes('re-authenticate') ||
                                error.message?.includes('Invalid Credentials')) {
                                return `Authentication error: ${error.message}`;
                            }
                            
                            if (attempt < 3) {
                                // Wait before retrying with exponential backoff
                                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
                            }
                        }
                    }
                    
                    // If all retries failed, return a descriptive error message instead of throwing
                    const errorMessage = `MCP tool '${mcpTool.name || 'unknown'}' failed after 3 attempts. Last error: ${lastError.message}`;
                    console.error(errorMessage);
                    return errorMessage;
                },
                {
                    name: mcpTool.name || 'unknown_tool',
                    description: mcpTool.description || '',
                    schema: jsonSchema,
                }
            );
        });

        console.log(`✅ [MCP] ${mcpTools.length} tools initialized:`, mcpTools.map(t => t && t.name ? t.name : 'undefined_tool'));
    } catch (error) {
        console.error('🚨 [MCP] Failed to initialize MCP tools:', error.message);
        console.error('🚨 [MCP] Error details:', {
            name: error.name,
            serverName: error.serverName,
            stack: error.stack
        });
        mcpTools = []; // Fallback to empty array if MCP fails
        mcpClient = null;
        console.log('⚠️ [MCP] Continuing without MCP tools - only web search and image generation will be available');
    }
    
    return mcpTools;
}




// Tool filtering mechanism based on query classification
async function filterToolsByDomain(query, availableTools, domains) {

    // console.log('=======filterToolsByDomain=====available tools======', availableTools);
    
    if (!domains || domains.length === 0) {
        return availableTools;
    }
    
    // Filter tools based on detected domains
    const filteredTools = availableTools.filter(tool => {
        // Check if tool is valid before accessing properties
        if (!tool || !tool.name) {
            console.warn('Invalid tool found in availableTools:', tool);
            return false;
        }
        
        // console.log('=======filterToolsByDomain=====tool======', tool.name);
        // Check if tool belongs to any of the detected domains
        for (const domain of domains) {
            // Find catalog entries that match this domain
            for (const [catalogKey, catalogData] of Object.entries(TOOL_CATALOG)) {
                if (catalogData.domain === domain && tool.name && catalogData.tools && catalogData.tools.includes(tool.name)) {
                    return true;
                }
            }
        }
        return false;
    });
    
    // Always include essential tools (web search, image generation)
    const essentialTools = availableTools.filter(tool => 
        tool && tool.name && ['web_search', 'dall_e_3'].includes(tool.name)
    );
    
    const result = [...new Set([...essentialTools, ...filteredTools])];
    // console.log('=======filterToolsByDomain=====filteredTools======', result.map(t => t && t.name ? t.name : 'undefined_tool'));
    
    return result;
}

// Enhanced tool selection with domain filtering
async function selectRelevantToolsWithDomainFilter(query, availableMcpTools) {
    // First classify the query to detect domains
    const classification = await classifyQuery(query);
    
    // Filter tools by detected domains
    const allTools = [webSearchTool, imageGenerationTool, ...availableMcpTools];
    const domainFilteredTools = await filterToolsByDomain(query, allTools, classification.domains);
    
    // Then apply semantic/keyword selection on the filtered set
    return await selectRelevantTools(query, domainFilteredTools.filter(t => t && t.name && !['web_search', 'dall_e_3'].includes(t.name)));
}





module.exports = { initializeMCPClient, selectRelevantToolsWithDomainFilter };