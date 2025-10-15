const { importChatQueue } = require('../jobs/configuration');
const logger = require('../utils/logger');
const ImportChat = require('../models/importChat');
const User = require('../models/user');
const { sendSESMail } = require('./email');
const { sendCommonNotification } = require('./notification');
const { NOTIFICATION_TYPE, EMAIL_TEMPLATE } = require('../config/constants/common');

/**
 * Process import chat in background
 * This function adds the import chat task to the queue
 */
const queueImportChatProcessing = async (importId, jsonData, config, currentUser, teamData, userData, teamDict, isShare) => {
    try {
        // Add job to the queue
        const job = await importChatQueue.add({
            importId,
            jsonData,
            config,
            currentUser,
            teamData,
            userData,
            teamDict,
            isShare
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            },
            removeOnComplete: true,
            removeOnFail: false
        });

        logger.info(`Import chat job added to queue with ID: ${job.id}`);
        return job.id;
    } catch (error) {
        logger.error(`Failed to queue import chat job: ${error.message}`);
        throw error;
    }
};

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
        // Create notification record directly instead of using sendCommonNotification
        try {
            const NotificationList = require('../models/notificationList');
            
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
                // Get email template
                const EmailTemplate = require('../models/emailTemplate');
                const { EMAIL_TEMPLATE } = require('../config/constants/common');
                
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

// Process jobs from the queue
importChatQueue.process(async (job) => {
    const { importId, jsonData, config, currentUser, teamData, userData, teamDict, isShare } = job.data;
    
    logger.info(`Processing import chat job ${job.id} for import ID: ${importId}`);
    
    try {
        // Update status to processing
        await ImportChat.findByIdAndUpdate(importId, {
            status: 'processing'
        });
        
        // Dynamically import to avoid circular dependency
        const { processConversations } = require('./importChat');
        
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
        
        logger.info(`Import chat job ${job.id} completed successfully`);
        return result;
    } catch (error) {
        logger.error(`Import chat job ${job.id} failed: ${error.message}`);
        
        // Update status to failed
        await ImportChat.findByIdAndUpdate(importId, {
            status: 'failed',
            responseAPI: error.message
        });
        
        // Send notification and email about failure
        await sendImportCompletionNotification(importId, job.data.currentUser.id, 'failed');
        
        throw error;
    }
});

module.exports = {
    queueImportChatProcessing
};