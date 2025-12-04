/**
 * Airtable MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');

const AIRTABLE_API_BASE = process.env.AIRTABLE_API_BASE || 'https://api.airtable.com';

/**
 * Make a request to the Airtable API
 * @param {string} endpoint - The API endpoint (should begin with a slash)
 * @param {string} airtableToken - Airtable PAT token
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON body for POST requests
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @returns {Object|null} API response data
 */
async function makeAirtableRequest(endpoint, airtableToken, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
    };

    try {
        const url = `${AIRTABLE_API_BASE}${endpoint}`;
        let response;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params, timeout: 30000 });
        } else if (method === 'PATCH') {
            response = await axios.patch(url, jsonData, { headers, params, timeout: 30000 });
        } else if (method === 'DELETE') {
            response = await axios.delete(url, { headers, data: jsonData, params, timeout: 30000 });
        } else { // POST & others
            response = await axios.post(url, jsonData, { headers, params, timeout: 30000 });
        }

        return response.data;
    } catch (error) {
        console.error('Airtable API Error:', error.message);
        return null;
    }
}

/**
 * Get Airtable PAT token from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} Airtable token or null if not found
 */
async function getAirtableAccessToken(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.AIRTABLE || !user.mcpdata.AIRTABLE.access_token) {
            return null;
        }
        const decryptedToken = decryptedData(user.mcpdata.AIRTABLE.access_token);

        return decryptedToken;
    } catch (error) {
        console.error('Error fetching Airtable access token:', error.message);
        return null;
    }
}

/**
 * List Airtable bases available to the PAT token
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted base list or error message
 */
async function listAirtableBases(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const accessToken = await getAirtableAccessToken(userId);
    if (!accessToken) {
        return 'Error: Airtable access token not found. Please configure your Airtable integration in your profile settings.';
    }

    const endpoint = '/v0/meta/bases';
    const data = await makeAirtableRequest(endpoint, accessToken);

    if (!data) {
        return 'Failed to fetch Airtable bases.';
    }

    if (!Array.isArray(data.bases) || data.bases.length === 0) {
        return 'No Airtable bases found.';
    }

    let result = `Found ${data.bases.length} bases in Airtable account:\n\n`;
    for (const base of data.bases) {
        result += `Base ID: ${base.id}\n`;
        result += `Name: ${base.name}\n`;
        result += '---\n';
    }

    console.log(result);
    return result;
}

/**
 * List tables for a specific Airtable base
 * @param {string} userId - User ID
 * @param {string} baseId - Airtable base ID
 * @returns {string} Formatted table list or error message
 */
async function listAirtableTables(userId = null, baseId) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    if (!baseId) {
        return 'Error: baseId is required.';
    }

    const accessToken = await getAirtableAccessToken(userId);
    if (!accessToken) {
        return 'Error: Airtable access token not found. Please configure your Airtable integration in your profile settings.';
    }

    const endpoint = `/v0/meta/bases/${baseId}/tables`;
    const data = await makeAirtableRequest(endpoint, accessToken);

    if (!data) {
        return `Failed to fetch tables for base: ${baseId}`;
    }

    if (!Array.isArray(data.tables) || data.tables.length === 0) {
        return `No tables found for base: ${baseId}`;
    }

    let result = `Found ${data.tables.length} tables in base '${baseId}':\n\n`;
    for (const table of data.tables) {
        result += `Table ID: ${table.id}\n`;
        result += `Name: ${table.name}\n`;
        result += '---\n';
    }

    console.log(result);
    return result;
}

/**
 * List records from a specific table
 * @param {string} userId - User ID
 * @param {string} baseId - Airtable base ID
 * @param {string} tableName - Name of the table
 * @param {number} maxRecords - Max records to fetch (default 10)
 * @returns {string} Formatted record list or error message
 */
async function listAirtableRecords(userId = null, baseId, tableName, maxRecords = 10) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    if (!baseId) {
        return 'Error: baseId is required.';
    }

    if (!tableName) {
        return 'Error: tableName is required.';
    }

    const accessToken = await getAirtableAccessToken(userId);
    if (!accessToken) {
        return 'Error: Airtable access token not found. Please configure your Airtable integration in your profile settings.';
    }

    const params = { maxRecords };
    const endpoint = `/v0/${baseId}/${encodeURIComponent(tableName)}`;
    const data = await makeAirtableRequest(endpoint, accessToken, params);

    if (!data) {
        return `Failed to fetch records for table: ${tableName}`;
    }

    if (!Array.isArray(data.records) || data.records.length === 0) {
        return `No records found in table: ${tableName}`;
    }

    let result = `Found ${data.records.length} records in table '${tableName}':\n\n`;
    for (const rec of data.records) {
        result += `Record ID: ${rec.id}\n`;
        result += `Fields: ${JSON.stringify(rec.fields)}\n`;
        result += '---\n';
    }

    console.log(result);
    return result;
}

module.exports = {
    list_airtable_bases: listAirtableBases,
    list_airtable_tables: listAirtableTables,
    list_airtable_records: listAirtableRecords,
    getAirtableAccessToken,
};