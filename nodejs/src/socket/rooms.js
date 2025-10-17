const { REDIS } = require("../config/config");
const { SOCKET_EVENTS, SOCKET_ROOM_PREFIX } = require("../config/constants/socket");
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const Chat = require('../models/chat');
const ChatMember = require('../models/chatmember');
const { catchSocketAsync } = require("../utils/helper");
const Company = require('../models/company');
const UserBot = require('../models/userBot');
const { LINK } = require('../config/config');
const { decryptedData } = require('../utils/helper');
const logger = require("../utils/logger");
const { checkChatAccess, socketFetchChatById, initializeChat } = require('../services/chat');
const { socketMessageList, sendMessage, getUsedCredit } = require('../services/thread');
const { socketWorkSpaceList } = require("../services/workspace");
const { socketChatMemberList } = require("../services/chatmember");
const User = require('../models/user');
const { fetchModalList } = require("../services/userBot");
const { toolExecutor, generateTitleByLLM } = require("../services/langgraph");

let sockets = global.io.sockets;

const pubClient = createClient({ url: `redis://${REDIS.HOST}:${REDIS.PORT}`});
const subClient = pubClient.duplicate();

// managed room at scale level
io.adapter(createAdapter(pubClient, subClient));

sockets.on('connection', function (socket) {
    /* join & Leave room for chat */
    socket.on(SOCKET_EVENTS.JOIN_CHAT_ROOM, catchSocketAsync(async (data) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${data['chatId']}`;
        
        if (!socket.adapter?.rooms?.get(roomName)?.has(socket.id)) {
            socket.join(roomName);
            console.log(`Socket ${socket.id} joined room ${roomName}`);
            //sockets.to(roomName).emit(SOCKET_EVENTS.SUBSCRIPTION_STATUS);
        } else {
            logger.info(`Socket ${socket.id} already in room ${roomName}`);
        }
    }));

    socket.on(SOCKET_EVENTS.LEAVE_CHAT_ROOM, catchSocketAsync(function (data) {
        socket.leave(`${SOCKET_ROOM_PREFIX.CHAT}${data['chatId']}`);
    }));

    socket.on(SOCKET_EVENTS.JOIN_THREAD_ROOM, catchSocketAsync((data) => {
        const roomName = `${SOCKET_ROOM_PREFIX.THREAD}${data['type']}-${data['messageId']}`;

        if (!socket.adapter?.rooms?.get(roomName)?.has(socket.id)) {
            socket.join(roomName);
            pubClient.sAdd(roomName, data.userId);
        } else {
            logger.info(`Socket ${socket.id} already in room ${roomName}`);
        }

    }));

    socket.on(SOCKET_EVENTS.LEAVE_THREAD_ROOM, catchSocketAsync((data) => {
        if (data.hasOwnProperty('type') && data.hasOwnProperty('messageId')) {
            const roomName = `${SOCKET_ROOM_PREFIX.THREAD}${data['type']}-${data['messageId']}`;
            socket.leave(roomName);
            pubClient.sRem(roomName, data.userId)
        }
    }));

    socket.on(SOCKET_EVENTS.ON_TYPING_THREAD, catchSocketAsync((data) => {
        const roomName = `${SOCKET_ROOM_PREFIX.THREAD}${data['type']}-${data['messageId']}`;
        sockets.to(roomName).emit(SOCKET_EVENTS.ON_TYPING_THREAD, data);
    }));

    socket.on(SOCKET_EVENTS.START_STREAMING, catchSocketAsync((data) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${data['chatId']}`;
        sockets.to(roomName).emit(SOCKET_EVENTS.START_STREAMING, data);
    }));

    socket.on(SOCKET_EVENTS.STOP_STREAMING, catchSocketAsync((data) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${data['chatId']}`;
        sockets.to(roomName).emit(SOCKET_EVENTS.STOP_STREAMING, { proccedMsg: data.proccedMsg, userId: data.userId });
    }));

    socket.on(SOCKET_EVENTS.ON_QUERY_TYPING, catchSocketAsync((data) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${data['chatId']}`;
        sockets.to(roomName).emit(SOCKET_EVENTS.ON_QUERY_TYPING, data);
    }));

    socket.on(SOCKET_EVENTS.DISABLE_QUERY_INPUT, catchSocketAsync((data) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${data['chatId']}`;
        sockets.to(roomName).emit(SOCKET_EVENTS.DISABLE_QUERY_INPUT, {});
    }));

    socket.on(SOCKET_EVENTS.NEW_CHAT_MESSAGE, catchSocketAsync((data) => {
        Promise.all([
            Chat.updateOne({ _id: data.chatId }, { $set: { isNewChat: false }}),
            ChatMember.updateMany({ chatId: data.chatId }, { $set: { isNewChat: false }})
        ]);
    }));

    socket.on(SOCKET_EVENTS.JOIN_COMPANY_ROOM, catchSocketAsync(({ companyId }) => {
        const companyRoom = `${SOCKET_ROOM_PREFIX.COMPANY}${companyId}`;

        if (!socket.adapter?.rooms?.get(companyRoom)?.has(socket.id)) {
            socket.join(companyRoom);
        }

    }));

    socket.on(SOCKET_EVENTS.LOAD_CONVERSATION, catchSocketAsync(async ({ chatId, userId, companyId, isNewChat }) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${chatId}`;
        if (isNewChat) {
            const modalList = await fetchModalList(companyId);
            sockets.to(roomName).emit(SOCKET_EVENTS.LOAD_CONVERSATION, { access: true });
            sockets.to(roomName).emit(SOCKET_EVENTS.FETCH_MODAL_LIST, { modalList });
        } else {
            const access = await checkChatAccess({ chatId, userId });
            sockets.to(roomName).emit(SOCKET_EVENTS.LOAD_CONVERSATION, { access });

            if (access) {
                const modalList = await fetchModalList(companyId);
                sockets.to(roomName).emit(SOCKET_EVENTS.FETCH_MODAL_LIST, { modalList });
            }
        }
    }));

    socket.on(SOCKET_EVENTS.MESSAGE_LIST, catchSocketAsync(async ({ chatId, companyId, userId,offset,limit }) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${chatId}`;
        const messageList = await socketMessageList({ chatId, companyId, userId,offset,limit });
        sockets.to(roomName).emit(SOCKET_EVENTS.MESSAGE_LIST, { messageList });
    }));

    socket.on(SOCKET_EVENTS.WORKSPACE_LIST, catchSocketAsync(async ({ userId, chatId }) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${chatId}`;
        const workspaceList = await socketWorkSpaceList({ userId });
        sockets.to(roomName).emit(SOCKET_EVENTS.WORKSPACE_LIST, { workspaceList });
    }));

    socket.on(SOCKET_EVENTS.FETCH_CHAT_BY_ID, catchSocketAsync(async ({ chatId }) => {
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${chatId}`;
        const chat = await socketFetchChatById({ chatId });
        sockets.to(roomName).emit(SOCKET_EVENTS.FETCH_CHAT_BY_ID, { chat });
    }));

    socket.on(SOCKET_EVENTS.CHAT_MEMBER_LIST, catchSocketAsync(async (filter) => {
        const { chatId, brainId, isPrivateBrainVisible,userId } = filter;
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${chatId}`;
        const chatMemberList = await socketChatMemberList({ chatId, brainId,isPrivateBrainVisible,userId });
        sockets.to(roomName).emit(SOCKET_EVENTS.CHAT_MEMBER_LIST, { chatMembers:chatMemberList,chatId : chatId });
    }));

    socket.on(SOCKET_EVENTS.INITIALIZE_CHAT, catchSocketAsync(async (data) => {
        await initializeChat(data);
    }));

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, catchSocketAsync(async (data) => {
        await sendMessage(data);
    }));

    socket.on(SOCKET_EVENTS.PRIVATE_BRAIN_ON, catchSocketAsync(async ({userId}) => {
        const currUser= await User.findOne({_id:userId},{isPrivateBrainVisible:1})
        socket.emit(SOCKET_EVENTS.PRIVATE_BRAIN_ON, {isPrivateBrainVisible:currUser.isPrivateBrainVisible,_id:userId})
       

    }));    
    socket.on(SOCKET_EVENTS.LLM_RESPONSE_SEND, catchSocketAsync(async (data) => {
        await toolExecutor(data, socket);
    }));
    
    socket.on(SOCKET_EVENTS.GENERATE_TITLE_BY_LLM, catchSocketAsync(async (data) => {
        const { chatId } = data;
        const roomName = `${SOCKET_ROOM_PREFIX.CHAT}${chatId}`;
        const title = await generateTitleByLLM(data);
        sockets.to(roomName).emit(SOCKET_EVENTS.GENERATE_TITLE_BY_LLM, { title });
    }));
})

module.exports = {
    pubClient, 
    subClient
}
