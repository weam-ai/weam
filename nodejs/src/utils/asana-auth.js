/**
 * Asana Authentication Utilities
 * Enhanced token refresh and authentication management with proactive refresh
 * Based on Google Auth and Zoom Auth implementation patterns for seamless user experience
 */

const axios = require('axios');
const User = require('../models/user');
const { encryptedData, decryptedData } = require('./helper');
const config = require('../config/config');
const logger = require('./logger');

// Asana OAuth URLs
const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';
const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

/**
 * Custom error class for Asana authentication errors
 */
class AsanaAuthenticationError extends Error {
    constructor(message, errorType = 'UNKNOWN', originalError = null) {
        super(message);
        this.name = 'AsanaAuthenticationError';
        this.errorType = errorType; // REFRESH_TOKEN_INVALID, NETWORK_ERROR, PERMISSION_DENIED, etc.
        this.originalError = originalError;
    }
}

/**
 * Check if an Asana access token is expired or needs proactive refresh
 * @param {Object} tokenData - Token data from user's mcpdata
 * @param {boolean} proactiveRefresh - Whether to check for proactive refresh (default: true)
 * @returns {boolean} True if token is expired or needs refresh
 */
function isTokenExpired(tokenData, proactiveRefresh = true) {
    if (!tokenData || !tokenData.expires_at) {
        return true;
    }
    
    const expiryTime = new Date(tokenData.expires_at).getTime();
    const currentTime = Date.now();
    
    if (proactiveRefresh) {
        // Proactively refresh tokens 5 minutes before expiry to prevent auth failures
        const refreshBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
        return (expiryTime - refreshBuffer) <= currentTime;
    }
    
    // Only return true if token is actually expired (no buffer)
    return currentTime >= expiryTime;
}

/**
 * Get Asana credentials from user data
 * @param {string} userId - User ID
 * @returns {Object|null} Asana credentials or null if not found
 */
async function getAsanaCredentials(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.ASANA) {
            return null;
        }
        
        return user.mcpdata.ASANA;
    } catch (error) {
        console.error('Error fetching Asana credentials:', error.message);
        throw new AsanaAuthenticationError('Failed to retrieve Asana credentials', 'CREDENTIAL_FETCH_ERROR');
    }
}

/**
 * Refresh Asana access token using refresh token with enhanced error handling
 * @param {string} refreshToken - Encrypted refresh token
 * @param {string} userId - User ID for logging purposes
 * @param {number} retryCount - Current retry attempt (default: 0)
 * @returns {Object} New token data
 */
async function refreshAccessToken(refreshToken, userId = null, retryCount = 0) {
    if (!refreshToken) {
        throw new AsanaAuthenticationError('No refresh token available', 'NO_REFRESH_TOKEN');
    }
    
    try {
        logger.info(`[refreshAccessToken] Attempting to refresh Asana token for user: ${userId}, attempt: ${retryCount + 1}`);
        
        const decryptedRefreshToken = decryptedData(refreshToken);
        
        if (!config.ASANA_OAUTH?.CLIENT_ID || !config.ASANA_OAUTH?.CLIENT_SECRET) {
            throw new AsanaAuthenticationError('Asana OAuth configuration missing', 'MISSING_CONFIG');
        }
        
        const response = await axios.post(ASANA_TOKEN_URL, {
            grant_type: 'refresh_token',
            refresh_token: decryptedRefreshToken,
            client_id: config.ASANA_OAUTH.CLIENT_ID,
            client_secret: config.ASANA_OAUTH.CLIENT_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 30000
        });
        
        const tokenData = response.data;
        
        if (tokenData.error) {
            throw new AsanaAuthenticationError(
                `Token refresh failed: ${tokenData.error_description || tokenData.error}`,
                tokenData.error === 'invalid_grant' ? 'REFRESH_TOKEN_INVALID' : 'TOKEN_REFRESH_FAILED'
            );
        }
        
        const newTokenData = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || decryptedRefreshToken,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            token_type: tokenData.token_type || 'Bearer',
            scope: tokenData.scope
        };
        
        logger.info(`[refreshAccessToken] Successfully refreshed Asana token for user: ${userId}`);
        return newTokenData;
        
    } catch (error) {
        logger.error(`[refreshAccessToken] Token refresh attempt ${retryCount + 1} failed for user ${userId}:`, error.message);
        
        // Check if refresh token is invalid/revoked - these are permanent failures
        if (error.response?.status === 400 && 
            (error.response?.data?.error === 'invalid_grant' ||
             error.response?.data?.error === 'invalid_request')) {
            logger.error(`[refreshAccessToken] Refresh token invalid for user ${userId}:`, error.response.data);
            throw new AsanaAuthenticationError(
                'Refresh token is invalid or expired. User needs to re-authenticate.',
                'REFRESH_TOKEN_INVALID',
                error
            );
        }
        
        // For temporary network/server errors, retry up to 3 times with exponential backoff
        if (retryCount < 3 && (
            error.code === 'ECONNRESET' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ETIMEDOUT' ||
            error.message?.includes('network') ||
            error.message?.includes('timeout') ||
            (error.response && error.response.status >= 500)
        )) {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            logger.warn(`[refreshAccessToken] Network/server error, retrying in ${delay}ms for user: ${userId} (attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return refreshAccessToken(refreshToken, userId, retryCount + 1);
        }
        
        // For other errors, don't immediately force re-authentication
        logger.warn(`[refreshAccessToken] Token refresh failed with non-retryable error for user ${userId}:`, error.message);
        throw new AsanaAuthenticationError(
            `Token refresh failed: ${error.message}`,
            'TOKEN_REFRESH_FAILED',
            error
        );
    }
}

/**
 * Save refreshed tokens to user's database record
 * @param {string} userId - User ID
 * @param {Object} tokenData - New token data
 */
async function saveRefreshedTokens(userId, tokenData) {
    if (!userId) {
        throw new AsanaAuthenticationError('User ID is required for saving tokens', 'MISSING_USER_ID');
    }
    
    try {
        const updateData = {
            'mcpdata.ASANA.access_token': encryptedData(tokenData.access_token),
            'mcpdata.ASANA.expires_at': tokenData.expires_at,
            'mcpdata.ASANA.token_type': tokenData.token_type,
            'mcpdata.ASANA.scope': tokenData.scope,
            'mcpdata.ASANA.last_refreshed': new Date().toISOString()
        };
        
        if (tokenData.refresh_token) {
            updateData['mcpdata.ASANA.refresh_token'] = encryptedData(tokenData.refresh_token);
        }
        
        // Clear any error flags when tokens are successfully refreshed
        updateData['mcpdata.ASANA.requires_reauth'] = false;
        updateData['mcpdata.ASANA.last_error'] = null;
        
        await User.findByIdAndUpdate(userId, { $set: updateData });
        logger.info(`[saveRefreshedTokens] Asana tokens updated successfully for user ${userId}`);
        
    } catch (error) {
        logger.error(`[saveRefreshedTokens] Error saving refreshed Asana tokens for user ${userId}:`, error.message);
        throw new AsanaAuthenticationError('Failed to save refreshed tokens', 'SAVE_TOKEN_ERROR', error);
    }
}

/**
 * Get authenticated Asana service with proactive token refresh (following Google Auth pattern)
 * @param {string} userId - User ID
 * @returns {string} Valid access token
 */
async function getAuthenticatedAsanaService(userId) {
    if (!userId) {
        throw new AsanaAuthenticationError('User ID is required. Please provide user authentication.');
    }
    
    try {
        logger.info(`[getAuthenticatedAsanaService] Getting Asana service for user: ${userId}`);
        
        // Get user credentials
        let credentials = await getAsanaCredentials(userId);
        if (!credentials) {
            throw new AsanaAuthenticationError(
                'Asana credentials not found. Please configure your Asana integration in your profile settings.',
                'NO_ACCESS_TOKEN'
            );
        }
        
        // Proactively refresh tokens before they expire to prevent auth failures
        if (isTokenExpired(credentials, true)) {
            const timeUntilExpiry = credentials.expires_at - Date.now();
            const isActuallyExpired = timeUntilExpiry <= 0;
            
            logger.info(`[getAuthenticatedAsanaService] Token ${isActuallyExpired ? 'expired' : 'expiring soon'} for user: ${userId}, refreshing...`);
            
            if (!credentials.refresh_token) {
                throw new AsanaAuthenticationError(
                    'Access token expired and no refresh token available. User needs to re-authenticate.',
                    'NO_REFRESH_TOKEN_AVAILABLE'
                );
            }
            
            try {
                const newTokenData = await refreshAccessToken(credentials.refresh_token, userId);
                await saveRefreshedTokens(userId, newTokenData);
                credentials = {
                    ...credentials,
                    access_token: newTokenData.access_token,
                    expires_at: newTokenData.expires_at
                };
            } catch (refreshError) {
                if (refreshError instanceof AsanaAuthenticationError && 
                    refreshError.errorType === 'REFRESH_TOKEN_INVALID') {
                    throw refreshError;
                }
                logger.warn(`[getAuthenticatedAsanaService] Token refresh failed for user ${userId}, attempting to use existing token:`, refreshError.message);
            }
        }
        
        // Return decrypted access token
        return decryptedData(credentials.access_token);
        
    } catch (error) {
        if (error instanceof AsanaAuthenticationError) {
            throw error;
        }
        logger.error(`[getAuthenticatedAsanaService] Error getting Asana service for user ${userId}:`, error.message);
        throw new AsanaAuthenticationError(
            `Failed to get authenticated Asana service: ${error.message}`,
            'SERVICE_ERROR',
            error
        );
    }
}

/**
 * Get valid access token with automatic refresh
 * @param {string} userId - User ID
 * @returns {string} Valid access token
 */
async function getValidAccessToken(userId) {
    return await getAuthenticatedAsanaService(userId);
}

/**
 * Handle Asana API errors with automatic retry and token refresh
 * @param {Function} operation - The operation to execute
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {boolean} isReadOnly - Whether the operation is read-only (default: true)
 * @param {string} userId - User ID for token refresh
 * @returns {*} Operation result
 */
async function handleAsanaApiErrors(operation, maxRetries = 3, isReadOnly = true, userId = null) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Check if it's an authentication error
            if (error.response?.status === 401) {
                if (userId && attempt < maxRetries) {
                    logger.warn(`[handleAsanaApiErrors] Authentication error on attempt ${attempt}, refreshing token for user: ${userId}`);
                    try {
                        await getAuthenticatedAsanaService(userId); // This will refresh the token
                        continue; // Retry the operation
                    } catch (authError) {
                        logger.error(`[handleAsanaApiErrors] Token refresh failed for user ${userId}:`, authError.message);
                        throw new AsanaAuthenticationError(
                            'Authentication failed and token refresh unsuccessful. Please re-authenticate.',
                            'AUTH_REFRESH_FAILED',
                            authError
                        );
                    }
                } else {
                    throw new AsanaAuthenticationError(
                        'Authentication failed. Please check your Asana credentials.',
                        'AUTH_FAILED',
                        error
                    );
                }
            }
            
            // Check for rate limiting
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || Math.pow(2, attempt);
                logger.warn(`[handleAsanaApiErrors] Rate limited, waiting ${retryAfter}s before retry ${attempt}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            
            // Check for temporary server errors
            if (error.response?.status >= 500 && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                logger.warn(`[handleAsanaApiErrors] Server error ${error.response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // For other errors, don't retry
            break;
        }
    }
    
    throw lastError;
}

/**
 * Make authenticated Asana API request with automatic token refresh
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Object} API response
 */
async function makeAuthenticatedAsanaRequest(userId, endpoint, options = {}) {
    const accessToken = await getValidAccessToken(userId);
    
    const requestOptions = {
        method: options.method || 'GET',
        url: `${ASANA_API_BASE}/${endpoint}`,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        timeout: 30000,
        ...options
    };
    
    return await handleAsanaApiErrors(async () => {
        const response = await axios(requestOptions);
        return response.data;
    }, 3, options.method === 'GET', userId);
}

/**
 * Make enhanced Asana API request with better error handling
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Object} API response
 */
async function makeEnhancedAsanaRequest(userId, endpoint, options = {}) {
    try {
        return await makeAuthenticatedAsanaRequest(userId, endpoint, options);
    } catch (error) {
        if (error instanceof AsanaAuthenticationError) {
            logger.error('Asana Authentication Error:', error.message);
            return { error: true, message: error.message, code: error.errorType };
        }
        logger.error('Asana API Error:', error.message);
        return { error: true, message: error.message };
    }
}

module.exports = {
    AsanaAuthenticationError,
    isTokenExpired,
    getAsanaCredentials,
    refreshAccessToken,
    saveRefreshedTokens,
    getValidAccessToken,
    getAuthenticatedAsanaService,
    makeAuthenticatedAsanaRequest,
    makeEnhancedAsanaRequest,
    handleAsanaApiErrors
};