/**
 * Jira MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');

const JIRA_API_BASE = 'https://api.atlassian.com';

/**
 * Make a request to the Jira API
 * @param {string} endpoint - The API endpoint
 * @param {string} accessToken - Jira access token
 * @param {string} cloudId - Jira cloud ID
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST/PUT requests
 * @param {string} method - HTTP method (GET, POST, PUT)
 * @returns {Object|null} API response data
 */
async function makeJiraRequest(endpoint, accessToken, cloudId, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    try {
        let response;
        const url = `${JIRA_API_BASE}/ex/jira/${cloudId}${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params });
        } else if (method === 'POST') {
            response = await axios.post(url, jsonData, { headers, params });
        } else if (method === 'PUT') {
            response = await axios.put(url, jsonData, { headers, params });
        }

        return response.data;
    } catch (error) {
        console.error('Jira API Error:', error.message);
        return null;
    }
}

/**
 * Get Jira access token and cloud ID from user's MCP data
 * @param {string} userId - User ID
 * @returns {Object|null} Object containing access token and cloud ID or null if not found
 */
async function getJiraCredentials(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.JIRA || !user.mcpdata.JIRA.access_token) {
            return null;
        }
        
        const jiraData = user.mcpdata.JIRA;
        // Decrypt the access token before returning
        const decryptedToken = decryptedData(jiraData.access_token);
        
        return {
            accessToken: decryptedToken,
            cloudId: jiraData.site_id
        };
    } catch (error) {
        console.error('Error fetching Jira credentials:', error.message);
        return null;
    }
}

/**
 * Get all Jira projects
 * @param {string} userId - User ID to get access token from
 * @param {string} expand - Expand options for project details
 * @returns {string} Formatted project list or error message
 */
async function getJiraProjects(userId = null, expand = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }
    
    const params = {};
    if (expand) {
        params.expand = expand;
    }

    const response = await makeJiraRequest('/rest/api/3/project', credentials.accessToken, credentials.cloudId, params);
    
    if (!response) {
        return 'Error: Failed to fetch projects';
    }

    if (response.length === 0) {
        return 'No projects found in the workspace.';
    }

    let result = `Found ${response.length} projects:\n\n`;
    for (const project of response) {
        const projectType = project.projectTypeKey || 'Unknown';
        const lead = project.lead?.displayName || 'No lead assigned';
        
        result += `• **${project.name}** (${project.key})\n`;
        result += `  ID: ${project.id}\n`;
        result += `  Type: ${projectType}\n`;
        result += `  Lead: ${lead}\n`;
        if (project.description) {
            result += `  Description: ${project.description}\n`;
        }
        result += `\n`;
    }

    return result;
}

/**
 * Search for Jira issues using JQL
 * @param {string} userId - User ID to get access token from
 * @param {string} jql - JQL query string
 * @param {number} startAt - Starting index for pagination
 * @param {number} maxResults - Maximum number of results
 * @param {Array} fields - Fields to include in response
 * @returns {string} Formatted issue list or error message
 */
async function searchJiraIssues(userId = null, jql = null, startAt = 0, maxResults = 50, fields = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }
    
    const params = {};
    if (jql) params.jql = jql;
    if (startAt) params.startAt = startAt;
    if (maxResults) params.maxResults = maxResults;
    if (fields) params.fields = fields.join(',');

    const response = await makeJiraRequest('/rest/api/3/search', credentials.accessToken, credentials.cloudId, params);
    
    if (!response) {
        return 'Error: Failed to search issues';
    }

    const issues = response.issues || [];
    if (issues.length === 0) {
        return 'No issues found matching the search criteria.';
    }

    let result = `Found ${issues.length} issues (showing ${response.startAt + 1}-${response.startAt + issues.length} of ${response.total}):\n\n`;
    
    for (const issue of issues) {
        const summary = issue.fields?.summary || 'No summary';
        const status = issue.fields?.status?.name || 'Unknown status';
        const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
        const priority = issue.fields?.priority?.name || 'No priority';
        const issueType = issue.fields?.issuetype?.name || 'Unknown type';
        
        result += `• **${issue.key}**: ${summary}\n`;
        result += `  Status: ${status}\n`;
        result += `  Type: ${issueType}\n`;
        result += `  Priority: ${priority}\n`;
        result += `  Assignee: ${assignee}\n\n`;
    }

    return result;
}

/**
 * Get a specific Jira issue by key
 * @param {string} userId - User ID to get access token from
 * @param {string} issueKey - Issue key (e.g., PROJ-123)
 * @param {string} expand - Expand options for issue details
 * @returns {string} Formatted issue details or error message
 */
async function getJiraIssue(userId = null, issueKey, expand = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }
    
    const params = {};
    if (expand) {
        params.expand = expand;
    }

    const response = await makeJiraRequest(`/rest/api/3/issue/${issueKey}`, credentials.accessToken, credentials.cloudId, params);
    
    if (!response) {
        return `Error: Failed to fetch issue ${issueKey}`;
    }

    const summary = response.fields?.summary || 'No summary';
    const description = response.fields?.description?.content?.[0]?.content?.[0]?.text || 'No description';
    const status = response.fields?.status?.name || 'Unknown status';
    const assignee = response.fields?.assignee?.displayName || 'Unassigned';
    const priority = response.fields?.priority?.name || 'No priority';
    const issueType = response.fields?.issuetype?.name || 'Unknown type';
    const reporter = response.fields?.reporter?.displayName || 'Unknown reporter';
    const created = response.fields?.created ? new Date(response.fields.created).toLocaleString() : 'Unknown';
    const updated = response.fields?.updated ? new Date(response.fields.updated).toLocaleString() : 'Unknown';
    
    let result = `**Issue Details for ${response.key}**\n\n`;
    result += `• **Summary:** ${summary}\n`;
    result += `• **Description:** ${description}\n`;
    result += `• **Status:** ${status}\n`;
    result += `• **Type:** ${issueType}\n`;
    result += `• **Priority:** ${priority}\n`;
    result += `• **Assignee:** ${assignee}\n`;
    result += `• **Reporter:** ${reporter}\n`;
    result += `• **Created:** ${created}\n`;
    result += `• **Updated:** ${updated}\n`;

    return result;
}

/**
 * Create a new Jira issue
 * @param {string} userId - User ID to get access token from
 * @param {string} projectKey - Project key
 * @param {string} summary - Issue summary
 * @param {string} description - Issue description
 * @param {string} issueType - Issue type (e.g., Task, Bug, Story)
 * @param {string} priority - Issue priority
 * @param {string} assignee - Assignee account ID
 * @returns {string} Success message with issue key or error message
 */
async function createJiraIssue(userId = null, projectKey, summary, description = '', issueType, priority = null, assignee = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }
    
    const issueData = {
        fields: {
            project: { key: projectKey },
            summary: summary,
            description: {
                type: 'doc',
                version: 1,
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: description || ''
                    }]
                }]
            },
            issuetype: { name: issueType }
        }
    };
    
    if (priority) {
        issueData.fields.priority = { name: priority };
    }
    
    if (assignee) {
        issueData.fields.assignee = { accountId: assignee };
    }

    const response = await makeJiraRequest('/rest/api/3/issue', credentials.accessToken, credentials.cloudId, null, issueData, 'POST');
    
    if (!response) {
        return 'Error: Failed to create issue';
    }

    return `Issue created successfully!\nIssue Key: ${response.key}\nIssue ID: ${response.id}`;
}

/**
 * Update an existing Jira issue
 * @param {string} userId - User ID to get access token from
 * @param {string} issueKey - Issue key (e.g., PROJ-123)
 * @param {string} summary - Updated summary
 * @param {string} description - Updated description
 * @param {string} assignee - New assignee account ID
 * @returns {string} Success or error message
 */
async function updateJiraIssue(userId = null, issueKey, summary = null, description = null, assignee = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }
    
    const updateData = { fields: {} };
    
    if (summary) updateData.fields.summary = summary;
    if (description) {
        updateData.fields.description = {
            type: 'doc',
            version: 1,
            content: [{
                type: 'paragraph',
                content: [{
                    type: 'text',
                    text: description
                }]
            }]
        };
    }
    if (assignee) updateData.fields.assignee = { accountId: assignee };

    const response = await makeJiraRequest(`/rest/api/3/issue/${issueKey}`, credentials.accessToken, credentials.cloudId, null, updateData, 'PUT');
    
    if (response === null) {
        return 'Error: Failed to update issue';
    }

    return `Issue ${issueKey} updated successfully.`;
}

/**
 * Add a comment to a Jira issue
 * @param {string} userId - User ID to get access token from
 * @param {string} issueKey - Issue key (e.g., PROJ-123)
 * @param {string} comment - Comment text
 * @returns {string} Success or error message
 */
async function addJiraComment(userId = null, issueKey, comment) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }
    
    const commentData = {
        body: {
            type: 'doc',
            version: 1,
            content: [{
                type: 'paragraph',
                content: [{
                    type: 'text',
                    text: comment
                }]
            }]
        }
    };

    const response = await makeJiraRequest(`/rest/api/3/issue/${issueKey}/comment`, credentials.accessToken, credentials.cloudId, null, commentData, 'POST');
    
    if (!response) {
        return 'Error: Failed to add comment';
    }

    return `Comment added successfully to issue ${issueKey}. Comment ID: ${response.id}`;
}

/**
 * Get current user information from Jira
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted user information or error message
 */
async function getJiraUserInfo(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }

    const response = await makeJiraRequest('/rest/api/3/myself', credentials.accessToken, credentials.cloudId);
    
    if (!response) {
        return 'Error: Failed to fetch user information';
    }

    const displayName = response.displayName || 'Unknown';
    const emailAddress = response.emailAddress || 'No email';
    const accountType = response.accountType || 'Unknown';
    const active = response.active ? 'Yes' : 'No';
    const timeZone = response.timeZone || 'Unknown timezone';
    
    let result = `**User Information**\n\n`;
    result += `• **Account ID:** ${response.accountId}\n`;
    result += `• **Display Name:** ${displayName}\n`;
    result += `• **Email:** ${emailAddress}\n`;
    result += `• **Account Type:** ${accountType}\n`;
    result += `• **Active:** ${active}\n`;
    result += `• **Time Zone:** ${timeZone}\n`;

    return result;
}

/**
 * Get issue comments
 * @param {string} userId - User ID to get access token from
 * @param {string} issueKey - Issue key (e.g., PROJ-123)
 * @param {number} maxResults - Maximum number of comments to return
 * @returns {string} Formatted comments list or error message
 */
async function getJiraIssueComments(userId = null, issueKey, maxResults = 50) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const credentials = await getJiraCredentials(userId);
    if (!credentials) {
        return 'Error: Jira access token not found. Please configure your Jira integration in your profile settings.';
    }
    
    const params = {
        maxResults: maxResults
    };

    const response = await makeJiraRequest(`/rest/api/3/issue/${issueKey}/comment`, credentials.accessToken, credentials.cloudId, params);
    
    if (!response) {
        return `Error: Failed to fetch comments for issue ${issueKey}`;
    }

    const comments = response.comments || [];
    if (comments.length === 0) {
        return 'No comments found for this issue.';
    }

    let result = `Comments for issue ${issueKey} (${comments.length} total):\n\n`;
    
    for (const comment of comments) {
        const author = comment.author?.displayName || 'Unknown author';
        const created = comment.created ? new Date(comment.created).toLocaleString() : 'Unknown date';
        const body = comment.body?.content?.[0]?.content?.[0]?.text || '[No text content]';
        
        result += `**${author}** (${created}):\n${body}\n\n`;
    }

    return result;
}

/**
 * Get project issues
 * @param {string} userId - User ID to get access token from
 * @param {string} projectKey - Project key
 * @param {number} maxResults - Maximum number of issues to return
 * @returns {string} Formatted project issues list or error message
 */
async function getProjectIssues(userId = null, projectKey, maxResults = 50) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const jql = `project = ${projectKey}`;
    return await searchJiraIssues(userId, jql, 0, maxResults);
}

module.exports = {
    getJiraProjects,
    searchJiraIssues,
    getJiraIssue,
    createJiraIssue,
    updateJiraIssue,
    addJiraComment,
    getJiraUserInfo,
    getJiraIssueComments,
    getProjectIssues
};