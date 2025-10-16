const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, END } = require('@langchain/langgraph');
const { ToolMessage, HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { langGraphEventName, llmStreamingEvents, toolCallOptions, toolDescription, IS_MCP_TOOLS } = require('../config/constants/llm');
const { SOCKET_EVENTS, SOCKET_ROOM_PREFIX } = require('../config/constants/socket');
const Messages = require('../models/thread');
const Brain = require('../models/brains');
const { decryptedData, catchSocketAsync } = require('../utils/helper');
const { LINK } = require('../config/config');
const { AI_MODAL_PROVIDER, MODAL_NAME , ANTHROPIC_MAX_TOKENS, PERPLEXITY_MODAL } = require('../config/constants/aimodal');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { SearxNGSearchTool } = require('./searchTool');
const { createLLMConversation } = require('./thread');
const { getConversationHistory } = require('./memoryService');
// Commented out qdrant imports - using pinecone instead
// const { getFilesListFromCollection, searchWithinFileByName, searchWithinFileByFileId } = require('./qdrant');
const { getFilesListFromIndex, searchWithinFileByName, searchWithinFileByFileId } = require('./pinecone');
const CustomGpt = require('../models/customgpt');
const ChatDocs = require('../models/chatdocs');
const { createCostCallback } = require('./callbacks/contextManager');
const logger = require('../utils/logger');
// const { deductUserMsgCredit } = require('./user');
const { tool } = require('@langchain/core/tools');
const Chat = require('../models/chat');
const ChatMember = require('../models/chatmember');
const { perplexityRawStream } = require('./perplexityRaw')

const webSearchTool = new SearxNGSearchTool({
    searxUrl: LINK.SEARXNG_API_URL,
    maxResults: 10,
});

// set web search tool description
webSearchTool.description = toolDescription.WEB_SEARCH_TOOL;

/**
 * Get model-specific max_tokens for Anthropic models
 * @param {string} modelName - The name of the Anthropic model
 * @returns {number} The max_tokens value for the model
 */
function getAnthropicMaxTokens(modelName) {
    // Look up model-specific max_tokens
    const modelMaxTokens = ANTHROPIC_MAX_TOKENS[modelName];
    if (modelMaxTokens) {
        return modelMaxTokens;
    }

    // Fallback to default
    return ANTHROPIC_MAX_TOKENS['default'];
}
// Import the custom DALL-E tool
const { createDallEImageTool } = require('./imageTool');
const { initializeMCPClient, selectRelevantToolsWithDomainFilter } = require('./mcpService');
const { z } = require('zod');
// Import the custom Gemini image tool
const { createGeminiImageTool } = require('./geminiImageTool');

// Create the DALL-E image generation tool with default API key
const imageGenerationTool = createDallEImageTool();
// Create the Gemini image generation tool with default API key
const geminiImageTool = createGeminiImageTool();

// Current time tool
const currentTimeTool = tool(
    async () => {
        return new Date().toISOString();
    },
    {
        name: 'get_current_time',
        description: 'Get the current date and time in ISO format',
        schema: z.object({}),
    }
);


// Vision support configuration
const MODEL_CONFIGS = {
    [AI_MODAL_PROVIDER.OPEN_AI]: {
        supportsVision: true,
        imageFormats: ['url'],
        formatImage: (imageUrl) => ({
            type: 'image_url',
            image_url: {
                url: imageUrl
            }
        })
    },
    [AI_MODAL_PROVIDER.ANTHROPIC]: {
        supportsVision: true,
        imageFormats: ['base64'],
        formatImage: async (imageUrl) => {
            const result= await convertImageToBase64(imageUrl);
            if (!result) {
                return null;
            }
            return {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: result.mimeType,
                    data: result.base64
                }
            };
        }
    },
    [AI_MODAL_PROVIDER.GEMINI]: {
        supportsVision: true,
        imageFormats: ['base64'],
        formatImage: async (imageUrl) => {
            const result= await convertImageToBase64(imageUrl);
            if (!result) {
                return null;
            }
            return {
                type: 'image_url',
                image_url: {
                    url: `data:${result.mimeType};base64,${result.base64}`
                }
            };
        }
    },
    [AI_MODAL_PROVIDER.DEEPSEEK]: {
        supportsVision: false,
        imageFormats: []
    },
    [AI_MODAL_PROVIDER.LLAMA4]: {
        supportsVision: true,
        imageFormats: ['url'],
        formatImage: (imageUrl) => ({
            type: 'image_url',
            image_url: {
                url: imageUrl
            }
        })
    },
     [AI_MODAL_PROVIDER.GROK]: {
        supportsVision: false,
        imageFormats: []
    },
    [AI_MODAL_PROVIDER.QWEN]: {
        supportsVision: false,
        imageFormats: []
    }
};

// Helper function to convert image URL to base64 (for Anthropic)
async function convertImageToBase64(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return {
            base64,
            mimeType
        };
    } catch (error) {
        logger.error('Error converting image to base64:', error);
        throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
}

// Helper function to format images based on model type
async function formatImagesForModel(imageUrls, provider) {
    if (!imageUrls || imageUrls.length === 0) return [];
    
    const config = MODEL_CONFIGS[provider];
    if (!config || !config.supportsVision || !config.formatImage) {
        logger.warn(`Model provider ${provider} does not support vision`);
        return [];
    }
    
    const formattedImages = [];
    
    for (const imageUrl of imageUrls) {
        try {
            const formattedImage = await config.formatImage(imageUrl);
            formattedImages.push(formattedImage);
        } catch (error) {
            logger.error(`Error formatting image ${imageUrl}:`, error);
            // Continue with other images even if one fails
        }
    }
    
    return formattedImages;
}

// Helper function to check if vision is enabled
function shouldEnableVision(data) {
    return data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0;
}

// Helper function to create vision message
async function createVisionMessage(query, imageUrls, provider) {
    if (!shouldEnableVision({ imageUrls })) {
        return [['user', query]];
    }
    
    try {
        const formattedImages = await formatImagesForModel(imageUrls, provider);
        
        if (formattedImages.length === 0) {
            logger.warn('No images could be formatted for vision, falling back to text-only');
            return [['user', query]];
        }
        
        // Create HumanMessage with text and images
        const content = [
            { type: 'text', text: query },
            ...formattedImages
        ];
        
        return [new HumanMessage({ content })];
    } catch (error) {
        logger.error('Error creating vision message:', error);
        // Fallback to text-only message
        return [['user', query]];
    }
}

const graphState = {
    messages: {
        value: (x, y) => x.concat(y),
        default: () => [],
    },
}

// Global cache for MCP client and simple models
let mcpClientCache = null;
let mcpCacheTimestamp = 0;
const MCP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let simpleModelCache = new Map();

// Dynamic query classification - Let LangGraph decide which tools to use
function queryNeedsTools(query) {
    // Always return true to allow LangGraph to make dynamic tool decisions
    // This ensures all tools (including web search) are available for the model to choose from
    if (!query || typeof query !== 'string') {
        return false;
    }
    return true;
}

// Cached MCP client initialization
async function getCachedMCPClient() {
    const now = Date.now();
    
    // Return cached client if still valid
    if (mcpClientCache && (now - mcpCacheTimestamp) < MCP_CACHE_TTL) {
        return mcpClientCache;
    }
    
    // Initialize new client and cache it
    mcpClientCache = await initializeMCPClient();
    mcpCacheTimestamp = now;
    
    return mcpClientCache;
}

// Enhanced tool executor map with agent-specific tools
function getToolExecutorMap(agentDetails = null, mcpTools = []) {
    const baseTools = {
        [webSearchTool.name]: webSearchTool,
        [imageGenerationTool.name]: imageGenerationTool,
        [geminiImageTool.name]: geminiImageTool,
        [currentTimeTool.name]: currentTimeTool,
        ...Object.fromEntries(mcpTools.map(tool => [tool.name, tool]))
    };
    
    // Add agent-specific tools if available
    if (agentDetails && agentDetails.tools && Array.isArray(agentDetails.tools)) {
        agentDetails.tools.forEach(tool => {
            if (tool.name && tool.executor) {
                baseTools[tool.name] = tool.executor;
            }
        });
    }
    
    return baseTools;
}

async function callModel(state, model, data, agentDetails = null) {
    const { messages } = state;
    const lastMessageIndex = messages[messages.length - 1];
    let context = [];
    
    // Fetch brain data and add SystemMessage with customInstruction if exists
    let brainData = null;
    if (data.brainId) {
        try {
            // Fetch the brain data using the brain ID from data
            brainData = await Brain.findById(data.brainId);
        } catch (error) {
            console.error('Error fetching brain data:', error);
        }
    }
    
    
    // Determine if we're using Gemini or Anthropic provider
    const isGeminiProvider = data.llmProvider === 'GEMINI' || (data.model && data.model.toLowerCase().includes('gemini'));
    const isAnthropicProvider = data.llmProvider === 'ANTHROPIC' || (data.model && data.model.toLowerCase().includes('claude'));

    if (Array.isArray(lastMessageIndex)) {
        // Use our new conversation history function (matches Python flow)
        const conversationHistory = await getConversationHistory(data.chatId);
        
        // Start with conversation history
        context = [...conversationHistory];

        // For Gemini and Anthropic: collect all system messages and consolidate them
        let consolidatedSystemContent = '';

        if (isGeminiProvider || isAnthropicProvider) {
            // Extract all system messages and remove them from context
            const systemMessages = context.filter(msg => msg.constructor.name === 'SystemMessage' || msg.type === 'system');
            context = context.filter(msg => msg.constructor.name !== 'SystemMessage' && msg.type !== 'system');
            
            // Consolidate system message content
            if (systemMessages.length > 0) {
                consolidatedSystemContent = systemMessages.map(msg => msg.content).join('\n\n');
            }
        }
        
        // Add agent's system message if available (this will override or supplement the DB system message)
        if (agentDetails) {
            let agentSystemContent = `${agentDetails.systemPrompt}\n`;
            
            // If RAG context is available, add it to the system message (like Python implementation)
            if (global.currentRagContext) {
                agentSystemContent += `\n\n----\nContext from uploaded documents:\n${global.currentRagContext}\n----\n\nUse the above document context when relevant to answer the user's question.`;
            }
            
            if (isGeminiProvider || isAnthropicProvider) {
                // For Gemini and Anthropic: consolidate with existing system content
                if (consolidatedSystemContent) {
                    consolidatedSystemContent = agentSystemContent + '\n\n' + consolidatedSystemContent;
                } else {
                    consolidatedSystemContent = agentSystemContent;
                }
            } else {
                // For other providers: use the original logic
                const agentSystemMessage = new SystemMessage({
                    content: agentSystemContent
                });
                
                // Replace the first system message or add at the beginning
                if (context.length > 0 && (context[0].constructor.name === 'SystemMessage' || context[0].type === 'system')) {
                    context[0] = agentSystemMessage;
                } else {
                    context.unshift(agentSystemMessage);
                }
            }
        } else if ((isGeminiProvider || isAnthropicProvider) && !consolidatedSystemContent) {
            // For Gemini and Anthropic without agent: still need to consolidate any existing system messages
            const systemMessages = context.filter(msg => msg.constructor.name === 'SystemMessage' || msg.type === 'system');
            if (systemMessages.length > 0) {
                context = context.filter(msg => msg.constructor.name !== 'SystemMessage' && msg.type !== 'system');
                consolidatedSystemContent = systemMessages.map(msg => msg.content).join('\n\n');
            }
        }

        // For Gemini and Anthropic: insert the consolidated system message at position 0
        if ((isGeminiProvider || isAnthropicProvider) && consolidatedSystemContent) {
            const finalSystemMessage = new SystemMessage({
                content: consolidatedSystemContent
            });
            context.unshift(finalSystemMessage);
        }
        
        // Add current messages (the new user query)
        const currentMessages = messages.map(msg => 
            Array.isArray(msg) ? new HumanMessage(msg[1]) : msg
        );
        context.push(...currentMessages);
        
        
    } else {
        // Fallback for non-array messages
        context = messages;
    }
    
    // Add SystemMessage with customInstruction if brain has customInstruction
    if (brainData && brainData.customInstruction && brainData.customInstruction.trim()) {
        if (isAnthropicProvider) {
            // For Anthropic: convert additional system prompt to human message to avoid multiple system prompts
            // Check if there's already a system message in context
            const hasSystemMessage = context.some(msg =>
                (msg.constructor && msg.constructor.name === 'SystemMessage') ||
                (Array.isArray(msg) && msg[0] === 'system') ||
                (msg.type === 'system')
            );

            if (hasSystemMessage) {
                // Convert customInstruction to human message format
                const customInstructionAsHuman = `Please note these additional instructions: ${brainData.customInstruction}`;
                context.push(['user', customInstructionAsHuman]);
            } else {
                // No existing system message, can add as system
                const systemMessage = new SystemMessage(brainData.customInstruction);
                context.unshift(['system', systemMessage.content]);
            }
        } else {
            // For other providers: use original logic
            const systemMessage = new SystemMessage(brainData.customInstruction);
            context.unshift(['system', systemMessage.content]);
        }
    }
    
    // Log the context being sent to LLM for debugging
    context.forEach((msg, idx) => {
        let content = '';
        try {
            if (typeof msg.content === 'string') {
                content = msg.content.substring(0, 100);
            } else if (Array.isArray(msg.content)) {
                // For vision messages with image arrays
                content = `[Array with ${msg.content.length} items]`;
            } else if (typeof msg.content === 'object') {
                content = `[Object: ${JSON.stringify(msg.content).substring(0, 50)}...]`;
            } else {
                content = String(msg.content || '').substring(0, 100);
            }
        } catch (error) {
            content = '[Content parsing error]';
        }
    });
    
    const response = await model.invoke(context);
    
    // Safe logging for response content
    let responsePreview = '';
    try {
        if (typeof response.content === 'string') {
            responsePreview = response.content.substring(0, 100);
        } else if (Array.isArray(response.content)) {
            responsePreview = `[Array with ${response.content.length} items]`;
        } else {
            responsePreview = String(response.content || '').substring(0, 100);
        }
    } catch (error) {
        responsePreview = '[Response content parsing error]';
    }
    
    return { messages: [response] };
}

async function callTool(state, agentDetails = null, userData = null) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return {};
    }

    // Get MCP tools from global state if available
    const mcpTools = global.mcpTools || [];
    const toolExecutorMap = getToolExecutorMap(agentDetails, mcpTools);
    const toolInvocations = [];
    
    for (const toolCall of lastMessage.tool_calls) {
        const toolExecutor = toolExecutorMap[toolCall.name];
        if (toolExecutor) {
            try {
                const mcpTools = IS_MCP_TOOLS.includes(toolCall.name);
                // For image generation tool, pass the API key from the query data
                let toolArgs = toolCall.args;
                if (toolCall.name === 'dalle_api_wrapper' && global.currentQueryData && global.currentQueryData.apiKey) {
                    const decryptedApiKey = decryptedData(global.currentQueryData.apiKey);
                    toolArgs = { ...toolCall.args, apiKey: decryptedApiKey };
                }
                if (toolCall.name === 'gemini_image_generator' && global.currentQueryData && global.currentQueryData.apiKey) {
                    const decryptedApiKey = decryptedData(global.currentQueryData.apiKey);
                    toolArgs = { ...toolCall.args, apiKey: decryptedApiKey };
                }

                if (mcpTools) {
                    if (toolCall.args.mcp_data) {
                        toolArgs = {
                            ...toolCall.args,
                            user_id: toolCall.args.mcp_data
                        };
                        // Remove mcp_data from args as it's not needed by the tool
                        delete toolArgs.mcp_data;
                    } else if (typeof userData !== 'undefined' && userData && userData.id) {
                        // Fallback to userData if mcp_data is not available
                        toolArgs = {
                            ...toolCall.args,
                            user_id: userData.id
                        };
                    }
                }
                
                // Debug: Log tool call details for DALL-E tool (keeping for now)
                
                let toolOutput;
                if (mcpTools) {
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error(`MCP tool '${toolCall.name}' timed out after 5 minutes`)), 300000);
                    });
                    
                    const executeWithRetry = async (retries = 2) => {
                        for (let attempt = 0; attempt <= retries; attempt++) {
                            try {
                                return await Promise.race([
                                    toolExecutor.invoke(toolArgs),
                                    timeoutPromise
                                ]);
                            } catch (error) {
                                console.error(`MCP tool '${toolCall.name}' attempt ${attempt + 1} failed:`, error.message);
                                if (attempt === retries) {
                                    throw error;
                                }
                                // Exponential backoff: wait 1s, then 2s, then 4s
                                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                            }
                        }
                    };
                    toolOutput = await executeWithRetry();
                } else {
                    toolOutput = await toolExecutor.invoke(toolArgs);
                }
                
                // Ensure tool output is properly formatted for LangChain
                let formattedOutput;
                if (typeof toolOutput === 'string') {
                    // If output is a string (like our DALL-E tool), format it properly
                    formattedOutput = toolOutput;
                } else if (toolOutput && typeof toolOutput === 'object') {
                    // If output is an object, extract the content
                    formattedOutput = toolOutput.content || toolOutput.text || JSON.stringify(toolOutput);
                } else {
                    // Fallback for other types
                    formattedOutput = String(toolOutput);
                }
                
                toolInvocations.push(
                    new ToolMessage({
                        content: formattedOutput,
                        tool_call_id: toolCall.id,
                    }),
                );
            } catch (error) {
                logger.error(`Error executing tool ${toolCall.name}:`, error);

                const errorOutput = mcpTools 
                    ? `MCP tool execution failed: ${error.message}. This might be due to connection timeout or server issues. Please try again.`
                    : `Error executing tool ${toolCall.name}: ${error.message}`;
                
                // Add error message to tool invocations
                toolInvocations.push(
                    new ToolMessage({
                        content: errorOutput,
                        tool_call_id: toolCall.id,
                    }),
                );
            }
        } else {
            // Only add "tool not found" message if tool executor doesn't exist
            toolInvocations.push(
                new ToolMessage({
                    content: `Tool '${toolCall.name}' not found or not available. Available tools: ${Object.keys(toolExecutorMap).join(', ')}`,
                    tool_call_id: toolCall.id,
                }),
            );
        }
    }

    return { messages: toolInvocations };
}

function shouldContinue(state) {
    const { messages } = state
    const lastMessage = messages[messages.length - 1]

    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return 'end'
    }
    return 'tools'
}

async function chatOpenRouterWithCallback(modelName, opts = {}, costCallback = null) {
    const baseURL = LINK.OPEN_ROUTER_API_URL || 'https://openrouter.ai/api/v1';
    
    return new ChatOpenAI({
        model: modelName,
        temperature: opts.temperature ?? 1,
        streaming: opts.streaming ?? true,
        apiKey: opts.apiKey,
        configuration: {
            baseURL: baseURL,
            defaultHeaders: {
                'HTTP-Referer': 'https://weam.ai',
                'X-Title': 'Weam AI'
            }
        },
        ...(costCallback && { callbacks: [costCallback] })
    });
}


async function toolChatOpenRouterWithCallback(modelName, opts = {}, costCallback = null, selectedTools = []) {
    const baseURL = LINK.OPEN_ROUTER_API_URL;
    return new ChatOpenAI({
        model: modelName,
        temperature: opts.temperature ?? 1,
        streaming: opts.streaming ?? true,
        apiKey: opts.apiKey,
        configuration: {
            baseURL: baseURL,
            defaultHeaders: {
                'HTTP-Referer': 'https://weam.ai',
                'X-Title': 'Weam AI'
            }
        },
        ...(costCallback && { callbacks: [costCallback] })
    }).bindTools([webSearchTool, currentTimeTool, ...selectedTools]);
}

async function llmFactory(modelName, opts = {}) {

    // Validate API key
    if (!opts.apiKey) {
        throw new Error('API key is required but not provided');
    }
    
    // Ensure we have a valid provider, default to OPEN_AI if none specified
    let provider = opts.llmProvider;
    if (!provider || !Object.values(AI_MODAL_PROVIDER).includes(provider)) {
        provider = AI_MODAL_PROVIDER.OPEN_AI;
    }
    
    // Create cost callback if threadId is provided
    let costCallback = null;
    if (opts.threadId) {
        try {
            costCallback = await createCostCallback(modelName, {
                threadId: opts.threadId,
                collectionName: opts.collectionName || 'messages',
                encryptedKey: opts.encryptedKey,
                companyRedisId: opts.companyRedisId,
                additionalData: opts.additionalData || {}
            });
        } catch (error) {
            logger.error('Failed to create cost callback:', error);
            // Continue without callback rather than failing
        }
    } else {
    }
    
    // Base configuration for all LLMs
    const baseConfig = {
        model: modelName,
        temperature: opts.temperature ?? 1,
        streaming: opts.streaming ?? true,
        ...(costCallback && { callbacks: [costCallback] })
    };

    // Ultra-fast path: Skip expensive operations for simple queries
    let selectedTools = [];
    const needsTools = queryNeedsTools(opts.query);
    
    if (needsTools) {
        const availableMcpTools = await getCachedMCPClient();
        const rawSelectedTools = await selectRelevantToolsWithDomainFilter(opts.query, availableMcpTools);
        selectedTools = (rawSelectedTools || []).filter(tool => tool != null && typeof tool === 'object');
    } else {
    }
    
    const llmConfig = {
        [AI_MODAL_PROVIDER.OPEN_AI]: (() => {
            // Check cache for simple model first
            const cacheKey = `openai_${modelName}_${needsTools}`;
            if (!needsTools && simpleModelCache.has(cacheKey)) {
                return simpleModelCache.get(cacheKey);
            }
            
            const openAIModel = new ChatOpenAI({
                ...baseConfig,
                openAIApiKey: opts.apiKey,
                configuration: {
                    apiKey: opts.apiKey
                }
            });
            
            // chatgpt-4o-latest and gpt-5-chat-latest doesn't support tools, so don't bind them
            if (modelName.toLowerCase().includes('chatgpt-4o-latest') || modelName.toLowerCase().includes('gpt-5-chat-latest')) {
                if (!needsTools) {
                    simpleModelCache.set(cacheKey, openAIModel);
                }
                return openAIModel;
            }
            
            // Only bind tools if query needs them
            if (needsTools && (selectedTools.length > 0 || queryNeedsTools(opts.query))) {
                return openAIModel.bindTools([webSearchTool, imageGenerationTool, currentTimeTool, ...selectedTools]);
            }
            
            // Cache simple model for reuse
            if (!needsTools) {
                simpleModelCache.set(cacheKey, openAIModel);
            }
            
            return openAIModel;
        })(),
        [AI_MODAL_PROVIDER.ANTHROPIC]: (() => {
            // Check cache for simple model first
            const cacheKey = `anthropic_${modelName}_${needsTools}`;
            if (!needsTools && simpleModelCache.has(cacheKey)) {
                return simpleModelCache.get(cacheKey);
            }
            
            const anthropicModel = new ChatAnthropic({
                ...baseConfig,
                anthropicApiKey: opts.apiKey,
            maxTokens: getAnthropicMaxTokens(modelName), // Model-specific max_tokens
            });
            
            // Only bind tools if query needs them
            if (needsTools && (selectedTools.length > 0 || queryNeedsTools(opts.query))) {
                return anthropicModel.bindTools([webSearchTool, currentTimeTool, ...selectedTools]);
            }
            
            // Cache simple model for reuse
            if (!needsTools) {
                simpleModelCache.set(cacheKey, anthropicModel);
            }
            
            return anthropicModel;
        })(),
        [AI_MODAL_PROVIDER.GEMINI]: (() => {
            try {
                // Check cache for simple model first
                const cacheKey = `gemini_${modelName}_${needsTools}`;
                if (!needsTools && simpleModelCache.has(cacheKey)) {
                    return simpleModelCache.get(cacheKey);
                }
                
                const geminiLLM = new ChatGoogleGenerativeAI({
                    ...baseConfig,
                    apiKey: opts.apiKey,
                    model: modelName, // Explicitly set the model name
                });
                
                // Only bind tools if query needs them
                if (needsTools && (selectedTools.length > 0 || queryNeedsTools(opts.query))) {
                    return geminiLLM.bindTools([webSearchTool, geminiImageTool, currentTimeTool, ...selectedTools]);
                }
                
                // Cache simple model for reuse
                if (!needsTools) {
                    simpleModelCache.set(cacheKey, geminiLLM);
                }
                
                return geminiLLM;
            } catch (error) {
                logger.error(`❌ [GEMINI] Failed to create ChatGoogleGenerativeAI:`, error);
                throw error;
            }
        })(),
        [AI_MODAL_PROVIDER.DEEPSEEK]: await chatOpenRouterWithCallback(modelName, { ...opts, apiKey: opts.apiKey }, costCallback),
        [AI_MODAL_PROVIDER.LLAMA4]: await toolChatOpenRouterWithCallback(modelName, { ...opts, apiKey: opts.apiKey }, costCallback, selectedTools),
        [AI_MODAL_PROVIDER.GROK]: await toolChatOpenRouterWithCallback(modelName, { ...opts, apiKey: opts.apiKey }, costCallback, selectedTools),
        [AI_MODAL_PROVIDER.QWEN]: await chatOpenRouterWithCallback(modelName, { ...opts, apiKey: opts.apiKey }, costCallback),
        [AI_MODAL_PROVIDER.PERPLEXITY]: (() => {
            // Return a special object that will be handled by perplexityRawStream
            return {
                _isPerplexityRaw: true,
                model: modelName,
                apiKey: opts.apiKey,
                streaming: opts.streaming ?? true,
                temperature: opts.temperature ?? 0.7,
                maxTokens: opts.maxTokens || null,
                search_recency_filter: 'month',
                search_domain_filter: Array.isArray(opts.searchDomains) ? opts.searchDomains : undefined,
                web_search_options: opts.web_search_options,
                extra_body: opts.extra_body,
                costCallback: costCallback,
                threadId: opts.threadId
            };
        })(),
    }
    
    
    const selectedLLM = llmConfig[provider];
    if (!selectedLLM) {
        logger.error(`❌ [LLM_FACTORY] No LLM configuration found for provider: ${provider}`);
        logger.error('Available providers:', Object.keys(llmConfig));
        logger.error('Using fallback to OpenAI');
        return llmConfig[AI_MODAL_PROVIDER.OPEN_AI];
    }
    
    
    // Store callback reference on LLM for later access if needed
    if (costCallback) {
        selectedLLM._costCallback = costCallback;
    }
    
    return selectedLLM;
}





async function buildGraph(model, data, agentDetails = null) {
    // Ultra-fast path: Only initialize MCP tools if the query needs them
    let mcpTools = [];
    const needsTools = queryNeedsTools(data.query);
    
    if (needsTools) {
        mcpTools = await getCachedMCPClient();
    } else {
    }
    
    // Store MCP tools in global state for access in callTool function
    global.mcpTools = mcpTools;
    getToolExecutorMap(agentDetails, mcpTools);
    const workflow = new StateGraph({ channels: graphState });
    
    // Check if this is a supervisor agent with agents
    if (agentDetails && agentDetails.type === 'supervisor' && agentDetails.Agents && agentDetails.Agents.length > 0) {
        // Build supervisor agent workflow
        return await buildSupervisorGraph(workflow, model, data, agentDetails);
    } else {
        // Build regular agent workflow
        const toolExecutor = (state) => callTool(state, agentDetails, data.user);
        
        // Pass agentDetails to callModel
        workflow.addNode('agent', state => callModel(state, model, data, agentDetails));
        workflow.addNode('tools', toolExecutor);
        workflow.setEntryPoint('agent');
        workflow.addConditionalEdges('agent', shouldContinue, {
            tools: 'tools',
            end: END,
        });
        workflow.addEdge('tools', 'agent');
        const app = workflow.compile();
        return app;
    }
}

// Helper function to check if RAG should be enabled
function shouldEnableRag(data, agentDetails = null) {
    // Disable RAG when images are present to avoid conflicts with vision
    if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
        return false;
    }
    
    // Check for regular uploaded documents
    const hasUploadedDocuments = Array.isArray(data.cloneMedia) && data.cloneMedia?.some((file) => file?.isDocument);
    
    // Check for agent documents (files with isCustomGpt or when agent has documents)
    const hasAgentDocuments = Array.isArray(data.cloneMedia) && data.cloneMedia?.some((file) => file?.isCustomGpt);
    
    // If agent is selected and has documents configured, enable RAG
    const agentHasDocuments = agentDetails && (
        (agentDetails.doc && agentDetails.doc.length > 0)
    );
    
    return hasUploadedDocuments || hasAgentDocuments || agentHasDocuments;
}

// Helper function to check if agent flow should be enabled
function shouldEnableAgent(data) {
    // Check if customGptId is provided (main way to detect agent)
    if (data.customGptId) {
        return true;
    }
    
    // Also check cloneMedia for backward compatibility
    const hasAgent = Array.isArray(data.cloneMedia) && data.cloneMedia?.some((file) => file?.isCustomGpt);
    return hasAgent;
}

// Helper function to build agent context from system prompt, goals, and instructions
function buildAgentContext(agent) {
    let agentContext = '\n\nAgent Configuration:\n';
    
    if (agent.systemPrompt) {
        agentContext += `\nSystem Prompt: ${agent.systemPrompt}\n`;
    }
    
    agentContext += '\nPlease follow these agent configurations in your response.\n';
    return agentContext;
}

// Helper function to fetch agent details
async function fetchAgentDetails(agentId) {
    try {
        const agent = await CustomGpt.findById(agentId).lean();
        if (!agent) {
            throw new Error('Agent not found');
        }
        return agent;
    } catch (error) {
        logger.error('Error fetching agent details:', error);
        return null;
    }
}

async function streamAndLog(app, data, socket, threadId = null) {
    let proccedMsg = '';
    // Set global query data for tool execution (including API key)
    global.currentQueryData = data;
    
    // Check flow type and build appropriate context
    let inputs;
    let isAgentEnabled = false;
    let agentDetails = null;
    
    // Check if agent flow should be enabled
    if (shouldEnableAgent(data)) {
        try {
            
            // Fetch agent details using customGptId
            agentDetails = await fetchAgentDetails(data.customGptId);
            if (agentDetails) {
                isAgentEnabled = true;
                
                // Notify frontend that agent is being used
                // socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                //     event: llmStreamingEvents.AGENT_ENABLED,
                //     chunk: `Agent activated`
                // });
            }
        } catch (error) {
            logger.error('Agent flow failed:', error);
        }
    }
    
    // Check if RAG should be enabled (for both normal and agent flows)
    // Skip RAG entirely if images are present to avoid conflicts with vision
    if (shouldEnableRag(data, agentDetails)) {
        try {
            
            // Notify frontend that RAG is being used
            // socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
            //     event: llmStreamingEvents.RAG_ENABLED,
            //     chunk: `RAG enabled: Searching through ${data.cloneMedia.length} uploaded documents...`
            // });
            
            // Map uploaded files to pinecone index files
            const companyId = data.companyId || data.user?.company?.id;
            if (!companyId) {
                throw new Error('Company ID is required for pinecone search');
            }
            
            
            // Get unique tags and namespaces from uploaded files and agent documents
            const tagList = [];
            const namespaceList = [];
            const seenTags = new Set();
            
            // Combine cloneMedia files with agent documents
            let allFiles = [...(data.cloneMedia || [])];
            
            // Add agent's pre-configured documents if agent is enabled
            if (isAgentEnabled && agentDetails) {
                if (agentDetails.doc && Array.isArray(agentDetails.doc)) {
                    agentDetails.doc.forEach(agentFile => {
                        // Convert agent file format to match cloneMedia structure
                        allFiles.push({
                            name: agentFile.name,
                            filename: agentFile.name,
                            uri: agentFile.uri,
                            isCustomGpt: true,
                            isDocument: true, // Mark as document for RAG processing
                            brainId: agentDetails.brain?.id || data.brainId,
                            _id: agentFile._id
                        });
                    });
                }
            }
            
            
            for (const file of allFiles) {
                // Debug: Log the file object structure
                
                // Extract filename from URI (priority method)
                // URI format: /documents/676ac4b5103171b59d6daf41.pdf
                let filename = null;
                
                // Method 1: Use URI parsing (primary method - matches upload process)
                if (file.uri) {
                    filename = file.uri.split('/')[2]; // Extract: 676ac4b5103171b59d6daf41.pdf
                }
                // Method 2: Use file._id as fallback
                else if (file._id) {
                    const extension = file.name?.split('.').pop() || file.filename?.split('.').pop() || 'pdf';
                    filename = `${file._id.toString()}.${extension}`;
                }
                // Method 3: Use file.id as fallback  
                else if (file.id) {
                    const extension = file.name?.split('.').pop() || file.filename?.split('.').pop() || 'pdf';
                    filename = `${file.id.toString()}.${extension}`;
                }
                // Method 4: Use name/filename fields as final fallback
                else if (file.name) {
                    filename = file.name;
                }
                else if (file.filename) {
                    filename = file.filename;
                }
                
                if (filename) {
                    // Try multiple ways to get the brain ID
                    let fileBrainId = null;
                    
                    // Method 1: Use file.brainId if available (most reliable)
                    if (file.brainId) {
                        fileBrainId = file.brainId.toString();
                    }
                    // Method 2: Use file.brain.id if available
                    else if (file.brain?.id) {
                        fileBrainId = file.brain.id.toString();
                    }
                    // Method 3: Use file.brain._id if available
                    else if (file.brain?._id) {
                        fileBrainId = file.brain._id.toString();
                    }
                    // Method 4: Try to lookup brain ID from database using file ID
                    else if (file._id || file.id) {
                        try {
                            const fileId = file._id || file.id;
                            const chatDoc = await ChatDocs.findOne({ fileId: fileId }).select('brainId');
                            if (chatDoc && chatDoc.brainId) {
                                fileBrainId = chatDoc.brainId.toString();
                            } else {
                                fileBrainId = data.brainId;
                                logger.warn(`🧠 Database lookup failed, using current brain: ${fileBrainId} for file: ${fileId}`);
                            }
                        } catch (error) {
                            logger.error(`🧠 Error looking up brain ID: ${error.message}`);
                            fileBrainId = data.brainId;
                            logger.warn(`🧠 Database error, using current brain: ${fileBrainId}`);
                        }
                    }
                    // Method 5: Final fallback to current brain ID
                    else {
                        fileBrainId = data.brainId;
                        logger.warn(`🧠 No file brain ID found, using current brain: ${fileBrainId}`);
                    }
                    
                    const searchKey = `${filename}_${fileBrainId}`; // Create unique key to prevent duplicates across brains
                    if (!seenTags.has(searchKey)) {
                        seenTags.add(searchKey);
                        tagList.push(filename);           // Tag = filename
                        namespaceList.push(fileBrainId); // Namespace = file's brain ID
                    }
                } else {
                    logger.warn(`❌ Could not extract filename from file object:`, file);
                }
            }
            const { searchWithinFileByFileId } = require('./qdrant');

            // Search across all relevant namespaces
            const searchResults =  await searchWithinFileByFileId(allFiles[0]._id, data.query, 18);
            
            // Build enhanced context from search results
            let enhancedContext = '';
            let ragContext = '';
            
            // Notify frontend about found documents
            if (searchResults && searchResults.length > 0) {
                // socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                //     event: llmStreamingEvents.RAG_ENABLED,
                //     chunk: `Found ${searchResults.length} relevant document sections`
                // });

                // Build RAG context from search results
                const relevantTexts = searchResults.map(result => {
                    const text = result.payload?.text || '';
                    const filename = result.payload?.filename || 'unknown';
                    return `[From ${filename}]: ${text}`;
                }).filter(text => text.length > 0);
                
                ragContext = relevantTexts.join('\n\n');
                
                // Create a clear, structured context for the LLM
                enhancedContext = `\n\n📄 RELEVANT DOCUMENT CONTENT:\n\n${ragContext}\n\nPlease use the above document content to answer the user's question. The content is from uploaded files and should be used as the primary source for your response.\n`;
                
            } else {
                // socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                //     event: llmStreamingEvents.RAG_ENABLED,
                //     chunk: `No specific relevant content found, but RAG context is available`
                // });
                
                enhancedContext = `\n\nNote: No specific relevant documents found for this query, but RAG context is available.\n`;
            }
            
            // Store RAG context globally for system message injection (when agent is enabled)
            let enhancedQuery;
            
            if (isAgentEnabled && agentDetails) {
                // Store only the raw context for system message injection
                global.currentRagContext = ragContext;
                
                // For agent flow, don't append context to query - it will be added to system message
                enhancedQuery = data.query;
                
                // Handle vision support for agent + RAG flow
                if (shouldEnableVision(data)) {
                    const mappedProvider = mapProviderCode(data.code);
                    inputs = { messages: await createVisionMessage(enhancedQuery, data.imageUrls, mappedProvider) };
                } else {
                    inputs = { messages: [['user', enhancedQuery]] };
                }
            } else {
                // For non-agent flow, append context to query (existing behavior)
                enhancedQuery = data.query + enhancedContext;
                
                // Debug: Log the enhanced query being sent to LLM
                
                // Handle vision support for RAG flow
                if (shouldEnableVision(data)) {
                    const mappedProvider = mapProviderCode(data.code);
                    inputs = { messages: await createVisionMessage(enhancedQuery, data.imageUrls, mappedProvider) };
                } else {
                    inputs = { messages: [['user', enhancedQuery]] };
                }
            }
            
            isRagEnabled = true;
            
        } catch (error) {
            logger.error('🚨 RAG SEARCH FAILED:', error);
            logger.error(`🚨 RAG ERROR DETAILS:`, {
                message: error.message,
                stack: error.stack,
                companyId: data.companyId || data.user?.company?.id,
                brainId: data.brainId,
                fileCount: data.cloneMedia?.length || 0
            });
            
            // Provide specific error messages for different failure types
            let errorMessage = 'RAG failed, using normal flow';
            if (error.message.includes('Pinecone index validation failed')) {
                errorMessage = 'RAG failed: Pinecone index validation failed. Please ensure documents are properly indexed.';
            } else if (error.message.includes('No files could be mapped')) {
                errorMessage = 'RAG failed: No uploaded files match the indexed documents. Please check file names.';
            } else if (error.message.includes('No files found in pinecone index')) {
                errorMessage = 'RAG failed: No documents found in the vector database. Please ensure documents are indexed.';
            } else if (error.message.includes('Search across namespaces failed')) {
                errorMessage = 'RAG failed: Vector search across namespaces failed. Please check index configuration.';
            }
            
            // Fallback to normal flow if RAG fails
            let fallbackQuery = data.query;
            
            // Still add agent context if available
            if (isAgentEnabled && agentDetails) {
                const agentContext = buildAgentContext(agentDetails);
                fallbackQuery += agentContext;
            }
            
            // Handle vision support for fallback flow
            if (shouldEnableVision(data)) {
                const mappedProvider = mapProviderCode(data.code);
                inputs = { messages: await createVisionMessage(fallbackQuery, data.imageUrls, mappedProvider) };
            } else {
                inputs = { messages: [['user', fallbackQuery]] };
            }
            socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                event: llmStreamingEvents.RAG_DISABLED,
                chunk: errorMessage
            });
        }
    } else {
        // Normal flow: No files uploaded
        let normalQuery = data.query;
        
        // Add agent context if agent is enabled
        if (isAgentEnabled && agentDetails) {
            const agentContext = buildAgentContext(agentDetails);
            normalQuery += agentContext;
        }
        
        // Handle vision support for normal flow
        if (shouldEnableVision(data)) {
            const mappedProvider = mapProviderCode(data.code);
            inputs = { messages: await createVisionMessage(normalQuery, data.imageUrls, mappedProvider) };
        } else {
            inputs = { messages: [['user', normalQuery]] };
        }
        
        if (isAgentEnabled) {
            socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                event: llmStreamingEvents.AGENT_ENABLED,
                chunk: `Agent active (no documents)`
            });
        }
    }
    
    try {
        const eventHandlers = {
            [langGraphEventName.ON_TOOL_START]: chunk => {
                if (chunk.name === toolCallOptions.WEB_SEARCH_TOOL) {
                    socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                        event: llmStreamingEvents.WEB_SEARCH_START,
                        chunk: toolCallOptions.SEARCHING_THE_WEB
                    });
                }
                if (chunk.name === toolCallOptions.IMAGE_GENERATION_TOOL) {
                    socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                        event: llmStreamingEvents.IMAGE_GENERATION_START,
                        chunk: toolCallOptions.GENERATING_IMAGE,
                    });
                    // Note: Image generation now includes S3 upload, so it may take longer
                    // but will return S3 URL directly instead of OpenAI URL
                }
            },

            [langGraphEventName.ON_CHAIN_MODEL_STREAM]: chunk => {
                const token = Array.isArray(chunk.data?.chunk?.content) ? chunk.data?.chunk?.content[0]?.text : chunk.data?.chunk?.content || '';
                if (token) {
                    proccedMsg += token;
                    socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, { chunk: token });
                }
            },

            [langGraphEventName.ON_CHAIN_MODEL_END]: async () => {                 
                socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                    chunk: llmStreamingEvents.RESPONSE_DONE,
                    proccedMsg,
                });
            },

            [langGraphEventName.ON_TOOL_END]: chunk => {
                const toolOutput = chunk.data?.output;
                
                if (chunk.name === toolCallOptions.IMAGE_GENERATION_TOOL) {
                    socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                        event: llmStreamingEvents.IMAGE_GENERATION_TOOL,
                        chunk: toolOutput,
                    });
                    
                    // Image is already uploaded to S3 by the CustomDallEAPIWrapper
                    // No need for background upload since it's handled synchronously
                } else {
                    try {
                        const parsedToolOutput = JSON.parse(toolOutput);
                        if (Array.isArray(parsedToolOutput)) {
                            socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
                                event: llmStreamingEvents.WEB_SEARCH_CITATION,
                                chunk: parsedToolOutput,
                            });
                            data.citations = parsedToolOutput;
                        }
                    } catch (parseError) {
                    }
                }
            },
        };
        // Helper to check if a stop has been requested for this chat
        let sockets = global.io.sockets;
        let stopRequested = false;

        // Styled stop note to visually distinguish from streamed answer
        const STOP_NOTE_HTML = "\n\n<div style=\"text-align:right; font-size:14px; font-style:italic; color:#8f8f8f; background:#fff; padding:8px 12px; display:inline-block;\">✋ Generation stopped by you</div>\n";

        const forceStopHandler = catchSocketAsync((value) => {
            if (value.chatId === data.chatId) {
                const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${value.chatId}`;
                sockets.to(roomName).emit(SOCKET_EVENTS.FORCE_STOP, { proccedMsg: value.proccedMsg + STOP_NOTE_HTML, userId: value.userId });
                stopRequested = true;
            }
        });

        // Listen once for stop; upon receiving, mark and break the stream loop
        socket.once(SOCKET_EVENTS.FORCE_STOP, forceStopHandler);

        for await (const chunk of app.streamEvents(inputs, {
            streamMode: 'messages',
            version: 'v2',
        })) {
            if (stopRequested) {
                logger.info('isStopRequested', stopRequested);
                proccedMsg += STOP_NOTE_HTML;
                break;
            }

            const handler = eventHandlers[chunk.event];
            if (handler) {
                handler(chunk);
            }
        }
        await createLLMConversation({ 
            ...data, 
            answer: proccedMsg, 
            usedCredit: data.usedCredit || 1 
        });
    } catch (error) {
        logger.error('error streamAndLog', error);
        
        // Send error message to frontend
        socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
            event: llmStreamingEvents.CONVERSATION_ERROR,
            chunk: llmStreamingEvents.RESPONSE_ERROR_MESSAGE,
        });
    } finally {
        // Clean up stop listeners if they never fired
        try {
            if (typeof forceStopHandler === 'function') {
                socket.off(SOCKET_EVENTS.FORCE_STOP, forceStopHandler);
            }
            if (typeof stopStreamingHandler === 'function') {
                socket.off(SOCKET_EVENTS.STOP_STREAMING, stopStreamingHandler);
            }
        } catch (cleanupError) {
            // Non-fatal: log and continue
            logger.warn('Stop listener cleanup warning:', cleanupError?.message || cleanupError);
        }
        proccedMsg = '';
        
        // Clean up global query data and RAG context
        global.currentQueryData = null;
        global.currentRagContext = null;
    }
}

// Helper function to get agent-specific model configuration
async function getAgentModelConfig(agentDetails, data) {
    try {
        if (!agentDetails || !agentDetails.responseModel) {
            return null;
        }
        
        const { responseModel } = agentDetails;
        
        // If agent has a specific model configuration, use it
        if (responseModel.id && responseModel.bot) {
            
            // Infer provider from model name if not explicitly set
            let inferredProvider = responseModel.provider;
            if (!inferredProvider || inferredProvider === 'undefined') {
                const modelName = responseModel.name.toLowerCase();
                if (modelName.includes('gemini')) {
                    inferredProvider = 'GEMINI';
                } else if (modelName.includes('claude')) {
                    inferredProvider = 'ANTHROPIC';
                } else if (modelName.includes('gpt') || modelName.includes('o1') || modelName.includes('o3')) {
                    inferredProvider = 'OPEN_AI';
                } else if (modelName.includes('deepseek')) {
                    inferredProvider = 'DEEPSEEK';
                } else if (modelName.includes('llama')) {
                    inferredProvider = 'LLAMA4';
                } else if (modelName.includes('grok')) {
                    inferredProvider = 'GROK';
                } else if (modelName.includes('qwen')) {
                    inferredProvider = 'QWEN';
                } else {
                    inferredProvider = 'OPEN_AI'; // Default fallback
                }
                
            }
            
            // Return agent-specific configuration
            const agentConfig = {
                model: responseModel.name,
                apiKey: data.apiKey,
                llmProvider: inferredProvider,
                temperature: 0.7,
                streaming: true
            };
            
            
            return agentConfig;
        }
        
        return null;
    } catch (error) {
        logger.error('Error getting agent model config:', error);
        return null;
    }
}

// Helper function to safely decrypt API key data
function safeDecryptApiKey(encryptedData) {
    try {
        // If the data looks like it's already decrypted (starts with 'sk-'), return as is
        if (typeof encryptedData === 'string' && encryptedData.startsWith('sk-')) {
            return encryptedData;
        }
        
        // Try to decrypt the data
        const decrypted = decryptedData(encryptedData);
        return decrypted;
    } catch (error) {
        logger.error('Error decrypting API key:', error.message);
        return encryptedData; // Return as is if decryption fails
    }
}

// Helper function to map provider codes to AI_MODAL_PROVIDER constants
function mapProviderCode(code) {
    if (!code) return AI_MODAL_PROVIDER.OPEN_AI;
    
    const codeStr = code.toString().toLowerCase();
    
    // Map common provider codes
    const providerMap = {
        'openai': AI_MODAL_PROVIDER.OPEN_AI,
        'open_ai': AI_MODAL_PROVIDER.OPEN_AI,
        'anthropic': AI_MODAL_PROVIDER.ANTHROPIC,
        'claude': AI_MODAL_PROVIDER.ANTHROPIC,
        'gemini': AI_MODAL_PROVIDER.GEMINI,
        'google': AI_MODAL_PROVIDER.GEMINI,
        'deepseek': AI_MODAL_PROVIDER.DEEPSEEK,
        'llama': AI_MODAL_PROVIDER.LLAMA4,
        'llama4': AI_MODAL_PROVIDER.LLAMA4,
        'grok': AI_MODAL_PROVIDER.GROK,
        'qwen': AI_MODAL_PROVIDER.QWEN,
        'perplexity': AI_MODAL_PROVIDER.PERPLEXITY,
        'azure': AI_MODAL_PROVIDER.AZURE_OPENAI_SERVICE,
        'huggingface': AI_MODAL_PROVIDER.HUGGING_FACE,
        'local': AI_MODAL_PROVIDER.LOCAL_LLM,
        'anyscale': AI_MODAL_PROVIDER.ANYSCALE
    };
    
    // Check exact matches first
    if (providerMap[codeStr]) {
        return providerMap[codeStr];
    }
    
            // Check partial matches
        for (const [key, value] of Object.entries(providerMap)) {
            if (codeStr.includes(key) || key.includes(codeStr)) {
                return value;
            }
        }
    return AI_MODAL_PROVIDER.OPEN_AI;
}

async function toolExecutor(data, socket) {
    try {
        let apiKey, model, app, agentDetails = null;

        // Map the provider code to the correct constant
        const mappedProvider = mapProviderCode(data.code);
        const options = {
            apiKey: data.apiKey,
            llmProvider: mappedProvider,
            temperature: data.temperature,
            streaming: true,
            query: data.query,
            threadId: data.threadId,
            userId: data.user.id
        };
        // RAW Perplexity routing for all Perplexity models
        const isPerplexity = mappedProvider === AI_MODAL_PROVIDER.PERPLEXITY;
        if (isPerplexity) {
            const rawMessages = [['user', data.query || '']];
            await perplexityRawStream({
                apiKey: decryptedData(data.apiKey),
                model: data.model,
                messages: rawMessages,
                data,
                socket,
                threadId: data.threadId,
                options: {
                    temperature: data.temperature,
                    maxTokens: data.maxTokens,
                    search_recency_filter: 'month',
                    search_domain_filter: Array.isArray(data.searchDomains) ? data.searchDomains : undefined,
                    web_search_options: data.web_search_options,
                    extra_body: data.extra_body,
                    encryptedKey: data.apiKey,
                    companyRedisId: data.user?.company?.id,
                    additionalData: {},
                },
            });
            return;
        }
        if (shouldEnableAgent(data)) {
            agentDetails = await fetchAgentDetails(data.customGptId);
            if (agentDetails) {
                const agentModelConfig = await getAgentModelConfig(agentDetails, data);
                if (agentModelConfig) {
                    // Use agent-specific model configuration
                    apiKey = safeDecryptApiKey(agentModelConfig.apiKey);
                    // Map the agent's provider to the correct format
                    const mappedAgentProvider = mapProviderCode(agentModelConfig.llmProvider);
                    
                    model = await llmFactory(agentModelConfig.model, {...options, apiKey: apiKey});
                } else {
                    // Fallback to user's model configuration
                    apiKey = safeDecryptApiKey(data.apiKey);
                    model = await llmFactory(data.model, {...options, apiKey: apiKey});
                }
            } else {
                // Agent not found, use user's model configuration
                apiKey = decryptedData(data.apiKey);
                model = await llmFactory(data.model, {...options, apiKey: apiKey});
            }
        } else {
            // Normal flow: use user's model configuration
            apiKey = decryptedData(data.apiKey);
            model = await llmFactory(data.model, {...options, apiKey: apiKey});
        }
        
        // Build the graph with the selected model and agent details
        app = await buildGraph(model, data, agentDetails);
        
        // Stream and log the response
        await streamAndLog(app, data, socket, data.threadId);
        
    } catch (error) {
        logger.error('Error in toolExecutor:', error);
    }
}

async function generateTitleByLLM(payload) {
    try {
        const { query, code, apiKey, chatId } = payload;
        
        if (!query || !apiKey) {
            throw new Error('Missing required parameters: query and apiKey are required');
        }
        
        const mappedProvider = mapProviderCode(code);
        const defaultModelMap = {
            [AI_MODAL_PROVIDER.OPEN_AI]: 'gpt-4o-mini',
            [AI_MODAL_PROVIDER.ANTHROPIC]: 'claude-3-5-sonnet-20240620',
            [AI_MODAL_PROVIDER.GEMINI]: 'gemini-2.0-flash-001',
            [AI_MODAL_PROVIDER.DEEPSEEK]: 'deepseek-chat',
            [AI_MODAL_PROVIDER.LLAMA4]: 'llama-3.1-8b-instruct',
            [AI_MODAL_PROVIDER.GROK]: 'grok-2-1212',
            [AI_MODAL_PROVIDER.QWEN]: 'qwq-32b',
            [AI_MODAL_PROVIDER.PERPLEXITY]: 'sonar',
        };
        
        const defaultModel = defaultModelMap[mappedProvider] || defaultModelMap[AI_MODAL_PROVIDER.OPEN_AI];
        const decryptedApiKey = decryptedData(apiKey);
        
        if (!decryptedApiKey) {
            throw new Error('Invalid or missing API key');
        }
        
        const model = await llmFactory(defaultModel, { 
            streaming: false, 
            apiKey: decryptedApiKey, 
            llmProvider: mappedProvider 
        });
        const titleSystemPrompt = toolDescription.TITLE_SYSTEM_PROMPT.replace('{{query}}', query);
        const messages = [
            new SystemMessage(titleSystemPrompt),
            new HumanMessage(query)
        ];
        const result = await model.invoke(messages);
        const parsedResult = JSON.parse(result.content);
        const answer = parsedResult.title || 'New Chat';
        Promise.all([
            Chat.updateOne({ _id: chatId }, { $set: { title: answer } }),
            ChatMember.updateMany({ chatId: chatId }, { $set: { title: answer } })
        ])
        return answer;
    } catch (error) {
        handleError(error, 'Error in generateTitleByLLM');
    }
}

async function enhancePromptByLLM(payload) {
    try {
        const { query, apiKey } = payload;
        
        if (!query || !apiKey) {
            throw new Error('Missing required parameters: query and apiKey are required');
        }
        const decryptedApiKey = decryptedData(apiKey);
        
        if (!decryptedApiKey) {
            throw new Error('Invalid or missing API key');
        }
        
        const model = await llmFactory(MODAL_NAME.GPT_4_1_MINI, { 
            streaming: false, 
            apiKey: decryptedApiKey, 
            llmProvider: AI_MODAL_PROVIDER.OPEN_AI 
        });
        const enhanceSystemPrompt = toolDescription.ENHANCE_QUERY_PROMPT.replace('{{query}}', query);
        const messages = [
            new SystemMessage(enhanceSystemPrompt),
            new HumanMessage(query)
        ];
        const result = await model.invoke(messages);
        return result.content;
    } catch (error) {
        handleError(error, 'Error in enhancePromptByLLM');
    }
}

// Helper function to build supervisor agent workflow
async function buildSupervisorGraph(workflow, model, data, supervisorAgent) {
    try {
        // Fetch agent details
        const agentDetails = await Promise.all(
            supervisorAgent.Agents.map(async (agentId) => {
                try {
                    const agent = await CustomGpt.findById(agentId).lean();
                    return agent;
                } catch (error) {
                    logger.error(`Error fetching tool agent ${agentId}:`, error);
                    return null;
                }
            })
        );
        
        // Filter out null agents
        const validAgents = AgentDetails.filter(agent => agent !== null);
        
        if (validAgents.length === 0) {
            logger.warn('No valid agents found for supervisor, falling back to regular workflow');
            // Fallback to regular workflow
            const toolExecutor = (state) => callTool(state, supervisorAgent, data.user);
            workflow.addNode('supervisor', state => callModel(state, model, data, supervisorAgent));
            workflow.addNode('tools', toolExecutor);
            workflow.setEntryPoint('supervisor');
            workflow.addConditionalEdges('supervisor', shouldContinue, {
                tools: 'tools',
                end: END,
            });
            workflow.addEdge('tools', 'supervisor');
            return workflow.compile();
        }
        
        // Add supervisor node
        workflow.addNode('supervisor', state => callSupervisorModel(state, model, data, supervisorAgent, validAgents));
        
        // Add tool agent nodes
        validAgents.forEach((Agent, index) => {
            const nodeName = `tool_agent_${index}`;
            workflow.addNode(nodeName, state => callAgent(state, model, data, Agent, supervisorAgent));
        });
        
        // Add tools node for regular tools (web search, image generation, etc.)
        const toolExecutor = (state) => callTool(state, supervisorAgent, data.user);
        workflow.addNode('tools', toolExecutor);
        
        // Set entry point
        workflow.setEntryPoint('supervisor');
        
        // Add conditional edges from supervisor
        workflow.addConditionalEdges('supervisor', (state) => supervisorShouldContinue(state, validAgents), {
            ...validAgents.reduce((acc, _, index) => {
                acc[`tool_agent_${index}`] = `tool_agent_${index}`;
                return acc;
            }, {}),
            tools: 'tools',
            end: END,
        });
        
        // Add edges from agents back to supervisor
        validAgents.forEach((_, index) => {
            workflow.addEdge(`tool_agent_${index}`, 'supervisor');
        });
        
        // Add edge from tools back to supervisor
        workflow.addEdge('tools', 'supervisor');
        
        return workflow.compile();
        
    } catch (error) {
        logger.error('Error building supervisor graph:', error);
        // Fallback to regular workflow
        const toolExecutor = (state) => callTool(state, supervisorAgent, data.user);
        workflow.addNode('supervisor', state => callModel(state, model, data, supervisorAgent));
        workflow.addNode('tools', toolExecutor);
        workflow.setEntryPoint('supervisor');
        workflow.addConditionalEdges('supervisor', shouldContinue, {
            tools: 'tools',
            end: END,
        });
        workflow.addEdge('tools', 'supervisor');
        return workflow.compile();
    }
}

// Helper function for supervisor decision making
function supervisorShouldContinue(state, Agents) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        const toolCall = lastMessage.tool_calls[0];
        
        // Check if it's a tool agent call
        const AgentMatch = toolCall.name.match(/^call_tool_agent_(\d+)$/);
        if (AgentMatch) {
            const agentIndex = parseInt(AgentMatch[1]);
            if (agentIndex >= 0 && agentIndex < Agents.length) {
                return `tool_agent_${agentIndex}`;
            }
        }
        
        // Check if it's a regular tool call
        if (['web_search', 'generate_image', 'get_current_time'].includes(toolCall.name)) {
            return 'tools';
        }
    }
    
    return 'end';
}

// Helper function to call supervisor model with tool agent options
async function callSupervisorModel(state, model, data, supervisorAgent, Agents) {
    try {
        // Build system message with tool agent information
        let systemMessage = supervisorAgent.systemPrompt || 'You are a supervisor agent that coordinates multiple agents.';
        
        systemMessage += '\n\nAvailable Agents:\n';
        Agents.forEach((agent, index) => {
            systemMessage += `${index + 1}. ${agent.title}: ${agent.description || agent.systemPrompt || 'No description available'}\n`;
        });
        
        systemMessage += '\nTo delegate a task to a tool agent, use the call_tool_agent_X function where X is the agent index (0-based).';
        
        // Add tool agent functions to the model
        const AgentFunctions = Agents.map((agent, index) => ({
            name: `call_tool_agent_${index}`,
            description: `Delegate task to ${agent.title}: ${agent.description || agent.systemPrompt || 'Tool agent'}`,
            parameters: {
                type: 'object',
                properties: {
                    task: {
                        type: 'string',
                        description: 'The specific task or query to delegate to this tool agent'
                    }
                },
                required: ['task']
            }
        }));
        
        // Add regular tools
        const regularTools = [
            {
                name: 'web_search',
                description: 'Search the web for information',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' }
                    },
                    required: ['query']
                }
            },
            {
                name: 'generate_image',
                description: 'Generate an image using DALL-E',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Image generation prompt' }
                    },
                    required: ['prompt']
                }
            },
            {
                name: 'get_current_time',
                description: 'Get the current date and time',
                parameters: { type: 'object', properties: {} }
            }
        ];
        
        const allTools = [...AgentFunctions, ...regularTools];
        
        // Prepare messages with system message
        const messages = [
            new SystemMessage(systemMessage),
            ...state.messages
        ];
        
        // Call the model with tools
        const response = await model.invoke(messages, { tools: allTools });
        
        return { messages: [...state.messages, response] };
        
    } catch (error) {
        logger.error('Error in callSupervisorModel:', error);
        // Fallback to regular model call
        return await callModel(state, model, data, supervisorAgent);
    }
}

// Helper function to call individual tool agent
async function callAgent(state, model, data, Agent, supervisorAgent) {
    try {
        const messages = state.messages;
        const lastMessage = messages[messages.length - 1];
        
        // Extract the task from the tool call
        let task = data.query; // Default to original query
        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            const toolCall = lastMessage.tool_calls[0];
            if (toolCall.args && toolCall.args.task) {
                task = toolCall.args.task;
            }
        }
        
        // Build tool agent context
        let AgentSystemMessage = Agent.systemPrompt || 'You are a specialized tool agent.';
        AgentSystemMessage += `\n\nTask delegated from supervisor: ${task}`;
        
        // Create new message chain for tool agent
        const AgentMessages = [
            new SystemMessage(AgentSystemMessage),
            new HumanMessage(task)
        ];
        
        // Call the model for this tool agent
        const response = await model.invoke(AgentMessages);
        
        // Create tool message to return to supervisor
        const toolMessage = new ToolMessage({
            content: response.content,
            tool_call_id: lastMessage.tool_calls[0].id,
            name: lastMessage.tool_calls[0].name
        });
        
        return { messages: [...state.messages, toolMessage] };
        
    } catch (error) {
        logger.error('Error in callAgent:', error);
        
        // Return error message
        const errorMessage = new ToolMessage({
            content: `Error executing tool agent: ${error.message}`,
            tool_call_id: lastMessage.tool_calls[0].id,
            name: lastMessage.tool_calls[0].name
        });
        
        return { messages: [...state.messages, errorMessage] };
    }
}

module.exports = {
    toolExecutor,
    generateTitleByLLM,
    webSearchTool,
    imageGenerationTool,
    currentTimeTool,
    enhancePromptByLLM,
    llmFactory
}