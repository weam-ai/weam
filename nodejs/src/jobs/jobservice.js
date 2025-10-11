const { sendEmail } = require('../services/email');
const { updateDBRef, deleteDBRef } = require('../utils/helper');
const { sendPushNotification } = require('../services/notification');
//const { connectedClients } = require('../services/subscriptionSSE');
const logger = require('../utils/logger');
const ImportChat = require('../models/importChat');
const User = require('../models/user');
const NotificationList = require('../models/notificationList');
const EmailTemplate = require('../models/emailTemplate');
const { EMAIL_TEMPLATE } = require('../config/constants/common');
const { sendSESMail } = require('../services/email');

/**
 * Send notification and email when import chat is completed
 */
const sendImportCompletionNotification = async (importId, userId, status) => {
    try {
        // Get user details
        const user = await User.findById(userId).lean();
        if (!user) {
            logger.error(`User not found for import completion notification: ${userId}`);
            return;
        }

        // Get import details
        const importChat = await ImportChat.findById(importId).lean();
        if (!importChat) {
            logger.error(`Import chat not found for notification: ${importId}`);
            return;
        }

        const successMessage = "Your chat import has been completed successfully.";
        const failureMessage = "Your chat import could not be completed due to an error.";
        
        const message = status === 'completed' ? successMessage : failureMessage;
        const title = status === 'completed' ? "Chat Import Completed" : "Chat Import Failed";

        // Send in-app notification directly without using notification template
        try {
            // Create notification directly
            await NotificationList.create({
                title: title,
                body: message,
                user: { id: userId },
                isRead: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            logger.info(`Created in-app notification for user ${userId}`);
        } catch (error) {
            logger.error(`Failed to create in-app notification: ${error.message}`);
        }

        // Send email notification
        if (user.email) {
            try {
                // Find the template
                const template = await EmailTemplate.findOne({ code: EMAIL_TEMPLATE.IMPORT_CHAT_SUCCESS }).lean();
                
                if (!template) {
                    logger.error('Import chat success email template not found');
                    return;
                }
                
                // Get header and footer templates
                const headerTemplate = await EmailTemplate.findOne({ code: EMAIL_TEMPLATE.HEADER_CONTENT }).lean();
                const footerTemplate = await EmailTemplate.findOne({ code: EMAIL_TEMPLATE.FOOTER_CONTENT }).lean();
                
                if (!headerTemplate || !footerTemplate) {
                    logger.error('Header or footer email template not found');
                    return;
                }
                
                // Replace placeholders in the template
                let emailContent = template.body
                    .replace('{{header}}', headerTemplate.body)
                    .replace('{{footer}}', footerTemplate.body)
                    .replace('{{name}}', user.fname || user.email.split('@')[0])
                    .replace('{{url}}', `${process.env.FRONTEND_URL || 'https://app.weam.ai'}/chats`);
                
                // Send the email
                await sendSESMail(user.email, template.subject, emailContent);
                logger.info(`Import chat success email sent to ${user.email}`);
            } catch (error) {
                logger.error(`Failed to send import chat success email: ${error.message}`);
            }
        }

        logger.info(`Import completion notification sent to user ${userId} for import ${importId}`);
    } catch (error) {
        logger.error(`Error sending import completion notification: ${error.message}`);
    }
};

module.exports = {
    _processors: {
        sendMail: async ({ data }) => {
            try {
                logger.info('start proccessing email sent');
                await sendEmail(data);
                logger.info('finish email sent');
                return { succeed: true };
            } catch (error) {
                logger.error('Error in email sent' + error);
                return { succeed: false };
            }
        },
        updateRef: async ({ data }) => {
            try {
                logger.info('start proccessing update db ref');
                await updateDBRef(data);
                logger.info('finish proccessing update db ref');
            } catch (error) {
                logger.error('Error in DB ref update' + error);
                return { succeed: false };
            }
        },
        deleteRef: async ({ data }) => {
            try {
                logger.info('Start proccessing to delete db ref');
                await deleteDBRef(data);
                logger.info('Finish proccessing to delete db ref');
            } catch (error) {
                logger.error('Error in DB ref delete' + error);
                return { succeed: false };
            }
        },
        sendNotification: async ({ data }) => {
            try {
                logger.info('Start proccessing to send notification');
                await sendPushNotification(data.fcmTokens, data.payload);
                logger.info('Finish proccessing to send notification');
            } catch (error) {
                logger.error('Error in send notification' + error);
                return { succeed: false };
            }
        },
        processImportChat: async ({ data }) => {
            const { importId, jsonData, config, currentUser, teamData, userData, teamDict, isShare } = data;
            
            logger.info(`Processing import chat for import ID: ${importId}`);
            
            try {
                // Update status to processing
                await ImportChat.findByIdAndUpdate(importId, {
                    status: 'processing'
                });
                
                // Dynamically import to avoid circular dependency
                const { processConversations } = require('../services/importChat');
                
                // Process the conversations
                const result = await processConversations(
                    importId,
                    jsonData,
                    config,
                    currentUser,
                    teamData,
                    userData,
                    teamDict,
                    isShare
                );
                
                // Update status to completed
                await ImportChat.findByIdAndUpdate(importId, {
                    status: 'completed'
                });
                
                // Send notification and email about completion
                await sendImportCompletionNotification(importId, currentUser.id, 'completed');
                
                logger.info(`Import chat processing completed successfully for import ID: ${importId}`);
                return { succeed: true, result };
            } catch (error) {
                logger.error(`Import chat processing failed: ${error.message}`);
                
                // Update status to failed
                await ImportChat.findByIdAndUpdate(importId, {
                    status: 'failed',
                    responseAPI: error.message
                });
                
                // Send notification and email about failure
                await sendImportCompletionNotification(importId, currentUser.id, 'failed');
                
                return { succeed: false, error: error.message };
            }
        }
        // sendSubscription: async ({data}) => {

        //     try {
        //         logger.info('Processing SSE broadcast');
        //         const { companyId } = data.data;

        //         if (!connectedClients[companyId]) {
        //             logger.info(`No connected clients for company ${companyId}`);
        //             return { succeed: true };
        //         }

        //         Object.values(connectedClients[companyId]).forEach(userConnections => {
        //             userConnections.forEach(({res}) => {
        //                 try {
        //                     res.write(`data: ${JSON.stringify(data)}\n\n`);
        //                 } catch (error) {
        //                     logger.error('Error sending SSE event to client:', error);
        //                     throw error; 
        //                 }
        //             });
        //         });

        //         // return { succeed: true };
        //     } catch (error) {
        //         logger.error('Error in SSE broadcast:', error);
        //         return { succeed: false };
        //     }
        // }
    }
}