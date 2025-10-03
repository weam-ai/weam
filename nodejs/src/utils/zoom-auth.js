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
    this.expiry = mcpData.expiry_date || mcpData.expiry;
    this.client_id = CLIENT_ID;
    this.client_secret = CLIENT_SECRET;
    this.scopes = mcpData.scopes || [];
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
      // Prepare refresh token request (matching Zoom OAuth implementation)
      const requestData = {
        grant_type: 'refresh_token',
        refresh_token: this.refresh_token
      };

      // Create Basic Auth header for Zoom OAuth
      const authHeader = Buffer.from(`${this.client_id}:${this.client_secret}`).toString('base64');

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

      if (response.status !== 200) {
        const errorData = response.data || {};
        
        if (response.status === 400 && (errorData.error === 'invalid_grant' || errorData.error === 'invalid_request')) {
          throw new ZoomAuthenticationError(
            'Refresh token is invalid or expired. User needs to re-authenticate.',
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

      const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;

      if (!access_token) {
        throw new ZoomAuthenticationError(
          'Invalid response from Zoom OAuth endpoint - no access token',
          'INVALID_RESPONSE'
        );
      }

      // Update credentials with new token
      this.access_token = access_token;
      
      // Calculate new expiry time (Zoom tokens typically expire in 1 hour)
      if (expires_in) {
        this.expiry = Date.now() + (expires_in * 1000);
      }
      
      // Update refresh token if provided
      if (newRefreshToken) {
        this.refresh_token = newRefreshToken;
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
 */
async function getCredentials(userId, serviceType = 'zoom') {
  try {
    // Fetch user's MCP data
    const user = await User.findById(userId);
    if (!user || !user.mcpdata) {
      throw new ZoomAuthenticationError(
        'User MCP data not found. User needs to authenticate first.',
        'USER_NOT_FOUND'
      );
    }

    // Use ZOOM as the service key
    const serviceKey = 'ZOOM';
    const mcpData = user.mcpdata[serviceKey];
    
    if (!mcpData) {
      throw new ZoomAuthenticationError(
        'Zoom authentication data not found. User needs to authenticate first.',
        'SERVICE_NOT_AUTHENTICATED'
      );
    }

    // Create credentials object
    const credentials = new ZoomCredentials(userId, serviceType, mcpData);

    // Check if credentials are valid
    if (credentials.valid) {
      logger.debug(`[getCredentials] Valid credentials found for user: ${userId}, service: ${serviceType}`);
      return credentials;
    }

    // If expired and we have a refresh token, try to refresh
    if (credentials.expired && credentials.refresh_token) {
      logger.info(`[getCredentials] Credentials expired, attempting refresh for user: ${userId}, service: ${serviceType}`);
      await credentials.refresh();
      return credentials;
    }

    // If no refresh token or other issues
    throw new ZoomAuthenticationError(
      'Credentials are invalid and cannot be refreshed. User needs to re-authenticate.',
      'INVALID_CREDENTIALS'
    );

  } catch (error) {
    if (error instanceof ZoomAuthenticationError) {
      throw error;
    }

    logger.error(`[getCredentials] Error getting credentials for user: ${userId}, service: ${serviceType}:`, error.message);
    throw new ZoomAuthenticationError(
      `Failed to get credentials: ${error.message}`,
      'CREDENTIALS_ERROR',
      error
    );
  }
}

/**
 * Get valid access token with automatic refresh
 */
async function getValidAccessToken(userId) {
  try {
    const credentials = await getCredentials(userId);
    return credentials.access_token;
  } catch (error) {
    logger.error(`[getValidAccessToken] Failed to get valid access token for user: ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Make authenticated request to Zoom API
 */
async function makeAuthenticatedZoomRequest(userId, endpoint, options = {}) {
  try {
    const credentials = await getCredentials(userId);
    
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
        const credentials = await getCredentials(userId);
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
 */
async function makeEnhancedZoomRequest(userId, endpoint, options = {}, useServerFallback = false) {
  try {
    return await makeAuthenticatedZoomRequest(userId, endpoint, options);
  } catch (error) {
    // If user authentication fails and server fallback is enabled, could implement server-to-server auth here
    // For now, just throw the original error
    throw error;
  }
}

/**
 * Handle Zoom API errors with automatic retry and reauthentication
 */
async function handleZoomApiErrors(operation, maxRetries = 3, isReadOnly = true, userId = null) {
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
            // Try to refresh credentials
            const credentials = await getCredentials(userId);
            await credentials.refresh();
            
            // Retry the operation with refreshed credentials
            continue;
          } catch (refreshError) {
            logger.error(`[handleZoomApiErrors] Failed to refresh credentials:`, refreshError.message);
            throw new ZoomAuthenticationError(
              'Authentication failed and could not refresh credentials. User needs to re-authenticate.',
              'REFRESH_FAILED',
              refreshError
            );
          }
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
        logger.warn(`[handleZoomApiErrors] Retryable error on attempt ${attempt}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or max retries reached, throw the error
      break;
    }
  }
  
  throw lastError;
}

module.exports = {
  ZoomCredentials,
  ZoomAuthenticationError,
  getCredentials,
  getValidAccessToken,
  makeAuthenticatedZoomRequest,
  makeEnhancedZoomRequest,
  handleZoomApiErrors,
  ZOOM_SCOPES,
  SCOPE_GROUPS
};