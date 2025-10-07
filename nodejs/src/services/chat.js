const Chat = require('../models/chat');
const { formatUser, getCompanyId, formatBrain } = require('../utils/helper');
const dbService = require('../utils/dbService');
const ChatMember = require('../models/chatmember');
const shareBrain = require('../models/shareBrain');
const Thread = require('../models/thread');
const Brain = require("../models/brains");
const { createDefaultBrain, shareBrainWithUser } = require('./brain');
const WorkSpace = require('../models/workspace');
const { DEFAULT_NAME } = require('../config/constants/common');
const { enhancePromptByLLM } = require('./langgraph');

const addChat = async (req) => {
    try {
        const { isPrivateBrainVisible } = req.user
        let { addDefaultBrain, workspaceId } = req.body

        let generalBrain=null;
        if (!req.body.isShare && !isPrivateBrainVisible) {
            throw new Error(_localize('module.unAuthorized', req, 'Brain'))
        }

        if (addDefaultBrain && isPrivateBrainVisible) {
            if (!workspaceId) {
                const workspace = await WorkSpace.findOne({ "company.id": getCompanyId(req.user), isDefault: true })
                workspaceId = workspace._id
            }
            const defaultBrainSlug = `default-brain-${req.userId}`
            let defaultBrain = await Brain.findOne({ slug: defaultBrainSlug, workspaceId,isShare:false,isDefault:true })

            let createdDefaultBrain
            if (!defaultBrain) {
                createdDefaultBrain = await createDefaultBrain(req, workspaceId, req.user);
                defaultBrain = createdDefaultBrain

            }
         
            // const existingnew = await Chat.findOne({
            //     "user.id": req.userId,
            //     "brain.id": defaultBrain._id,
            //     isNewChat: true,
            // });

            // if (existingnew) return { _id: existingnew._id, createdDefaultBrain: defaultBrain };

            // const chat = await Chat.create({
            //     user: formatUser(req.user),
            //     brain: formatBrain(defaultBrain),
            //     isNewChat: true,
            // });

            // await ChatMember.create({
            //     chatId: chat._id,
            //     isNewChat: chat.isNewChat,
            //     user: formatUser(req.user),
            //     brain: chat.brain,
            // });

            return {brain:defaultBrain};
        }
        // const existingnew = await Chat.findOne({
        //     "user.id": req.userId,
        //     "brain.id": req.body.brain.id,
        //     isNewChat: true,
        // });
        // if (existingnew) return { _id: existingnew._id };

        // const parentBrain = await Brain.findOne({ _id: req.body.brain.id });

        // const chat = await Chat.create({
        //     user: formatUser(req.user),
        //     brain: req.body.brain,
        //     isNewChat: true,
        //     teams: parentBrain.teams.map((currTeam) => currTeam.id._id),
        // });

        // if (req.body.isShare) {
        //     const brainusers = await shareBrain.find({
        //         "brain.id": req.body.brain.id,
        //     });
        //     const bulkOps = brainusers.map((member) => {
        //         return {
        //             insertOne: {
        //                 document: {
        //                     user: formatUser(member.user),
        //                     chatId: chat._id,
        //                     invitedBy: req.userId,
        //                     isNewChat: chat.isNewChat,
        //                     brain: chat.brain,
        //                     ...(member?.teamId && { teamId: member?.teamId }),
        //                 },
        //             },
        //         };
        //     });

        //     if (bulkOps.length) await ChatMember.bulkWrite(bulkOps);
        // } else {
        //     await ChatMember.create({
        //         chatId: chat._id,
        //         isNewChat: chat.isNewChat,
        //         user: formatUser(req.user),
        //         brain: chat.brain,
        //     });
        // }
        // return chat;
    } catch (error) {
        handleError(error, "Error - addChat");
    }
};

/**
 * Helper to get the default workspace ID for the user.
 */
const getDefaultWorkspaceId = async (user) => {
    const workspace = await WorkSpace.findOne({ "company.id": getCompanyId(user), isDefault: true });
    if (!workspace) throw new Error("Default workspace not found.");
    return workspace._id;
};


const findOrCreateGeneralBrain = async (req, workspaceId) => {
    let brain = await Brain.findOne({ slug: DEFAULT_NAME.GENERAL_BRAIN_SLUG, workspaceId,isShare:true });

    if (!brain) {
        brain = await Brain.create({
            isShare: true,
            title: DEFAULT_NAME.GENERAL_BRAIN_TITLE,
            workspaceId,
            slug: DEFAULT_NAME.GENERAL_BRAIN_SLUG,
            companyId:getCompanyId(req.user),
            user: formatUser(req.user)
        });
        return { ...brain, created: true };
    }

    return brain;
};


/**
 * Helper to find or create a default brain for the user.
 */
const findOrCreateDefaultBrain = async (req, workspaceId) => {
    const defaultBrainSlug = `default-brain-${req.userId}`;
    let brain = await Brain.findOne({ slug: defaultBrainSlug, workspaceId }).lean();

    if (!brain) {
        brain = await createDefaultBrain(req, workspaceId, req.user);
        return { ...brain, created: true };
    }

    return brain;
};

/**
 * Helper to find an existing new chat for the user and brain.
 */
const findExistingNewChat = async (userId, brainId) => {
    return await Chat.findOne({
        "user.id": userId,
        "brain.id": brainId,
        isNewChat: true,
    });
};

/**
 * Helper to create a new chat and associate it with a member.
 */
const createChatWithMember = async (user, brain, isNewChat) => {
    const chat = await Chat.create({
        user: formatUser(user),
        brain: formatBrain(brain),
        isNewChat,
    });

    await addChatMember(chat, user);
    return chat;
};

/**
 * Helper to create a chat with teams.
 */
const createChat = async (user, brain, teams) => {
    return await Chat.create({
        user: formatUser(user),
        brain,
        isNewChat: true,
        teams: teams.map((currTeam) => currTeam.id._id),
    });
};

/**
 * Helper to add a shared brain's members as chat members.
 */
const addSharedBrainMembers = async (brainId, chat, invitedBy) => {
    const brainUsers = await shareBrain.find({ "brain.id": brainId });
    if (!brainUsers.length) return;

    const bulkOps = brainUsers.map((member) => ({
        insertOne: {
            document: {
                user: formatUser(member.user),
                chatId: chat._id,
                invitedBy,
                isNewChat: chat.isNewChat,
                brain: chat.brain,
                ...(member?.teamId && { teamId: member.teamId }),
            },
        },
    }));

    await ChatMember.bulkWrite(bulkOps);
};

/**
 * Helper to add a single chat member.
 */
const addChatMember = async (chat, user) => {
    await ChatMember.create({
        chatId: chat._id,
        isNewChat: chat.isNewChat,
        user: formatUser(user),
        brain: chat.brain,
    });
};


const checkChat = async (req) => {
    const result = await Chat.findOne({ _id: req.params.id });
    if (!result) return false;
    return result;
};

const updateChat = async (req) => {
    try {
        await checkChat(req);
        const updated = Chat.findOneAndUpdate(
            { _id: req.params.id },
            req.body,
            {
                new: true,
            }
        );

        if (req.body.title)
            await ChatMember.updateMany(
                { chatId: req.params.id },
                { $set: { title: req.body.title } }
            );

        return updated;
    } catch (error) {
        handleError(error, "Error - updateWorkSpace");
    }
};

const getAllChat = async (req) => {
    try {
        return dbService.getAllDocuments(
            Chat,
            req.body.query || {},
            req.body.options || {}
        );
    } catch (error) {
        handleError(error, "Error - getAllChat");
    }
};

const removeChat = async (req) => {
    try {
        // return Chat.updateOne({ _id: req.params.id, 'user.id': req.userId }, { $set: { deletedAt: new Date() }})
        const remove = await Chat.deleteOne({ _id: req.params.id });
        await ChatMember.deleteMany({ chatId: req.params.id });
        return remove;
    } catch (error) {
        handleError(error, "Error - removeChat");
    }
};

const getChatById = async (req) => {
    try {
        return Chat.findById({ _id: req.params.id }).populate("brain.id");
    } catch (error) {
        handleError(error, "Error - getChatById");
    }
};

const forkChat = async (req) => {
    try {
        const { conversation, brain, title } = req.body;
        const shareBrains = await shareBrain.find({ 'brain.id': brain.id });
        if (!shareBrains.length) return true;
        const threadIds = conversation.map(thread => thread.id);
        const existingMessage = await Thread.find(
            { _id: { $in: threadIds } },
            { message: 1, user: 1, responseModel: 1, ai: 1, tokens: 1, model: 1, responseAPI: 1, media: 1, cloneMedia: 1, isMedia: 1, sumhistory_checkpoint: 1, system: 1, createdAt: 1, updatedAt: 1, seq: 1, companyId: 1, proAgentData: 1 }
          ).lean();
        if (!existingMessage.length) return true;
        const chatMemberData = [], threadData = [];
        const newChat = await Chat.create({
            user: formatUser(req.user),
            brain: brain,
            title: title,
            isFork: true,
            isNewChat: false,
        });
        for (const record of shareBrains) {
            chatMemberData.push({
                insertOne: {
                    document: {
                        chatId: newChat._id,
                        user: formatUser(record.user),
                        brain: brain,
                        title: title,
                        isNewChat: false,
                    }
                }
            })
        }
        existingMessage.forEach((ele) => {
            threadData.push({
                insertOne: {
                    document: {
                        message: ele.message,
                        chatId: newChat._id,
                        chat_session_id: newChat._id,
                        brain: brain,
                        user: formatUser(ele.user),
                        responseModel: ele.responseModel,
                        ai: ele?.ai,
                        seq: ele.seq,
                        isFork: true,
                        threadIds: [],
                        tokens: ele.tokens,
                        model: ele.model,
                        isActive: true,
                        responseAPI: ele.responseAPI,
                        proAgentData: ele.proAgentData || {},
                        media: ele.media,
                        cloneMedia: ele.cloneMedia,
                        reaction: [],
                        isMedia: ele.isMedia,
                        sumhistory_checkpoint: ele.sumhistory_checkpoint,
                        system: ele.system,
                        createdAt: ele.createdAt,
                        updatedAt: ele.updatedAt,
                        companyId: ele?.companyId
                    }
                }
            })
        })
        if (chatMemberData.length)
            Promise.all([ChatMember.bulkWrite(chatMemberData), Thread.bulkWrite(threadData)]);
        return true;
    } catch (error) {
        handleError(error, "Error - forkChat");
    }
};

const checkChatAccess = async (filter) => {
    try {
        const access = await ChatMember.findOne(
            { chatId: filter.chatId, 'user.id': filter.userId },
            { chatId: 1, user: 1 }
        );
        if (!access) return false;
        return true;
    } catch (error) {
        logger.error("Error - checkChatAccess", error);
    }
};

async function socketFetchChatById(filter) {
    try {
        return Chat.findById(filter.chatId);
    } catch (error) {
        handleError(error, "Error - socketFetchChatById");
    }
}

/**
 * Initialize a new chat for a user.
 * @param {Object} payload - The payload object containing user and default brain.
 * @returns {Promise<void>}
 */
async function initializeChat(payload) {
    try {
        if (!payload?.brain?.id) {
            console.warn('initializeChat called without valid brain.id');
            return;
        }
        const [brains, shareBrains] = await Promise.all([
            Brain.findById({ _id: payload.brain.id }, { teams: 1 }),
            shareBrain.find({ 'brain.id': payload.brain.id, user:{$exists:true} })
        ])
        const bulkOps = [];
        shareBrains.forEach(async (shareBrain) => {
            bulkOps.push({
                insertOne: {
                    document: {
                        chatId: payload.chatId,
                        user: shareBrain.user,
                        brain: payload.brain,
                        isNewChat: false,
                        invitedBy: payload?.user?.id,
                        ...(shareBrain?.teamId && { teamId: shareBrain?.teamId }),
                    }
                }
            })
        })
        await Promise.all([
            Chat.create({
                _id: payload.chatId,
                user: formatUser(payload.user),
                brain: payload.brain,
                isNewChat: false,
                teams: brains?.teams?.map((currTeam) => currTeam.id._id),
            }),
            ChatMember.bulkWrite(bulkOps)
        ])
    } catch (error) {
        handleError(error, 'Error - initializeChat');
    }
}
const enhancePrompt = async (req) => {
    try {
        const { query, apiKey } = req.body;
        const result = await enhancePromptByLLM({ query, apiKey });
        return result;
    } catch (error) {
        handleError(error, 'Error - enhancePrompt');
    }
}

module.exports = {
    addChat,
    getAllChat,
    removeChat,
    getChatById,
    forkChat,
    updateChat,
    checkChatAccess,
    socketFetchChatById,
    initializeChat,
    enhancePrompt
};
