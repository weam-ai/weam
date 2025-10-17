const { ConversationSummaryBufferMemory } = require('langchain/memory');
const { ChatOpenAI } = require('@langchain/openai');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');
const Thread = require('../models/thread');
const Messages = Thread; // Alias for consistency with pipelineQuery.js
const { encryptedData, decryptedData } = require('../utils/helper');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { getLatestCheckpoint, retrieveMessagesForRegeneration } = require('../utils/pipelineQuery');

// Configuration constants  
const MAX_TOKEN_LIMIT = 10000; // Increased token limit for ConversationSummaryBufferMemory (was too low at 10)

/**
 * Custom MongoDB Chat Message History for ConversationSummaryBufferMemory
 */
class MongoDBChatMessageHistory {
    constructor(chatSessionId, threadId = null) {
        this.chatSessionId = chatSessionId;
        this.threadId = threadId;
        this.memoryBuffer = '';
    }

    /**
     * Retrieve messages from MongoDB
     */
    async getMessages() {
        try {
            // Use checkpoint-based retrieval like Python implementation
            const messages = await retrieveMessagesForRegeneration(this.chatSessionId);

            const formattedMessages = [];
            
            // First add system message if exists (should be first in the sequence)
            let systemAdded = false;
            for (const msg of messages) {
                if (msg.system) {
                    try {
                        const decryptedSystem = JSON.parse(decryptedData(msg.system));
                        const systemContent = decryptedSystem.content || decryptedSystem.text || '';
                        formattedMessages.push(new SystemMessage(systemContent));
                        // Store system message in memory buffer
                        this.memoryBuffer = systemContent;
                        systemAdded = true;
                        break; // Only use the first system message
                    } catch (err) {
                        logger.error(`Error decrypting system message: ${err.message}`);
                    }
                }
            }
            
            // If no system message was found, add an empty one to ensure proper formatting
            if (!systemAdded) {
                formattedMessages.push(new SystemMessage(''));
            }
            
            // Process all messages to maintain conversation flow
            for (const msg of messages) {
                try {
                    // Add human message
                    if (msg.message) {
                        const decryptedMessageRaw = decryptedData(msg.message);
                        
                        const decryptedMessage = JSON.parse(decryptedMessageRaw);
                        
                        // Try multiple possible content field names
                        let humanContent = '';
                        if (decryptedMessage.content) {
                            humanContent = decryptedMessage.content;
                        } else if (decryptedMessage.text) {
                            humanContent = decryptedMessage.text;
                        } else if (decryptedMessage.message) {
                            humanContent = decryptedMessage.message;
                        } else if (decryptedMessage.data && decryptedMessage.data.content) {
                            humanContent = decryptedMessage.data.content;
                        } else if (typeof decryptedMessage === 'string') {
                            humanContent = decryptedMessage;
                        } else {
                            // Log the structure for debugging
                            logger.warn(`🔍🔍🔍 Unknown human message structure:`, Object.keys(decryptedMessage));
                            humanContent = JSON.stringify(decryptedMessage);
                        }
                        
                        if (!humanContent || humanContent.trim() === '') {
                            logger.warn(`🔍🔍🔍 Empty human message content, using placeholder`);
                            humanContent = 'User message placeholder';
                        }
                        
                        const humanMessage = new HumanMessage(humanContent);
                        
                        // Add any additional properties that might be in the original message
                        if (decryptedMessage.additional_kwargs) {
                            humanMessage.additional_kwargs = decryptedMessage.additional_kwargs;
                        }
                        
                        formattedMessages.push(humanMessage);
                    }

                    // Add AI message if it exists
                    if (msg.ai) {
                        const decryptedAIRaw = decryptedData(msg.ai);
                        
                        const decryptedAI = JSON.parse(decryptedAIRaw);
                        
                        // Try multiple possible content field names
                        let aiContent = '';
                        if (decryptedAI.content) {
                            aiContent = decryptedAI.content;
                        } else if (decryptedAI.text) {
                            aiContent = decryptedAI.text;
                        } else if (decryptedAI.message) {
                            aiContent = decryptedAI.message;
                        } else if (decryptedAI.data && decryptedAI.data.content) {
                            aiContent = decryptedAI.data.content;
                        } else if (typeof decryptedAI === 'string') {
                            aiContent = decryptedAI;
                        } else {
                            // Log the structure for debugging
                            logger.warn(`🔍🔍🔍 Unknown AI message structure:`, Object.keys(decryptedAI));
                            aiContent = JSON.stringify(decryptedAI);
                        }
                        
                        if (!aiContent || aiContent.trim() === '') {
                            logger.warn(`🔍🔍🔍 Empty AI message content, using placeholder`);
                            aiContent = 'AI message placeholder';
                        }
                        
                        const aiMessage = new AIMessage(aiContent);
                        
                        // Add any additional properties
                        if (decryptedAI.additional_kwargs) {
                            aiMessage.additional_kwargs = decryptedAI.additional_kwargs;
                        }
                        
                        formattedMessages.push(aiMessage);
                    }
                } catch (err) {
                    logger.error(`Error processing message: ${err.message}`);
                    logger.error(`🔍🔍🔍 Message structure that failed:`, JSON.stringify(msg, null, 2));
                }
            }
            
            return formattedMessages;
        } catch (error) {
            logger.error('Error retrieving messages from MongoDB:', error);
            return [];
        }
    }

    /**
     * Add a message to MongoDB
     */
    async addMessage(message) {
        try {
            
            // Create a minimal messageData object with only required fields
            const messageData = {
                chat_session_id: this.chatSessionId,
                createdAt: new Date()
            };
            
            // Encrypt the message content based on type
            if (message.type === 'human') {
                const humanContent = JSON.stringify({
                    content: message.data.content,
                    additional_kwargs: {}
                });
                messageData.message = encryptedData(humanContent);
            } else if (message.type === 'ai') {
                const aiContent = JSON.stringify({
                    content: message.data.content,
                    additional_kwargs: {}
                });
                messageData.ai = encryptedData(aiContent);
            } else if (message.type === 'system') {
                const systemContent = JSON.stringify({
                    content: message.data.content
                });
                messageData.system = encryptedData(systemContent);
                
                // Generate a checkpoint hash for system messages
                const checkpointHash = crypto
                    .createHash('sha256')
                    .update(message.data.content + Date.now().toString())
                    .digest('hex');
                messageData.sumhistory_checkpoint = checkpointHash;
                
                // Update memory buffer
                this.memoryBuffer = message.data.content;
            }
            
            // Check if a similar message already exists to prevent duplicates
            const existingQuery = {
                chat_session_id: this.chatSessionId,
                createdAt: { $gte: new Date(Date.now() - 5000) } // Check messages created in last 5 seconds
            };
            
            // Add type-specific field to query
            if (message.type === 'human') {
                existingQuery.message = { $exists: true };
            } else if (message.type === 'ai') {
                existingQuery.ai = { $exists: true };
            } else if (message.type === 'system') {
                existingQuery.system = { $exists: true };
            }
            
            const existingMessage = await Messages.findOne(existingQuery);
            if (existingMessage) {
                return true;
            }
            
            // Save to MongoDB with only the necessary fields
            await Messages.create(messageData);
            
            return true;
        } catch (error) {
            logger.error(`Error saving message to MongoDB: ${error.message}`, error);
            return false;
        }
    }

    /**
     * Clear messages (not implemented for safety)
     */
    async clear() {
        logger.warn('Clear operation not implemented for safety');
    }
}

/**
 * Generate hash for sumhistory_checkpoint
 * Uses SHA-256 to match Python implementation
 */
function generateSumhistoryCheckpoint(content) {
    // Use SHA-256 to match Python implementation
    return crypto.createHash('sha256').update((content || '').toString()).digest('hex');
}

/**
 * Initialize ConversationSummaryBufferMemory
 */
async function initializeMemory(chatSessionId, llmModel, threadId = null) {
    try {
        const chatHistory = new MongoDBChatMessageHistory(chatSessionId, threadId);
    // Get existing system message to initialize the moving summary buffer
        const existingThread = await Thread.findOne({
            chat_session_id: chatSessionId,
            system: { $exists: true, $ne: null }
        }).sort({ seq: -1 });

        let existingSummary = '';
        if (existingThread && existingThread.system) {
            try {
                const decryptedSystem = JSON.parse(decryptedData(existingThread.system));
                existingSummary = decryptedSystem.content || '';
                chatHistory.memoryBuffer = existingSummary;
            } catch (error) {
                logger.error('Error parsing existing system message:', error);
            }
        }
        
        // Create memory with proper configuration
        const memory = new ConversationSummaryBufferMemory({
            memoryKey: 'history',
            inputKey: 'input',
            llm: llmModel,
            maxTokenLimit: MAX_TOKEN_LIMIT,
            returnMessages: true,
            chatHistory: chatHistory
        });

        // Set the moving summary buffer from existing system message
        memory.movingSummaryBuffer = existingSummary;
        
        // Also set the buffer to initialize memory content (critical for pruning)
        if (existingSummary) {
            memory.buffer = existingSummary;
        }
        
        // Ensure the LLM is properly set for summarization
        if (!memory.llm) {
            memory.llm = llmModel;
        }
        
        return memory;
    } catch (error) {
        logger.error('Error initializing memory:', error);
        throw error;
    }
}

/**
 * Add system message to MongoDB with sumhistory_checkpoint
 * Follows the exact Python flow pattern
 * @param {string} message - System message content (can be empty for first message)
 * @param {string} threadId - Thread ID
 * @param {string} chatSessionId - Chat session ID
 * @param {string} customCheckpoint - Optional custom checkpoint to use
 * @returns {Promise<string>} The checkpoint used
 */
async function addSystemMessage(message, threadId, chatSessionId, customCheckpoint = null) {
    try {
        // Match Python format exactly with nested data structure
        const systemMessage = {
            type: "system",
            data: {
                content: message || '',
                additional_kwargs: {},
                response_metadata: {},
                type: "system",
                name: null,
                id: null
            }
        };

        let sumhistoryCheckpoint;
        
        if (customCheckpoint) {
            // Use provided custom checkpoint (usually after pruning)
            sumhistoryCheckpoint = customCheckpoint;
        } else {
            // Python flow: First message uses chat_session_id, subsequent use content
            if (!message || message.trim() === '') {
                // First message - empty system message, checkpoint based on session ID
                sumhistoryCheckpoint = generateSumhistoryCheckpoint(chatSessionId);
            } else {
                // Subsequent messages - checkpoint based on summary content
                sumhistoryCheckpoint = generateSumhistoryCheckpoint(message);
            }
        }

        await Thread.updateOne(
            { _id: threadId, chat_session_id: chatSessionId },
            {
                $set: {
                    system: encryptedData(JSON.stringify(systemMessage)),
                    sumhistory_checkpoint: sumhistoryCheckpoint
                }
            },
            { upsert: true }
        );
        
        return sumhistoryCheckpoint;
    } catch (error) {
        logger.error('Error adding system message:', error);
        throw error;
    }
}

/**
 * Prune memory and update system message
 */
async function pruneMemoryAndUpdateSystem(memory, threadId, chatSessionId, tokenCallback = null) {
    try {
        let tokenUsage = { total_tokens: 0 };
        
        // 1. DIRECT BUFFER MANIPULATION - Always ensure we have content
        let userMessage = "";
        let aiMessage = "";
        
        // Try to get messages from chatHistory.getMessages() first (this gives us properly formatted messages)
        try {
            const messages = await memory.chatHistory.getMessages();
            
            // Get the most recent user and AI messages from properly formatted messages
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                
                if ((msg.type === "human" || msg.constructor.name === "HumanMessage") && !userMessage) {
                    userMessage = msg.content || "";
                } else if ((msg.type === "ai" || msg.constructor.name === "AIMessage") && !aiMessage) {
                    aiMessage = msg.content || "";
                }
                if (userMessage && aiMessage) {
                    break;
                }
            }
        } catch (err) {
            logger.error(`🚨 Error getting messages from getMessages(): ${err.message}`);
        }
        
        // Fallback: Try to get messages from memory.chatHistory.messages if getMessages() didn't work
        if ((!userMessage || !aiMessage) && memory.chatHistory && memory.chatHistory.messages && memory.chatHistory.messages.length > 0) {
            const messages = memory.chatHistory.messages;
            
            // Get the most recent user and AI messages
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].type === "human" && !userMessage) {
                    userMessage = messages[i].content || messages[i].data?.content || "";
                } else if (messages[i].type === "ai" && !aiMessage) {
                    aiMessage = messages[i].content || messages[i].data?.content || "";
                }
                if (userMessage && aiMessage) {
                    break;
                }
            }
        }
        
        // Final fallback - only use placeholders if we really have no messages
        if (!userMessage || userMessage.trim() === '') {
            logger.warn(`🚨 No user message found, using placeholder`);
            userMessage = "User message placeholder";
        }
        if (!aiMessage || aiMessage.trim() === '') {
            logger.warn(`🚨 No AI message found, using placeholder`);
            aiMessage = "AI message placeholder";
        }
        
        // 2. DIRECT BUFFER MANIPULATION - Force buffer content (use correct property name)
        
        // Create a more structured conversation format for better summarization
        const conversationBuffer = `Human: ${userMessage}\n\nAssistant: ${aiMessage}`;
        memory.buffer = conversationBuffer;
        
        // Also ensure the chat_memory has the messages for the summarizer to work with
        if (memory.chatHistory && memory.chatHistory.messages && memory.chatHistory.messages.length === 0) {
            // Add messages directly to chat memory if it's empty
            memory.chatHistory.messages = [
                new HumanMessage(userMessage),
                new AIMessage(aiMessage)
            ];
        }
        
        // 3. EXPLICIT SAVE_CONTEXT - Belt and suspenders approach
        try {
            await memory.saveContext({"input": userMessage}, {"output": aiMessage});
        } catch (e) {
            logger.error(`🚨 SAVE_CONTEXT ERROR: ${e.message}`);
            // Continue anyway since we set buffer directly
        }
        
        if (tokenCallback) {
            // Use callback to track token usage during pruning
            const originalPrune = memory.prune.bind(memory);
            memory.prune = async () => {
                const result = await originalPrune();
                tokenUsage = tokenCallback.getTokenUsage ? tokenCallback.getTokenUsage() : { total_tokens: 0 };
                return result;
            };
        }
        
        try {
            const pruneResult = await memory.prune();
        } catch (e) {
            logger.error(`🚨 PRUNING ERROR: ${e.message}`);
            logger.error(`🚨 PRUNING ERROR STACK: ${e.stack}`);
            throw e;
        }
        
        // 6. GET SUMMARY CONTENT (use correct property name)
        const summaryContent = memory.movingSummaryBuffer || '';
        
        // 7. GENERATE NEW CHECKPOINT AFTER PRUNING (not before)  
        // Only generate and update checkpoint if we have actual summary content
        let newCheckpoint;
        let updateCount = 0;
        
        if (summaryContent && summaryContent.trim() !== '' && 
            !summaryContent.includes('No conversation content provided') && 
            !summaryContent.includes('nothing to summarize')) {
            
            newCheckpoint = generateSumhistoryCheckpoint(summaryContent);
            
            // 8. UPDATE ALL MESSAGES WITH NEW CHECKPOINT
            const updateResult = await Messages.updateMany(
                { chat_session_id: chatSessionId },
                { $set: { sumhistory_checkpoint: newCheckpoint } }
            );
            updateCount = updateResult.modifiedCount;
            
            // 9. ADD SYSTEM MESSAGE WITH SUMMARY AND NEW CHECKPOINT
            await addSystemMessage(summaryContent, threadId, chatSessionId, newCheckpoint);
        } else {
            logger.warn(`🚨 SKIPPING CHECKPOINT UPDATE - NO VALID SUMMARY CONTENT`);
            newCheckpoint = 'no-update';
        }
        
        return {
            checkpoint: newCheckpoint,
            tokenUsage,
            summaryContent
        };
    } catch (error) {
        logger.error(`Error pruning memory: ${error.message}`, error);
        throw error;
    }
}

// NOTE: shouldPruneMemory function removed - ConversationSummaryBufferMemory handles this internally
// The memory class automatically prunes when it exceeds maxTokenLimit during prune() calls

/**
 * Process memory after LLM response - follows exact Python flow
 * This function should be called after every LLM response
 * @param {object} memory - The ConversationSummaryBufferMemory instance
 * @param {string} threadId - Thread ID
 * @param {string} chatSessionId - Chat session ID
 * @param {string} userMessage - The user's input message
 * @param {string} aiMessage - The AI's response message
 * @param {function} tokenCallback - Optional token usage callback
 * @returns {Promise<object>} Result object with checkpoint and summary info
 */
async function processMemoryAfterLLMResponse(memory, threadId, chatSessionId, userMessage, aiMessage, tokenCallback = null) {
    try {

        let tokenUsage = { total_tokens: 0 };

        // 1. DIRECT BUFFER MANIPULATION - Always ensure we have content (like Python)
        
        // Create a structured conversation format for better summarization
        const conversationBuffer = `Human: ${userMessage}\nAI: ${aiMessage}`;
        memory.buffer = conversationBuffer;
        
        // 2. EXPLICIT SAVE_CONTEXT - Belt and suspenders approach (like Python)
        try {
            await memory.saveContext({"input": userMessage}, {"output": aiMessage});
        } catch (e) {
            logger.error(`🚨 SAVE_CONTEXT ERROR: ${e.message}`);
            // Continue anyway since we set buffer directly
        }
        
        if (tokenCallback) {
            const originalPrune = memory.prune.bind(memory);
            memory.prune = async () => {
                const result = await originalPrune();
                tokenUsage = tokenCallback.getTokenUsage ? tokenCallback.getTokenUsage() : { total_tokens: 0 };
                return result;
            };
        }
        
        try {
            const pruneResult = await memory.prune();
        } catch (e) {
            logger.error(`🚨 PRUNING ERROR: ${e.message}`);
            logger.error(`🚨 PRUNING ERROR STACK: ${e.stack}`);
        }
        
        // 5. ALWAYS ADD SYSTEM MESSAGE (like Python) 
        // Python always calls chat_history.add_message_system after LLM response
        const summaryContent = memory.movingSummaryBuffer || '';
        const checkpoint = await addSystemMessage(summaryContent, threadId, chatSessionId);
        
        return {
            checkpoint: checkpoint,
            tokenUsage: tokenUsage,
            summaryContent: summaryContent,
            memoryProcessed: true
        };
        
    } catch (error) {
        logger.error(`Error processing memory after LLM response: ${error.message}`, error);
        throw error;
    }
}

/**
 * Initialize memory for first message - creates empty system message
 * This should be called before the first LLM call in a new chat session
 * @param {string} threadId - Thread ID
 * @param {string} chatSessionId - Chat session ID
 * @returns {Promise<string>} The checkpoint used
 */
async function initializeMemoryForFirstMessage(threadId, chatSessionId) {
    try {
        
        // Python flow: First message always creates empty system message with checkpoint from session ID
        const checkpoint = await addSystemMessage('', threadId, chatSessionId);
        return checkpoint;
    } catch (error) {
        logger.error(`Error initializing memory for first message: ${error.message}`, error);
        throw error;
    }
}

/**
 * Get conversation history for LLM - matches Python flow exactly
 * Returns array of LangChain message objects: [SystemMessage, HumanMessage, AIMessage, ...]
 * @param {string} chatSessionId - Chat session ID
 * @returns {Promise<Array>} Array of LangChain message objects
 */
async function getConversationHistory(chatSessionId) {
    try {
        
        // Use the same retrieval logic as the MongoDBChatMessageHistory.getMessages()
        const messages = await retrieveMessagesForRegeneration(chatSessionId);

        const formattedMessages = [];
        
        // First add system message if exists (should be first in the sequence)
        let systemAdded = false;
        for (const msg of messages) {
            if (msg.system) {
                try {
                    const decryptedSystem = JSON.parse(decryptedData(msg.system));
                    const systemContent = decryptedSystem.data?.content || decryptedSystem.content || '';
                    formattedMessages.push(new SystemMessage(systemContent));
                    systemAdded = true;
                    break; // Only use the first system message
                } catch (err) {
                    logger.error(`Error decrypting system message: ${err.message}`);
                }
            }
        }
        
        // If no system message was found, add an empty one (Python pattern)
        if (!systemAdded) {
            formattedMessages.push(new SystemMessage(''));
        }
        
        // Process all messages to maintain conversation flow
        for (const msg of messages) {
            try {
                // Add human message
                if (msg.message) {
                    const decryptedMessageRaw = decryptedData(msg.message);
                    const decryptedMessage = JSON.parse(decryptedMessageRaw);
                    
                    // Try multiple possible content field names
                    let humanContent = '';
                    if (decryptedMessage.data?.content) {
                        humanContent = decryptedMessage.data.content;
                    } else if (decryptedMessage.content) {
                        humanContent = decryptedMessage.content;
                    } else if (decryptedMessage.text) {
                        humanContent = decryptedMessage.text;
                    } else if (typeof decryptedMessage === 'string') {
                        humanContent = decryptedMessage;
                    } else {
                        humanContent = JSON.stringify(decryptedMessage);
                    }
                    
                    if (humanContent && humanContent.trim() !== '') {
                        formattedMessages.push(new HumanMessage(humanContent));
                    }
                }

                // Add AI message if it exists
                if (msg.ai) {
                    const decryptedAIRaw = decryptedData(msg.ai);
                    const decryptedAI = JSON.parse(decryptedAIRaw);
                    
                    // Try multiple possible content field names
                    let aiContent = '';
                    if (decryptedAI.data?.content) {
                        aiContent = decryptedAI.data.content;
                    } else if (decryptedAI.content) {
                        aiContent = decryptedAI.content;
                    } else if (decryptedAI.text) {
                        aiContent = decryptedAI.text;
                    } else if (typeof decryptedAI === 'string') {
                        aiContent = decryptedAI;
                    } else {
                        aiContent = JSON.stringify(decryptedAI);
                    }
                    
                    if (aiContent && aiContent.trim() !== '') {
                        formattedMessages.push(new AIMessage(aiContent));
                    }
                }
            } catch (err) {
                logger.error(`Error processing message: ${err.message}`);
            }
        }
        
        return formattedMessages;
        
    } catch (error) {
        logger.error(`Error getting conversation history: ${error.message}`, error);
        // Return at least an empty system message so LLM doesn't fail
        return [new SystemMessage('')];
    }
}

module.exports = {
    MongoDBChatMessageHistory,
    initializeMemory,
    addSystemMessage,
    pruneMemoryAndUpdateSystem, // Legacy function - consider using processMemoryAfterLLMResponse instead
    generateSumhistoryCheckpoint,
    processMemoryAfterLLMResponse,
    initializeMemoryForFirstMessage,
    getConversationHistory,
    MAX_TOKEN_LIMIT
};