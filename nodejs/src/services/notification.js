const NotificationList = require('../models/notificationList');
const Notification = require('../models/notification');
const User = require('../models/user');
const dbService = require('../utils/dbService');
const admin = require('firebase-admin');
const { NOTIFICATION_TYPE, JOB_TYPE } = require('../config/constants/common');
const { formatUser } = require('../utils/helper');
const { createJob } = require('../jobs');
const logger = require('../utils/logger');

const createOrUpdateToken = async (req) => {
    try {
        return User.findOneAndUpdate({ _id: req.userId }, { $addToSet: { fcmTokens: req.body.fcmTokens } });
    } catch (error) {
        handleError(error, 'Error in create or update notification token');
    }
}

const getAll = async (req) => {
    try {
        return dbService.getAllDocuments(NotificationList, req.body.query || {}, req.body.options || {});
    } catch (error) {
        handleError(error, 'Error in getall notification');
    }
}

const updateReadStatus = async (req) => {
    try {
        if(req.body?.singleRead){
            return NotificationList.updateOne({ 'user.id': req.userId, '_id': req.body.notificationId }, { $set: { isRead: true }});
        }
        return NotificationList.updateMany({ 'user.id': req.userId }, { $set: { isRead: true }});
    } catch (error) {
        handleError(error, 'Error in notification updateReadStatus');
    }
}

const notificationCount = async (req) => {
    try {
        return NotificationList.countDocuments({ 'user.id': req.userId, isRead: false });
    } catch (error) {
        handleError(error, 'Error in notification count');
    }
}

const sendPushNotification = async (fcmTokens, notificationPayload) => {
    try {
        if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
            return;
        }

        const message = {
            notification: notificationPayload,
            tokens: fcmTokens
        }


        return admin.messaging().sendEachForMulticast(message)
            .then(response => {
                logger.info('Successfully sent message:', JSON.stringify(response));
            })
            .catch(error => {
                logger.info('Error sending message:', JSON.stringify(error));
            });
    } catch (error) {
        logger.error('Error in sendNotification', error);
    }
};

const sendPushNotificationToUsers = async (data) => {
    await sendPushNotification(data.fcmTokens, data.notificationPayload);
};

/**
 * Sends a common notification to a list of users based on a notification code.
 * @param {string} code - The notification code used to fetch the notification template.
 * @param {Array} users - An array of user objects to whom the notification will be sent.
 * @param {Object} requestUser - The user who initiated the request.
 * @param {Object} replacedata - An object containing data to replace placeholders in the notification template.
 * @returns {Promise<void>} - A promise representing the asynchronous execution of the notification sending process.
 * This function should be called in the background without blocking the main thread.
 * ⚠️ WARNING: Do not use await with sendCommonNotification().
 */

const sendCommonNotification = async (code, users, requestUser, replacedata) => {
    try {
        const response = await Notification.findOne({ code: code }, { title: 1, body: 1 });
        const userList = await User.find({ _id: { $in: users.map(user => user.id) } } );
        if (!userList.length) return;
        const notificationTemplates = {
            [NOTIFICATION_TYPE.THREAD_MENTIONE]: { name: '{name}', chat: '{chat}', brain: '{brain}' },
            [NOTIFICATION_TYPE.THREAD_REPLY]: { name: '{name}', chat: '{chat}', brain: '{brain}' },
            [NOTIFICATION_TYPE.BRAIN_INVITATION]: { name: '{name}', brain: '{brain}' },
            [NOTIFICATION_TYPE.WORKSPACE_INVITATION]: { name: '{name}', workspace: '{workspace}' },
            [NOTIFICATION_TYPE.CHAT_INVITATION]: { name: '{name}', chat: '{chat}' },
            [NOTIFICATION_TYPE.PROMPT_SCRAPING]: { prompt: '{prompt}' },
        };

        const targetTemplate = notificationTemplates[code];

        const notificationTitle = response.title;
        let notificationBody = response.body;
        const bulkNotificationOps = [];
        const fcmTokens = [];

        const notificationPromises = users.map(async (user) => {
            const match = userList.find((element) => element._id.toString() === user.id.toString());
            
            if (targetTemplate.name) {
                const fullName = (requestUser.fname && requestUser.lname) 
                    ? `${requestUser.fname} ${requestUser.lname}` 
                    : requestUser.email.split('@')[0];
                notificationBody = notificationBody.replace(targetTemplate.name, fullName);
            }
            if (targetTemplate.brain) {
                notificationBody = notificationBody.replace(targetTemplate.brain, replacedata.brain);
            }
            if (targetTemplate.chat) {
                notificationBody = notificationBody.replace(targetTemplate.chat, replacedata.chat);
            }
            if (targetTemplate.workspace) {
                notificationBody = notificationBody.replace(targetTemplate.workspace, replacedata.workspace);
            }
            if (targetTemplate.prompt) {
                notificationBody = notificationBody.replace(targetTemplate.prompt, replacedata.prompt);
            }
            if (match.fcmTokens.length) {
                if (user.id.toString() !== requestUser._id.toString())
                    fcmTokens.push(...match.fcmTokens);
            }

            if (user.id.toString() !== requestUser._id.toString()) {
                bulkNotificationOps.push({
                    insertOne: {
                        document: {
                            notificationId: response._id,
                            msg: notificationBody,
                            user: formatUser(match),
                            sender: formatUser(requestUser),
                            workspaceId: replacedata?.workspaceId,
                            chatId: replacedata?.chatId,
                            brainId: replacedata?.brainId,
                            threadId: replacedata?.threadId,
                            messageId: replacedata?.messageId,
                            threadType: replacedata?.threadType,
                        }
                    }
                });
            }
        });

        await Promise.all(notificationPromises);

        if (bulkNotificationOps.length > 0) {
            await NotificationList.bulkWrite(bulkNotificationOps);
        }
        
        await createJob(JOB_TYPE.SEND_NOTIFICATION, { fcmTokens, payload: { title: notificationTitle, body: notificationBody } })
    } catch (error) {
        handleError(error, 'Error - sendCommonNotification');
    }
};

const deleteAll = async (req) => {
    try {
        return NotificationList.deleteMany({ 'user.id': req.userId });
    } catch (error) {
        handleError(error, 'Error - deleteAll');
    }
}   


module.exports = {
    createOrUpdateToken,
    getAll,
    updateReadStatus,
    notificationCount,
    sendPushNotification,
    sendPushNotificationToUsers,
    sendCommonNotification,
    deleteAll
}