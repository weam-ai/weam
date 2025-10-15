const crypto = require('crypto');
const Message = require('../models/thread');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { encryptedData, decryptedData } = require('../utils/helper');
const { MODAL_NAME } = require('../config/constants/aimodal');
const CompanyModel = require('../models/userBot');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');

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
const createSimpleSummary = (conversationHistory) => {
    // In production, this would call an LLM to create a summary
    // For now, we'll just truncate and combine
    const summary = conversationHistory
        .slice(-5) // Last 5 exchanges
        .map(pair => `User: ${pair.user.substring(0, 100)}...\nAssistant: ${pair.assistant.substring(0, 100)}...`)
        .join('\n\n');

    return `Summary of conversation:\n${summary}`;
};

/**
 * Process a single Anthropic conversation and create message documents
 */
const processAnthropicConversation = async (conversation, chat_id, import_id, config, currentUser, model_id) => {
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

        // Get chat messages from Anthropic format
        const chat_messages = conversation.chat_messages || [];

        logger.info(`Processing Anthropic conversation: ${conversation.name || conversation.uuid}, total messages: ${chat_messages.length}`);

        // Log first message structure for debugging
        if (chat_messages.length > 0) {
            logger.info(`First message structure: ${JSON.stringify(chat_messages[0], null, 2)}`);
        }

        // Filter and sort messages by created_at (oldest to newest)
        const filtered_sorted_messages = chat_messages
            .filter(msg => {
                if (!msg || typeof msg !== 'object') {
                    logger.warn(`Skipping invalid message: not an object`);
                    return false;
                }
                if (!msg.created_at) {
                    logger.warn(`Skipping message: no created_at`);
                    return false;
                }

                // Check for text in multiple places
                let hasText = false;

                // 1. Check text field
                if (msg.text && typeof msg.text === 'string' && msg.text.trim()) {
                    hasText = true;
                }

                // 2. Check content field (can be array or string)
                if (!hasText && msg.content) {
                    if (Array.isArray(msg.content)) {
                        hasText = msg.content.some(part => {
                            if (typeof part === 'string' && part.trim()) return true;
                            if (part && part.type === 'text' && part.text && part.text.trim()) return true;
                            return false;
                        });
                    } else if (typeof msg.content === 'string' && msg.content.trim()) {
                        hasText = true;
                    }
                }

                // 3. Check attachments for extracted_content
                if (!hasText && msg.attachments && Array.isArray(msg.attachments)) {
                    hasText = msg.attachments.some(att =>
                        att && att.extracted_content && typeof att.extracted_content === 'string' && att.extracted_content.trim()
                    );
                }

                if (!hasText) {
                    logger.warn(`Skipping message: no valid text found in text, content, or attachments`);
                    return false;
                }

                return true;
            })
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        logger.info(`Filtered messages count: ${filtered_sorted_messages.length}`);

        let currentUserMessage = null;
        let currentUserMessageTokens = 0;
        let createTime = null;

        // Process each message in the conversation
        for (const message of filtered_sorted_messages) {
            const sender = message.sender;
            const content_parts = message.content || [];
            createTime = new Date(message.created_at);
            const updateTime = new Date(message.updated_at);

            // Extract text from content parts
            let msg_text = '';

            // 1. Try text field first
            if (message.text && typeof message.text === 'string' && message.text.trim()) {
                msg_text = message.text.trim();
            }

            // 2. Try content field
            if (!msg_text && content_parts) {
                if (Array.isArray(content_parts)) {
                    msg_text = content_parts
                        .filter(part => {
                            if (typeof part === 'string' && part.trim()) return true;
                            if (typeof part === 'object' && part.text && part.text.trim()) return true;
                            return false;
                        })
                        .map(part => typeof part === 'string' ? part.trim() : part.text.trim())
                        .join(' ');
                } else if (typeof content_parts === 'string') {
                    msg_text = content_parts.trim();
                }
            }

            // 3. Try attachments if still no text
            if (!msg_text && message.attachments && Array.isArray(message.attachments)) {
                const attachmentTexts = message.attachments
                    .filter(att => att && att.extracted_content && typeof att.extracted_content === 'string' && att.extracted_content.trim())
                    .map(att => att.extracted_content.trim());
                if (attachmentTexts.length > 0) {
                    msg_text = attachmentTexts.join('\n\n');
                    logger.info(`Extracted text from ${attachmentTexts.length} attachment(s) for sender: ${sender}`);
                }
            }

            if (!msg_text) {
                logger.warn(`Skipping message with no text content for sender: ${sender}`);
                continue;
            }

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

            const response_model = 'claude-3-5-sonnet-latest'; // Default Anthropic model

            // Process human/user messages
            if (sender === 'human') {
                currentUserMessage = msg_text;
                currentUserMessageTokens = estimateTokens(currentUserMessage);
                tokens.promptT = currentUserMessageTokens;
                totalPromptTokens += currentUserMessageTokens;
                maxSummaryToken += currentUserMessageTokens;
                logger.info(`Captured human message: "${msg_text.substring(0, 50)}..."`);
            }
            // Process assistant messages
            else if (sender === 'assistant' && currentUserMessage) {
                logger.info(`Processing assistant message for user message: "${currentUserMessage.substring(0, 50)}..."`);
                logger.info(`Assistant message: "${msg_text.substring(0, 50)}..."`);
            } else if (sender === 'assistant' && !currentUserMessage) {
                logger.warn(`Skipping assistant message without preceding user message`);
                continue;
            }

            // Process assistant response and create document
            if (sender === 'assistant' && currentUserMessage) {
                const assistant_message = msg_text;
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

                // Log profile data before creating message
                logger.info(`Creating message with user profile: ${JSON.stringify({
                    hasProfile: !!currentUser.profile,
                    profile: currentUser.profile
                })}`);

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
                    model: {
                        title: 'Anthropic',
                        code: 'ANTHROPIC',
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
                    responseAPI: 'ANTHROPIC',
                    media: null,
                    cloneMedia: null,
                    companyId: new mongoose.Types.ObjectId(config.company_id),
                    reaction: [],
                    seq: new Date(),
                    isMedia: false,
                    createdAt: createTime,
                    updatedAt: updateTime,
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
                            invalid_tool_calls: [],
                            usage_metadata: null
                        }
                    })),
                    system: encryptedData(JSON.stringify({
                        type: 'system',
                        data: {
                            content: systemMessageContent,
                            additional_kwargs: {},
                            response_metadata: {},
                            type: 'system'
                        }
                    })),
                    sumhistory_checkpoint: currentSumhistoryCheckpoint,
                    summarizedHistory: summarizedHistory || null
                };

                documents.push(messageDoc);
                logger.info(`Created message document ${documents.length} for chat ${chat_id}`);
                logger.info(`Message user field: ${JSON.stringify(messageDoc.user)}`);

                // Reset for next pair
                currentUserMessage = null;
                currentUserMessageTokens = 0;
            }
        }

        // Save all documents to MongoDB
        if (documents.length > 0) {
            logger.info(`Attempting to insert ${documents.length} Anthropic messages for chat ${chat_id}`);
            const insertedMessages = await Message.insertMany(documents);
            logger.info(`Successfully inserted ${documents.length} Anthropic messages for chat ${chat_id}`);

            // Verify first message has profile data
            if (insertedMessages.length > 0) {
                const firstMessage = await Message.findById(insertedMessages[0]._id).lean();
                logger.info(`Verified first message user data: ${JSON.stringify(firstMessage.user)}`);
            }
        } else {
            logger.warn(`No documents created for Anthropic chat ${chat_id}. Filtered messages: ${filtered_sorted_messages.length}, Original messages: ${chat_messages.length}`);
        }

        return {
            success: true,
            messageCount: documents.length,
            totalTokens: totalImportedTokens
        };

    } catch (error) {
        logger.error(`Error processing Anthropic conversation: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        throw error;
    }
};

module.exports = {
    processAnthropicConversation,
    estimateTokens,
    createCheckpointHash,
    createSimpleSummary,
    createLLMSummary,
    getDefaultModelKey
};
