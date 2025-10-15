const ImportChat = require('../models/importChat');
const Brain = require('../models/brains');
const ShareBrain = require('../models/shareBrain');
const TeamUser = require('../models/teamUser');
const Model = require('../models/bot');
const Chat = require('../models/chat');
const ChatMember = require('../models/chatmember');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const { AWS_CONFIG } = require('../config/config');
const logger = require('../utils/logger');
const { processConversation } = require('./importChatProcessor');
const { processAnthropicConversation } = require('./importChatProcessorAnthropic');
const { createJob } = require('../jobs');
const { JOB_TYPE } = require('../config/constants/common');

// Use existing AWS configuration
require('aws-sdk/lib/maintenance_mode_message').suppress = true;
AWS.config.update({
    apiVersion: AWS_CONFIG.AWS_S3_API_VERSION,
    accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    region: AWS_CONFIG.REGION
});

// Create S3 instance with acceleration explicitly disabled
const S3 = new AWS.S3({ useAccelerateEndpoint: false });

/**
 * Get team data for a brain
 */
const getTeamData = async (brainId) => {
    try {
        const teamData = await Brain.findById(brainId)
            .select('teams isShare')
            .lean();
        return teamData || {};
    } catch (error) {
        logger.error(`Failed to retrieve Team Data: ${error.message}`);
        throw error;
    }
};

/**
 * Get user data for a brain
 */
const getUserData = async (brainId) => {
    try {
        const userData = await ShareBrain.find({ 'brain.id': brainId })
            .select('user teamId invitedBy')
            .lean();
        return userData || [];
    } catch (error) {
        logger.error(`Failed to retrieve User data: ${error.message}`);
        throw error;
    }
};

/**
 * Get team users
 */
const getTeamUsers = async (teamId) => {
    try {
        const teamUsers = await TeamUser.findById(teamId)
            .select('teamUsers')
            .lean();
        return teamUsers || {};
    } catch (error) {
        logger.error(`Failed to retrieve Team Users: ${error.message}`);
        throw error;
    }
};

/**
 * Get model ID by code
 */
const getModelId = async (code) => {
    try {
        // Map frontend codes to database codes
        const codeMapping = {
            'OPENAI': 'OPEN_AI',
            'ANTHROPIC': 'ANTHROPIC',
            'OPEN_AI': 'OPEN_AI'
        };

        const dbCode = codeMapping[code] || code;

        const modelData = await Model.findOne({ code: dbCode })
            .select('_id')
            .lean();

        if (!modelData) {
            logger.warn(`Model not found for code: ${code} (mapped to: ${dbCode})`);
        }

        return modelData ? modelData._id.toString() : null;
    } catch (error) {
        logger.error(`Failed to retrieve Model ID: ${error.message}`);
        throw error;
    }
};

/**
 * Insert import chat record
 */
const insertImportRecord = async (config, fileName, importId, userData, fileUri, conversationFile) => {
    try {
        const importChatData = {
            _id: importId,
            user: {
                email: userData.email,
                ...(userData.fname && { fname: userData.fname }),
                ...(userData.lname && { lname: userData.lname }),
                ...(userData.profile && userData.profile.uri && userData.profile.uri.trim() !== '' && { profile: userData.profile }),
                id: new mongoose.Types.ObjectId(config.user_id)
            },
            company: {
                name: config.company_name,
                id: new mongoose.Types.ObjectId(config.company_id)
            },
            brain: {
                title: config.brain_title,
                slug: config.brain_slug,
                id: new mongoose.Types.ObjectId(config.brain_id)
            },
            fileDetails: {
                fileName: fileName,
                fileId: new mongoose.Types.ObjectId(),
                uri: fileUri,
                jsonUri: conversationFile
            },
            hashids: config.hashids || [],
            conversationData: config.conversationData || null,
            totalImportChat: 0,
            successImportedChat: 0,
            totalImportedTokens: 0,
            responseAPI: null,
            status: 'pending'
        };

        const result = await ImportChat.create(importChatData);
        return { importChatData: result, importId };
    } catch (error) {
        logger.error(`Failed to insert import record: ${error.message}`);
        throw error;
    }
};

/**
 * Upload file to S3
 */
const uploadFileToS3 = async (fileContent, fileName, s3Key) => {
    try {
        const bucketName = process.env.AWS_BUCKET;

        const params = {
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent,
            ContentType: 'application/json',
            ACL: 'public-read',
            UseAccelerateEndpoint: false // Disable S3 Transfer Acceleration
        };

        await S3.upload(params).promise();
        logger.info(`File uploaded to S3: ${s3Key}`);
        
        return s3Key;
    } catch (error) {
        logger.error(`Failed to upload file to S3: ${error.message}`);
        throw error;
    }
};

/**
 * Process import chat JSON file
 */
const processImportChatJson = async (req) => {
    try {
        const { user_id, company_id, brain_id, brain_title, brain_slug, company_name, code } = req.body;
        const file = req.file;
        const currentUser = req.user; // Use req.user which already has profile data

        if (!file) {
            throw new Error(_localize('import.no_file', req));
        }

        logger.info(`Import started by user: ${currentUser.email}`);

        // Validate JSON file
        if (!file.originalname.endsWith('.json')) {
            throw new Error(_localize('import.invalid_file_type', req));
        }

        // Parse JSON content
        let jsonData;
        try {
            jsonData = JSON.parse(file.buffer.toString('utf-8'));
        } catch (error) {
            throw new Error(_localize('import.invalid_json', req));
        }
        
        // Validate if the JSON structure matches one of the two allowed formats
        if (!Array.isArray(jsonData)) {
            throw new Error(_localize('import.invalid_format', req));
        }
        
        // Check if it's Anthropic format or OpenAI format
        const isAnthropicFormat = jsonData.length > 0 && jsonData[0].chat_messages !== undefined;
        const isOpenAIFormat = jsonData.length > 0 && jsonData[0].mapping !== undefined;
        
        // Validate that the JSON matches one of the two allowed formats
        if (!isAnthropicFormat && !isOpenAIFormat) {
            throw new Error(_localize('import.invalid_structure', req));
        }
        
        // Extract conversation data in the format matching Python implementation
        let hashids = [];
        const conversationData = {};
        
        // Process each conversation to extract required data
        jsonData.forEach(conversation => {
            let conversationId = '';
            let lastMsgId = '';
            let hashId = '';
            
            if (isAnthropicFormat) {
                // Anthropic format - use uuid instead of id for Anthropic format
                conversationId = conversation.uuid || '';
                // Get the last message ID if available
                if (conversation.chat_messages && conversation.chat_messages.length > 0) {
                    lastMsgId = conversation.chat_messages[conversation.chat_messages.length - 1].uuid || '';
                }
                
                // Create a hash from the conversation ID
                hashId = require('crypto').createHash('sha256').update(conversationId).digest('hex');
            } else {
                // OpenAI format
                conversationId = conversation.id || '';
                
                // Find the last message in the conversation
                if (conversation.mapping) {
                    const messageIds = Object.keys(conversation.mapping);
                    if (messageIds.length > 0) {
                        // Get the last message ID
                        lastMsgId = messageIds[messageIds.length - 1] || '';
                    }
                }
                
                // Create a hash from the conversation ID
                hashId = require('crypto').createHash('sha256').update(conversationId).digest('hex');
            }
            
            if (hashId) {
                hashids.push(hashId);
                
                // Create an entry in conversationData with the format matching Python implementation
                const chatId = new mongoose.Types.ObjectId().toString();
                conversationData[chatId] = {
                    hashIds: hashId,
                    ConversationIds: conversationId,
                    LastMsgIds: lastMsgId,
                    taskstatus: "SUCCESS",
                    taskIds: require('crypto').randomUUID()
                };
            }
        });
        
        // Get existing hashids from the database
        const existingHashids = await _getExistingHashIds(user_id, brain_id);
        
        // Filter out conversations that already exist
        const duplicateHashids = [];
        const newHashids = [];
        
        // Check each hashid if it already exists
        hashids.forEach(hashid => {
            if (existingHashids.includes(hashid)) {
                duplicateHashids.push(hashid);
            } else {
                newHashids.push(hashid);
            }
        });
        
        // Filter conversationData to only include new conversations
        Object.keys(conversationData).forEach(chatId => {
            const currentHashId = conversationData[chatId].hashIds;
            if (existingHashids.includes(currentHashId)) {
                delete conversationData[chatId];
                logger.info(`Skipping duplicate conversation with hash: ${currentHashId}`);
            }
        });
        
        // Update hashids to only include new ones
        hashids = newHashids;
        
        if (duplicateHashids.length > 0) {
            logger.info(`Skipping ${duplicateHashids.length} already imported conversations`);
        }
        
        // If no new conversations to import, inform the user
        if (hashids.length === 0) {
            return {
                filename: file.originalname,
                message: 'All conversations in this file have already been imported.',
                import_id: null
            };
        }

        // Generate import ID
        const importId = new mongoose.Types.ObjectId();

        // Define S3 paths
        const conversationFile = `importdata/${importId.toString()}/conversations.json`;
        const fileUri = ' '; // Empty as per Python implementation

        // Upload file to S3
        await uploadFileToS3(file.buffer, file.originalname, conversationFile);

        // Insert import record
        const config = {
            user_id,
            company_id,
            brain_id,
            brain_slug,
            brain_title,
            company_name,
            code,
            hashids,
            conversationData // Use the structured conversationData object
        };

        await insertImportRecord(config, file.originalname, importId, currentUser, fileUri, conversationFile);

        // Get team and user data
        const teamData = await getTeamData(brain_id);
        const userData = await getUserData(brain_id);

        const isShare = teamData?.isShare || false;
        const teams = teamData?.teams || [];

        // Build team dictionary
        const teamDict = {};
        if (teams.length > 0) {
            for (const team of teams) {
                // Handle both populated and non-populated team objects
                let teamId;
                if (typeof team.id === 'object' && team.id._id) {
                    // If team.id is populated with full teamUser document
                    teamId = team.id._id;
                } else if (team.id) {
                    // If team.id is just an ObjectId
                    teamId = team.id;
                } else if (team._id) {
                    // Fallback to team._id
                    teamId = team._id;
                }
                
                if (teamId) {
                    const teamUsers = await getTeamUsers(teamId.toString());
                    teamDict[teamId.toString()] = teamUsers;
                }
            }
        }

        // Queue conversations for background processing using the existing queue infrastructure
        
        await createJob(JOB_TYPE.PROCESS_IMPORT_CHAT, {
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
            }
        });

        logger.info(`Import chat queued for background processing. Import ID: ${importId}`);

        return {
            filename: file.originalname,
            message: 'Your chats are being imported. You can continue using the application while we process your data.',
            import_id: importId.toString(),
            status: 'processing'
        };
    } catch (error) {
        logger.error(`Failed to process import chat: ${error.message}`);
        throw error;
    }
};

/**
 * Get import chat status
 */
const getImportChatStatus = async (importId) => {
    try {
        const importChat = await ImportChat.findById(importId).lean();

        if (!importChat) {
            throw new Error(_localize('import.not_found', req));
        }

        return importChat;
    } catch (error) {
        logger.error(`Failed to get import chat status: ${error.message}`);
        throw error;
    }
};

/**
 * Get all import chats for a user
 */
const getImportChats = async (req) => {
    try {
        const { user } = req;
        const { brain_id } = req.query;

        const query = {
            'user.id': new mongoose.Types.ObjectId(user._id)
        };

        if (brain_id) {
            query['brain.id'] = new mongoose.Types.ObjectId(brain_id);
        }

        const imports = await ImportChat.find(query)
            .sort({ createdAt: -1 })
            .lean();

        return imports;
    } catch (error) {
        logger.error(`Failed to get import chats: ${error.message}`);
        throw error;
    }
};

/**
 * Process conversations and create chat records with messages
 */
const processConversations = async (importId, jsonData, config, currentUser, teamData, userData, teamDict, isShare) => {
    try {
        // Update status to processing
        await ImportChat.findByIdAndUpdate(importId, {
            status: 'processing'
        });

        let successCount = 0;
        let totalCount = 0;
        let totalTokens = 0;

        // Get model ID
        const modelId = await getModelId(config.code);
        if (!modelId) {
            throw new Error(_localize('import.model_not_found', req, { code: config.code }));
        }

        // Detect conversation format (OpenAI vs Anthropic)
        const isAnthropicFormat = jsonData.length > 0 && jsonData[0].chat_messages !== undefined;
        const responseAPI = isAnthropicFormat ? 'ANTHROPIC' : 'OPEN_AI';

        logger.info(`Detected format: ${responseAPI}`);

        // Process each conversation with newest first (last in the file)
        // This ensures the newest chat appears at the top of the list
        for (const conversation of [...jsonData].reverse()) {
            try {
                totalCount++;

                // Validate conversation structure based on format
                if (isAnthropicFormat) {
                    // Anthropic format validation
                    if (!conversation.name && !conversation.chat_messages) {
                        logger.warn(`Skipping Anthropic conversation ${totalCount} - missing name or chat_messages`);
                        continue;
                    }
                } else {
                    // OpenAI format validation
                    if (!conversation.title || !conversation.mapping) {
                        logger.warn(`Skipping OpenAI conversation ${totalCount} - missing title or mapping`);
                        continue;
                    }
                }

                // Get conversation title based on format
                const conversationTitle = isAnthropicFormat
                    ? (conversation.name || 'Imported Chat')
                    : (conversation.title || 'Imported Chat');

                // Create chat record
                const chatData = {
                    title: conversationTitle,
                    user: {
                        email: currentUser.email,
                        fname: currentUser.fname || '',
                        lname: currentUser.lname || '',
                        id: new mongoose.Types.ObjectId(config.user_id)
                    },
                    brain: {
                        title: config.brain_title,
                        slug: config.brain_slug,
                        id: new mongoose.Types.ObjectId(config.brain_id)
                    },
                    isShare: isShare || false,
                    teams: teamData?.teams || []
                };

                // Add profile if exists - keep the exact structure from req.user
                if (currentUser.profile) {
                    chatData.user.profile = {
                        name: currentUser.profile.name,
                        uri: currentUser.profile.uri,
                        mime_type: currentUser.profile.mime_type
                    };

                    // Handle profile.id - ensure it's an ObjectId for Chat model
                    if (currentUser.profile.id) {
                        chatData.user.profile.id = typeof currentUser.profile.id === 'string'
                            ? new mongoose.Types.ObjectId(currentUser.profile.id)
                            : currentUser.profile.id;
                    }

                    logger.info(`Profile added to Chat: ${JSON.stringify(chatData.user.profile)}`);
                }

                const chat = await Chat.create(chatData);
                logger.info(`Created chat: ${chat._id} with title: "${conversationTitle}"`);

                // Prepare user data with profile for ChatMember
                const chatMemberUserData = {
                    email: currentUser.email,
                    id: currentUser._id
                };

                // Add optional fields
                if (currentUser.fname) chatMemberUserData.fname = currentUser.fname;
                if (currentUser.lname) chatMemberUserData.lname = currentUser.lname;

                // Add profile if exists - keep the exact structure from req.user
                if (currentUser.profile) {
                    chatMemberUserData.profile = {
                        name: currentUser.profile.name,
                        uri: currentUser.profile.uri,
                        mime_type: currentUser.profile.mime_type
                    };

                    // Handle profile.id - ensure it's an ObjectId
                    if (currentUser.profile.id) {
                        chatMemberUserData.profile.id = typeof currentUser.profile.id === 'string'
                            ? new mongoose.Types.ObjectId(currentUser.profile.id)
                            : currentUser.profile.id;
                    }

                }

                // Check if this is a shared brain
                const brainId = new mongoose.Types.ObjectId(config.brain_id);
                
                // Get all users who have access to this brain through ShareBrain collection
                const shareBrainMembers = await ShareBrain.find({
                    'brain.id': brainId
                }).lean();
                
                logger.info(`Found ${shareBrainMembers.length} members for shared brain: ${config.brain_id}`);
                
                // Create ChatMember record for the importing user
                const chatMember = await ChatMember.create({
                    chatId: chat._id,
                    isNewChat: false, // Imported chats are not new chats
                    user: chatMemberUserData,
                    brain: {
                        title: config.brain_title,
                        slug: config.brain_slug,
                        id: brainId
                    },
                    title: conversationTitle
                });
                logger.info(`Created ChatMember: ${chatMember._id} for importing user: ${currentUser._id}`);
                
                // Create ChatMember records for all other brain members to make chat visible to everyone
                if (shareBrainMembers.length > 0) {
                    const otherMembers = shareBrainMembers.filter(member => 
                        member.user && member.user.id && 
                        member.user.id.toString() !== currentUser._id.toString()
                    );
                    
                    if (otherMembers.length > 0) {
                        const chatMemberPromises = otherMembers.map(member => {
                            // Prepare user data for ChatMember
                            const memberUserData = {
                                email: member.user.email,
                                id: member.user.id
                            };
                            
                            // Add optional fields if they exist
                            if (member.user.fname) memberUserData.fname = member.user.fname;
                            if (member.user.lname) memberUserData.lname = member.user.lname;
                            
                            // Add profile if exists
                            if (member.user.profile) {
                                memberUserData.profile = {
                                    name: member.user.profile.name,
                                    uri: member.user.profile.uri,
                                    mime_type: member.user.profile.mime_type
                                };
                                
                                // Handle profile.id - ensure it's an ObjectId
                                if (member.user.profile.id) {
                                    memberUserData.profile.id = typeof member.user.profile.id === 'string'
                                        ? new mongoose.Types.ObjectId(member.user.profile.id)
                                        : member.user.profile.id;
                                }
                            }
                            
                            return ChatMember.create({
                                chatId: chat._id,
                                isNewChat: false,
                                user: memberUserData,
                                brain: {
                                    title: config.brain_title,
                                    slug: config.brain_slug,
                                    id: brainId
                                },
                                title: conversationTitle
                            });
                        });
                        
                        await Promise.all(chatMemberPromises);
                        logger.info(`Created ChatMember entries for ${otherMembers.length} additional brain members`);
                    }
                }

                // Process conversation messages and create message documents
                // Use appropriate processor based on format
                const result = isAnthropicFormat
                    ? await processAnthropicConversation(
                        conversation,
                        chat._id.toString(),
                        importId.toString(),
                        config,
                        currentUser,
                        modelId
                    )
                    : await processConversation(
                        conversation,
                        chat._id.toString(),
                        importId.toString(),
                        config,
                        currentUser,
                        modelId
                    );

                if (result.success) {
                    totalTokens += result.totalTokens;
                    successCount++;

                    logger.info(`Processed ${responseAPI} conversation "${conversationTitle}" - ${result.messageCount} messages, ${result.totalTokens} tokens`);
                }

                // Update progress
                await ImportChat.findByIdAndUpdate(importId, {
                    successImportedChat: successCount,
                    totalImportChat: totalCount,
                    totalImportedTokens: totalTokens
                });

                logger.info(`Progress: ${successCount}/${totalCount} conversations imported`);

            } catch (convError) {
                logger.error(`Error processing conversation ${totalCount}: ${convError.message}`);
                logger.error(`Error stack: ${convError.stack}`);
                // Continue with next conversation
            }
        }

        logger.info(`Completed processing ${totalCount} conversations, ${successCount} successful`);

        // Update final status
        await ImportChat.findByIdAndUpdate(importId, {
            status: 'completed',
            totalImportChat: totalCount,
            successImportedChat: successCount,
            totalImportedTokens: totalTokens,
            responseAPI: responseAPI
        });

        logger.info(`Import completed. Import ID: ${importId}, Success: ${successCount}/${totalCount}, Tokens: ${totalTokens}`);

        return { success: true, importId, successCount, totalCount, totalTokens };

    } catch (error) {
        logger.error(`Process conversations failed: ${error.message}`);

        // Update status to failed
        await ImportChat.findByIdAndUpdate(importId, {
            status: 'failed',
            responseAPI: error.message
        });

        throw error;
    }
};

/**
 * Get existing hash IDs from the database
 * This matches the Python implementation's _get_existing_hash_ids function
 */
const _getExistingHashIds = async (user_id, brain_id, hashids = []) => {
    try {
        const existingHashIds = new Set();
        
        // Find all imports for this company and brain
        const data = await ImportChat.find({
            'user.id': new mongoose.Types.ObjectId(user_id),
            'brain.id': new mongoose.Types.ObjectId(brain_id)
        }).lean();
        
        // Extract hashIds from conversationData
        for (const doc of data) {
            // Add hashids from the hashids array field
            if (doc.hashids && Array.isArray(doc.hashids)) {
                doc.hashids.forEach(hashId => {
                    if (hashId) {
                        existingHashIds.add(hashId);
                    }
                });
            }
            
            // Also check conversationData for hashIds
            const conversationData = doc.conversationData;
            if (conversationData && typeof conversationData === 'object') {
                for (const key in conversationData) {
                    const hashId = conversationData[key]?.hashIds;
                    if (hashId) {
                        existingHashIds.add(hashId);
                        logger.info(`Found existing hash: ${hashId}`);
                    }
                }
            }
        }
        
        logger.info(`Total existing hashes found: ${existingHashIds.size}`);
        return Array.from(existingHashIds);
    } catch (error) {
        logger.error(`Error getting existing hash IDs: ${error.message}`);
        return [];
    }
};

module.exports = {
    processImportChatJson,
    getImportChatStatus,
    getImportChats,
    getTeamData,
    getUserData,
    getTeamUsers,
    getModelId,
    insertImportRecord,
    uploadFileToS3,
    processConversations
};
