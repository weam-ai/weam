/**
 * Zoom MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 * Updated to use automated token refresh authentication
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');
const { 
    makeAuthenticatedZoomRequest, 
    makeEnhancedZoomRequest,
    getValidAccessToken, 
    ZoomAuthenticationError,
    handleZoomApiErrors 
} = require('../utils/zoom-auth');

const ZOOM_API_BASE = 'https://api.zoom.us/v2';

/**
 * Make a request to the Zoom API with enhanced error handling and fallback options
 * @param {string} userId - User ID for authentication
 * @param {string} endpoint - The API endpoint
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST/PATCH requests
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {boolean} useServerFallback - Whether to use server-to-server auth as fallback
 * @returns {Object|null} API response data
 */
async function makeZoomRequest(userId, endpoint, params = null, jsonData = null, method = 'GET', useServerFallback = false) {
    try {
        const options = { method };
        if (params) options.params = params;
        if (jsonData) options.data = jsonData;
        
        // Use enhanced request method with better error handling and fallback options
        return await makeEnhancedZoomRequest(userId, endpoint, options, useServerFallback);
    } catch (error) {
        if (error instanceof ZoomAuthenticationError) {
            console.error('Zoom Authentication Error:', error.message);
            return { error: true, message: error.message, code: error.code };
        }
        console.error('Zoom API Error:', error.message);
        return { error: true, message: error.message };
    }
}

/**
 * Get Zoom access token from user's MCP data with automatic refresh
 * @param {string} userId - User ID
 * @returns {string|null} Zoom access token or null if not found
 */
async function getZoomAccessToken(userId) {
    try {
        return await getValidAccessToken(userId);
    } catch (error) {
        if (error instanceof ZoomAuthenticationError) {
            console.error('Zoom Authentication Error:', error.message);
            return null;
        }
        console.error('Error fetching Zoom access token:', error.message);
        return null;
    }
}

/**
 * Get current user information
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted user information
 */
async function getZoomUserInfo(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const response = await makeZoomRequest(userId, 'users/me');
    
    if (!response || response.error || response.code) {
        return `Error: ${response?.message || 'Failed to fetch user information'}`;
    }

    let result = `**Zoom User Information:**\n\n`;
    result += `• **Name:** ${response.first_name} ${response.last_name}\n`;
    result += `• **Email:** ${response.email}\n`;
    result += `• **User ID:** ${response.id}\n`;
    result += `• **Account ID:** ${response.account_id}\n`;
    result += `• **Type:** ${response.type === 1 ? 'Basic' : response.type === 2 ? 'Licensed' : 'On-prem'}\n`;
    result += `• **Status:** ${response.status}\n`;
    result += `• **Timezone:** ${response.timezone || 'Not set'}\n`;
    result += `• **Language:** ${response.language || 'Not set'}\n`;
    result += `• **PMI:** ${response.pmi || 'Not set'}\n`;
    result += `• **Personal Meeting URL:** ${response.personal_meeting_url || 'Not set'}\n`;

    return result;
}

/**
 * List all meetings for the authenticated user
 * @param {string} userId - User ID to get access token from
 * @param {string} type - Meeting type (scheduled, live, upcoming)
 * @param {number} pageSize - Number of meetings to return per page
 * @returns {string} Formatted meeting list
 */
async function listZoomMeetings(userId = null, type = 'scheduled', pageSize = 30) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const params = {
        type: type,
        page_size: pageSize
    };

    const response = await makeZoomRequest(userId, 'users/me/meetings', params);
    
    if (!response || response.error || response.code) {
        return `Error: ${response?.message || 'Failed to fetch meetings'}`;
    }

    const meetings = response.meetings || [];
    if (meetings.length === 0) {
        return `No ${type} meetings found.`;
    }

    let result = `**${type.charAt(0).toUpperCase() + type.slice(1)} Meetings (${meetings.length} found):**\n\n`;
    
    for (const meeting of meetings) {
        const startTime = meeting.start_time ? new Date(meeting.start_time).toLocaleString() : 'Not scheduled';
        const duration = meeting.duration || 'Not set';
        const status = meeting.status || 'Unknown';
        
        result += `• **${meeting.topic}**\n`;
        result += `  Meeting ID: ${meeting.id}\n`;
        result += `  Start Time: ${startTime}\n`;
        result += `  Duration: ${duration} minutes\n`;
        result += `  Status: ${status}\n`;
        result += `  Join URL: ${meeting.join_url}\n`;
        if (meeting.password) {
            result += `  Password: ${meeting.password}\n`;
        }
        result += `\n`;
    }

    return result;
}

/**
 * Create a new Zoom meeting
 * @param {string} userId - User ID to get access token from
 * @param {string} topic - Meeting topic
 * @param {string} startTime - Meeting start time (ISO 8601 format)
 * @param {number} duration - Meeting duration in minutes
 * @param {string} password - Meeting password (optional)
 * @param {Object} settings - Additional meeting settings
 * @param {Array<string>} invitees - Array of email addresses to invite to the meeting
 * @returns {string} Success message with meeting details or error
 */
async function createZoomMeeting(userId = null, topic, startTime = null, duration = 60, password = null, settings = {}, invitees = []) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const meetingData = {
        topic: topic,
        type: startTime ? 2 : 1, // 1 = instant, 2 = scheduled
        duration: duration,
        settings: {
            host_video: settings.host_video || false,
            participant_video: settings.participant_video || false,
            join_before_host: settings.join_before_host || false,
            mute_upon_entry: settings.mute_upon_entry || false,
            watermark: settings.watermark || false,
            use_pmi: settings.use_pmi || false,
            approval_type: settings.approval_type || 2,
            audio: settings.audio || 'both',
            auto_recording: settings.auto_recording || 'none',
            waiting_room: settings.waiting_room || false,
            ...settings
        }
    };
    
    // Add invitees to meeting data if provided
    if (invitees && invitees.length > 0) {
        meetingData.invitees = invitees.map(email => ({ email: email.trim() }));
    }

    if (startTime) {
        meetingData.start_time = startTime;
    }

    if (password) {
        meetingData.password = password;
    }

    const response = await makeZoomRequest(userId, 'users/me/meetings', null, meetingData, 'POST');
    
    if (!response || response.error || response.code) {
        return `Error creating meeting: ${response?.message || 'Unknown error'}`;
    }

    let result = `Meeting '${topic}' created successfully!\n`;
    result += `Meeting ID: ${response.id}\n`;
    result += `Join URL: ${response.join_url}\n`;
    if (response.password) {
        result += `Password: ${response.password}\n`;
    }
    if (response.start_time) {
        result += `Start Time: ${new Date(response.start_time).toLocaleString()}\n`;
    }
    result += `Duration: ${response.duration} minutes\n`;
    result += `Host URL: ${response.start_url}\n`;
    
    // Show invitees info if provided
    if (invitees && invitees.length > 0) {
        result += `\n✅ Invitations sent to ${invitees.length} participant(s): ${invitees.join(', ')}\n`;
    }

    return result;
}

/**
 * Get detailed information about a specific meeting
 * @param {string} userId - User ID to get access token from
 * @param {string} meetingId - Meeting ID
 * @returns {string} Formatted meeting information
 */
async function getZoomMeetingInfo(userId = null, meetingId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const response = await makeZoomRequest(userId, `meetings/${meetingId}`);
    
    if (!response || response.error || response.code) {
        return `Error: ${response?.message || 'Failed to fetch meeting information'}`;
    }

    const startTime = response.start_time ? new Date(response.start_time).toLocaleString() : 'Not scheduled';
    const createdAt = response.created_at ? new Date(response.created_at).toLocaleString() : 'Unknown';
    
    let result = `**Meeting Information:**\n\n`;
    result += `• **Topic:** ${response.topic}\n`;
    result += `• **Meeting ID:** ${response.id}\n`;
    result += `• **Host ID:** ${response.host_id}\n`;
    result += `• **Status:** ${response.status}\n`;
    result += `• **Start Time:** ${startTime}\n`;
    result += `• **Duration:** ${response.duration} minutes\n`;
    result += `• **Timezone:** ${response.timezone || 'Not set'}\n`;
    result += `• **Created At:** ${createdAt}\n`;
    result += `• **Join URL:** ${response.join_url}\n`;
    result += `• **Start URL:** ${response.start_url}\n`;
    
    if (response.password) {
        result += `• **Password:** ${response.password}\n`;
    }
    
    if (response.settings) {
        result += `\n**Settings:**\n`;
        result += `• Host Video: ${response.settings.host_video ? 'Enabled' : 'Disabled'}\n`;
        result += `• Participant Video: ${response.settings.participant_video ? 'Enabled' : 'Disabled'}\n`;
        result += `• Join Before Host: ${response.settings.join_before_host ? 'Enabled' : 'Disabled'}\n`;
        result += `• Mute Upon Entry: ${response.settings.mute_upon_entry ? 'Enabled' : 'Disabled'}\n`;
        result += `• Waiting Room: ${response.settings.waiting_room ? 'Enabled' : 'Disabled'}\n`;
        result += `• Audio: ${response.settings.audio || 'Both'}\n`;
        result += `• Auto Recording: ${response.settings.auto_recording || 'None'}\n`;
    }

    return result;
}

/**
 * Update an existing meeting
 * @param {string} userId - User ID to get access token from
 * @param {string} meetingId - Meeting ID to update
 * @param {Object} updateData - Data to update
 * @returns {string} Success or error message
 */
async function updateZoomMeeting(userId = null, meetingId, updateData) {


    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const response = await makeZoomRequest(userId, `meetings/${meetingId}`, null, updateData, 'PATCH');
    
    if (response && (response.error || response.code)) {
        return `Error updating meeting: ${response.message || 'Unknown error'}`;
    }

    return `Meeting ${meetingId} updated successfully.`;
}

/**
 * Delete a meeting
 * @param {string} userId - User ID to get access token from
 * @param {string} meetingId - Meeting ID to delete
 * @param {string} occurrenceId - Occurrence ID for recurring meetings (optional)
 * @returns {string} Success or error message
 */
async function deleteZoomMeeting(userId = null, meetingId, occurrenceId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const params = occurrenceId ? { occurrence_id: occurrenceId } : null;
    const response = await makeZoomRequest(userId, `meetings/${meetingId}`, params, null, 'DELETE');
    
    if (response && (response.error || response.code)) {
        return `Error deleting meeting: ${response.message || 'Unknown error'}`;
    }

    return `Meeting ${meetingId} deleted successfully.`;
}

/**
 * List meeting participants
 * @param {string} userId - User ID to get access token from
 * @param {string} meetingId - Meeting ID
 * @param {number} pageSize - Number of participants to return per page
 * @returns {string} Formatted participants list
 */
async function listMeetingParticipants(userId = null, meetingId, pageSize = 30) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const params = {
        page_size: pageSize
    };

    const response = await makeZoomRequest(userId, `past_meetings/${meetingId}/participants`, params);
    
    if (!response || response.error || response.code) {
        return `Error: ${response?.message || 'Failed to fetch participants'}`;
    }

    const participants = response.participants || [];
    if (participants.length === 0) {
        return 'No participants found for this meeting.';
    }

    let result = `**Meeting Participants (${participants.length} found):**\n\n`;
    
    for (const participant of participants) {
        const joinTime = participant.join_time ? new Date(participant.join_time).toLocaleString() : 'Unknown';
        const leaveTime = participant.leave_time ? new Date(participant.leave_time).toLocaleString() : 'Still in meeting';
        const duration = participant.duration || 0;
        
        result += `• **${participant.name || 'Unknown'}**\n`;
        result += `  Email: ${participant.user_email || 'Not provided'}\n`;
        result += `  User ID: ${participant.user_id || 'Guest'}\n`;
        result += `  Join Time: ${joinTime}\n`;
        result += `  Leave Time: ${leaveTime}\n`;
        result += `  Duration: ${Math.floor(duration / 60)} minutes\n`;
        result += `\n`;
    }

    return result;
}







/**
 * Get meeting poll results
 * @param {string} userId - User ID to get access token from
 * @param {string} meetingId - Meeting ID
 * @returns {string} Formatted poll results
 */
async function getMeetingPolls(userId = null, meetingId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const response = await makeZoomRequest(userId, `past_meetings/${meetingId}/polls`);
    
    if (!response || response.error || response.code) {
        return `Error: ${response?.message || 'Failed to fetch poll results'}`;
    }

    const polls = response.polls || [];
    if (polls.length === 0) {
        return 'No polls found for this meeting.';
    }

    let result = `**Meeting Poll Results (${polls.length} polls):**\n\n`;
    
    for (const poll of polls) {
        result += `• **Poll: ${poll.title || 'Untitled'}**\n`;
        result += `  Status: ${poll.status || 'Unknown'}\n`;
        
        if (poll.questions && poll.questions.length > 0) {
            result += `  Questions (${poll.questions.length}):\n`;
            
            for (const question of poll.questions) {
                result += `    - ${question.name || 'Question'}\n`;
                result += `      Type: ${question.type || 'Unknown'}\n`;
                
                if (question.answers && question.answers.length > 0) {
                    result += `      Answers:\n`;
                    for (const answer of question.answers) {
                        result += `        • ${answer}\n`;
                    }
                }
            }
        }
        result += `\n`;
    }

    return result;
}

module.exports = {
    getZoomUserInfo,
    listZoomMeetings,
    createZoomMeeting,
    getZoomMeetingInfo,
    updateZoomMeeting,
    deleteZoomMeeting,
    listMeetingParticipants,
    getMeetingPolls
};