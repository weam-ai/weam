const ReplyThread = require('../models/replythread');
const { sendThread } = require('../socket/chat');
const { formatUser, encryptedData } = require('../utils/helper');
const dbService = require('../utils/dbService');
const ChatMember = require('../models/chatmember');
const Chat = require('../models/chat');
const { NOTIFICATION_TYPE, KAFKA_TOPIC } = require('../config/constants/common');
const { sendCommonNotification } = require('./notification');
// const mongoose = require('mongoose');
// const { produceKafkaMessages } = require('../kafka/producer');
const { SOCKET_ROOM_PREFIX } = require('../config/constants/socket');
const Messages = require('../models/thread');

const sendMessage = async (req) => {
    try {
        const { tagusers, messageId, chatId, type } = req.body;
        const threadData = { ...req.body, content: encryptedData(req.body.content) };
        if (tagusers && tagusers.length)
            Object.assign(threadData, { tagusers })

        const message = await ReplyThread.create({ ...threadData, sender: req.userId });
        await Messages.updateOne({ _id: messageId }, { $push: { threadIds: message._id } });

        /**
            * This code generates a unique identifier for a new thread message and prepares the data
            * to be sent to a Kafka topic. It uses MongoDB's ObjectId for uniqueness and captures
            * the current timestamp for creation and update times. The data is then sent to the Kafka
            * topic using the `produceKafkaMessages` function.
            *
            * Steps:
            * 1. Create a new MongoDB ObjectId for the thread message, ensuring a unique identifier.
            * 2. Capture the current date and time in ISO format for the `createdAt` and `updatedAt` fields.
            * 3. Use the `produceKafkaMessages` function to send the prepared thread data to the specified Kafka topic.
            * 
            * Note:
            * - `threadData` should be an object containing the main content of the thread message.
            * - `KAFKA_TOPIC.REPLY_THREAD` is the Kafka topic where the message will be published.
            *
            * @param {Object} threadData - The data to be sent in the Kafka message.
            * @param {Object} req - The request object containing the user ID.
                const customid = new mongoose.mongo.ObjectId();
                const now = new Date();
                produceKafkaMessages(KAFKA_TOPIC.REPLY_THREAD, { 
                    ...threadData,
                    _id: customid,
                    sender: req.userId,
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                });
        */
        //Start Socket Event Sent
        sendThread(req.body.chatId, {
            // ...threadData, kafka code
            ...message._doc,
            sender:formatUser(req.user)
        });
        //End Socket Event Sent

        // Add push notification for thread or mention users
        let usersInChat = await ChatMember.find({ chatId: chatId });

        // Req.user will not receive notification..
        usersInChat = usersInChat.filter(chatMember => chatMember?.user?.id?.toString() != req.userId.toString());
        const chatInfo = await Chat.findOne({ _id: chatId });

        let chatUsers = [];
        let mentionUsers = [];

        // Here logic is if user is already mention then this user send notification for mention and rather than user will
        // receive notification for replay thread.
        if(usersInChat.length > 0){
            chatUsers = usersInChat.map(chatMember => chatMember?.user).filter(user=>!tagusers.includes(user?.id?.toString()));
        }

        if (tagusers.length > 0) {
            mentionUsers = tagusers.map(id => ({ id: id }));
        }

        // Either Chat user Notification
        if (chatUsers.length > 0) {
            // ⚠️ WARNING: Do not use await with sendCommonNotification().
            // This function should be called in the background without blocking the main thread.
            // This line not work as a top level import
            const { pubClient } = require('../socket/rooms');
            const roomName = `${SOCKET_ROOM_PREFIX.THREAD}${type}-${messageId}`;
            const threadMembers = await pubClient.sMembers(roomName);
            const notifyUsers = chatUsers.filter((element) => element?.id && !threadMembers.includes(element?.id?.toString()));
            if (notifyUsers.length)
                sendCommonNotification(NOTIFICATION_TYPE.THREAD_REPLY, notifyUsers, req.user,
                    { 
                        chat: chatInfo?.title,
                        brain: chatInfo?.brain?.title,
                        chatId: chatId,
                        brainId: chatInfo?.brain?.id,
                        messageId: messageId,
                        threadId: message._id,
                        // threadId: customid,
                        threadType: type
                    }
                )
        }

        // Either Mention user notification
        if (mentionUsers.length > 0) {
            // ⚠️ WARNING: Do not use await with sendCommonNotification().
            // This function should be called in the background without blocking the main thread.
            sendCommonNotification(NOTIFICATION_TYPE.THREAD_MENTIONE, mentionUsers, req.user, 
                { 
                    chat: chatInfo?.title,
                    brain: chatInfo?.brain?.title, 
                    chatId: chatId, 
                    brainId: chatInfo?.brain?.id,
                    messageId: messageId,
                    // threadId: customid ,
                    threadId: message._id ,
                    threadType: type
                }
            )
        }

        return {
            // ...threadData, kafka code
            ...message._doc,
            sender:formatUser(req.user)
        };
    } catch (error) {
        handleError(error, 'Error - sendMessage');
    }
}

const getReplayThreadList = async (req) => {
    try {
        return dbService.getAllDocuments(
            ReplyThread,
            req.body.query || {},
            req.body.options || {},
        )
    } catch (error) {
        handleError(error, 'Error - sendMessage');
    }
}

module.exports = {
    sendMessage,
    getReplayThreadList
}