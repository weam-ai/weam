/**
 * Slack MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Make a request to the Slack API
 * @param {string} endpoint - The API endpoint
 * @param {string} botToken - Slack bot token
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST requests
 * @param {string} method - HTTP method (GET, POST)
 * @returns {Object|null} API response data
 */
async function makeSlackRequest(endpoint, botToken, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json'
    };

    try {
        let response;
        const url = `${SLACK_API_BASE}/${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params });
        } else {
            response = await axios.post(url, jsonData, { headers, params });
        }

        return response.data;
    } catch (error) {
        console.error('Slack API Error:', error.message);
        return null;
    }
}

/**
 * Get Slack access token from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} Slack access token or null if not found
 */
async function getSlackAccessToken(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.SLACK || !user.mcpdata.SLACK.access_token) {
            return null;
        }
        // Decrypt the access token before returning
        const decryptedToken = decryptedData(user.mcpdata.SLACK.access_token);
        return decryptedToken;
    } catch (error) {
        console.error('Error fetching Slack access token:', error.message);
        return null;
    }
}

/**
 * List all channels in the Slack workspace
 * @param {string} userId - User ID to get access token from
 * @param {number} limit - Maximum number of channels to return
 * @returns {string} Formatted channel list
 */
async function listSlackChannels(userId = null, limit = 100) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    const params = {
        limit: limit,
        exclude_archived: true,
        types: 'public_channel,private_channel'
    };

    const response = await makeSlackRequest('conversations.list', botToken, params);
    
    if (!response || !response.ok) {
        return `Error: ${response?.error || 'Failed to fetch channels'}`;
    }

    const channels = response.channels || [];
    if (channels.length === 0) {
        return 'No channels found in the workspace.';
    }

    let result = `Found ${channels.length} channels:\n\n`;
    for (const channel of channels) {
        const memberCount = channel.num_members || 0;
        const channelType = channel.is_private ? 'Private' : 'Public';
        const topic = channel.topic?.value || 'No topic set';
        
        result += `• **${channel.name}** (${channelType})\n`;
        result += `  ID: ${channel.id}\n`;
        result += `  Members: ${memberCount}\n`;
        result += `  Topic: ${topic}\n\n`;
    }

    return result;
}

/**
 * Send a message to a Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID or name
 * @param {string} text - Message text
 * @returns {string} Success or error message
 */
async function sendSlackMessage(userId = null, channelId, text) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    const jsonData = {
        channel: channelId,
        text: text
    };

    const response = await makeSlackRequest('chat.postMessage', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error sending message: ${response?.error || 'Unknown error'}`;
    }

    return `Message sent successfully to channel ${channelId}. Message timestamp: ${response.ts}`;
}

/**
 * Get channel ID by channel name
 * @param {string} userId - User ID to get access token from
 * @param {string} channelName - Channel name (without #)
 * @returns {string} Channel ID or error message
 */
async function getChannelIdByName(userId = null, channelName) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    const params = {
        exclude_archived: true,
        types: 'public_channel,private_channel'
    };

    const response = await makeSlackRequest('conversations.list', botToken, params);
    
    if (!response || !response.ok) {
        return `Error: ${response?.error || 'Failed to fetch channels'}`;
    }

    const channels = response.channels || [];
    const channel = channels.find(ch => ch.name === channelName);
    
    if (!channel) {
        return `Channel '${channelName}' not found`;
    }

    return `Channel ID for '${channelName}': ${channel.id}`;
}

/**
 * Get recent messages from a channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {number} limit - Number of messages to retrieve
 * @returns {string} Formatted message list
 */
async function getChannelMessages(userId = null, channelId, limit = 50) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    const params = {
        channel: channelId,
        limit: limit
    };

    const response = await makeSlackRequest('conversations.history', botToken, params);
    
    if (!response || !response.ok) {
        return `Error: ${response?.error || 'Failed to fetch messages'}`;
    }

    const messages = response.messages || [];
    if (messages.length === 0) {
        return 'No messages found in this channel.';
    }

    let result = `Recent ${messages.length} messages from channel ${channelId}:\n\n`;
    
    for (const message of messages.reverse()) {
        const timestamp = new Date(parseFloat(message.ts) * 1000).toLocaleString();
        const user = message.user || 'Unknown';
        const text = message.text || '[No text content]';
        
        result += `**${user}** (${timestamp}):\n${text}\n\n`;
    }

    return result;
}

/**
 * List workspace users
 * @param {string} userId - User ID to get access token from
 * @param {number} limit - Maximum number of users to return per page (default 200, max 1000)
 * @returns {string} Formatted user list
 */
async function listWorkspaceUsers(userId = null, limit = 200) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }

    // Ensure limit is within acceptable range
    const pageLimit = Math.min(Math.max(limit, 1), 1000);
    let allMembers = [];
    let cursor = null;
    let hasMore = true;

    try {
        // Paginate through all users using cursor-based pagination
        while (hasMore) {
            const params = {
                limit: pageLimit
            };
            
            // Add cursor parameter if we have one (for subsequent requests)
            if (cursor) {
                params.cursor = cursor;
            }

            const response = await makeSlackRequest('users.list', botToken, params);
            
            if (!response || !response.ok) {
                return `Error: ${response?.error || 'Failed to fetch users'}`;
            }

            const members = response.members || [];
            allMembers = allMembers.concat(members);

            // Check if there are more results to fetch
            if (response.response_metadata && response.response_metadata.next_cursor) {
                cursor = response.response_metadata.next_cursor;
                hasMore = true;
            } else {
                hasMore = false;
            }
        }

        // Filter out deleted users and bots
        const activeUsers = allMembers.filter(user => !user.deleted && !user.is_bot);
        
        if (activeUsers.length === 0) {
            return 'No active users found in the workspace.';
        }

        let result = `Found ${activeUsers.length} active users (total members including bots/deleted: ${allMembers.length}):\n\n`;
        
        for (const user of activeUsers) {
            const realName = user.real_name || user.name || 'Unknown';
            const displayName = user.profile?.display_name || '';
            const email = user.profile?.email || 'No email';
            const status = user.presence || 'unknown';
            
            result += `• **${realName}**`;
            if (displayName && displayName !== realName) {
                result += ` (${displayName})`;
            }
            result += `\n  ID: ${user.id}\n`;
            result += `  Email: ${email}\n`;
            result += `  Status: ${status}\n\n`;
        }

        return result;
        
    } catch (error) {
        console.error('Error in listWorkspaceUsers pagination:', error);
        return `Error: Failed to fetch all workspace users - ${error.message}`;
    }
}

/**
 * Get detailed information about a specific user
 * @param {string} userId - User ID to get access token from
 * @param {string} targetUserId - The ID of the user to get information about
 * @returns {string} Formatted user information
 */
async function getUserInfo(userId = null, targetUserId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    const params = {
        user: targetUserId
    };

    const response = await makeSlackRequest('users.info', botToken, params);
    
    if (!response || !response.ok) {
        return `Error: ${response?.error || 'Failed to fetch user information'}`;
    }

    const user = response.user;
    if (!user) {
        return 'User not found.';
    }

    const realName = user.real_name || user.name || 'Unknown';
    const displayName = user.profile?.display_name || '';
    const email = user.profile?.email || 'No email';
    const title = user.profile?.title || 'No title';
    const phone = user.profile?.phone || 'No phone';
    const timezone = user.tz_label || 'Unknown timezone';
    const isAdmin = user.is_admin ? 'Yes' : 'No';
    const isOwner = user.is_owner ? 'Yes' : 'No';
    const status = user.profile?.status_text || 'No status';
    
    let result = `**User Information for ${realName}**\n\n`;
    result += `• **ID:** ${user.id}\n`;
    result += `• **Username:** ${user.name}\n`;
    result += `• **Real Name:** ${realName}\n`;
    if (displayName) {
        result += `• **Display Name:** ${displayName}\n`;
    }
    result += `• **Email:** ${email}\n`;
    result += `• **Title:** ${title}\n`;
    result += `• **Phone:** ${phone}\n`;
    result += `• **Timezone:** ${timezone}\n`;
    result += `• **Status:** ${status}\n`;
    result += `• **Admin:** ${isAdmin}\n`;
    result += `• **Owner:** ${isOwner}\n`;
    result += `• **Deleted:** ${user.deleted ? 'Yes' : 'No'}\n`;
    result += `• **Bot:** ${user.is_bot ? 'Yes' : 'No'}\n`;

    return result;
}

/**
 * Get user profile information including custom fields
 * @param {string} userId - User ID to get access token from
 * @param {string} targetUserId - The ID of the user to get profile for
 * @returns {string} Formatted user profile
 */
async function getUserProfile(userId = null, targetUserId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    const params = {
        user: targetUserId
    };

    const response = await makeSlackRequest('users.profile.get', botToken, params);
    
    if (!response || !response.ok) {
        return `Error: ${response?.error || 'Failed to fetch user profile'}`;
    }

    const profile = response.profile;
    if (!profile) {
        return 'User profile not found.';
    }

    let result = `**Profile for ${profile.real_name || profile.display_name || 'Unknown User'}**\n\n`;
    result += `• **Display Name:** ${profile.display_name || 'Not set'}\n`;
    result += `• **Real Name:** ${profile.real_name || 'Not set'}\n`;
    result += `• **Email:** ${profile.email || 'Not set'}\n`;
    result += `• **Title:** ${profile.title || 'Not set'}\n`;
    result += `• **Phone:** ${profile.phone || 'Not set'}\n`;
    result += `• **Skype:** ${profile.skype || 'Not set'}\n`;
    result += `• **Status Text:** ${profile.status_text || 'No status'}\n`;
    result += `• **Status Emoji:** ${profile.status_emoji || 'No emoji'}\n`;
    
    if (profile.fields) {
        result += `\n**Custom Fields:**\n`;
        for (const [key, field] of Object.entries(profile.fields)) {
            if (field.value) {
                result += `• **${field.label || key}:** ${field.value}\n`;
            }
        }
    }

    return result;
}

/**
 * Get all members of a specific channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - The ID of the channel
 * @param {number} limit - Maximum number of members to return
 * @returns {string} Formatted channel members list
 */
async function getChannelMembers(userId = null, channelId, limit = 200) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    const params = {
        channel: channelId,
        limit: limit
    };

    const response = await makeSlackRequest('conversations.members', botToken, params);
    
    if (!response || !response.ok) {
        return `Error: ${response?.error || 'Failed to fetch channel members'}`;
    }

    const memberIds = response.members || [];
    if (memberIds.length === 0) {
        return 'No members found in this channel.';
    }

    // Get user info for all members
    const memberDetails = [];
    for (const memberId of memberIds) {
        const userResponse = await makeSlackRequest('users.info', botToken, { user: memberId });
        if (userResponse?.ok && userResponse.user) {
            memberDetails.push(userResponse.user);
        }
    }

    let result = `**Channel Members (${memberDetails.length} total):**\n\n`;
    
    for (const member of memberDetails) {
        const realName = member.real_name || member.name || 'Unknown';
        const displayName = member.profile?.display_name || '';
        const email = member.profile?.email || 'No email';
        const isBot = member.is_bot ? ' (Bot)' : '';
        
        result += `• **${realName}**${isBot}`;
        if (displayName && displayName !== realName) {
            result += ` (${displayName})`;
        }
        result += `\n  ID: ${member.id}\n`;
        result += `  Email: ${email}\n\n`;
    }

    return result;
}

/**
 * Create a new Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelName - Name of the channel to create
 * @param {boolean} isPrivate - Whether the channel should be private
 * @param {string} topic - Optional topic for the channel
 * @param {string} purpose - Optional purpose for the channel
 * @param {Array} initialMembers - Optional array of user IDs to invite
 * @returns {string} Success message with channel info or error
 */
async function createSlackChannel(userId = null, channelName, isPrivate = false, purpose = null, initialMembers = null) {

    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        name: channelName,
        is_private: isPrivate
    };

    const response = await makeSlackRequest('conversations.create', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error creating channel: ${response?.error || 'Unknown error'}`;
    }

    const channel = response.channel;
    let result = `Channel '${channelName}' created successfully!\n`;
    result += `Channel ID: ${channel.id}\n`;
    result += `Type: ${isPrivate ? 'Private' : 'Public'}\n`;

    // Set purpose if provided
    if (purpose) {
        const purposeResponse = await makeSlackRequest('conversations.setPurpose', botToken, null, {
            channel: channel.id,
            purpose: purpose
        }, 'POST');
        if (purposeResponse?.ok) {
            result += `Purpose set: ${purpose}\n`;
        }
    }

    // Invite initial members if provided
    if (initialMembers && initialMembers.length > 0) {
        const inviteResponse = await makeSlackRequest('conversations.invite', botToken, null, {
            channel: channel.id,
            users: initialMembers.join(',')
        }, 'POST');
        if (inviteResponse?.ok) {
            result += `Invited ${initialMembers.length} members to the channel\n`;
        }
    }

    return result;
}

/**
 * Set the topic for a Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} topic - New topic for the channel
 * @returns {string} Success or error message
 */
async function setChannelTopic(userId = null, channelId, topic) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId,
        topic: topic
    };

    const response = await makeSlackRequest('conversations.setTopic', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error setting topic: ${response?.error || 'Unknown error'}`;
    }

    return `Channel topic updated successfully to: "${topic}"`;
}

/**
 * Set the purpose for a Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} purpose - New purpose for the channel
 * @returns {string} Success or error message
 */
async function setChannelPurpose(userId = null, channelId, purpose) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId,
        purpose: purpose
    };

    const response = await makeSlackRequest('conversations.setPurpose', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error setting purpose: ${response?.error || 'Unknown error'}`;
    }

    return `Channel purpose updated successfully to: "${purpose}"`;
}

/**
 * Archive a Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID to archive
 * @returns {string} Success or error message
 */
async function archiveChannel(userId = null, channelId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId
    };

    const response = await makeSlackRequest('conversations.archive', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error archiving channel: ${response?.error || 'Unknown error'}`;
    }

    return `Channel ${channelId} has been archived successfully.`;
}

/**
 * Invite users to a Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID to invite users to
 * @param {Array} userIds - Array of user IDs to invite
 * @returns {string} Success or error message
 */
async function inviteUsersToChannel(userId = null, channelId, userIds) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return 'Error: Please provide an array of user IDs to invite.';
    }
    
    const jsonData = {
        channel: channelId,
        users: userIds.join(',')
    };

    const response = await makeSlackRequest('conversations.invite', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error inviting users: ${response?.error || 'Unknown error'}`;
    }

    return `Successfully invited ${userIds.length} users to channel ${channelId}.`;
}

/**
 * Remove a user from a Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID to remove user from
 * @param {string} targetUserId - User ID to remove from channel
 * @returns {string} Success or error message
 */
async function kickUserFromChannel(userId = null, channelId, targetUserId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId,
        user: targetUserId
    };

    const response = await makeSlackRequest('conversations.kick', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error removing user: ${response?.error || 'Unknown error'}`;
    }

    return `Successfully removed user ${targetUserId} from channel ${channelId}.`;
}

/**
 * Open a direct message conversation
 * @param {string} userId - User ID to get access token from
 * @param {Array} targetUserIds - Array of user IDs (1 for DM, multiple for group DM)
 * @returns {string} DM channel ID or error message
 */
async function openDirectMessage(userId = null, targetUserIds) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        return 'Error: Please provide an array of user IDs.';
    }
    
    const jsonData = {
        users: targetUserIds.join(',')
    };

    const response = await makeSlackRequest('conversations.open', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error opening DM: ${response?.error || 'Unknown error'}`;
    }

    const channel = response.channel;
    const dmType = targetUserIds.length === 1 ? 'Direct Message' : 'Group Direct Message';
    
    return `${dmType} opened successfully. Channel ID: ${channel.id}`;
}

/**
 * Send a direct message to a user
 * @param {string} userId - User ID to get access token from
 * @param {string} targetUserId - User ID to send DM to
 * @param {string} text - Message text
 * @returns {string} Success or error message
 */
async function sendDirectMessage(userId = null, targetUserId, text) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    // First open a DM channel
    const dmResponse = await makeSlackRequest('conversations.open', botToken, null, {
        users: targetUserId
    }, 'POST');
    
    if (!dmResponse || !dmResponse.ok) {
        return `Error opening DM: ${dmResponse?.error || 'Unknown error'}`;
    }
    
    const channelId = dmResponse.channel.id;
    
    // Send the message
    const messageResponse = await makeSlackRequest('chat.postMessage', botToken, null, {
        channel: channelId,
        text: text
    }, 'POST');
    
    if (!messageResponse || !messageResponse.ok) {
        return `Error sending DM: ${messageResponse?.error || 'Unknown error'}`;
    }

    return `Direct message sent successfully to user ${targetUserId}.`;
}

/**
 * Send an ephemeral message visible only to a specific user
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} targetUserId - User ID who will see the message
 * @param {string} text - Message text
 * @returns {string} Success or error message
 */
async function sendEphemeralMessage(userId = null, channelId, targetUserId, text) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId,
        user: targetUserId,
        text: text
    };

    const response = await makeSlackRequest('chat.postEphemeral', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error sending ephemeral message: ${response?.error || 'Unknown error'}`;
    }

    return `Ephemeral message sent successfully to user ${targetUserId} in channel ${channelId}.`;
}

/**
 * Reply to a thread in a Slack channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} threadTs - Thread timestamp to reply to
 * @param {string} text - Reply text
 * @returns {string} Success or error message
 */
async function replyToThread(userId = null, channelId, threadTs, text) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId,
        thread_ts: threadTs,
        text: text
    };

    const response = await makeSlackRequest('chat.postMessage', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error replying to thread: ${response?.error || 'Unknown error'}`;
    }

    return `Reply posted successfully to thread ${threadTs} in channel ${channelId}.`;
}

/**
 * Get messages from a specific thread
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} threadTs - Thread timestamp
 * @param {number} limit - Maximum number of messages to return
 * @returns {string} Formatted thread messages
 */
async function getThreadMessages(userId = null, channelId, threadTs, limit = 50) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const params = {
        channel: channelId,
        ts: threadTs,
        limit: limit
    };

    const response = await makeSlackRequest('conversations.replies', botToken, params);
    
    if (!response || !response.ok) {
        return `Error getting thread messages: ${response?.error || 'Unknown error'}`;
    }

    const messages = response.messages || [];
    if (messages.length === 0) {
        return 'No messages found in this thread.';
    }

    // Get user info for all unique users
    const userIds = [...new Set(messages.map(msg => msg.user).filter(Boolean))];
    const userNames = {};
    
    for (const userId of userIds) {
        const userData = await makeSlackRequest('users.info', botToken, { user: userId });
        if (userData?.ok) {
            const user = userData.user || {};
            userNames[userId] = user.real_name || user.name || 'Unknown';
        }
    }

    let result = `**Thread Messages (${messages.length} total):**\n\n`;
    
    for (const message of messages) {
        const timestamp = new Date(parseFloat(message.ts) * 1000).toLocaleString();
        const userId = message.user || 'Unknown';
        const userName = userNames[userId] || 'Unknown User';
        const text = message.text || '[No text content]';
        
        result += `**${userName}** (${timestamp}):\n${text}\n\n`;
    }

    return result;
}

/**
 * Start a new thread with a message
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} text - Message text to start the thread
 * @param {boolean} broadcast - Whether to broadcast to channel
 * @returns {string} Success message with thread info
 */
async function startThreadWithMessage(userId = null, channelId, text, broadcast = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId,
        text: text,
        reply_broadcast: broadcast
    };

    const response = await makeSlackRequest('chat.postMessage', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error starting thread: ${response?.error || 'Unknown error'}`;
    }

    const threadTs = response.ts;
    let result = `Thread started successfully in channel ${channelId}.\n`;
    result += `Thread timestamp: ${threadTs}\n`;
    if (broadcast) {
        result += `Message was broadcast to the channel.\n`;
    }

    return result;
}

/**
 * Find threads in a channel
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {number} limit - Maximum number of messages to check
 * @returns {string} Formatted list of threads
 */
async function findThreadsInChannel(userId = null, channelId, limit = 50) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const params = {
        channel: channelId,
        limit: limit
    };

    const response = await makeSlackRequest('conversations.history', botToken, params);
    
    if (!response || !response.ok) {
        return `Error getting channel messages: ${response?.error || 'Unknown error'}`;
    }

    const messages = response.messages || [];
    const threads = messages.filter(msg => msg.reply_count && msg.reply_count > 0);
    
    if (threads.length === 0) {
        return 'No threads found in this channel.';
    }

    // Get user info for thread starters
    const userIds = [...new Set(threads.map(msg => msg.user).filter(Boolean))];
    const userNames = {};
    
    for (const userId of userIds) {
        const userData = await makeSlackRequest('users.info', botToken, { user: userId });
        if (userData?.ok) {
            const user = userData.user || {};
            userNames[userId] = user.real_name || user.name || 'Unknown';
        }
    }

    let result = `**Threads in Channel (${threads.length} found):**\n\n`;
    
    for (const thread of threads) {
        const timestamp = new Date(parseFloat(thread.ts) * 1000).toLocaleString();
        const userId = thread.user || 'Unknown';
        const userName = userNames[userId] || 'Unknown User';
        const text = thread.text || '[No text content]';
        const replyCount = thread.reply_count || 0;
        
        result += `**Thread by ${userName}** (${timestamp}):\n`;
        result += `Message: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n`;
        result += `Replies: ${replyCount}\n`;
        result += `Thread TS: ${thread.ts}\n\n`;
    }

    return result;
}

/**
 * Reply to a thread with broadcast option
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} threadTs - Thread timestamp to reply to
 * @param {string} text - Reply text
 * @param {boolean} broadcast - Whether to broadcast to channel
 * @returns {string} Success or error message
 */
async function replyToThreadWithBroadcast(userId = null, channelId, threadTs, text, broadcast = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const jsonData = {
        channel: channelId,
        thread_ts: threadTs,
        text: text,
        reply_broadcast: broadcast
    };

    const response = await makeSlackRequest('chat.postMessage', botToken, null, jsonData, 'POST');
    
    if (!response || !response.ok) {
        return `Error replying to thread: ${response?.error || 'Unknown error'}`;
    }

    let result = `Reply posted successfully to thread ${threadTs} in channel ${channelId}.`;
    if (broadcast) {
        result += ` Message was broadcast to the channel.`;
    }

    return result;
}

/**
 * Get detailed information about a thread
 * @param {string} userId - User ID to get access token from
 * @param {string} channelId - Channel ID
 * @param {string} threadTs - Thread timestamp
 * @returns {string} Detailed thread information
 */
async function getThreadInfo(userId = null, channelId, threadTs) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const botToken = await getSlackAccessToken(userId);
    if (!botToken) {
        return 'Error: Slack access token not found. Please configure your Slack integration in your profile settings.';
    }
    
    const params = {
        channel: channelId,
        ts: threadTs
    };

    const response = await makeSlackRequest('conversations.replies', botToken, params);
    
    if (!response || !response.ok) {
        return `Error getting thread info: ${response?.error || 'Unknown error'}`;
    }

    const messages = response.messages || [];
    if (messages.length === 0) {
        return 'Thread not found.';
    }

    const parentMessage = messages[0];
    const replies = messages.slice(1);
    
    // Get user info for parent message author
    const userResponse = await makeSlackRequest('users.info', botToken, { user: parentMessage.user });
    const userName = userResponse?.ok ? 
        (userResponse.user?.real_name || userResponse.user?.name || 'Unknown') : 'Unknown User';
    
    const timestamp = new Date(parseFloat(parentMessage.ts) * 1000).toLocaleString();
    
    let result = `**Thread Information:**\n\n`;
    result += `**Started by:** ${userName}\n`;
    result += `**Started at:** ${timestamp}\n`;
    result += `**Thread TS:** ${threadTs}\n`;
    result += `**Total replies:** ${replies.length}\n`;
    result += `**Original message:** ${parentMessage.text || '[No text content]'}\n\n`;
    
    if (replies.length > 0) {
        const lastReply = replies[replies.length - 1];
        const lastReplyTime = new Date(parseFloat(lastReply.ts) * 1000).toLocaleString();
        result += `**Last reply:** ${lastReplyTime}\n`;
        
        // Get unique participants
        const participants = [...new Set(replies.map(msg => msg.user).filter(Boolean))];
        result += `**Participants:** ${participants.length}\n`;
    }

    return result;
}

module.exports = {
    listSlackChannels,
    sendSlackMessage,
    getChannelIdByName,
    getChannelMessages,
    listWorkspaceUsers,
    getUserInfo,
    getUserProfile,
    getChannelMembers,
    createSlackChannel,
    setChannelTopic,
    setChannelPurpose,
    archiveChannel,
    inviteUsersToChannel,
    kickUserFromChannel,
    openDirectMessage,
    sendDirectMessage,
    sendEphemeralMessage,
    replyToThread,
    getThreadMessages,
    startThreadWithMessage,
    findThreadsInChannel,
    replyToThreadWithBroadcast,
    getThreadInfo
};