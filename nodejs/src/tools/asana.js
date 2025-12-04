/**
 * Asana MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 * Updated to use automated token refresh authentication
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');
const { 
    makeAuthenticatedAsanaRequest, 
    makeEnhancedAsanaRequest,
    getValidAccessToken, 
    AsanaAuthenticationError,
    handleAsanaApiErrors 
} = require('../utils/asana-auth');

const ASANA_API_BASE = process.env.ASANA_API_BASE || 'https://app.asana.com/api/1.0';

/**
 * Make a request to the Asana API with enhanced error handling and fallback options
 * @param {string} userId - User ID for authentication
 * @param {string} endpoint - The API endpoint
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST/PUT requests
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @returns {Object|null} API response data
 */
async function makeAsanaRequest(userId, endpoint, params = null, jsonData = null, method = 'GET') {
    try {
        const options = { method };
        if (params) options.params = params;
        if (jsonData) options.data = jsonData;
        
        // Use enhanced request method with better error handling
        return await makeEnhancedAsanaRequest(userId, endpoint, options);
    } catch (error) {
        if (error instanceof AsanaAuthenticationError) {
            console.error('Asana Authentication Error:', error.message);
            return { error: true, message: error.message, code: error.code };
        }
        console.error('Asana API Error:', error.message);
        return { error: true, message: error.message };
    }
}

/**
 * Get Asana access token from user's MCP data with automatic refresh
 * @param {string} userId - User ID
 * @returns {string|null} Asana access token or null if not found
 */
async function getAsanaAccessToken(userId) {
    try {
        return await getValidAccessToken(userId);
    } catch (error) {
        if (error instanceof AsanaAuthenticationError) {
            console.error('Asana Authentication Error:', error.message);
            return null;
        }
        console.error('Error fetching Asana access token:', error.message);
        return null;
    }
}

// =============================================================================
// PROJECT FUNCTIONS
// =============================================================================

/**
 * Create a new project in Asana Workspace
 * @param {string} userId - User ID to get access token from
 * @param {string} name - The name of the project
 * @param {string} notes - Optional notes about the project
 * @param {string} color - Optional color for the project
 * @param {boolean} isPublic - Optional flag to make the project public to the team
 * @param {string} workspaceId - workspace ID
 * @param {string} teamId - Team ID
 * @returns {string} Formatted project information or error message
 */
async function createProject(userId = null, name, notes = '', color = null, isPublic = true, workspaceId = null, teamId = null) {

    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!name) {
        return 'Error: Project name is required';
    }

    // Check if workspace is organization
    const workspace = await makeAsanaRequest(userId, `workspaces/${workspaceId}`);
    let projectData;
    
    if (workspace?.data?.is_organization) {
        projectData = {
            name: name,
            notes: notes,
            workspace: workspaceId,
            team: teamId
        };
    } else {
        projectData = {
            name: name,
            notes: notes,
            workspace: workspaceId
        };
    }

    if (color) {
        projectData.color = color;
    }

    const data = await makeAsanaRequest(userId, 'projects', null, { data: projectData }, 'POST');

    if (!data) {
        return `Failed to create project: ${name}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const project = data.data || {};

    return `\nProject Created Successfully!\nName: ${project.name || name}\nID: ${project.gid || 'unknown'}\nNotes: ${project.notes || 'None'}\nColor: ${project.color || 'None'}\nPublic: ${!project.is_private}\nWorkspace: ${typeof project.workspace === 'object' ? project.workspace.name : 'unknown'}\nTeam: ${typeof project.team === 'object' ? project.team.name : 'None'}\nCreated At: ${project.created_at || 'unknown'}`;
}

/**
 * List all projects in a workspace
 * @param {string} userId - User ID to get access token from
 * @param {string} workspaceId - workspace ID
 * @returns {string} Formatted project list or error message
 */
async function listProjects(userId = null, workspaceId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    const data = await makeAsanaRequest(userId, `workspaces/${workspaceId}/projects`);

    if (!data) {
        return 'Failed to list projects';
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const projects = data.data || [];

    if (projects.length === 0) {
        return 'No projects found in the workspace';
    }

    let result = `Found ${projects.length} projects:\n\n`;
    for (const project of projects) {
        result += `Name: ${project.name || 'unknown'}\n`;
        result += `ID: ${project.gid || 'unknown'}\n`;
        result += `Notes: ${project.notes || 'None'}\n`;
        result += `Color: ${project.color || 'None'}\n`;
        result += `Public: ${!project.is_private}\n\n---\n\n`;
    }

    return result;
}

/**
 * Get project details
 * @param {string} userId - User ID to get access token from
 * @param {string} projectId - The ID of the project
 * @returns {string} Formatted project details or error message
 */
async function getProject(userId = null, projectId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!projectId) {
        return 'Error: Project ID is required';
    }

    const data = await makeAsanaRequest(userId, `projects/${projectId}`);

    if (!data) {
        return `Failed to get project details: ${projectId}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const project = data.data || {};

    if (!project.gid) {
        return `No project found with ID: ${projectId}`;
    }

    return `\nProject Details:\nName: ${project.name || 'unknown'}\nID: ${project.gid || 'unknown'}\nNotes: ${project.notes || 'None'}\nColor: ${project.color || 'None'}\nPublic: ${!project.is_private}\nWorkspace: ${project.workspace?.name || 'unknown'}\nCreated At: ${project.created_at || 'unknown'}\nModified At: ${project.modified_at || 'unknown'}\nOwner: ${project.owner?.name || 'None'}`;
}

/**
 * Update a project in Asana
 * @param {string} userId - User ID to get access token from
 * @param {string} projectId - The ID of the project to update
 * @param {Object} updatedFields - Fields to update
 * @returns {string} Formatted updated project information or error message
 */
async function updateProject(userId = null, projectId, updatedFields) {

    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!projectId) {
        return 'Error: Project ID is required';
    }

    if (!updatedFields || Object.keys(updatedFields).length === 0) {
        return 'Error: No fields to update provided';
    }

    const data = await makeAsanaRequest(userId, `projects/${projectId}`, null, { data: updatedFields }, 'PUT');

    if (!data) {
        return `Failed to update project: ${projectId}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const project = data.data || {};

    return `\nProject Updated Successfully!\nName: ${project.name || 'unknown'}\nID: ${project.gid || 'unknown'}\nNotes: ${project.notes || 'None'}\nColor: ${project.color || 'None'}\nPublic: ${!project.is_private}\nModified At: ${project.modified_at || 'unknown'}`;
}

// =============================================================================
// TASK FUNCTIONS
// =============================================================================

/**
 * Create a new task in Asana
 * @param {string} userId - User ID to get access token from
 * @param {string} name - The name of the task
 * @param {string} notes - Optional notes about the task
 * @param {string} assignee - Optional assignee email or ID
 * @param {string} dueOn - Optional due date in YYYY-MM-DD format
 * @param {string} projectId - project ID to add the task to
 * @param {string} workspaceId - workspace ID
 * @returns {string} Formatted task information or error message
 */
async function createTask(userId = null, name, notes = '', assignee = null, dueOn = null, projectId = null, workspaceId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!name) {
        return 'Error: Task name is required';
    }

    const taskData = {
        name: name,
        notes: notes
    };

    if (workspaceId) {
        taskData.workspace = workspaceId;
    }

    if (projectId) {
        taskData.projects = [projectId];
    }

    if (assignee) {
        taskData.assignee = assignee;
    }

    if (dueOn) {
        taskData.due_on = dueOn;
    }

    const data = await makeAsanaRequest(userId, 'tasks', null, { data: taskData }, 'POST');

    if (!data) {
        return `Failed to create task: ${name}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const task = data.data || {};

    return `\nTask Created Successfully!\nName: ${task.name || name}\nID: ${task.gid || 'unknown'}\nNotes: ${task.notes || 'None'}\nAssignee: ${typeof task.assignee === 'object' ? task.assignee.name : 'None'}\nDue On: ${task.due_on || 'None'}\nCompleted: ${task.completed || false}\nCreated At: ${task.created_at || 'unknown'}`;
}

/**
 * List tasks in a project or workspace
 * @param {string} userId - User ID to get access token from
 * @param {string} projectId - project ID to list tasks from
 * @param {string} workspaceId - workspace ID
 * @param {string} assignee - Optional filter by assignee email or ID
 * @param {string} completedSince - Optional filter for tasks completed since a date
 * @returns {string} Formatted task list or error message
 */
async function listTasks(userId = null, projectId = null, workspaceId = null, assignee = null, completedSince = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    let endpoint = '';
    const params = {};

    if (projectId) {
        endpoint = `projects/${projectId}/tasks`;
    } else if (workspaceId) {
        endpoint = 'tasks';
        params.workspace = workspaceId;
    }

    if (assignee) {
        params.assignee = assignee;
    }

    if (completedSince) {
        params.completed_since = completedSince;
    }

    const data = await makeAsanaRequest(userId, endpoint, params);

    if (!data) {
        return 'Failed to list tasks';
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const tasks = data.data || [];

    if (tasks.length === 0) {
        return 'No tasks found';
    }

    let result = `Found ${tasks.length} tasks:\n\n`;
    for (const task of tasks) {
        result += `Name: ${task.name || 'unknown'}\n`;
        result += `ID: ${task.gid || 'unknown'}\n`;
        result += `Completed: ${task.completed || false}\n`;
        result += `Due On: ${task.due_on || 'None'}\n\n---\n\n`;
    }

    return result;
}

/**
 * Update a task in Asana
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - The ID of the task to update
 * @param {Object} updatedFields - Fields to update
 * @returns {string} Formatted updated task information or error message
 */
async function updateTask(userId = null, taskId, updatedFields) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!taskId) {
        return 'Error: Task ID is required';
    }

    if (!updatedFields || Object.keys(updatedFields).length === 0) {
        return 'Error: No fields to update provided';
    }

    const data = await makeAsanaRequest(userId, `tasks/${taskId}`, null, { data: updatedFields }, 'PUT');

    if (!data) {
        return `Failed to update task: ${taskId}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const task = data.data || {};

    return `\nTask Updated Successfully!\nName: ${task.name || 'unknown'}\nID: ${task.gid || 'unknown'}\nNotes: ${task.notes || 'None'}\nAssignee: ${typeof task.assignee === 'object' ? task.assignee.name : 'None'}\nDue On: ${task.due_on || 'None'}\nCompleted: ${task.completed || false}\nModified At: ${task.modified_at || 'unknown'}`;
}

/**
 * Mark a task as complete in Asana
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - The ID of the task to complete
 * @returns {string} Success status message or error message
 */
async function completeTask(userId = null, taskId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!taskId) {
        return 'Error: Task ID is required';
    }

    const data = await makeAsanaRequest(userId, `tasks/${taskId}`, null, { data: { completed: true } }, 'PUT');

    if (!data) {
        return `Failed to complete task: ${taskId}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    return `Task ${taskId} marked as complete`;
}

// =============================================================================
// SECTION FUNCTIONS
// =============================================================================

/**
 * Create a new section in an Asana project
 * @param {string} userId - User ID to get access token from
 * @param {string} name - The name of the section
 * @param {string} projectId - The ID of the project to add the section to
 * @returns {string} Formatted section information or error message
 */
async function createSection(userId = null, name, projectId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!name) {
        return 'Error: Section name is required';
    }

    const sectionData = { name: name };

    const data = await makeAsanaRequest(userId, `projects/${projectId}/sections`, null, { data: sectionData }, 'POST');

    if (!data) {
        return `Failed to create section: ${name}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const section = data.data || {};

    return `\nSection Created Successfully!\nName: ${section.name || name}\nID: ${section.gid || 'unknown'}\nProject: ${projectId}\nCreated At: ${section.created_at || 'unknown'}`;
}

/**
 * List all sections in an Asana project
 * @param {string} userId - User ID to get access token from
 * @param {string} projectId - The ID of the project
 * @returns {string} Formatted section list or error message
 */
async function listSections(userId = null, projectId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    const data = await makeAsanaRequest(userId, `projects/${projectId}/sections`);

    if (!data) {
        return 'Failed to list sections';
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const sections = data.data || [];

    if (sections.length === 0) {
        return 'No sections found in the project';
    }

    let result = `Found ${sections.length} sections:\n\n`;
    for (const section of sections) {
        result += `Name: ${section.name || 'unknown'}\n`;
        result += `ID: ${section.gid || 'unknown'}\n`;
        result += `Created At: ${section.created_at || 'unknown'}\n\n---\n\n`;
    }

    return result;
}

/**
 * Add a task to a section
 * @param {string} userId - User ID to get access token from
 * @param {string} taskId - The ID of the task
 * @param {string} sectionId - The ID of the section
 * @returns {string} Success message or error message
 */
async function addTaskToSection(userId = null, taskId, sectionId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!taskId) {
        return 'Error: Task ID is required';
    }

    if (!sectionId) {
        return 'Error: Section ID is required';
    }

    const data = await makeAsanaRequest(userId, `sections/${sectionId}/addTask`, null, { data: { task: taskId } }, 'POST');

    if (!data) {
        return `Failed to add task to section`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    return `Task ${taskId} successfully added to section ${sectionId}`;
}

// =============================================================================
// USER AND WORKSPACE FUNCTIONS
// =============================================================================

/**
 * Get user information from Asana
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted user information or error message
 */
async function getUserInfoAsana(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    const data = await makeAsanaRequest(userId, 'users/me');

    if (!data) {
        return 'Failed to get user information';
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const user = data.data || {};

    return `\nUser Information:\nName: ${user.name || 'unknown'}\nEmail: ${user.email || 'unknown'}\nID: ${user.gid || 'unknown'}\nPhoto: ${user.photo?.image_128x128 || 'None'}`;
}

/**
 * Get workspace ID from Asana
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted workspace information or error message
 */
async function getWorkspaceId(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    const data = await makeAsanaRequest(userId, 'workspaces');

    if (!data) {
        return 'Failed to get workspaces';
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const workspaces = data.data || [];

    if (workspaces.length === 0) {
        return 'No workspaces found';
    }

    let result = `Found ${workspaces.length} workspaces:\n\n`;
    for (const workspace of workspaces) {
        result += `Name: ${workspace.name || 'unknown'}\n`;
        result += `ID: ${workspace.gid || 'unknown'}\n`;
        result += `Is Organization: ${workspace.is_organization || false}\n\n---\n\n`;
    }

    return result;
}

/**
 * Create a team in Asana workspace
 * @param {string} userId - User ID to get access token from
 * @param {string} name - The name of the team
 * @param {string} workspaceId - The workspace ID
 * @param {string} description - Optional description
 * @param {string} htmlDescription - Optional HTML description
 * @returns {string} Formatted team information or error message
 */
async function createTeam(userId = null, name, workspaceId, description = '', htmlDescription = '') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!name) {
        return 'Error: Team name is required';
    }

    const teamData = {
        name: name,
        organization: workspaceId
    };

    if (description) {
        teamData.description = description;
    }

    if (htmlDescription) {
        teamData.html_description = htmlDescription;
    }

    const data = await makeAsanaRequest(userId, 'teams', null, { data: teamData }, 'POST');

    if (!data) {
        return `Failed to create team: ${name}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const team = data.data || {};

    return `\nTeam Created Successfully!\nName: ${team.name || name}\nID: ${team.gid || 'unknown'}\nDescription: ${team.description || 'None'}\nOrganization: ${team.organization?.name || 'unknown'}\nCreated At: ${team.created_at || 'unknown'}`;
}

/**
 * List team IDs in a workspace
 * @param {string} userId - User ID to get access token from
 * @param {string} workspaceId - The workspace ID
 * @returns {string} Formatted team list or error message
 */
async function listTeamIds(userId = null, workspaceId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    const data = await makeAsanaRequest(userId, `workspaces/${workspaceId}/teams`);

    if (!data) {
        return 'Failed to list teams';
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const teams = data.data || [];

    if (teams.length === 0) {
        return 'No teams found in the workspace';
    }

    let result = `Found ${teams.length} teams:\n\n`;
    for (const team of teams) {
        result += `Name: ${team.name || 'unknown'}\n`;
        result += `ID: ${team.gid || 'unknown'}\n\n---\n\n`;
    }

    return result;
}

/**
 * Get team details
 * @param {string} userId - User ID to get access token from
 * @param {string} teamId - The ID of the team
 * @returns {string} Formatted team details or error message
 */
async function getTeam(userId = null, teamId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const accessToken = await getAsanaAccessToken(userId);
    if (!accessToken) {
        return 'Error: Asana access token not found. Please configure your Asana integration in your profile settings.';
    }

    if (!teamId) {
        return 'Error: Team ID is required';
    }

    const data = await makeAsanaRequest(userId, `teams/${teamId}`);

    if (!data) {
        return `Failed to get team details: ${teamId}`;
    }

    if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown error';
        return `Asana API error: ${errorMessage}`;
    }

    const team = data.data || {};

    if (!team.gid) {
        return `No team found with ID: ${teamId}`;
    }

    return `\nTeam Details:\nName: ${team.name || 'unknown'}\nID: ${team.gid || 'unknown'}\nDescription: ${team.description || 'None'}\nHTML Description: ${team.html_description || 'None'}\nOrganization: ${team.organization?.name || 'unknown'}\nCreated At: ${team.created_at || 'unknown'}\nModified At: ${team.modified_at || 'unknown'}`;
}

module.exports = {
    createProject,
    listProjects,
    getProject,
    updateProject,
    createTask,
    listTasks,
    updateTask,
    completeTask,
    createSection,
    listSections,
    addTaskToSection,
    getUserInfoAsana,
    getWorkspaceId,
    createTeam,
    listTeamIds,
    getTeam
};