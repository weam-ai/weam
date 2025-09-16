const Thread = require('../models/thread');
const dbService = require('../utils/dbService');
const { THREAD_MESSAGE_TYPE } = require('../config/constants/common');
const User = require('../models/user');
const { formatUser, encryptedData, getCompanyId, decryptedData } = require('../utils/helper');
const ReplyThread = require('../models/replythread');
const { sendUserQuery } = require('../socket/chat');
const Company = require('../models/company');
const { AI_MODAL_PROVIDER } = require('../config/constants/aimodal');
const mongoose = require('mongoose');
const chat = require('../models/chat');


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
        let updateData = req.body;
        
        // If updating AI response, preserve the existing structure and only update content
        if (req.body.ai) {
            // First, get the existing message to preserve its structure
            const existingMessage = await Thread.findById(req.params.id);
            if (existingMessage && existingMessage.ai) {
                try {
                    // Decrypt existing AI response to get its structure
                    const decryptedExistingAI = decryptedData(existingMessage.ai);
                    const existingAIStructure = JSON.parse(decryptedExistingAI);
                    
                    // Update only the content while preserving all other fields
                    const updatedAIStructure = {
                        ...existingAIStructure,
                        data: {
                            ...existingAIStructure.data,
                            content: req.body.ai
                        }
                    };
                    
                    updateData = {
                        ...req.body,
                        ai: encryptedData(JSON.stringify(updatedAIStructure))
                    };
                } catch (parseError) {
                    console.error('Error parsing existing AI structure:', parseError);
                    // Fallback to minimal structure if parsing fails
                    const aiData = {
                        data: {
                            content: req.body.ai
                        }
                    };
                    updateData = {
                        ...req.body,
                        ai: encryptedData(JSON.stringify(aiData))
                    };
                }
            } else {
                // If no existing AI structure, create a minimal one
                const aiData = {
                    data: {
                        content: req.body.ai
                    }
                };
                updateData = {
                    ...req.body,
                    ai: encryptedData(JSON.stringify(aiData))
                };
            }
        }
        
        return Thread.findByIdAndUpdate({ _id: req.params.id }, updateData, { new: true });
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

async function socketMessageList(filter) {
    try {
        const query = {
            chatId: filter.chatId,
        }
        const options = {
            offset: filter.offset,
            limit: filter.limit,
            select: 'user message responseModel ai seq media isMedia promptId customGptId responseAPI cloneMedia openai_error model proAgentData',
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


module.exports = {
    editMessage,
    getAll,
    addReaction,
    sendMessage,
    saveTime,
    socketMessageList,
    getUsedCredit,
    getUserMsgCredit,
    searchMessage
}