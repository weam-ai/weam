const { PINECORN, API, LINK } = require('../config/config');
const logger = require('../utils/logger');
// Using global fetch instead of node-fetch
const JWT_STRING = 'jwt ';

/**
 * Ensures a Pinecone index exists for the given company ID
 * @param {string} companyId - Company ID to use for the index
 * @param {number} dimensions - Vector dimensions (default: 1536 for OpenAI embeddings)
 * @returns {Promise<boolean>} - True if index exists or was created
 */
async function ensureIndex(companyId, dimensions = 1536) {
    try {
        logger.info(`Ensuring Pinecone index exists for company: ${companyId}`);
        
        // Call the Python API to create/ensure index
        const response = await fetch(`${LINK.PYTHON_API_URL}/${API.PYTHON_API_PREFIX}/qdrant/create-qdrant-index`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${JWT_STRING}${PINECORN.API_KEY}`
            },
            body: JSON.stringify({
                companypinecone: 'companypinecone',
                company_id: companyId,
                dimensions: dimensions
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to ensure Pinecone index: ${errorData.message || response.statusText}`);
        }
        
        logger.info(`Successfully ensured Pinecone index for company: ${companyId}`);
        return true;
    } catch (error) {
        logger.error(`Error ensuring Pinecone index for company ${companyId}:`, error);
        throw error;
    }
}

/**
 * Upserts documents to Pinecone index
 * @param {string} companyId - Company ID for the index
 * @param {Array} points - Array of points to upsert
 * @param {string} namespace - Namespace to use (usually brainId)
 * @returns {Promise<Object>} - Upsert response
 */
async function upsertDocuments(companyId, points, namespace = 'default') {
    try {
        logger.info(`Upserting ${points.length} documents to Pinecone for company: ${companyId}, namespace: ${namespace}`);
        
        // Call the Python API to upsert documents
        const response = await fetch(`${LINK.PYTHON_API_URL}/${API.PYTHON_API_PREFIX}/qdrant/upsert-vectors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${JWT_STRING}${PINECORN.API_KEY}`
            },
            body: JSON.stringify({
                company_id: companyId,
                namespace: namespace,
                points: points
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to upsert documents: ${errorData.message || response.statusText}`);
        }
        
        const result = await response.json();
        logger.info(`Successfully upserted ${points.length} documents to Pinecone`);
        return result;
    } catch (error) {
        logger.error(`Error upserting documents to Pinecone for company ${companyId}:`, error);
        throw error;
    }
}

/**
 * Gets a list of files from the Pinecone index
 * @param {string} companyId - Company ID for the index
 * @returns {Promise<Array>} - Array of file metadata
 */
async function getFilesListFromIndex(companyId) {
    try {
        logger.info(`Getting files list from Pinecone for company: ${companyId}`);
        
        // Call the Python API to get files list
        const response = await fetch(`${LINK.PYTHON_API_URL}/${API.PYTHON_API_PREFIX}/qdrant/list-files?company_id=${companyId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${JWT_STRING}${PINECORN.API_KEY}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get files list: ${errorData.message || response.statusText}`);
        }
        
        const result = await response.json();
        logger.info(`Successfully retrieved files list from Pinecone for company: ${companyId}`);
        return result.files || [];
    } catch (error) {
        logger.error(`Error getting files list from Pinecone for company ${companyId}:`, error);
        return [];
    }
}

module.exports = {
    ensureIndex,
    upsertDocuments,
    getFilesListFromIndex
};