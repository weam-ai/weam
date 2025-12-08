/**
 * ClickUp MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

/**
 * Make a request to the ClickUp API
 * @param {string} endpoint - The API endpoint
 * @param {string} accessToken - ClickUp access token
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST/PUT requests
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @returns {Object|null} API response data
 */
async function makeClickUpRequest(endpoint, accessToken, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': accessToken,
        'Content-Type': 'application/json'
    };

    try {
        let response;
        const url = `${CLICKUP_API_BASE}/${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params });
        } else if (method === 'POST') {
            response = await axios.post(url, jsonData, { headers, params });
        } else if (method === 'PUT') {
            response = await axios.put(url, jsonData, { headers, params });
        } else if (method === 'DELETE') {
            response = await axios.delete(url, { headers, params });
        }

        return response.data;
    } catch (error) {
        console.error('ClickUp API Error:', error.message);
        return null;
    }
}

/**
 * Get ClickUp access token from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} ClickUp access token or null if not found
 */
async function getClickUpAccessToken(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.CLICKUP || !user.mcpdata.CLICKUP.access_token) {
            return null;
        }
        // Decrypt the access token before returning
        const decryptedToken = decryptedData(user.mcpdata.CLICKUP.access_token);
        return decryptedToken;
    } catch (error) {
        console.error('Error fetching ClickUp access token:', error.message);
        return null;
    }
}

/**
 * Get authorized workspaces (teams) for the user
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted workspace list
 */
async function getAuthorizedWorkspaces(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const response = await makeClickUpRequest('team', accessToken);
    
    if (!response || !response.teams) {
        return 'Error: Failed to fetch workspaces';
    }

    const teams = response.teams || [];
    if (teams.length === 0) {
        return 'No workspaces found.';
    }

    let result = `Found ${teams.length} authorized workspaces:\n\n`;
    for (const team of teams) {
        result += `• **${team.name}**\n`;
        result += `  ID: ${team.id}\n`;
        result += `  Color: ${team.color || 'Default'}\n`;
        result += `  Avatar: ${team.avatar || 'None'}\n\n`;
    }

    return result;
}

/**
 * Get spaces in a workspace
 * @param {string} userId - User ID to get access token from
 * @param {string} teamId - Workspace (team) ID
 * @param {boolean} archived - Include archived spaces
 * @returns {string} Formatted spaces list
 */
async function getSpaces(userId = null, teamId, archived = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const params = {
        archived: archived
    };

    const response = await makeClickUpRequest(`team/${teamId}/space`, accessToken, params);
    
    if (!response || !response.spaces) {
        return 'Error: Failed to fetch spaces';
    }

    const spaces = response.spaces || [];
    if (spaces.length === 0) {
        return 'No spaces found in this workspace.';
    }

    let result = `Found ${spaces.length} spaces in workspace:\n\n`;
    for (const space of spaces) {
        result += `• **${space.name}**\n`;
        result += `  ID: ${space.id}\n`;
        result += `  Private: ${space.private ? 'Yes' : 'No'}\n`;
        result += `  Color: ${space.color || 'Default'}\n`;
        result += `  Archived: ${space.archived ? 'Yes' : 'No'}\n\n`;
    }

    return result;
}

/**
 * Get folders in a space
 * @param {string} userId - User ID to get access token from
 * @param {string} spaceId - Space ID
 * @param {boolean} archived - Include archived folders
 * @returns {string} Formatted folders list
 */
async function getFolders(userId = null, spaceId, archived = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const params = {
        archived: archived
    };

    const response = await makeClickUpRequest(`space/${spaceId}/folder`, accessToken, params);
    
    if (!response || !response.folders) {
        return 'Error: Failed to fetch folders';
    }

    const folders = response.folders || [];
    if (folders.length === 0) {
        return 'No folders found in this space.';
    }

    let result = `Found ${folders.length} folders in space:\n\n`;
    for (const folder of folders) {
        result += `• **${folder.name}**\n`;
        result += `  ID: ${folder.id}\n`;
        result += `  Hidden: ${folder.hidden ? 'Yes' : 'No'}\n`;
        result += `  Task Count: ${folder.task_count || 0}\n`;
        result += `  Archived: ${folder.archived ? 'Yes' : 'No'}\n\n`;
    }

    return result;
}

/**
 * Get lists in a folder or space
 * @param {string} userId - User ID to get access token from
 * @param {string} folderId - Folder ID (optional)
 * @param {string} spaceId - Space ID (required if no folder)
 * @param {boolean} archived - Include archived lists
 * @returns {string} Formatted lists
 */
async function getLists(userId = null, folderId = null, spaceId = null, archived = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    if (!folderId && !spaceId) {
        return 'Error: Either folder ID or space ID is required.';
    }

    const params = {
        archived: archived
    };

    let endpoint;
    if (folderId) {
        endpoint = `folder/${folderId}/list`;
    } else {
        endpoint = `space/${spaceId}/list`;
    }

    const response = await makeClickUpRequest(endpoint, accessToken, params);
    
    if (!response || !response.lists) {
        return 'Error: Failed to fetch lists';
    }

    const lists = response.lists || [];
    if (lists.length === 0) {
        return 'No lists found.';
    }

    let result = `Found ${lists.length} lists:\n\n`;
    for (const list of lists) {
        result += `• **${list.name}**\n`;
        result += `  ID: ${list.id}\n`;
        result += `  Task Count: ${list.task_count || 0}\n`;
        result += `  Due Date: ${list.due_date ? new Date(parseInt(list.due_date)).toLocaleDateString() : 'None'}\n`;
        result += `  Priority: ${list.priority ? list.priority.priority : 'None'}\n`;
        result += `  Archived: ${list.archived ? 'Yes' : 'No'}\n\n`;
    }

    return result;
}

/**
 * Get tasks from a list
 * @param {string} userId - User ID to get access token from
 * @param {string} listId - List ID
 * @param {boolean} archived - Include archived tasks
 * @param {number} page - Page number for pagination
 * @param {boolean} subtasks - Include subtasks
 * @returns {string} Formatted tasks list
 */
async function getTasks(userId = null, listId, archived = false, page = 0, subtasks = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const params = {
        archived: archived,
        page: page,
        subtasks: subtasks
    };

    const response = await makeClickUpRequest(`list/${listId}/task`, accessToken, params);
    
    if (!response || !response.tasks) {
        return 'Error: Failed to fetch tasks';
    }

    const tasks = response.tasks || [];
    if (tasks.length === 0) {
        return 'No tasks found in this list.';
    }

    let result = `Found ${tasks.length} tasks in list:\n\n`;
    for (const task of tasks) {
        const assignees = task.assignees ? task.assignees.map(a => a.username).join(', ') : 'Unassigned';
        const priority = task.priority ? task.priority.priority : 'None';
        const status = task.status ? task.status.status : 'No status';
        const dueDate = task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString() : 'No due date';
        
        result += `• **${task.name}**\n`;
        result += `  ID: ${task.id}\n`;
        result += `  Status: ${status}\n`;
        result += `  Priority: ${priority}\n`;
        result += `  Assignees: ${assignees}\n`;
        result += `  Due Date: ${dueDate}\n`;
        result += `  Description: ${task.description || 'No description'}\n\n`;
    }

    return result;
}

/**
 * Get a specific task by ID
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - Task ID
 * @param {boolean} includeSubtasks - Include subtasks in response
 * @returns {string} Formatted task details
 */
async function getTask(userId = null, taskId, includeSubtasks = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const params = {
        include_subtasks: includeSubtasks
    };

    const response = await makeClickUpRequest(`task/${taskId}`, accessToken, params);
    
    if (!response) {
        return 'Error: Failed to fetch task or task not found';
    }

    const task = response;
    const assignees = task.assignees ? task.assignees.map(a => `${a.username} (${a.email})`).join(', ') : 'Unassigned';
    const priority = task.priority ? task.priority.priority : 'None';
    const status = task.status ? task.status.status : 'No status';
    const dueDate = task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString() : 'No due date';
    const timeEstimate = task.time_estimate ? `${Math.round(task.time_estimate / 3600000)} hours` : 'No estimate';
    
    let result = `**Task Details: ${task.name}**\n\n`;
    result += `• **ID:** ${task.id}\n`;
    result += `• **Status:** ${status}\n`;
    result += `• **Priority:** ${priority}\n`;
    result += `• **Assignees:** ${assignees}\n`;
    result += `• **Due Date:** ${dueDate}\n`;
    result += `• **Time Estimate:** ${timeEstimate}\n`;
    result += `• **Description:** ${task.description || 'No description'}\n`;
    result += `• **URL:** ${task.url}\n`;
    
    if (task.tags && task.tags.length > 0) {
        result += `• **Tags:** ${task.tags.map(tag => tag.name).join(', ')}\n`;
    }
    
    if (task.parent) {
        result += `• **Parent Task:** ${task.parent}\n`;
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
        result += `\n**Subtasks (${task.subtasks.length}):**\n`;
        for (const subtask of task.subtasks) {
            result += `  - ${subtask.name} (${subtask.status.status})\n`;
        }
    }

    return result;
}

/**
 * Create a new task
 * @param {string} userId - User ID to get access token from
 * @param {string} listId - List ID where task will be created
 * @param {string} name - Task name
 * @param {string} description - Task description
 * @param {Array} assignees - Array of user IDs to assign
 * @param {number} priority - Priority level (1=Urgent, 2=High, 3=Normal, 4=Low)
 * @param {string} dueDate - Due date in milliseconds
 * @param {string} status - Task status
 * @returns {string} Success message with task details
 */
async function createTask(userId = null, listId, name, description = '', assignees = [], priority = null, dueDate = null, status = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const jsonData = {
        name: name,
        description: description,
        assignees: assignees
    };

    if (priority) {
        jsonData.priority = priority;
    }
    if (dueDate) {
        jsonData.due_date = dueDate;
    }
    if (status) {
        jsonData.status = status;
    }

    const response = await makeClickUpRequest(`list/${listId}/task`, accessToken, null, jsonData, 'POST');
    
    if (!response || !response.id) {
        return 'Error: Failed to create task';
    }

    return `Task created successfully!\nTask ID: ${response.id}\nName: ${response.name}\nURL: ${response.url}`;
}

/**
 * Update an existing task
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - Task ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {string} Success or error message
 */
async function updateTask(userId = null, taskId, updates = {}) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const response = await makeClickUpRequest(`task/${taskId}`, accessToken, null, updates, 'PUT');
    
    if (!response) {
        return 'Error: Failed to update task';
    }

    return `Task updated successfully! Task ID: ${taskId}`;
}

/**
 * Delete a task
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - Task ID to delete
 * @returns {string} Success or error message
 */
async function deleteTask(userId = null, taskId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const response = await makeClickUpRequest(`task/${taskId}`, accessToken, null, null, 'DELETE');
    
    if (response === null) {
        return 'Error: Failed to delete task';
    }

    return `Task deleted successfully! Task ID: ${taskId}`;
}

/**
 * Get comments on a task
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - Task ID
 * @returns {string} Formatted comments list
 */
async function getTaskComments(userId = null, taskId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const response = await makeClickUpRequest(`task/${taskId}/comment`, accessToken);
    
    if (!response || !response.comments) {
        return 'Error: Failed to fetch comments';
    }

    const comments = response.comments || [];
    if (comments.length === 0) {
        return 'No comments found on this task.';
    }

    let result = `Found ${comments.length} comments on task:\n\n`;
    for (const comment of comments) {
        const date = new Date(parseInt(comment.date)).toLocaleString();
        const user = comment.user ? comment.user.username : 'Unknown';
        
        result += `**${user}** (${date}):\n${comment.comment_text}\n\n`;
    }

    return result;
}

/**
 * Create a comment on a task
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - Task ID
 * @param {string} commentText - Comment text
 * @param {string} assignee - User ID to assign (optional)
 * @returns {string} Success or error message
 */
async function createTaskComment(userId = null, taskId, commentText, assignee = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const jsonData = {
        comment_text: commentText
    };

    if (assignee) {
        jsonData.assignee = assignee;
    }

    const response = await makeClickUpRequest(`task/${taskId}/comment`, accessToken, null, jsonData, 'POST');
    
    if (!response || !response.id) {
        return 'Error: Failed to create comment';
    }

    return `Comment created successfully! Comment ID: ${response.id}`;
}

/**
 * Get workspace members
 * @param {string} userId - User ID to get access token from
 * @param {string} teamId - Workspace (team) ID
 * @returns {string} Formatted members list
 */
async function getWorkspaceMembers(userId = null, teamId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const response = await makeClickUpRequest(`team/${teamId}`, accessToken);
    
    if (!response || !response.team || !response.team.members) {
        return 'Error: Failed to fetch workspace members';
    }

    const members = response.team.members || [];
    if (members.length === 0) {
        return 'No members found in this workspace.';
    }

    let result = `Found ${members.length} members in workspace:\n\n`;
    for (const member of members) {
        const user = member.user;
        const role = member.role === 1 ? 'Owner' : member.role === 2 ? 'Admin' : member.role === 3 ? 'Member' : 'Guest';
        
        result += `• **${user.username}**\n`;
        result += `  ID: ${user.id}\n`;
        result += `  Email: ${user.email}\n`;
        result += `  Role: ${role}\n`;
        result += `  Color: ${user.color || 'Default'}\n\n`;
    }

    return result;
}

/**
 * Get user information
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted user information
 */
async function getUser(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getClickUpAccessToken(userId);
    if (!accessToken) {
        return 'Error: ClickUp access token not found. Please configure your ClickUp integration in your profile settings.';
    }

    const response = await makeClickUpRequest('user', accessToken);
    
    if (!response || !response.user) {
        return 'Error: Failed to fetch user information';
    }

    const user = response.user;
    
    let result = `**User Information**\n\n`;
    result += `• **ID:** ${user.id}\n`;
    result += `• **Username:** ${user.username}\n`;
    result += `• **Email:** ${user.email}\n`;
    result += `• **Color:** ${user.color || 'Default'}\n`;
    result += `• **Profile Picture:** ${user.profilePicture || 'None'}\n`;
    result += `• **Initials:** ${user.initials || 'N/A'}\n`;
    result += `• **Week Start Day:** ${user.week_start_day || 'Sunday'}\n`;
    result += `• **Global Font Support:** ${user.global_font_support ? 'Yes' : 'No'}\n`;
    result += `• **Timezone:** ${user.timezone || 'Not set'}\n`;

    return result;
}

module.exports = {
    getAuthorizedWorkspaces,
    getSpaces,
    getFolders,
    getLists,
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    getTaskComments,
    createTaskComment,
    getWorkspaceMembers,
    getUser
};