const Thread = require('../models/thread');
const dbService = require('../utils/dbService');
const { THREAD_MESSAGE_TYPE } = require('../config/constants/common');
const User = require('../models/user');
const {formatAIMessage, formatAIMessageResponse, formatUser, encryptedData, getCompanyId, decryptedData } = require('../utils/helper');
const ReplyThread = require('../models/replythread');
const { sendUserQuery } = require('../socket/chat');
const Company = require('../models/company');
const { checkSubscription } = require('./auth');
const { AI_MODAL_PROVIDER } = require('../config/constants/aimodal');
const mongoose = require('mongoose');
const Subscription = require('../models/subscription');
const chat = require('../models/chat');
const { initializeMemory, processMemoryAfterLLMResponse, initializeMemoryForFirstMessage } = require('./memoryService');
const { ChatOpenAI } = require('@langchain/openai');
const logger = require('../utils/logger');


const sendMessage = async (payload) => {
    try {
        Thread.create({
            ...payload, 
            message: encryptedData(JSON.stringify(payload.message)),
            user: formatUser(payload.user),
            chat_session_id: payload.chatId,
            seq: Date.now(),
            _id: payload.messageId,
            isPaid: payload.isPaid,
            companyId: payload.companyId
        });
        sendUserQuery(payload.chatId, { ...payload, user: payload.user, id: payload.messageId });
        return true;
    } catch (error) {
        handleError(error, 'Error - sendMessage');
    }
}

const editMessage = async (req) => {
    try {
        return Thread.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true });
    } catch (error) {
        handleError(error, 'Error- editMessage');
    }
}

const getAll = async (req) => {
    try {
        const { query = {}, options = {} } = req.body;

        const [result] = await Promise.all([
            dbService.getAllDocuments(Thread, query, options),
        ])

        const finalResult = await Promise.all(result.data.map(async (message) => {
            const messageId = message._id;

            const [question_count, answer_count, question_senders, answer_senders, question_thread_last, answer_thread_last] = await Promise.all([
                ReplyThread.countDocuments({ messageId, type: THREAD_MESSAGE_TYPE.QUESTION }),
                ReplyThread.countDocuments({ messageId, type: THREAD_MESSAGE_TYPE.ANSWER }),
                ReplyThread.distinct('sender', { messageId, type: THREAD_MESSAGE_TYPE.QUESTION }),
                ReplyThread.distinct('sender', { messageId, type: THREAD_MESSAGE_TYPE.ANSWER }),
                ReplyThread.findOne({ messageId, type: THREAD_MESSAGE_TYPE.QUESTION }).sort({ createdAt: -1 }),
                ReplyThread.findOne({ messageId, type: THREAD_MESSAGE_TYPE.ANSWER }).sort({ createdAt: -1 })
            ]);

            const [question_users, answer_users] = await Promise.all([
                User.find({ _id: { $in: question_senders } }, { email: 1, profile: 1, fname: 1, lname: 1 }),
                User.find({ _id: { $in: answer_senders } }, { email: 1, profile: 1, fname: 1, lname: 1 })
            ]);

            return {
                ...message._doc,
                question_thread: {
                    count: question_count,
                    users: question_users,
                    last_time: question_thread_last?.createdAt || '',
                },
                answer_thread: {
                    count: answer_count,
                    users: answer_users,
                    last_time: answer_thread_last?.createdAt || '',
                },
            };
        }));

        return {
            status: result.status,
            code: result.code,
            message: result.message,
            data: finalResult,
            paginator: result.paginator,
        };
    } catch (error) {
        handleError(error, 'Error - getAll');
    }
};

const addReaction = async (req) => {
    try {
        const existing = await Thread.findOne({ 'reaction.user.id': { $in: req.userId }, 'reaction.emoji': req.body.emoji }, { reaction: 1 });
        let query;
        const obj = {
            reaction: {
                user: {
                    username: req.body.user.username,
                    email: req.body.user.email,
                    id: req.body.user.id
                },
                emoji: req.body.emoji
            }
        }
        if (existing) {
            query = {
                $pull: {
                    ...obj
                }
            }
        } else {
            query = {
                $push: {
                    ...obj
                }
            }
        }
        return Thread.findOneAndUpdate({ _id: req.body.id }, query, { new: true }).select('message reaction');
    } catch (error) {
        handleError(error, 'Error - addReaction');
    }
}

const saveTime = async (req) => {
    try {
        return Thread.updateOne({ _id: req.body.id }, { $set: { responseTime: req.body.responseTime } })
    } catch (error) {
        handleError(error, 'Error - saveTime');
    }
}

const getRemainingMessageCount = async (req) => {
    try {
        const [planType] = await Promise.all([

            checkSubscription(req),
        ])
        return {
            planType
        }
    } catch (error) {
        handleError(error, 'Error - saveTime');
    }
}

async function socketMessageList(filter) {
    try {
        const query = {
            chatId: filter.chatId,
        }
        const options = {
            offset: filter.offset,
            limit: filter.limit,
            select: 'user message responseModel ai seq media isMedia promptId customGptId responseAPI cloneMedia openai_error model proAgentData citations',
            populate: [
                {
                    path: 'customGptId',
                    select: "title slug systemPrompt coverImg"
                }
            ],
            sort: { createdAt:-1 }
        }

        const [result] = await Promise.all([
            dbService.getAllDocuments(Thread, query, options),     
        ])

        const reversedData = result.data.reverse();
        //Fetch user msg credit
        const user = await User.findById(filter.userId)
            .select('msgCredit')
            .lean();


        const creditInfo = await getUsedCredit(filter, user);
        const finalResult = await Promise.all(reversedData.map(async (message) => {
            const messageId = message._id;

            const [question_count, answer_count, question_senders, answer_senders, question_thread_last, answer_thread_last] = await Promise.all([
                ReplyThread.countDocuments({ messageId, type: THREAD_MESSAGE_TYPE.QUESTION }),
                ReplyThread.countDocuments({ messageId, type: THREAD_MESSAGE_TYPE.ANSWER }),
                ReplyThread.distinct('sender', { messageId, type: THREAD_MESSAGE_TYPE.QUESTION }),
                ReplyThread.distinct('sender', { messageId, type: THREAD_MESSAGE_TYPE.ANSWER }),
                ReplyThread.findOne({ messageId, type: THREAD_MESSAGE_TYPE.QUESTION }).sort({ createdAt: -1 }),
                ReplyThread.findOne({ messageId, type: THREAD_MESSAGE_TYPE.ANSWER }).sort({ createdAt: -1 })
            ]);

            const [question_users, answer_users] = await Promise.all([
                User.find({ _id: { $in: question_senders } }, { email: 1, profile: 1, fname: 1, lname: 1 }),
                User.find({ _id: { $in: answer_senders } }, { email: 1, profile: 1, fname: 1, lname: 1 })
            ]);

            return {
                ...message._doc,
                question_thread: {
                    count: question_count,
                    users: question_users,
                    last_time: question_thread_last?.createdAt || '',
                },
                answer_thread: {
                    count: answer_count,
                    users: answer_users,
                    last_time: answer_thread_last?.createdAt || '',
                },
            };
        }));

      
        return {
            data: finalResult,
            creditInfo,
            paginator: result.paginator,
        };
    } catch (error) {
        handleError(error, 'Error - socketMessageList');
    }
};

const getUsedCredit = async (filter, user, subscription=null,isPaid=true) => {
    const matchCondition = {
        "companyId": new mongoose.Types.ObjectId(filter.companyId),
        "user.id": new mongoose.Types.ObjectId(filter.userId),
        openai_error: { $exists: false }
    };
    
    const aggregationPipeline = [
        { $match: matchCondition },
        {
            $project: {
                user: 1,
                usedCredit: 1
            }
        },
        {
            $group: {
                _id: '$user.id',
                totalCreditsUsed: { $sum: '$usedCredit' }
            }
        }        
    ];
    
    const [userMsgCount] = await Promise.all([
        Thread.aggregate(aggregationPipeline)
    ])

    const creditInfo = {
        msgCreditLimit: user?.msgCredit || 0,
        msgCreditUsed: userMsgCount[0]?.totalCreditsUsed || 0,
        //subscriptionStatus: null
    };
    
    return creditInfo;
}


const checkExisting = async function (req) {
    const companyId = getCompanyId(req.user);
    const result = await dbService.getSingleDocumentById(User, req.user.id,[],companyId);
    if (!result) {
        throw new Error(_localize('module.notFound', req, 'user'));
    }
    return result;
}

async function getUserMsgCredit(req) {
    try {
        const [result, company, credit] = await Promise.all([
            checkExisting(req),
            Company.findOne({ _id: req.user.company.id }, { freeCredit: 1,freeTrialStartDate: 1 }).lean(),
            getUsedCredit({ companyId: req.user.company.id, userId: req.user.id }, req.user),
            
        ]);
        const removeFields = ['password', 'fcmTokens', 'mfaSecret', 'resetHash'];
        removeFields.forEach(field => {
            delete result[field];
        });
        return {
            ...(company?.freeTrialStartDate
              ? { freeTrialStartDate: company?.freeTrialStartDate }
              : {}),
            msgCreditLimit: credit.msgCreditLimit,
            msgCreditUsed: credit.msgCreditUsed,
            //subscriptionStatus: null,
        };
    } catch (error) {
        handleError(error, 'Error - getUserMsgCredit');
    }
}


const searchMessage3 = async (req) => {
    try {
        const userId = req.userId;
        const brains = req.body.query.brains;
        const searchTerm = req.body.query.search.trim().toLowerCase();
        const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 1);

        let messages = [];
        let chatFilter = {};

        if (searchTerm.length > 0) {
            messages = await Thread.find(
                { 'brain.id': { $in: brains } },
                { message: 1, ai: 1, chatId: 1, _id: 1, user: 1, brain: 1 }
            ).lean();

            chatFilter = { 
                'brain.id': { $in: brains },
                'title': { $regex: new RegExp(`\\b${searchTerm}\\b`, 'i') }  
            }
        } else {
            chatFilter = { 
                'user.id': userId,
            }
        }

        const chatRecords = await chat.find(
            chatFilter, 
            { _id: 1, title: 1, brain: 1 }
        )
        .sort({ createdAt: -1 })
        .limit(searchWords.length > 0 ? 0 : 5)
        .lean();
        
        const messageResults = (await Promise.all(messages.map(async (msg) => {
            try {
                if (!msg.message && !msg.ai) return null;

                let messageContent = "";
                let aiContent = "";

                try {
                    const decryptedMessage = JSON.parse(await decryptedData(msg?.message));
                    messageContent = decryptedMessage?.data?.content?.toLowerCase() || "";
                    
                } catch (decryptError) {
                    console.error('Error decrypting message content:', decryptError);
                }

                try {
                    if(msg?.ai){
                        const decryptedAi = JSON.parse(await decryptedData(msg?.ai));
                        aiContent = decryptedAi?.data?.content?.toLowerCase() || "";
                    }                    
                } catch (decryptError) {
                    console.error('Error decrypting AI content:', decryptError);
                }

                if (!messageContent && !aiContent) return null;

                // **Exact Match Check**
                const exactMatchRegex = new RegExp(`\\b${searchTerm}\\b`, 'i');
                const exactMatch = exactMatchRegex.test(messageContent) || exactMatchRegex.test(aiContent);

                // **Whole Word Match Count**
                let matchCount = 0;
                searchWords.forEach(word => {
                    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
                    if (wordRegex.test(messageContent) || wordRegex.test(aiContent)) {
                        matchCount += 1;
                    }
                });

                // If either exact match or partial matches exist, return the message
                if (exactMatch || matchCount > 0) {
                    return {
                        type: 'message',
                        message: messageContent,
                        ai: aiContent,
                        id: msg._id,
                        chatId: msg.chatId,
                        user: msg.user?.email,
                        brain: msg.brain,
                        exactMatch,
                        matchCount
                    };
                }

                return null;
            } catch (error) {
                console.error('Error processing message:', error);
                return null;
            }
        }))).filter(Boolean);

        // **Chat Records Processing**
        const chatResults = chatRecords.map(record => ({
            type: 'chat',
            id: record._id,
            chatId: record._id,
            title: record.title,
            brain: record.brain,
            exactMatch: true, // Chat titles are assumed to be exact matches
            matchCount: 1
        }));

        // **Merge & Remove Duplicates**
        const uniqueResults = [...messageResults].filter(msgResult => 
            !chatResults.some(chatResult => chatResult.chatId === msgResult.chatId)
        );

        // **Final Sorting Logic**
        const allResults = [...chatResults, ...uniqueResults].sort((a, b) => {
            if (a.exactMatch && !b.exactMatch) return -1;  // Exact match comes first
            if (!a.exactMatch && b.exactMatch) return 1;   // Lower rank for non-exact
            return b.matchCount - a.matchCount;            // Higher word matches ranked higher
        });

        return allResults;
        
    } catch (error) {
        handleError(error, 'Error - searchMessage');
    }
}

const BATCH_SIZE = 100; // Adjust batch size based on memory limits

const searchMessage = async (req) => {
    try {
        const userId = req.userId;
        const brains = req.body.query.brains;
        const searchTerm = req.body.query.search.trim().toLowerCase();
        const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 1);

        let messages = [];
        let chatFilter = {};
        let chatTitles = [];

        if (searchTerm.length > 0) {
            messages = await Thread.find(
                { 'brain.id': { $in: brains } },
                { message: 1, ai: 1, chatId: 1, _id: 1, user: 1, brain: 1 }
            ).lean();

            chatTitles = await chat.find(
                { 'brain.id': { $in: brains } },
                { title: 1 }
            ).lean();

            chatFilter = { 
                'brain.id': { $in: brains },
                'title': { $regex: new RegExp(`\\b${searchTerm}\\b`, 'i') }  
            };
        } else {
            chatFilter = { 'user.id': userId, 'brain.id': { $in: brains } };
        }

        const chatRecords = await chat.find(chatFilter, { _id: 1, title: 1, brain: 1 })
            .sort({ createdAt: -1 })
            .limit(searchTerm.length === 0 ? 10 : 0)  // Only apply limit when search term is empty
            .lean();

        // **Batch Processing for Decryption**
        const decryptedMessages = [];
        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            const batch = messages.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.all(batch.map(async (msg) => {
                try {
                    if (!msg.message && !msg.ai) return null;

                    const decryptedMessage = msg.message ? JSON.parse(await decryptedData(msg.message)) : null;
                    const decryptedAi = msg.ai ? JSON.parse(await decryptedData(msg.ai)) : null;

                    const messageContent = decryptedMessage?.data?.content?.toLowerCase() || "";
                    const aiContent = decryptedAi?.data?.content?.toLowerCase() || "";

                    if (!messageContent && !aiContent) return null;

                    return { ...msg, messageContent, aiContent };
                } catch (error) {
                    console.error('Error decrypting message:', error);
                    return null;
                }
            }));

            decryptedMessages.push(...batchResults.filter(Boolean));
        }

        // **Regex Optimization**
        const exactMatchRegex = new RegExp(`\\b${searchTerm}\\b`, 'i');
        const wordRegexes = searchWords.map(word => new RegExp(`\\b${word}\\b`, 'i'));

        // **Process Messages**
        const messageResults = decryptedMessages.map(msg => {
            const exactMatch = exactMatchRegex.test(msg.messageContent) || exactMatchRegex.test(msg.aiContent);
            const matchCount = wordRegexes.reduce((count, regex) => 
                count + (regex.test(msg.messageContent) || regex.test(msg.aiContent) ? 1 : 0), 0);
            
            if (exactMatch || matchCount > 0) {
                return {
                    type: 'message',
                    message: msg.messageContent,
                    ai: msg.aiContent,
                    id: msg._id,
                    chatId: msg.chatId,
                    user: msg.user?.email,
                    brain: msg.brain,
                    exactMatch,
                    matchCount,
                    title: chatTitles.find(title => title._id.toString() === msg.chatId.toString())?.title || ''
                };
            }
            return null;
        }).filter(Boolean);

        // **Chat Records Processing**
        const chatResults = chatRecords.map(record => ({
            type: 'chat',
            id: record._id,
            chatId: record._id,
            title: record.title,
            brain: record.brain,
            exactMatch: true, 
            matchCount: 1
        }));

        // **Remove Duplicates Using a Set**
        const chatIds = new Set(chatResults.map(chat => chat.chatId));
        const uniqueMessages = messageResults.filter(msg => !chatIds.has(msg.chatId));

        // **Final Sorting**
        const allResults = [...chatResults, ...uniqueMessages].sort((a, b) => {
            if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
            return b.matchCount - a.matchCount;
        });

        return allResults;
        
    } catch (error) {
        handleError(error, 'Error - searchMessage');
    }
};

async function createLLMConversation (data) {
    try {
        const formatedQuestion = formatAIMessage(data.query);
        const formatedResponse = formatAIMessageResponse(data.answer, {
            search_citations: data.search_citations,
            search_results: data.search_results
        });
        
        // Import generateSumhistoryCheckpoint and system message functions
        const { generateSumhistoryCheckpoint, addSystemMessage } = require('./memoryService');
        
        // Get the latest thread to check if it's the first message in the chat
        const latestThread = await Thread.findOne({ chat_session_id: data.chatId })
            .sort({ seq: -1 })
            .lean();
        
        // For the first message or when no checkpoint exists, use chat session ID
        // For subsequent messages, use the latest checkpoint from the database
        let messageCheckpoint;
        let systemContent = '';
        
        if (!latestThread || !latestThread.sumhistory_checkpoint) {
            // First message in chat - derive checkpoint from chat session ID
            messageCheckpoint = generateSumhistoryCheckpoint(data.chatId);
        } else {
            // Get the latest checkpoint from database (could be updated after pruning)
            const { getLatestCheckpoint } = require('../utils/pipelineQuery');
            const latestCheckpoint = await getLatestCheckpoint(data.chatId);
            messageCheckpoint = latestCheckpoint || generateSumhistoryCheckpoint(data.chatId);
            
            // Get existing system message content from the latest system message
            const latestSystemThread = await Thread.findOne({
                chat_session_id: data.chatId,
                system: { $exists: true, $ne: null }
            }).sort({ createdAt: -1 });
            
            if (latestSystemThread && latestSystemThread.system) {
                try {
                    const decryptedSystem = JSON.parse(decryptedData(latestSystemThread.system));
                    systemContent = decryptedSystem.data?.content || '';
                } catch (error) {
                    logger.error('Error parsing existing system message:', error);
                }
            }
        }
        
        // Determine the credit amount for this conversation and ensure it's stored as double
        // const creditAmount = Number((parseFloat(data.msgCredit || data.usedCredit || 1.0)).toFixed(1));
        
        // logger.info(`📝 [THREAD_DEBUG] Creating thread with data keys: ${Object.keys(data).join(', ')}`);
        // logger.info(`📝 [THREAD_DEBUG] Model: ${data.responseModel || data.model || 'unknown'}`);
        // logger.info(`📝 [THREAD_DEBUG] Credit calculation: msgCredit=${data.msgCredit}, usedCredit=${data.usedCredit}, final=${creditAmount} (stored as Double)`);
        
        // Create the thread document with sumhistory_checkpoint
        const threadDoc = await Thread.create({
            message: encryptedData(JSON.stringify(formatedQuestion)),
            ai: encryptedData(JSON.stringify(formatedResponse)),
            user: formatUser(data.user),
            chat_session_id: data.chatId,
            chatId: data.chatId,
            seq: Date.now(),
            _id: data.messageId,
            companyId: data.companyId,
            promptId: data.promptId,
            customGptId: data.customGptId,
            media: data.media,
            cloneMedia: data.cloneMedia,
            responseModel: data.responseModel,
            responseAPI: data.responseAPI,
            proAgentData: data.proAgentData,
            sumhistory_checkpoint: messageCheckpoint,
            usedCredit: data.usedCredit, // Use model-specific credit from frontend, fallback to usedCredit or 1
            citations: data.citations,
            isPaid: true
        });
        
        // logger.info(`📝 [THREAD_SAVED] Thread saved with usedCredit: ${creditAmount}`);
        
        // Always add system message with the same content and checkpoint as previous messages
        // This ensures every message has a system key until pruning occurs
        await addSystemMessage(systemContent, data.messageId, data.chatId);

        // Initialize memory for conversation summary buffer
        // Process memory for all messages (both regular and regenerated)
        try {
            // Create LLM instance for memory (using same model as response)
            const llmModel = new ChatOpenAI({
                modelName: data.responseModel || 'gpt-4o-mini',
                temperature: 1,
                openAIApiKey: process.env.OPENAI_API_KEY || data.apiKey
            });

            // Initialize memory with chat history
            const memory = await initializeMemory(data.chatId, llmModel, data.messageId);
            
            // Process memory after LLM response (follows Python flow)
            // This automatically handles: buffer setup, pruning, and system message updates
            const tokenCallback = {
                total_tokens: 0,
                getTokenUsage: () => ({ total_tokens: tokenCallback.total_tokens })
            };
            
            const memoryResult = await processMemoryAfterLLMResponse(
                memory,
                data.messageId,
                data.chatId,
                data.query,
                data.answer,
                tokenCallback
            );
            
            logger.info(`Memory processed successfully. Summary tokens: ${memoryResult.tokenUsage.total_tokens}`);
            logger.info(`Checkpoint after processing: ${memoryResult.checkpoint}`);
            
            // Update the messageCheckpoint to use the checkpoint from memory processing
            messageCheckpoint = memoryResult.checkpoint;
                
            // Update the thread document with the new checkpoint
            await Thread.updateOne(
                { _id: data.messageId },
                { sumhistory_checkpoint: messageCheckpoint }
            );
            
            // Update token usage if callback data is available
            if (data.tokenCallback && memoryResult.tokenUsage.total_tokens > 0) {
                await updateTokenUsageSummary(data.messageId, {
                    summaryTokens: memoryResult.tokenUsage.total_tokens,
                    summaryCost: calculateSummaryCost(memoryResult.tokenUsage.total_tokens, data.responseModel)
                });
            }
        } catch (memoryError) {
            logger.error('Error processing memory for conversation:', memoryError);
            // Don't fail the entire conversation creation due to memory errors
        }
    } catch (error) {
        logger.error('Error - createLLMConversation', error);
    }
}

// ============ TOKEN MANAGEMENT FUNCTIONS (migrated from threadRepository.js) ============

/**
 * Default token dictionary structure
 */
const defaultTokenDict = {
    totalCost: '$0',
    promptT: 0,
    completion: 0,
    totalUsed: 0,
    imageT: 0
};

/**
 * Calculate cost for summary tokens based on model
 */
function calculateSummaryCost(tokens, modelName) {
    // Basic cost calculation - adjust rates based on your pricing
    const costPerToken = {
        'gpt-4o': 0.00003,
        'gpt-4o-mini': 0.00000015,
        'gpt-4': 0.00003,
        'gpt-3.5-turbo': 0.000002,
        'default': 0.000002
    };
    
    const rate = costPerToken[modelName] || costPerToken['default'];
    const cost = tokens * rate;
    return `$${cost.toFixed(6)}`;
}

/**
 * Fetch thread model data safely
 * @param {string} threadId - Thread ID
 * @returns {Promise<object|null>} Thread data or null
 */
const _fetchThreadModelData = async (threadId) => {
    try {
        if (!threadId) {
            console.warn('Thread ID not provided');
            return null;
        }

        const thread = await Thread.findById(threadId);
        return thread;
    } catch (error) {
        console.error('Error fetching thread model data:', error);
        return null;
    }
};

/**
 * Safe fetch thread data with error handling
 * @param {string} threadId - Thread ID
 * @returns {Promise<object|null>} Thread data or null
 */
const _safeFetchThreadData = async (threadId) => {
    try {
        const thread = await _fetchThreadModelData(threadId);
        if (!thread) {
            console.warn(`Thread not found with ID: ${threadId}`);
            return null;
        }
        return thread;
    } catch (error) {
        console.error('Error in safe fetch thread data:', error);
        return null;
    }
};

/**
 * Update specific fields in the thread
 * @param {string} threadId - Thread ID
 * @param {object} updateData - Data to update
 * @returns {Promise<boolean>} Success status
 */
const updateThreadFields = async (threadId, updateData) => {
    try {
        if (!threadId) {
            console.error('Thread ID is required for update');
            return false;
        }

        const result = await Thread.findByIdAndUpdate(
            threadId,
            { $set: updateData },
            { new: true, upsert: false }
        );

        if (!result) {
            console.error(`Thread not found for update: ${threadId}`);
            return false;
        }

        console.log('Thread fields updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating thread fields:', error);
        return false;
    }
};

/**
 * Update token fields in the thread
 * @param {string} threadId - Thread ID
 * @param {object} tokenData - Token data to update
 * @returns {Promise<boolean>} Success status
 */
const updateTokenFields = async (threadId, tokenData) => {
    try {
        console.log('🔧 [THREAD_REPO] Updating token fields for thread:', threadId);
        
        const updateData = {
            'tokens.totalUsed': tokenData.totalUsed || 0,
            'tokens.promptT': tokenData.promptT || 0,
            'tokens.completion': tokenData.completion || 0,
            'tokens.totalCost': String(tokenData.totalCost || '0'),
            'tokens.imageT': tokenData.imageT || 0
        };
        
        console.log('📝 [THREAD_REPO] Update data:', updateData);

        const success = await updateThreadFields(threadId, updateData);
        
        if (success) {
            console.log('✅ [THREAD_REPO] Token fields updated successfully');
        } else {
            console.log('❌ [THREAD_REPO] Failed to update token fields');
        }
        
        return success;
    } catch (error) {
        console.error('❌ [THREAD_REPO] Error updating token fields:', error);
        return false;
    }
};

/**
 * Get current token usage dictionary
 * @param {string} threadId - Thread ID
 * @returns {Promise<object>} Current token usage
 */
const getTokenUsageDict = async (threadId) => {
    try {
        const thread = await _safeFetchThreadData(threadId);
        if (!thread || !thread.tokens) {
            return { ...defaultTokenDict };
        }

        return {
            totalCost: thread.tokens.totalCost || '0',
            promptT: thread.tokens.promptT || 0,
            completion: thread.tokens.completion || 0,
            totalUsed: thread.tokens.totalUsed || 0,
            imageT: thread.tokens.imageT || 0
        };
    } catch (error) {
        console.error('Error getting token usage dict:', error);
        return { ...defaultTokenDict };
    }
};

/**
 * Update token usage with new data
 * @param {string} threadId - Thread ID
 * @param {object} newTokenData - New token data
 * @returns {Promise<boolean>} Success status
 */
const updateTokenUsage = async (threadId, newTokenData) => {
    try {
        console.log('🔄 [THREAD_REPO] Updating token usage for thread:', threadId);
        console.log('📝 [THREAD_REPO] New token data:', newTokenData);
        
        const currentTokens = await getTokenUsageDict(threadId);
        console.log('📊 [THREAD_REPO] Current tokens:', currentTokens);
        
        const updatedTokens = {
            totalUsed: (currentTokens.totalUsed || 0) + (newTokenData.totalUsed || 0),
            promptT: (currentTokens.promptT || 0) + (newTokenData.promptT || 0),
            completion: (currentTokens.completion || 0) + (newTokenData.completion || 0),
            totalCost: '$' + (
                (parseFloat(currentTokens.totalCost.replace('$', '') || currentTokens.totalCost) || 0) + 
                (parseFloat(newTokenData.totalCost) || 0)
            ).toFixed(6),
            imageT: (currentTokens.imageT || 0) + (newTokenData.imageT || 0)
        };
        
        const success = await updateTokenFields(threadId, updatedTokens);
        
        if (success) {
            console.log('✅ [THREAD_REPO] Token usage updated successfully');
        } else {
            console.log('❌ [THREAD_REPO] Failed to update token usage');
        }
        
        return success;
    } catch (error) {
        console.error('❌ [THREAD_REPO] Error updating token usage:', error);
        return false;
    }
};

/**
 * Update tools token data (main method used by callback handler)
 * @param {string} threadId - Thread ID
 * @param {object} tokenData - New token data
 * @param {object|null} tokensOld - Old token data (optional)
 * @param {object} additionalData - Additional data for context
 * @returns {Promise<boolean>} Success status
 */
const updateToolsTokenData = async (threadId, tokenData, tokensOld = null, additionalData = {}) => {
    try {
        console.log('💾 [THREAD_REPO] Updating tools token data for thread:', threadId);
        console.log('📝 [THREAD_REPO] Token data:', tokenData);
        console.log('🔧 [THREAD_REPO] Additional data:', additionalData);

        // If tokensOld is not provided, fetch current tokens
        if (!tokensOld) {
            console.log('📊 [THREAD_REPO] Fetching current token usage');
            tokensOld = await getTokenUsageDict(threadId);
            console.log('📈 [THREAD_REPO] Current tokens:', tokensOld);
        }

        // Ensure tokensOld is not null and has required properties
        if (!tokensOld || typeof tokensOld !== 'object') {
            console.warn('⚠️ [THREAD_REPO] tokensOld is null or invalid, using default values');
            tokensOld = { ...defaultTokenDict };
        }

        // Calculate incremental update
        const incrementalTokens = {
            totalUsed: tokenData.totalUsed || 0,
            promptT: tokenData.promptT || 0,
            completion: tokenData.completion || 0,
            totalCost: tokenData.totalCost || 0,
            imageT: tokenData.imageT || 0
        };
        
        console.log('🔢 [THREAD_REPO] Incremental tokens:', incrementalTokens);

        // Update with incremental data
        const success = await updateTokenUsage(threadId, incrementalTokens);
        
        if (success) {
            console.log('✅ [THREAD_REPO] Tools token data updated successfully');
            
            // Log the update for debugging
            const updatedTokens = await getTokenUsageDict(threadId);
            console.log('📊 [THREAD_REPO] Updated token summary:', updatedTokens);
        } else {
            console.log('❌ [THREAD_REPO] Failed to update tools token data');
        }

        return success;
    } catch (error) {
        console.error('❌ [THREAD_REPO] Error updating tools token data:', error);
        return false;
    }
};

/**
 * Update token usage summary (for summary operations)
 * @param {string} threadId - Thread ID
 * @param {object} tokenData - Token data
 * @returns {Promise<boolean>} Success status
 */
const updateTokenUsageSummary = async (threadId, tokenData) => {
    try {
        console.log('Updating token usage summary:', tokenData);
        return await updateTokenUsage(threadId, tokenData);
    } catch (error) {
        console.error('Error updating token usage summary:', error);
        return false;
    }
};

/**
 * Update cache token usage (for cached responses)
 * @param {string} threadId - Thread ID
 * @param {object} tokenData - Token data
 * @returns {Promise<boolean>} Success status
 */
const updateCacheTokenUsage = async (threadId, tokenData) => {
    try {
        console.log('Updating cache token usage:', tokenData);
        return await updateTokenUsage(threadId, tokenData);
    } catch (error) {
        console.error('Error updating cache token usage:', error);
        return false;
    }
};

/**
 * Update image generation prompt tokens
 * @param {string} threadId - Thread ID
 * @param {number} imageTokens - Number of image tokens
 * @returns {Promise<boolean>} Success status
 */
const updateImgGenPrompt = async (threadId, imageTokens) => {
    try {
        console.log('Updating image generation tokens:', imageTokens);
        
        const tokenData = {
            imageT: imageTokens,
            totalUsed: imageTokens // Image tokens count towards total
        };

        return await updateTokenUsage(threadId, tokenData);
    } catch (error) {
        console.error('Error updating image generation tokens:', error);
        return false;
    }
};

/**
 * Overwrite token usage (replace instead of increment)
 * @param {string} threadId - Thread ID
 * @param {object} tokenData - New token data
 * @returns {Promise<boolean>} Success status
 */
const overwriteTokenUsage = async (threadId, tokenData) => {
    try {
        console.log('Overwriting token usage:', tokenData);
        return await updateTokenFields(threadId, tokenData);
    } catch (error) {
        console.error('Error overwriting token usage:', error);
        return false;
    }
};


module.exports = {
    editMessage,
    getAll,
    addReaction,
    sendMessage,
    saveTime,
    getRemainingMessageCount,
    socketMessageList,
    getUsedCredit,
    getUserMsgCredit,
    searchMessage,
    createLLMConversation,
    updateThreadFields,
    updateTokenFields,
    getTokenUsageDict,
    updateTokenUsage,
    updateToolsTokenData,
    updateTokenUsageSummary,
    updateCacheTokenUsage,
    updateImgGenPrompt,
    overwriteTokenUsage,
    calculateSummaryCost
}