const crypto = require('crypto');
const Message = require('../models/thread');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { encryptedData, decryptedData } = require('../utils/helper');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const CompanyModel = require('../models/userBot');
const { MODAL_NAME } = require('../config/constants/aimodal');

const MAX_TOKEN_LIMIT = 10000;
const TOKEN_ESTIMATE_PER_CHAR = 0.25; // Rough estimate: 1 token ≈ 4 characters

/**
 * Estimate token count from text
 */
const estimateTokens = (text) => {
    if (!text) return 0;
    return Math.ceil(text.length * TOKEN_ESTIMATE_PER_CHAR);
};

/**
 * Create checkpoint hash
 */
const createCheckpointHash = (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Get default model and API key from companyModel collection
 */
const getDefaultModelKey = async (companyId, modelType) => {
    try {
        // Find default model for the company
        const query = {
            'company.id': new mongoose.Types.ObjectId(companyId),
            'bot.code': modelType
        };
        
        const defaultModel = await CompanyModel.findOne(query).lean();
        
        if (!defaultModel || !defaultModel.config || !defaultModel.config.apikey) {
            logger.warn(`No default ${modelType} model found for company ${companyId}`);
            return null;
        }
        
        return {
            modelName: MODAL_NAME.GPT_4_1_MINI,
            apiKey: decryptedData(defaultModel.config.apikey)
        };
    } catch (error) {
        logger.error(`Error getting default model key: ${error.message}`);
        return null;
    }
};

/**
 * Create summarized history using LLM
 */
const createLLMSummary = async (conversationHistory, companyId) => {
    try {
        // Format conversation for the LLM
        const formattedConversation = conversationHistory
            .map(pair => `User: ${pair.user}\nAssistant: ${pair.assistant}`)
            .join('\n\n');
        
        // Try to get OpenAI model first, fall back to Anthropic if not available
        let modelInfo = await getDefaultModelKey(companyId, 'OPEN_AI');
        let llm;
        
        if (modelInfo && modelInfo.apiKey) {
            // Use OpenAI
            llm = new ChatOpenAI({
                modelName: modelInfo.modelName || 'gpt-4o-mini',
                temperature: 0,
                apiKey: modelInfo.apiKey
            });
        } else {
            // Try Anthropic as fallback
            modelInfo = await getDefaultModelKey(companyId, 'ANTHROPIC');
            
            if (!modelInfo || !modelInfo.apiKey) {
                logger.warn('No LLM API keys available, falling back to simple summary');
                return createSimpleSummary(conversationHistory);
            }
            
            llm = new ChatAnthropic({
                modelName: modelInfo.modelName || 'claude-3-5-sonnet-20240620',
                temperature: 0,
                anthropicApiKey: modelInfo.apiKey
            });
        }
        
        // Create summary prompt
        const messages = [
            new SystemMessage("You are a helpful assistant that creates concise summaries of conversations."),
            new HumanMessage(`Please summarize the following conversation in 700-1000 tokens. Focus on the main topics, key points, and decisions made. Ensure the summary is coherent and captures the essence of the conversation.\n\nCONVERSATION:\n${formattedConversation}`)
        ];
        
        // Generate summary
        const response = await llm.invoke(messages);
        return response.content;
    } catch (error) {
        logger.error(`Error creating LLM summary: ${error.message}`);
        // Fall back to simple summary if LLM fails
        return createSimpleSummary(conversationHistory);
    }
};

/**
 * Create simple summary (fallback when LLM is not available)
 */
const createSimpleSummary = (conversationHistory) => {
    // Extract key points from conversation
    const keyPoints = conversationHistory
        .slice(-5) // Last 5 exchanges
        .map((turn, index) => {
            const userMessage = turn.user.substring(0, 100) + (turn.user.length > 100 ? '...' : '');
            return `Turn ${index + 1}: User asked about "${userMessage}"`;
        }).join('\n');

    return `This conversation contains ${conversationHistory.length} turns.\n\n${keyPoints}`;
};

/**
 * Process a single conversation and create message documents
 */
const processConversation = async (conversation, chat_id, import_id, config, currentUser, model_id) => {
    try {
        const documents = [];
        let maxSummaryToken = 0;
        let totalImportedTokens = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let currentSumhistoryCheckpoint = null;
        let summarizedHistory = '';
        let systemMessageContent = '';
        const conversationHistory = [];

        // Filter mappings and sort by parent-child relationships to maintain conversation flow
        const mappingValues = Object.values(conversation.mapping || {});
        
        // First, find the root node (the one with no parent)
        const rootNode = mappingValues.find(value => 
            value && value.parent === null
        );
        
        // Function to build ordered list following the conversation tree structure
        const buildOrderedList = (nodeId, result = []) => {
            const node = conversation.mapping[nodeId];
            if (node && node.message) {
                result.push(node);
            }
            
            // Process children in order
            if (node && node.children && node.children.length > 0) {
                for (const childId of node.children) {
                    buildOrderedList(childId, result);
                }
            }
            
            return result;
        };
        
        // Build ordered list starting from root node
        const orderedMappings = rootNode ? buildOrderedList(rootNode.id) : [];
        
        // Filter out invalid messages
        const filtered_mappings = orderedMappings.filter(value => {
            if (!value || typeof value !== 'object') return false;
            const message = value.message;
            if (!message || typeof message !== 'object') return false;
            if (message.create_time === null || message.create_time === undefined) return false;

            const content = message.content;
            if (!content || !content.parts) return false;

            // Check if parts has at least one valid string
            return content.parts.some(part =>
                typeof part === 'string' && part.trim().length > 0
            );
        });

        let currentUserMessage = null;
        let currentUserMessageTokens = 0;
        let createTime = null;

        // Process each message in the conversation
        for (const mapping of filtered_mappings) {
            const message = mapping.message;
            const metadata = message.metadata || {};
            const msg_id = message.id;
            const author_role = message.author?.role;
            const content_parts = message.content?.parts || [];
            createTime = Math.floor(message.create_time);
            const model_slug = metadata.model_slug;

            let tokens = {
                imageT: 0,
                promptT: 0,
                completion: 0,
                totalUsed: 0,
                totalCost: '$0.0',
                summary: {
                    promptT: 0,
                    completion: 0,
                    totalUsed: 0,
                    totalCost: '$0.0'
                }
            };

            let response_model = null;
            if (model_slug && model_slug !== 'auto') {
                response_model = model_slug;
            }

            // Process user messages
            if (author_role === 'user') {
                currentUserMessage = content_parts
                    .filter(part => {
                        if (typeof part === 'string' && part.trim()) return true;
                        if (typeof part === 'object' && part.text && part.text.trim()) return true;
                        return false;
                    })
                    .map(part => typeof part === 'string' ? part.trim() : part.text.trim())
                    .join(' ');

                currentUserMessageTokens = estimateTokens(currentUserMessage);
                tokens.promptT = currentUserMessageTokens;
                totalPromptTokens += currentUserMessageTokens;
                maxSummaryToken += currentUserMessageTokens;
            }
            // Process assistant messages
            else if (author_role === 'assistant' && currentUserMessage) {
                const assistant_message = content_parts
                    .filter(part => {
                        if (typeof part === 'string' && part.trim()) return true;
                        if (typeof part === 'object' && part.text && part.text.trim()) return true;
                        return false;
                    })
                    .map(part => typeof part === 'string' ? part.trim() : part.text.trim())
                    .join(' ');

                const assistantTokens = estimateTokens(assistant_message);
                tokens.completion = assistantTokens;
                totalCompletionTokens += assistantTokens;
                maxSummaryToken += assistantTokens;

                tokens.totalUsed = tokens.promptT + tokens.completion;
                totalImportedTokens += tokens.totalUsed;
                tokens.totalCost = `$${(tokens.totalUsed * 0.00001).toFixed(6)}`;

                // Handle checkpoint and summary logic
                if (maxSummaryToken < MAX_TOKEN_LIMIT) {
                    // Store in conversation history for potential summary later
                    conversationHistory.push({
                        user: currentUserMessage,
                        assistant: assistant_message
                    });

                    if (!currentSumhistoryCheckpoint) {
                        currentSumhistoryCheckpoint = createCheckpointHash(chat_id.toString());
                    }
                } else {
                    // Create summary using LLM when token limit is reached
                    try {
                        // Use LLM for summary generation
                        summarizedHistory = await createLLMSummary(conversationHistory, config.company_id);
                        logger.info(`Generated LLM summary for chat ${chat_id}`);
                    } catch (error) {
                        // Fall back to simple summary if LLM fails
                        logger.error(`Error generating LLM summary: ${error.message}`);
                        summarizedHistory = createSimpleSummary(conversationHistory);
                    }
                    
                    const summarizedTokens = estimateTokens(summarizedHistory);
                    maxSummaryToken = summarizedTokens;

                    // Update summary tokens
                    tokens.summary.totalUsed = summarizedTokens;
                    tokens.summary.promptT = Math.floor(summarizedTokens * 0.6);
                    tokens.summary.completion = Math.floor(summarizedTokens * 0.4);
                    tokens.summary.totalCost = `$${(summarizedTokens * 0.00001).toFixed(6)}`;

                    // Create new checkpoint hash from summary
                    currentSumhistoryCheckpoint = createCheckpointHash(summarizedHistory);
                    
                    // Update system message content with the summary
                    systemMessageContent = summarizedHistory;

                    // Reset conversation history
                    conversationHistory.length = 0;
                    conversationHistory.push({
                        user: currentUserMessage,
                        assistant: assistant_message
                    });
                }

                // Create message document
                const messageDoc = {
                    message: encryptedData(JSON.stringify({
                        type: 'human',
                        data: {
                            content: currentUserMessage,
                            additional_kwargs: {},
                            response_metadata: {},
                            type: 'human',
                            name: null,
                            id: null,
                            example: false,
                            tool_calls: [],
                            invalid_tool_calls: []
                        }
                    })),
                    chatId: new mongoose.Types.ObjectId(chat_id),
                    chat_session_id: new mongoose.Types.ObjectId(chat_id),
                    importId: new mongoose.Types.ObjectId(import_id),
                    threadIds: [],
                    tokens: tokens,
                    createdAt: new Date(createTime * 1000), // Convert Unix timestamp to Date object
                    model: {
                        title: 'Open AI',
                        code: 'OPEN_AI',
                        id: new mongoose.Types.ObjectId(model_id)
                    },
                    brain: {
                        title: config.brain_title,
                        slug: config.brain_slug,
                        id: new mongoose.Types.ObjectId(config.brain_id)
                    },
                    user: {
                        email: currentUser.email,
                        fname: currentUser.fname || '',
                        lname: currentUser.lname || '',
                        id: new mongoose.Types.ObjectId(config.user_id),
                        ...(currentUser.profile && currentUser.profile.uri && currentUser.profile.uri.trim() !== '' && {
                            profile: {
                                name: currentUser.profile.name || '',
                                uri: currentUser.profile.uri,
                                mime_type: currentUser.profile.mime_type || '',
                                ...(currentUser.profile.id && {
                                    id: typeof currentUser.profile.id === 'string'
                                        ? new mongoose.Types.ObjectId(currentUser.profile.id)
                                        : currentUser.profile.id
                                })
                            }
                        })
                    },
                    isActive: true,
                    responseModel: response_model,
                    responseAPI: 'OPEN_AI',
                    media: null,
                    cloneMedia: null,
                    companyId: new mongoose.Types.ObjectId(config.company_id),
                    reaction: [],
                    seq: new Date(),
                    isMedia: false,
                    ai: encryptedData(JSON.stringify({
                        type: 'ai',
                        data: {
                            content: assistant_message,
                            additional_kwargs: {},
                            response_metadata: {},
                            type: 'ai',
                            name: null,
                            id: null,
                            example: false,
                            tool_calls: [],
                            invalid_tool_calls: []
                        }
                    })),
                    system: encryptedData(JSON.stringify({
                        type: 'system',
                        data: {
                            content: systemMessageContent,
                            additional_kwargs: {},
                            response_metadata: {},
                            type: 'system',
                            name: null,
                            id: null,
                            example: false
                        }
                    })),
                    sumhistory_checkpoint: currentSumhistoryCheckpoint,
                    summarizedHistory: summarizedHistory || null
                };

                documents.push(messageDoc);

                // Reset for next pair
                currentUserMessage = null;
                currentUserMessageTokens = 0;
            }
        }

        // Save all documents to MongoDB
        if (documents.length > 0) {
            await Message.insertMany(documents);
            logger.info(`Inserted ${documents.length} messages for chat ${chat_id}`);
        }

        return {
            success: true,
            messageCount: documents.length,
            totalTokens: totalImportedTokens
        };

    } catch (error) {
        logger.error(`Error processing conversation: ${error.message}`);
        throw error;
    }
};

module.exports = {
    processConversation,
    estimateTokens,
    createCheckpointHash,
    createSimpleSummary
};
