/**
 * Dropbox MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

const DROPBOX_API_BASE = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API_BASE = 'https://content.dropboxapi.com/2';

/**
 * Make a request to the Dropbox API
 * @param {string} endpoint - The API endpoint
 * @param {string} accessToken - Dropbox access token
 * @param {Object} params - Request parameters
 * @param {Object} headers - Additional headers
 * @param {string} method - HTTP method (GET, POST)
 * @param {string} baseUrl - Base URL to use (API or Content)
 * @returns {Object|null} API response data
 */
async function makeDropboxRequest(endpoint, accessToken, params = null, headers = {}, method = 'POST', baseUrl = DROPBOX_API_BASE) {
    const defaultHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...headers
    };

    try {
        let response;
        const url = `${baseUrl}/${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers: defaultHeaders, params });
        } else {
            response = await axios.post(url, params, { headers: defaultHeaders });
        }

        return response.data;
    } catch (error) {
        console.error('Dropbox API Error:', error.response?.data || error.message);
        return { error: error.response?.data || error.message };
    }
}

/**
 * Get Dropbox access token from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} Dropbox access token or null if not found
 */
async function getDropboxAccessToken(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.DROPBOX || !user.mcpdata.DROPBOX.access_token) {
            return null;
        }
        // Decrypt the access token before returning
        const decryptedToken = decryptedData(user.mcpdata.DROPBOX.access_token);
        return decryptedToken;
    } catch (error) {
        console.error('Error fetching Dropbox access token:', error.message);
        return null;
    }
}

/**
 * Get current user account information
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted account information
 */
async function getCurrentAccount(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const response = await makeDropboxRequest('users/get_current_account', accessToken);
    
    if (response.error) {
        return `Error: ${response.error}`;
    }

    let result = `**Dropbox Account Information:**\n\n`;
    result += `• **Name:** ${response.name?.display_name || 'N/A'}\n`;
    result += `• **Email:** ${response.email || 'N/A'}\n`;
    result += `• **Account ID:** ${response.account_id}\n`;
    result += `• **Account Type:** ${response.account_type?.['.tag'] || 'N/A'}\n`;
    result += `• **Country:** ${response.country || 'N/A'}\n`;
    result += `• **Locale:** ${response.locale || 'N/A'}\n`;
    result += `• **Email Verified:** ${response.email_verified ? 'Yes' : 'No'}\n`;
    result += `• **Disabled:** ${response.disabled ? 'Yes' : 'No'}\n`;

    return result;
}

/**
 * Get space usage information
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted space usage information
 */
async function getSpaceUsage(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const response = await makeDropboxRequest('users/get_space_usage', accessToken);
    
    if (response.error) {
        return `Error: ${response.error}`;
    }

    const used = response.used || 0;
    const allocated = response.allocation?.allocated || 0;
    const usedGB = (used / (1024 * 1024 * 1024)).toFixed(2);
    const allocatedGB = (allocated / (1024 * 1024 * 1024)).toFixed(2);
    const usagePercent = allocated > 0 ? ((used / allocated) * 100).toFixed(2) : 0;

    let result = `**Dropbox Space Usage:**\n\n`;
    result += `• **Used:** ${usedGB} GB\n`;
    result += `• **Allocated:** ${allocatedGB} GB\n`;
    result += `• **Usage:** ${usagePercent}%\n`;
    result += `• **Allocation Type:** ${response.allocation?.['.tag'] || 'N/A'}\n`;

    return result;
}

/**
 * List folder contents
 * @param {string} userId - User ID to get access token from
 * @param {string} path - Folder path (empty string for root)
 * @param {boolean} recursive - Whether to list recursively
 * @param {number} limit - Maximum number of entries to return
 * @returns {string} Formatted folder contents
 */
async function listFolder(userId = null, path = '', recursive = false, limit = 100) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        path: path || '',
        recursive: recursive,
        limit: limit
    };

    const response = await makeDropboxRequest('files/list_folder', accessToken, params);
    
    if (response.error) {
        return `Error: ${response.error}`;
    }

    const entries = response.entries || [];
    if (entries.length === 0) {
        return `No files or folders found in path: ${path || '/'}\n`;
    }

    let result = `**Contents of ${path || '/'}:**\n\n`;
    result += `Found ${entries.length} items:\n\n`;
    
    for (const entry of entries) {
        const type = entry['.tag'];
        const name = entry.name;
        const pathLower = entry.path_lower;
        
        if (type === 'file') {
            const size = entry.size ? `${(entry.size / 1024).toFixed(2)} KB` : 'Unknown size';
            const modified = entry.server_modified ? new Date(entry.server_modified).toLocaleString() : 'Unknown';
            result += `📄 **${name}** (File)\n`;
            result += `   Path: ${pathLower}\n`;
            result += `   Size: ${size}\n`;
            result += `   Modified: ${modified}\n\n`;
        } else if (type === 'folder') {
            result += `📁 **${name}** (Folder)\n`;
            result += `   Path: ${pathLower}\n\n`;
        }
    }

    if (response.has_more) {
        result += `\n*Note: There are more items available. Use the cursor to get additional results.*\n`;
    }

    return result;
}

/**
 * Get metadata for a file or folder
 * @param {string} userId - User ID to get access token from
 * @param {string} path - File or folder path
 * @returns {string} Formatted metadata information
 */
async function getMetadata(userId = null, path) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    if (!path) {
        return 'Error: Path is required.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        path: path
    };

    const response = await makeDropboxRequest('files/get_metadata', accessToken, params);
    
    if (response.error) {
        return `Error: ${response.error}`;
    }

    const type = response['.tag'];
    let result = `**Metadata for ${response.name}:**\n\n`;
    result += `• **Type:** ${type}\n`;
    result += `• **Name:** ${response.name}\n`;
    result += `• **Path:** ${response.path_lower}\n`;
    result += `• **ID:** ${response.id}\n`;
    
    if (type === 'file') {
        result += `• **Size:** ${response.size ? `${(response.size / 1024).toFixed(2)} KB` : 'Unknown'}\n`;
        result += `• **Client Modified:** ${response.client_modified ? new Date(response.client_modified).toLocaleString() : 'Unknown'}\n`;
        result += `• **Server Modified:** ${response.server_modified ? new Date(response.server_modified).toLocaleString() : 'Unknown'}\n`;
        result += `• **Content Hash:** ${response.content_hash || 'N/A'}\n`;
    }

    return result;
}

/**
 * Create a new folder
 * @param {string} userId - User ID to get access token from
 * @param {string} path - Path for the new folder
 * @param {boolean} autorename - Whether to autorename if folder exists
 * @returns {string} Success or error message
 */
async function createFolder(userId = null, path, autorename = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    if (!path) {
        return 'Error: Path is required.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        path: path,
        autorename: autorename
    };

    const response = await makeDropboxRequest('files/create_folder_v2', accessToken, params);
    
    if (response.error) {
        return `Error creating folder: ${response.error}`;
    }

    const metadata = response.metadata;
    return `Folder created successfully!\n• **Name:** ${metadata.name}\n• **Path:** ${metadata.path_lower}\n• **ID:** ${metadata.id}`;
}

/**
 * Delete a file or folder
 * @param {string} userId - User ID to get access token from
 * @param {string} path - Path to delete
 * @returns {string} Success or error message
 */
async function deleteFileOrFolder(userId = null, path) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    if (!path) {
        return 'Error: Path is required.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        path: path
    };

    const response = await makeDropboxRequest('files/delete_v2', accessToken, params);
    
    if (response.error) {
        return `Error deleting: ${response.error}`;
    }

    const metadata = response.metadata;
    const type = metadata['.tag'];
    return `${type === 'file' ? 'File' : 'Folder'} deleted successfully!\n• **Name:** ${metadata.name}\n• **Path:** ${metadata.path_lower}`;
}

/**
 * Move or rename a file or folder
 * @param {string} userId - User ID to get access token from
 * @param {string} fromPath - Source path
 * @param {string} toPath - Destination path
 * @param {boolean} autorename - Whether to autorename if destination exists
 * @returns {string} Success or error message
 */
async function moveFileOrFolder(userId = null, fromPath, toPath, autorename = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    if (!fromPath || !toPath) {
        return 'Error: Both source and destination paths are required.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        from_path: fromPath,
        to_path: toPath,
        autorename: autorename
    };

    const response = await makeDropboxRequest('files/move_v2', accessToken, params);
    
    if (response.error) {
        return `Error moving: ${response.error}`;
    }

    const metadata = response.metadata;
    const type = metadata['.tag'];
    return `${type === 'file' ? 'File' : 'Folder'} moved successfully!\n• **Name:** ${metadata.name}\n• **New Path:** ${metadata.path_lower}`;
}

/**
 * Copy a file or folder
 * @param {string} userId - User ID to get access token from
 * @param {string} fromPath - Source path
 * @param {string} toPath - Destination path
 * @param {boolean} autorename - Whether to autorename if destination exists
 * @returns {string} Success or error message
 */
async function copyFileOrFolder(userId = null, fromPath, toPath, autorename = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    if (!fromPath || !toPath) {
        return 'Error: Both source and destination paths are required.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        from_path: fromPath,
        to_path: toPath,
        autorename: autorename
    };

    const response = await makeDropboxRequest('files/copy_v2', accessToken, params);
    
    if (response.error) {
        return `Error copying: ${response.error}`;
    }

    const metadata = response.metadata;
    const type = metadata['.tag'];
    return `${type === 'file' ? 'File' : 'Folder'} copied successfully!\n• **Name:** ${metadata.name}\n• **New Path:** ${metadata.path_lower}`;
}

/**
 * Search for files and folders
 * @param {string} userId - User ID to get access token from
 * @param {string} query - Search query
 * @param {string} path - Path to search in (optional)
 * @param {number} maxResults - Maximum number of results
 * @returns {string} Formatted search results
 */
async function searchFiles(userId = null, query, path = '', maxResults = 50) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    if (!query) {
        return 'Error: Search query is required.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        query: query,
        options: {
            path: path || '',
            max_results: maxResults
        }
    };

    const response = await makeDropboxRequest('files/search_v2', accessToken, params);
    
    if (response.error) {
        return `Error searching: ${response.error}`;
    }

    const matches = response.matches || [];
    if (matches.length === 0) {
        return `No results found for query: "${query}"`;
    }

    let result = `**Search Results for "${query}":**\n\n`;
    result += `Found ${matches.length} matches:\n\n`;
    
    for (const match of matches) {
        const metadata = match.metadata.metadata;
        const type = metadata['.tag'];
        const name = metadata.name;
        const pathLower = metadata.path_lower;
        
        if (type === 'file') {
            const size = metadata.size ? `${(metadata.size / 1024).toFixed(2)} KB` : 'Unknown size';
            result += `📄 **${name}** (File)\n`;
            result += `   Path: ${pathLower}\n`;
            result += `   Size: ${size}\n\n`;
        } else if (type === 'folder') {
            result += `📁 **${name}** (Folder)\n`;
            result += `   Path: ${pathLower}\n\n`;
        }
    }

    return result;
}

/**
 * Create a shared link for a file or folder
 * @param {string} userId - User ID to get access token from
 * @param {string} path - Path to share
 * @param {Object} settings - Sharing settings
 * @returns {string} Shared link information
 */
async function createSharedLink(userId = null, path, settings = {}) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    if (!path) {
        return 'Error: Path is required.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = {
        path: path,
        settings: settings
    };

    const response = await makeDropboxRequest('sharing/create_shared_link_with_settings', accessToken, params);
    
    if (response.error) {
        return `Error creating shared link: ${response.error}`;
    }

    let result = `**Shared Link Created:**\n\n`;
    result += `• **Name:** ${response.name}\n`;
    result += `• **URL:** ${response.url}\n`;
    result += `• **Path:** ${response.path_lower}\n`;
    result += `• **Visibility:** ${response.link_permissions?.resolved_visibility?.['.tag'] || 'N/A'}\n`;
    result += `• **Expires:** ${response.expires ? new Date(response.expires).toLocaleString() : 'Never'}\n`;

    return result;
}

/**
 * List shared links
 * @param {string} userId - User ID to get access token from
 * @param {string} path - Path to list shared links for (optional)
 * @returns {string} Formatted shared links list
 */
async function listSharedLinks(userId = null, path = '') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    const accessToken = await getDropboxAccessToken(userId);
    if (!accessToken) {
        return 'Error: Dropbox access token not found. Please configure your Dropbox integration in your profile settings.';
    }

    const params = path ? { path: path } : {};

    const response = await makeDropboxRequest('sharing/list_shared_links', accessToken, params);
    
    if (response.error) {
        return `Error listing shared links: ${response.error}`;
    }

    const links = response.links || [];
    if (links.length === 0) {
        return `No shared links found${path ? ` for path: ${path}` : ''}.`;
    }

    let result = `**Shared Links${path ? ` for ${path}` : ''}:**\n\n`;
    result += `Found ${links.length} shared links:\n\n`;
    
    for (const link of links) {
        const type = link['.tag'];
        result += `${type === 'file' ? '📄' : '📁'} **${link.name}**\n`;
        result += `   URL: ${link.url}\n`;
        result += `   Path: ${link.path_lower}\n`;
        result += `   Visibility: ${link.link_permissions?.resolved_visibility?.['.tag'] || 'N/A'}\n`;
        result += `   Expires: ${link.expires ? new Date(link.expires).toLocaleString() : 'Never'}\n\n`;
    }

    return result;
}

module.exports = {
    getCurrentAccount,
    getSpaceUsage,
    listFolder,
    getMetadata,
    createFolder,
    deleteFileOrFolder,
    moveFileOrFolder,
    copyFileOrFolder,
    searchFiles,
    createSharedLink,
    listSharedLinks
};