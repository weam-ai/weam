/**
 * Zoom Authentication Utilities for MCP Tools
 * Node.js implementation based on Google OAuth reauthentication pattern
 * Mirrors the logic from /src/utils/google-auth.js for Zoom OAuth
 */

const axios = require('axios');
const { decryptedData, encryptedData } = require('./helper');
const User = require('../models/user');
const logger = require('./logger');
const { ZOOM_OAUTH } = require('../config/config');

// Constants for Zoom OAuth credentials
const CLIENT_ID = ZOOM_OAUTH.CLIENT_ID;
const CLIENT_SECRET = ZOOM_OAUTH.CLIENT_SECRET;
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

// Validate configuration on module load
function validateZoomOAuthConfig() {
  const errors = [];
  
  if (!ZOOM_OAUTH?.CLIENT_ID) {
    errors.push('ZOOM_OAUTH_CLIENT_ID is not set');
  }
  
  if (!ZOOM_OAUTH?.CLIENT_SECRET) {
    errors.push('ZOOM_OAUTH_CLIENT_SECRET is not set');
  }
  
  if (!ZOOM_OAUTH?.REDIRECT_URI) {
    errors.push('ZOOM_OAUTH.REDIRECT_URI is not properly configured');
  }
  
  if (errors.length > 0) {
    logger.error('[ZoomAuth] Configuration validation failed:', errors);
    logger.error('[ZoomAuth] Current environment:', process.env.NODE_ENV);
    logger.error('[ZoomAuth] Base URL:', process.env.BASE_URL);
  } else {
    logger.info('[ZoomAuth] Configuration validation passed');
    logger.debug('[ZoomAuth] Redirect URI:', ZOOM_OAUTH.REDIRECT_URI);
  }
  
  return errors;
}

// Validate configuration on startup
const configErrors = validateZoomOAuthConfig();

// Zoom OAuth Scopes
const ZOOM_SCOPES = {
  // Meeting scopes
  MEETING_READ: 'meeting:read',
  MEETING_WRITE: 'meeting:write',
  MEETING_UPDATE: 'meeting:update',
  
  // User scopes
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  
  // Webinar scopes
  WEBINAR_READ: 'webinar:read',
  WEBINAR_WRITE: 'webinar:write',
  
  // Recording scopes
  RECORDING_READ: 'recording:read',
  RECORDING_WRITE: 'recording:write'
};

// Scope groups for different services
const SCOPE_GROUPS = {
  meeting_read: [ZOOM_SCOPES.MEETING_READ, ZOOM_SCOPES.USER_READ],
  meeting_write: [ZOOM_SCOPES.MEETING_WRITE, ZOOM_SCOPES.MEETING_UPDATE, ZOOM_SCOPES.USER_READ],
  user_read: [ZOOM_SCOPES.USER_READ],
  user_write: [ZOOM_SCOPES.USER_WRITE, ZOOM_SCOPES.USER_READ],
  webinar_read: [ZOOM_SCOPES.WEBINAR_READ, ZOOM_SCOPES.USER_READ],
  webinar_write: [ZOOM_SCOPES.WEBINAR_WRITE, ZOOM_SCOPES.USER_READ],
  recording_read: [ZOOM_SCOPES.RECORDING_READ, ZOOM_SCOPES.USER_READ],
  recording_write: [ZOOM_SCOPES.RECORDING_WRITE, ZOOM_SCOPES.USER_READ]
};

/**
 * Custom error class for Zoom authentication errors
 * Mirrors Google's GoogleAuthenticationError
 */
class ZoomAuthenticationError extends Error {
  constructor(message, errorType = 'UNKNOWN', originalError = null, retryable = false) {
    super(message);
    this.name = 'ZoomAuthenticationError';
    this.errorType = errorType;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

/**
 * ZoomCredentials class - mirrors Google's Credentials object
 * Provides automatic token refresh functionality
 */
class ZoomCredentials {
  constructor(userId, serviceType, mcpData) {
    this.userId = userId;
    this.serviceType = serviceType;
    this.access_token = mcpData.access_token ? decryptedData(mcpData.access_token) : null;
    this.refresh_token = mcpData.refresh_token ? decryptedData(mcpData.refresh_token) : null;
    
    // Handle both old format (expires_at) and new format (expiry_date)
    // This provides backward compatibility for users who authenticated before the fix
    this.expiry = mcpData.expiry_date || mcpData.expires_at || mcpData.expiry;
    
    this.client_id = CLIENT_ID;
    this.client_secret = CLIENT_SECRET;
    
    // Handle scopes - can be array or space-separated string (matching Google implementation)
    if (mcpData.scopes) {
      this.scopes = Array.isArray(mcpData.scopes) ? mcpData.scopes : [];
    } else if (mcpData.scope) {
      // Some OAuth providers store as 'scope' (singular) as a space-separated string
      this.scopes = typeof mcpData.scope === 'string' ? mcpData.scope.split(' ').filter(s => s) : [];
    } else {
      this.scopes = [];
    }
    
    // Log credential initialization for debugging
    logger.debug(`[ZoomCredentials] Initialized for user ${userId}:`, {
      hasAccessToken: !!this.access_token,
      hasRefreshToken: !!this.refresh_token,
      expiry: this.expiry ? new Date(this.expiry).toISOString() : 'none',
      scopesCount: this.scopes.length,
      scopes: this.scopes.join(', ') || 'none'
    });
  }

  /**
   * Check if credentials are valid (not expired and have access token)
   * Mirrors Google's credentials.valid property
   */
  get valid() {
    if (!this.access_token) {
      return false;
    }
    
    if (!this.expiry) {
      return true; // No expiry means token is valid
    }
    
    // Add 5-minute buffer for proactive refresh (matching Google behavior)
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();
    const expiryTime = typeof this.expiry === 'number' ? this.expiry : new Date(this.expiry).getTime();
    
    return now < (expiryTime - bufferTime);
  }

  /**
   * Check if credentials are expired
   * Mirrors Google's credentials.expired property
   */
  get expired() {
    if (!this.expiry) {
      return false;
    }
    
    const now = Date.now();
    const expiryTime = typeof this.expiry === 'number' ? this.expiry : new Date(this.expiry).getTime();
    
    return now >= expiryTime;
  }

  /**
   * Refresh the access token using the refresh token
   * Mirrors Google's credentials.refresh(Request()) method
   */
  async refresh() {
    if (!this.refresh_token) {
      throw new ZoomAuthenticationError(
        'No refresh token available for automatic refresh',
        'REFRESH_TOKEN_INVALID'
      );
    }

    logger.info(`[ZoomCredentials] Refreshing credentials for user: ${this.userId}, service: ${this.serviceType}`);

    try {
      // Store original scopes to preserve them after refresh
      const originalScopes = this.scopes;
      
      // Prepare refresh token request (matching Zoom OAuth implementation)
      const requestData = {
        grant_type: 'refresh_token',
        refresh_token: this.refresh_token
      };

      // Create Basic Auth header for Zoom OAuth
      const authHeader = Buffer.from(`${this.client_id}:${this.client_secret}`).toString('base64');

      logger.debug(`[ZoomCredentials] Making token refresh request to: ${ZOOM_TOKEN_URL}`);

      // Make direct HTTP request to Zoom OAuth endpoint
      const response = await axios.post(ZOOM_TOKEN_URL, new URLSearchParams(requestData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json'
        },
        timeout: 30000,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      logger.debug(`[ZoomCredentials] Token refresh response status: ${response.status}`);

      if (response.status !== 200) {
        const errorData = response.data || {};
        
        logger.error(`[ZoomCredentials] Token refresh failed with status ${response.status}:`, {
          error: errorData.error,
          error_description: errorData.error_description,
          full_response: JSON.stringify(errorData),
          refresh_token_length: this.refresh_token ? this.refresh_token.length : 0,
          refresh_token_preview: this.refresh_token ? `${this.refresh_token.substring(0, 10)}...` : 'null'
        });
        
        if (response.status === 400 && (errorData.error === 'invalid_grant' || errorData.error === 'invalid_request')) {
          throw new ZoomAuthenticationError(
            `Refresh token is invalid or expired. Error: ${errorData.error_description || errorData.error}. User needs to re-authenticate.`,
            'REFRESH_TOKEN_INVALID',
            errorData
          );
        }
        
        throw new ZoomAuthenticationError(
          `Token refresh failed: ${errorData.error_description || errorData.error || 'Unknown error'}`,
          'TOKEN_REFRESH_FAILED',
          errorData
        );
      }

      const { access_token, expires_in, refresh_token: newRefreshToken, scope } = response.data;

      if (!access_token) {
        throw new ZoomAuthenticationError(
          'Invalid response from Zoom OAuth endpoint - no access token',
          'INVALID_RESPONSE'
        );
      }

      logger.debug(`[ZoomCredentials] Received new access token, expires_in: ${expires_in}`);

      // Update credentials with new token
      this.access_token = access_token;
      
      // Calculate new expiry time (Zoom tokens typically expire in 1 hour)
      if (expires_in) {
        this.expiry = Date.now() + (expires_in * 1000);
      }
      
      // Update refresh token if provided (some OAuth providers rotate refresh tokens)
      if (newRefreshToken) {
        logger.debug(`[ZoomCredentials] Received new refresh token`);
        this.refresh_token = newRefreshToken;
      }
      
      // Preserve scopes - Zoom may not return scope on refresh, so keep original scopes
      if (scope) {
        // If new scope is provided, update it
        this.scopes = typeof scope === 'string' ? scope.split(' ').filter(s => s) : scope;
        logger.debug(`[ZoomCredentials] Updated scopes from refresh response: ${this.scopes}`);
      } else {
        // Keep original scopes if not provided in refresh response
        this.scopes = originalScopes;
        logger.debug(`[ZoomCredentials] Preserving original scopes: ${this.scopes}`);
      }

      // Save refreshed tokens to database
      await this.saveTokens();

      logger.info(`[ZoomCredentials] Successfully refreshed credentials for user: ${this.userId}`);

    } catch (error) {
      if (error instanceof ZoomAuthenticationError) {
        throw error;
      }

      // Handle network and other errors
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        throw new ZoomAuthenticationError(
          'Network error during token refresh. Please try again.',
          'NETWORK_ERROR',
          error,
          true // retryable
        );
      }

      logger.error(`[ZoomCredentials] Unexpected error during token refresh:`, {
        message: error.message,
        stack: error.stack,
        code: error.code
      });

      throw new ZoomAuthenticationError(
        `Token refresh failed: ${error.message}`,
        'TOKEN_REFRESH_FAILED',
        error
      );
    }
  }

  /**
   * Save tokens to database - mirrors Google's save_tokens function
   */
  async saveTokens() {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        throw new ZoomAuthenticationError('User not found', 'USER_NOT_FOUND');
      }

      // Initialize mcpdata if it doesn't exist
      if (!user.mcpdata) {
        user.mcpdata = {};
      }

      // Use ZOOM as the service key
      const serviceKey = 'ZOOM';

      // Initialize service data if it doesn't exist
      if (!user.mcpdata[serviceKey]) {
        user.mcpdata[serviceKey] = {};
      }

      // Update tokens with encryption
      user.mcpdata[serviceKey].access_token = encryptedData(this.access_token);
      user.mcpdata[serviceKey].expiry_date = this.expiry;
      
      if (this.refresh_token) {
        user.mcpdata[serviceKey].refresh_token = encryptedData(this.refresh_token);
      }
      
      // CRITICAL: Preserve scopes when saving refreshed tokens
      // Zoom doesn't always return scope on refresh, so we need to maintain it
      if (this.scopes && this.scopes.length > 0) {
        // Store as space-separated string (matching OAuth standard)
        user.mcpdata[serviceKey].scope = Array.isArray(this.scopes) 
          ? this.scopes.join(' ') 
          : this.scopes;
        logger.debug(`[ZoomCredentials] Saved scopes: ${user.mcpdata[serviceKey].scope}`);
      }

      // Mark the field as modified to ensure Mongoose saves it
      user.markModified('mcpdata');

      // Save to database
      await user.save();

      logger.debug(`[ZoomCredentials] Saved refreshed tokens for user: ${this.userId}, service: ${serviceKey}`);

    } catch (error) {
      logger.error(`[ZoomCredentials] Failed to save tokens for user: ${this.userId}:`, error.message);
      throw new ZoomAuthenticationError(
        'Failed to save refreshed tokens to database',
        'TOKEN_SAVE_FAILED',
        error
      );
    }
  }

  /**
   * Convert to authorization header format
   */
  toAuthorizationHeader() {
    return `Bearer ${this.access_token}`;
  }
}

/**
 * Get credentials for a user - mirrors Google's get_credentials function
 * This is the core function that handles automatic token refresh
 * 
 * @param {string} userId - User ID to fetch credentials for
 * @param {string} serviceType - Service type (zoom)
 * @param {Array<string>} requiredScopes - List of scopes the credentials must have
 * @returns {Promise<ZoomCredentials>} Valid credentials object
 */
async function getCredentials(userId, serviceType = 'zoom', requiredScopes = []) {
  try {
    logger.info(`[getCredentials] Starting credential retrieval for user: ${userId}, service: ${serviceType}, required scopes: ${requiredScopes.length}`);
    
    // Fetch user's MCP data
    const user = await User.findById(userId);
    if (!user || !user.mcpdata) {
      logger.error(`[getCredentials] User MCP data not found for user: ${userId}`);
      throw new ZoomAuthenticationError(
        'User MCP data not found. User needs to authenticate first.',
        'USER_NOT_FOUND'
      );
    }

    logger.debug(`[getCredentials] User found, checking MCP data keys: ${Object.keys(user.mcpdata)}`);

    // Use ZOOM as the service key
    const serviceKey = 'ZOOM';
    const mcpData = user.mcpdata[serviceKey];
    
    if (!mcpData) {
      logger.error(`[getCredentials] Zoom authentication data not found for user: ${userId}. Available keys: ${Object.keys(user.mcpdata)}`);
      throw new ZoomAuthenticationError(
        'Zoom authentication data not found. User needs to authenticate first.',
        'SERVICE_NOT_AUTHENTICATED'
      );
    }

    logger.debug(`[getCredentials] MCP data found for ${serviceKey}, checking token validity`);

    // Create credentials object
    const credentials = new ZoomCredentials(userId, serviceType, mcpData);

    // Log credential status for debugging
    logger.debug(`[getCredentials] Credentials status - Valid: ${credentials.valid}, Expired: ${credentials.expired}, Has refresh token: ${!!credentials.refresh_token}, Scopes: ${credentials.scopes}`);

    // CRITICAL: Validate required scopes (matching Google implementation)
    // This prevents authentication failures due to missing scopes
    if (requiredScopes && requiredScopes.length > 0) {
      const credentialScopes = credentials.scopes || [];
      const missingScopes = requiredScopes.filter(scope => !credentialScopes.includes(scope));
      
      if (missingScopes.length > 0) {
        logger.warn(`[getCredentials] Credentials lack required scopes. Need: ${requiredScopes}, Have: ${credentialScopes}, Missing: ${missingScopes}`);
        throw new ZoomAuthenticationError(
          `Credentials lack required scopes: ${missingScopes.join(', ')}. User needs to re-authenticate with proper permissions.`,
          'INSUFFICIENT_SCOPES'
        );
      }
      
      logger.debug(`[getCredentials] All required scopes present: ${requiredScopes}`);
    }

    // Check if credentials are valid
    if (credentials.valid) {
      logger.info(`[getCredentials] Valid credentials found for user: ${userId}, service: ${serviceType}`);
      return credentials;
    }

    // If expired and we have a refresh token, try to refresh
    if (credentials.expired && credentials.refresh_token) {
      logger.info(`[getCredentials] Credentials expired, attempting refresh for user: ${userId}, service: ${serviceType}`);
      
      try {
        await credentials.refresh();
        logger.info(`[getCredentials] Successfully refreshed credentials for user: ${userId}, service: ${serviceType}`);
        return credentials;
      } catch (refreshError) {
        // Handle refresh errors gracefully (matching Google's RefreshError handling)
        if (refreshError.errorType === 'REFRESH_TOKEN_INVALID') {
          logger.warn(`[getCredentials] RefreshError - token expired/revoked for user: ${userId} - ${refreshError.message}`);
          throw new ZoomAuthenticationError(
            'Refresh token is invalid or expired. User needs to re-authenticate.',
            'REFRESH_TOKEN_INVALID',
            refreshError
          );
        }
        
        // Re-throw other refresh errors
        logger.error(`[getCredentials] Error refreshing credentials for user: ${userId}:`, refreshError);
        throw refreshError;
      }
    }

    // If no refresh token or other issues
    logger.warn(`[getCredentials] Credentials invalid and cannot be refreshed for user: ${userId}. Valid: ${credentials.valid}, Refresh Token: ${!!credentials.refresh_token}`);
    throw new ZoomAuthenticationError(
      'Credentials are invalid and cannot be refreshed. User needs to re-authenticate.',
      'INVALID_CREDENTIALS'
    );

  } catch (error) {
    if (error instanceof ZoomAuthenticationError) {
      logger.error(`[getCredentials] ZoomAuthenticationError for user: ${userId}, service: ${serviceType} - ${error.message}`);
      throw error;
    }

    logger.error(`[getCredentials] Unexpected error getting credentials for user: ${userId}, service: ${serviceType}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new ZoomAuthenticationError(
      `Failed to get credentials: ${error.message}`,
      'CREDENTIALS_ERROR',
      error
    );
  }
}

/**
 * Get valid access token with automatic refresh
 * 
 * @param {string} userId - User ID
 * @param {Array<string>} requiredScopes - Required scopes for the token
 * @returns {Promise<string>} Valid access token
 */
async function getValidAccessToken(userId, requiredScopes = []) {
  try {
    const credentials = await getCredentials(userId, 'zoom', requiredScopes);
    // credentials.access_token is already decrypted in ZoomCredentials constructor
    return credentials.access_token;
  } catch (error) {
    logger.error(`[getValidAccessToken] Failed to get valid access token for user: ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Make authenticated request to Zoom API
 * 
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @param {Array<string>} requiredScopes - Required scopes for the request
 * @returns {Promise<Object>} API response data
 */
async function makeAuthenticatedZoomRequest(userId, endpoint, options = {}, requiredScopes = []) {
  console.log('========userId========', userId);
  try {
    logger.info(`[makeAuthenticatedZoomRequest] Making request to ${endpoint} for user: ${userId} with scopes: ${requiredScopes.length}`);
    
    // Get credentials with scope validation
    const credentials = await getCredentials(userId, 'zoom', requiredScopes);
    
    const url = endpoint.startsWith('http') ? endpoint : `${ZOOM_API_BASE}/${endpoint.replace(/^\//, '')}`;
    
    const requestOptions = {
      ...options,
      url,
      headers: {
        'Authorization': credentials.toAuthorizationHeader(),
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000
    };

    const response = await axios(requestOptions);
    return response.data;

  } catch (error) {
    if (error.response?.status === 401) {
      // Token might be expired, try to refresh and retry once
      try {
        logger.info(`[makeAuthenticatedZoomRequest] 401 error, attempting token refresh for user: ${userId}`);
        const credentials = await getCredentials(userId, 'zoom', requiredScopes);
        await credentials.refresh();
        
        // Retry the request with refreshed token
        const url = endpoint.startsWith('http') ? endpoint : `${ZOOM_API_BASE}/${endpoint.replace(/^\//, '')}`;
        const requestOptions = {
          ...options,
          url,
          headers: {
            'Authorization': credentials.toAuthorizationHeader(),
            'Content-Type': 'application/json',
            ...options.headers
          },
          timeout: 30000
        };

        const retryResponse = await axios(requestOptions);
        return retryResponse.data;
        
      } catch (refreshError) {
        // Handle insufficient scopes error
        if (refreshError.errorType === 'INSUFFICIENT_SCOPES') {
          throw new ZoomAuthenticationError(
            'Authentication failed due to insufficient scopes. User needs to re-authenticate with proper permissions.',
            'INSUFFICIENT_SCOPES',
            refreshError
          );
        }
        
        throw new ZoomAuthenticationError(
          'Authentication failed and could not refresh credentials. User needs to re-authenticate.',
          'REFRESH_FAILED',
          refreshError
        );
      }
    }
    
    throw error;
  }
}

/**
 * Enhanced Zoom request with fallback options and better error handling
 * 
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @param {Array<string>} requiredScopes - Required scopes for the request
 * @param {boolean} useServerFallback - Whether to use server-to-server fallback
 * @returns {Promise<Object>} API response data
 */
async function makeEnhancedZoomRequest(userId, endpoint, options = {}, requiredScopes = [], useServerFallback = false) {
  try {
    return await makeAuthenticatedZoomRequest(userId, endpoint, options, requiredScopes);
  } catch (error) {
    // If user authentication fails and server fallback is enabled, could implement server-to-server auth here
    // For now, just throw the original error
    throw error;
  }
}

/**
 * Handle Zoom API errors with automatic retry and reauthentication
 * 
 * @param {Function} operation - The async operation to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {boolean} isReadOnly - Whether the operation is read-only
 * @param {string} userId - User ID for credential refresh
 * @param {Array<string>} requiredScopes - Required scopes for the operation
 */
async function handleZoomApiErrors(operation, maxRetries = 3, isReadOnly = true, userId = null, requiredScopes = []) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error instanceof ZoomAuthenticationError) {
        logger.warn(`[handleZoomApiErrors] Authentication error on attempt ${attempt}, trying to refresh credentials`);
        
        if (userId) {
          try {
            // Try to refresh credentials with proper scopes
            const credentials = await getCredentials(userId, 'zoom', requiredScopes);
            await credentials.refresh();
            
            // Retry the operation with refreshed credentials
            logger.info(`[handleZoomApiErrors] Credentials refreshed successfully, retrying operation`);
            continue;
          } catch (refreshError) {
            logger.error(`[handleZoomApiErrors] Failed to refresh credentials:`, refreshError.message);
            
            // If refresh token is invalid or scopes are insufficient, user needs to re-authenticate
            if (refreshError.errorType === 'REFRESH_TOKEN_INVALID' || refreshError.errorType === 'INSUFFICIENT_SCOPES') {
              throw new ZoomAuthenticationError(
                'Authentication failed and could not refresh credentials. User needs to re-authenticate with proper permissions.',
                refreshError.errorType,
                refreshError
              );
            }
            
            throw new ZoomAuthenticationError(
              'Authentication failed and could not refresh credentials.',
              'REFRESH_FAILED',
              refreshError
            );
          }
        } else {
          logger.error(`[handleZoomApiErrors] Authentication error but missing userId for refresh`);
          throw new ZoomAuthenticationError(
            'Authentication failed. User needs to re-authenticate.',
            'AUTH_ERROR',
            error
          );
        }
      }
      
      // Check if it's a retryable error
      if (attempt < maxRetries && (
        error.response?.status === 429 || // Rate limit
        error.response?.status === 500 || // Server error
        error.response?.status === 502 || // Bad gateway
        error.response?.status === 503 || // Service unavailable
        error.response?.status === 504    // Gateway timeout
      )) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`[handleZoomApiErrors] Retryable error (${error.response?.status}) on attempt ${attempt}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or max retries reached, throw the error
      break;
    }
  }
  
  throw lastError;
}

/**
 * Service-specific helper functions with proper scope management
 * These functions mirror Google's service-specific helpers
 */

/**
 * Get authenticated Zoom client for meeting operations
 * 
 * @param {string} userId - User ID
 * @param {string} scopeGroup - Scope group (meeting_read, meeting_write)
 * @returns {Promise<ZoomCredentials>} Authenticated credentials with meeting scopes
 */
async function getAuthenticatedZoomMeetingClient(userId, scopeGroup = 'meeting_read') {
  try {
    logger.info(`[getAuthenticatedZoomMeetingClient] Creating meeting client for user: ${userId}, scope group: ${scopeGroup}`);
    const requiredScopes = SCOPE_GROUPS[scopeGroup] || [];
    const credentials = await getCredentials(userId, 'zoom', requiredScopes);
    logger.info(`[getAuthenticatedZoomMeetingClient] Successfully created meeting client for user: ${userId} with validated scopes`);
    return credentials;
  } catch (error) {
    logger.error(`[getAuthenticatedZoomMeetingClient] Failed to create meeting client for user: ${userId}:`, {
      message: error.message,
      errorType: error.errorType || 'UNKNOWN'
    });
    throw error;
  }
}

/**
 * Get authenticated Zoom client for webinar operations
 * 
 * @param {string} userId - User ID
 * @param {string} scopeGroup - Scope group (webinar_read, webinar_write)
 * @returns {Promise<ZoomCredentials>} Authenticated credentials with webinar scopes
 */
async function getAuthenticatedZoomWebinarClient(userId, scopeGroup = 'webinar_read') {
  try {
    logger.info(`[getAuthenticatedZoomWebinarClient] Creating webinar client for user: ${userId}, scope group: ${scopeGroup}`);
    const requiredScopes = SCOPE_GROUPS[scopeGroup] || [];
    const credentials = await getCredentials(userId, 'zoom', requiredScopes);
    logger.info(`[getAuthenticatedZoomWebinarClient] Successfully created webinar client for user: ${userId} with validated scopes`);
    return credentials;
  } catch (error) {
    logger.error(`[getAuthenticatedZoomWebinarClient] Failed to create webinar client for user: ${userId}:`, {
      message: error.message,
      errorType: error.errorType || 'UNKNOWN'
    });
    throw error;
  }
}

/**
 * Get authenticated Zoom client for user operations
 * 
 * @param {string} userId - User ID
 * @param {string} scopeGroup - Scope group (user_read, user_write)
 * @returns {Promise<ZoomCredentials>} Authenticated credentials with user scopes
 */
async function getAuthenticatedZoomUserClient(userId, scopeGroup = 'user_read') {
  try {
    logger.info(`[getAuthenticatedZoomUserClient] Creating user client for user: ${userId}, scope group: ${scopeGroup}`);
    const requiredScopes = SCOPE_GROUPS[scopeGroup] || [];
    const credentials = await getCredentials(userId, 'zoom', requiredScopes);
    logger.info(`[getAuthenticatedZoomUserClient] Successfully created user client for user: ${userId} with validated scopes`);
    return credentials;
  } catch (error) {
    logger.error(`[getAuthenticatedZoomUserClient] Failed to create user client for user: ${userId}:`, {
      message: error.message,
      errorType: error.errorType || 'UNKNOWN'
    });
    throw error;
  }
}

/**
 * Get authenticated Zoom client for recording operations
 * 
 * @param {string} userId - User ID
 * @param {string} scopeGroup - Scope group (recording_read, recording_write)
 * @returns {Promise<ZoomCredentials>} Authenticated credentials with recording scopes
 */
async function getAuthenticatedZoomRecordingClient(userId, scopeGroup = 'recording_read') {
  try {
    logger.info(`[getAuthenticatedZoomRecordingClient] Creating recording client for user: ${userId}, scope group: ${scopeGroup}`);
    const requiredScopes = SCOPE_GROUPS[scopeGroup] || [];
    const credentials = await getCredentials(userId, 'zoom', requiredScopes);
    logger.info(`[getAuthenticatedZoomRecordingClient] Successfully created recording client for user: ${userId} with validated scopes`);
    return credentials;
  } catch (error) {
    logger.error(`[getAuthenticatedZoomRecordingClient] Failed to create recording client for user: ${userId}:`, {
      message: error.message,
      errorType: error.errorType || 'UNKNOWN'
    });
    throw error;
  }
}

/**
 * Diagnostic utility function to help troubleshoot Zoom authentication issues
 * This function provides detailed information about the current state of authentication
 */
async function diagnoseZoomAuthIssues(userId) {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    userId,
    configurationStatus: {},
    userDataStatus: {},
    credentialsStatus: {},
    networkStatus: {},
    recommendations: []
  };

  try {
    // Check configuration
    diagnosis.configurationStatus = {
      clientIdExists: !!ZOOM_OAUTH?.CLIENT_ID,
      clientSecretExists: !!ZOOM_OAUTH?.CLIENT_SECRET,
      redirectUriConfigured: !!ZOOM_OAUTH?.REDIRECT_URI,
      baseUrl: process.env.BASE_URL,
      configErrors: validateZoomOAuthConfig()
    };

    if (diagnosis.configurationStatus.configErrors.length > 0) {
      diagnosis.recommendations.push('Fix configuration errors: ' + diagnosis.configurationStatus.configErrors.join(', '));
    }

    // Check user data
    const user = await User.findById(userId);
    diagnosis.userDataStatus = {
      userExists: !!user,
      mcpDataExists: !!(user && user.mcpdata),
      availableServices: user && user.mcpdata ? Object.keys(user.mcpdata) : []
    };

    if (!user) {
      diagnosis.recommendations.push('User not found in database');
      return diagnosis;
    }

    if (!user.mcpdata) {
      diagnosis.recommendations.push('User has no MCP authentication data - user needs to authenticate first');
      return diagnosis;
    }

    const serviceKey = 'ZOOM';
    const mcpData = user.mcpdata[serviceKey];
    diagnosis.userDataStatus.serviceKey = serviceKey;
    diagnosis.userDataStatus.serviceDataExists = !!mcpData;

    if (!mcpData) {
      diagnosis.recommendations.push(`No authentication data found for Zoom. Available services: ${diagnosis.userDataStatus.availableServices.join(', ')}`);
      return diagnosis;
    }

    // Check credentials
    try {
      const credentials = new ZoomCredentials(userId, 'zoom', mcpData);
      diagnosis.credentialsStatus = {
        accessTokenExists: !!credentials.access_token,
        refreshTokenExists: !!credentials.refresh_token,
        hasExpiry: !!credentials.expiry,
        isValid: credentials.valid,
        isExpired: credentials.expired,
        expiryTime: credentials.expiry ? new Date(credentials.expiry).toISOString() : null,
        scopes: credentials.scopes || []
      };

      if (credentials.expired && !credentials.refresh_token) {
        diagnosis.recommendations.push('Credentials are expired and no refresh token is available - user needs to re-authenticate');
      } else if (credentials.expired && credentials.refresh_token) {
        diagnosis.recommendations.push('Credentials are expired but refresh token is available - attempting refresh should work');
      } else if (!credentials.valid) {
        diagnosis.recommendations.push('Credentials are invalid - check token format and expiry');
      }

    } catch (credError) {
      diagnosis.credentialsStatus.error = {
        message: credError.message,
        type: credError.name
      };
      diagnosis.recommendations.push(`Credentials creation failed: ${credError.message}`);
    }

    // Test network connectivity
    try {
      const testResponse = await axios.get('https://zoom.us/oauth/authorize', {
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status
      });
      
      diagnosis.networkStatus = {
        zoomReachable: testResponse.status < 500,
        responseStatus: testResponse.status,
        responseTime: testResponse.headers['x-response-time'] || 'unknown'
      };

      if (testResponse.status >= 500) {
        diagnosis.recommendations.push('Zoom APIs appear to be experiencing issues (5xx response)');
      }

    } catch (networkError) {
      diagnosis.networkStatus = {
        zoomReachable: false,
        error: {
          code: networkError.code,
          message: networkError.message
        }
      };

      if (networkError.code === 'ENOTFOUND') {
        diagnosis.recommendations.push('DNS resolution failed - check network connectivity and DNS settings');
      } else if (networkError.code === 'ECONNREFUSED') {
        diagnosis.recommendations.push('Connection refused - check firewall settings and proxy configuration');
      } else if (networkError.code === 'ETIMEDOUT') {
        diagnosis.recommendations.push('Connection timeout - check network connectivity and firewall settings');
      } else {
        diagnosis.recommendations.push(`Network error: ${networkError.message}`);
      }
    }

    // Final recommendations
    if (diagnosis.recommendations.length === 0) {
      diagnosis.recommendations.push('No obvious issues detected - check application logs for more details');
    }

  } catch (error) {
    diagnosis.error = {
      message: error.message,
      stack: error.stack
    };
    diagnosis.recommendations.push(`Diagnosis failed: ${error.message}`);
  }

  return diagnosis;
}

module.exports = {
  ZoomCredentials,
  ZoomAuthenticationError,
  getCredentials,
  getValidAccessToken,
  makeAuthenticatedZoomRequest,
  makeEnhancedZoomRequest,
  handleZoomApiErrors,
  getAuthenticatedZoomMeetingClient,
  getAuthenticatedZoomWebinarClient,
  getAuthenticatedZoomUserClient,
  getAuthenticatedZoomRecordingClient,
  diagnoseZoomAuthIssues,
  validateZoomOAuthConfig,
  ZOOM_SCOPES,
  SCOPE_GROUPS
};