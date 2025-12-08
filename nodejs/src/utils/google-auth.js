/**
 * Google Authentication Utilities for MCP Tools
 * Node.js implementation of Python-style Google OAuth reauthentication
 * Mirrors the logic from /src/google/google_auth.py
 */

const { google } = require('googleapis');
const axios = require('axios');
const { decryptedData, encryptedData } = require('./helper');
const User = require('../models/user');
const logger = require('./logger');
const config = require('../config/config');

// Google OAuth Token URL
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Validate configuration on module load
function validateGoogleOAuthConfig() {
  const errors = [];
  
  if (!config.GOOGLE_OAUTH?.CLIENT_ID) {
    errors.push('GOOGLE_OAUTH_CLIENT_ID is not set');
  }
  
  if (!config.GOOGLE_OAUTH?.CLIENT_SECRET) {
    errors.push('GOOGLE_OAUTH_CLIENT_SECRET is not set');
  }
  
  if (!config.GOOGLE_OAUTH?.REDIRECT_URI) {
    errors.push('GOOGLE_OAUTH.REDIRECT_URI is not properly configured');
  }
  
  if (errors.length > 0) {
    logger.error('[GoogleAuth] Configuration validation failed:', errors);
    logger.error('[GoogleAuth] Current environment:', process.env.NODE_ENV);
    logger.error('[GoogleAuth] Base URL:', process.env.BASE_URL);
  } else {
    logger.info('[GoogleAuth] Configuration validation passed');
    logger.debug('[GoogleAuth] Redirect URI:', config.GOOGLE_OAUTH.REDIRECT_URI);
  }
  
  return errors;
}

// Validate configuration on startup
const configErrors = validateGoogleOAuthConfig();

// Google OAuth Scopes
const GOOGLE_SCOPES = {
  // Gmail scopes
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  GMAIL_MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  GMAIL_COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',
  GMAIL_SEND: 'https://www.googleapis.com/auth/gmail.send',
  GMAIL_LABELS: 'https://www.googleapis.com/auth/gmail.labels',
  GMAIL_METADATA: 'https://www.googleapis.com/auth/gmail.metadata',
  
  // Drive scopes
  DRIVE_READONLY: 'https://www.googleapis.com/auth/drive.readonly',
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',
  DRIVE_METADATA_READONLY: 'https://www.googleapis.com/auth/drive.metadata.readonly',
  
  // Calendar scopes
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  CALENDAR_EVENTS: 'https://www.googleapis.com/auth/calendar.events',
  CALENDAR: 'https://www.googleapis.com/auth/calendar'
};

// Scope groups for different services
const SCOPE_GROUPS = {
  // gmail.readonly includes metadata access, so we don't need both
  gmail_read: [GOOGLE_SCOPES.GMAIL_READONLY],
  gmail_modify: [GOOGLE_SCOPES.GMAIL_MODIFY, GOOGLE_SCOPES.GMAIL_LABELS],
  gmail_compose: [GOOGLE_SCOPES.GMAIL_COMPOSE, GOOGLE_SCOPES.GMAIL_SEND],
  // drive.readonly includes metadata access, so we don't need both
  drive_read: [GOOGLE_SCOPES.DRIVE_READONLY],
  drive_file: [GOOGLE_SCOPES.DRIVE_FILE],
  calendar_read: [GOOGLE_SCOPES.CALENDAR_READONLY],
  calendar_events: [GOOGLE_SCOPES.CALENDAR_EVENTS],
  calendar_full: [GOOGLE_SCOPES.CALENDAR]
};

/**
 * Custom error class for Google authentication errors
 * Mirrors Python's GoogleAuthenticationError
 */
class GoogleAuthenticationError extends Error {
  constructor(message, errorType = 'UNKNOWN', originalError = null, retryable = false) {
    super(message);
    this.name = 'GoogleAuthenticationError';
    this.errorType = errorType;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

/**
 * GoogleCredentials class - mirrors Python's Credentials object
 * Provides automatic token refresh functionality
 */
class GoogleCredentials {
  constructor(userId, serviceType, mcpData) {
    this.userId = userId;
    this.serviceType = serviceType;
    this.access_token = mcpData.access_token ? decryptedData(mcpData.access_token) : null;
    this.refresh_token = mcpData.refresh_token ? decryptedData(mcpData.refresh_token) : null;
    this.expiry = mcpData.expiry_date || mcpData.expiry;
    this.client_id = config.GOOGLE_OAUTH.CLIENT_ID;
    this.client_secret = config.GOOGLE_OAUTH.CLIENT_SECRET;
    
    // Handle scopes - can be array or space-separated string (matching Python implementation)
    if (mcpData.scopes) {
      this.scopes = Array.isArray(mcpData.scopes) ? mcpData.scopes : [];
    } else if (mcpData.scope) {
      // Python stores as 'scope' (singular) as a space-separated string
      this.scopes = typeof mcpData.scope === 'string' ? mcpData.scope.split(' ').filter(s => s) : [];
    } else {
      this.scopes = [];
    }
  }

  /**
   * Check if credentials are valid (not expired and have access token)
   * Mirrors Python's credentials.valid property
   */
  get valid() {
    if (!this.access_token) {
      return false;
    }
    
    if (!this.expiry) {
      return true; // No expiry means token is valid
    }
    
    // Add 5-minute buffer for proactive refresh (matching Python behavior)
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();
    const expiryTime = typeof this.expiry === 'number' ? this.expiry : new Date(this.expiry).getTime();
    
    return now < (expiryTime - bufferTime);
  }

  /**
   * Check if credentials are expired
   * Mirrors Python's credentials.expired property
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
   * Mirrors Python's credentials.refresh(Request()) method
   */
  async refresh() {
    if (!this.refresh_token) {
      throw new GoogleAuthenticationError(
        'No refresh token available for automatic refresh',
        'REFRESH_TOKEN_INVALID'
      );
    }

    logger.info(`[GoogleCredentials] Refreshing credentials for user: ${this.userId}, service: ${this.serviceType}`);

    try {
      // Validate environment before making request
      if (!config.GOOGLE_OAUTH?.CLIENT_ID || !config.GOOGLE_OAUTH?.CLIENT_SECRET) {
        throw new GoogleAuthenticationError(
          'Google OAuth configuration is incomplete. Check GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables.',
          'CONFIG_ERROR'
        );
      }

      // Prepare refresh token request (matching Python implementation)
      const requestData = {
        grant_type: 'refresh_token',
        client_id: this.client_id,
        client_secret: this.client_secret,
        refresh_token: this.refresh_token
      };

      logger.debug(`[GoogleCredentials] Making token refresh request to: ${GOOGLE_TOKEN_URL}`);

      // Make direct HTTP request to Google OAuth endpoint
      const response = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams(requestData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      logger.debug(`[GoogleCredentials] Token refresh response status: ${response.status}`);

      if (response.status !== 200) {
        const errorData = response.data || {};
        
        logger.error(`[GoogleCredentials] Token refresh failed with status ${response.status}:`, errorData);
        
        if (response.status === 400 && errorData.error === 'invalid_grant') {
          throw new GoogleAuthenticationError(
            'Refresh token is invalid or expired. User needs to re-authenticate.',
            'REFRESH_TOKEN_INVALID',
            errorData
          );
        }
        
        if (response.status === 401) {
          throw new GoogleAuthenticationError(
            'Authentication failed. Check GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET configuration.',
            'AUTH_CONFIG_ERROR',
            errorData
          );
        }
        
        throw new GoogleAuthenticationError(
          `Token refresh failed: ${errorData.error_description || errorData.error || 'Unknown error'}`,
          'TOKEN_REFRESH_FAILED',
          errorData
        );
      }

      const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;

      if (!access_token) {
        throw new GoogleAuthenticationError(
          'Invalid response from Google OAuth endpoint - no access token',
          'INVALID_RESPONSE'
        );
      }

      logger.debug(`[GoogleCredentials] Token refresh successful, expires_in: ${expires_in}`);

      // Update credentials with new token
      this.access_token = access_token;
      
      // Calculate new expiry time
      if (expires_in) {
        this.expiry = Date.now() + (expires_in * 1000);
      }
      
      // Update refresh token if provided
      if (newRefreshToken) {
        this.refresh_token = newRefreshToken;
      }

      // Save refreshed tokens to database (matching Python's save_tokens behavior)
      await this.saveTokens();

      logger.info(`[GoogleCredentials] Successfully refreshed credentials for user: ${this.userId}`);

    } catch (error) {
      if (error instanceof GoogleAuthenticationError) {
        throw error;
      }

      // Log network/connection errors with more detail
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error(`[GoogleCredentials] Network error during token refresh:`, {
          code: error.code,
          message: error.message,
          hostname: error.hostname,
          port: error.port
        });
        throw new GoogleAuthenticationError(
          `Network error: Unable to connect to Google OAuth service. Check network connectivity and firewall settings.`,
          'NETWORK_ERROR',
          error,
          true // retryable
        );
      }

      if (error.code === 'ETIMEDOUT') {
        logger.error(`[GoogleCredentials] Timeout error during token refresh:`, error.message);
        throw new GoogleAuthenticationError(
          'Request timeout: Google OAuth service did not respond in time.',
          'TIMEOUT_ERROR',
          error,
          true // retryable
        );
      }

      logger.error(`[GoogleCredentials] Unexpected error during token refresh:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response?.data
      });

      throw new GoogleAuthenticationError(
        `Token refresh failed: ${error.message}`,
        'REFRESH_ERROR',
        error
      );
    }
  }

  /**
   * Save tokens to database - mirrors Python's save_tokens function
   */
  async saveTokens() {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        throw new GoogleAuthenticationError('User not found', 'USER_NOT_FOUND');
      }

      // Initialize mcpdata if it doesn't exist
      if (!user.mcpdata) {
        user.mcpdata = {};
      }

      // Determine service key based on serviceType
      let serviceKey;
      switch (this.serviceType.toLowerCase()) {
        case 'gmail':
          serviceKey = 'GMAIL';
          break;
        case 'drive':
        case 'google_drive':
          serviceKey = 'GOOGLE_DRIVE';
          break;
        case 'calendar':
        case 'google_calendar':
          serviceKey = 'GOOGLE_CALENDAR';
          break;
        default:
          serviceKey = this.serviceType.toUpperCase();
      }

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

      logger.debug(`[GoogleCredentials] Saved refreshed tokens for user: ${this.userId}, service: ${serviceKey}`);

    } catch (error) {
      logger.error(`[GoogleCredentials] Failed to save tokens for user: ${this.userId}:`, error.message);
      throw new GoogleAuthenticationError(
        'Failed to save refreshed tokens to database',
        'TOKEN_SAVE_FAILED',
        error
      );
    }
  }

  /**
   * Convert to OAuth2Client credentials format
   */
  toOAuth2Credentials() {
    return {
      access_token: this.access_token,
      refresh_token: this.refresh_token,
      expiry_date: this.expiry,
      token_type: 'Bearer'
    };
  }
}

/**
 * Get credentials for a user and service - mirrors Python's get_credentials function
 * This is the core function that handles automatic token refresh
 * 
 * @param {string} userId - User ID to fetch credentials for
 * @param {string} serviceType - Service type (gmail, drive, calendar)
 * @param {Array<string>} requiredScopes - List of scopes the credentials must have
 * @returns {Promise<GoogleCredentials>} Valid credentials object
 */
async function getCredentials(userId, serviceType = 'gmail', requiredScopes = []) {
  try {
    logger.info(`[getCredentials] Starting credential retrieval for user: ${userId}, service: ${serviceType}, required scopes: ${requiredScopes.length}`);
    
    // Fetch user's MCP data
    const user = await User.findById(userId);
    if (!user || !user.mcpdata) {
      logger.error(`[getCredentials] User MCP data not found for user: ${userId}`);
      throw new GoogleAuthenticationError(
        'User MCP data not found. User needs to authenticate first.',
        'USER_NOT_FOUND'
      );
    }

    logger.debug(`[getCredentials] User found, checking MCP data keys: ${Object.keys(user.mcpdata)}`);

    // Determine service key
    let serviceKey;
    switch (serviceType.toLowerCase()) {
      case 'gmail':
        serviceKey = 'GMAIL';
        break;
      case 'drive':
      case 'google_drive':
        serviceKey = 'GOOGLE_DRIVE';
        break;
      case 'calendar':
      case 'google_calendar':
        serviceKey = 'GOOGLE_CALENDAR';
        break;
      default:
        serviceKey = serviceType.toUpperCase();
    }

    logger.debug(`[getCredentials] Looking for service key: ${serviceKey}`);

    const mcpData = user.mcpdata[serviceKey];
    if (!mcpData) {
      logger.error(`[getCredentials] ${serviceType} authentication data not found for user: ${userId}. Available keys: ${Object.keys(user.mcpdata)}`);
      throw new GoogleAuthenticationError(
        `${serviceType} authentication data not found. User needs to authenticate first.`,
        'SERVICE_NOT_AUTHENTICATED'
      );
    }

    logger.debug(`[getCredentials] MCP data found for ${serviceKey}, checking token validity`);

    // Create credentials object
    const credentials = new GoogleCredentials(userId, serviceType, mcpData);

    // Log credential status for debugging
    logger.debug(`[getCredentials] Credentials status - Valid: ${credentials.valid}, Expired: ${credentials.expired}, Has refresh token: ${!!credentials.refresh_token}, Scopes: ${credentials.scopes}`);

    // CRITICAL: Validate required scopes (matching Python implementation)
    // This prevents authentication failures due to missing scopes
    if (requiredScopes && requiredScopes.length > 0) {
      const credentialScopes = credentials.scopes || [];
      const missingScopes = requiredScopes.filter(scope => !credentialScopes.includes(scope));
      
      if (missingScopes.length > 0) {
        logger.warn(`[getCredentials] Credentials lack required scopes. Need: ${requiredScopes}, Have: ${credentialScopes}, Missing: ${missingScopes}`);
        throw new GoogleAuthenticationError(
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
        // Handle refresh errors gracefully (matching Python's RefreshError handling)
        if (refreshError.errorType === 'REFRESH_TOKEN_INVALID') {
          logger.warn(`[getCredentials] RefreshError - token expired/revoked for user: ${userId} - ${refreshError.message}`);
          throw new GoogleAuthenticationError(
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
    throw new GoogleAuthenticationError(
      'Credentials are invalid and cannot be refreshed. User needs to re-authenticate.',
      'INVALID_CREDENTIALS'
    );

  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      logger.error(`[getCredentials] GoogleAuthenticationError for user: ${userId}, service: ${serviceType} - ${error.message}`);
      throw error;
    }

    logger.error(`[getCredentials] Unexpected error getting credentials for user: ${userId}, service: ${serviceType}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new GoogleAuthenticationError(
      `Failed to get credentials: ${error.message}`,
      'CREDENTIALS_ERROR',
      error
    );
  }
}

async function getAuthenticatedGoogleService(userId, serviceName, version = 'v1', requiredScopes = []) {
  try {
    logger.info(`[getAuthenticatedGoogleService] Creating ${serviceName} service for user: ${userId}, version: ${version}, required scopes: ${requiredScopes.length}`);
    
    // Log environment info for debugging
    logger.debug(`[getAuthenticatedGoogleService] Environment: ${process.env.NODE_ENV}, CLIENT_ID exists: ${!!config.GOOGLE_OAUTH?.CLIENT_ID}, CLIENT_SECRET exists: ${!!config.GOOGLE_OAUTH?.CLIENT_SECRET}`);

    // Map service names to service types
    const serviceTypeMap = {
      'gmail': 'gmail',
      'drive': 'drive',
      'calendar': 'calendar'
    };

    const serviceType = serviceTypeMap[serviceName.toLowerCase()] || serviceName;
    logger.debug(`[getAuthenticatedGoogleService] Service type mapped to: ${serviceType}, passing ${requiredScopes.length} required scopes`);
    
    // CRITICAL FIX: Pass requiredScopes to getCredentials (matching Python implementation)
    // This ensures credentials have all necessary permissions before creating the service
    const credentials = await getCredentials(userId, serviceType, requiredScopes);
    logger.debug(`[getAuthenticatedGoogleService] Credentials retrieved and validated successfully`);
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(config.GOOGLE_OAUTH.CLIENT_ID, config.GOOGLE_OAUTH.CLIENT_SECRET);
    const oauth2Creds = credentials.toOAuth2Credentials();
    
    logger.debug(`[getAuthenticatedGoogleService] OAuth2 credentials prepared - access_token exists: ${!!oauth2Creds.access_token}, refresh_token exists: ${!!oauth2Creds.refresh_token}`);
    
    oauth2Client.setCredentials(oauth2Creds);
    
    // Create and return the Google service with proper service name mapping
    let service;
    const lowerServiceName = serviceName.toLowerCase();
    
    switch (lowerServiceName) {
      case 'gmail':
        service = google.gmail({ version, auth: oauth2Client });
        break;
      case 'drive':
        service = google.drive({ version, auth: oauth2Client });
        break;
      case 'calendar':
        service = google.calendar({ version, auth: oauth2Client });
        break;
      default:
        // Fallback to dynamic access for other services
        if (google[lowerServiceName]) {
          service = google[lowerServiceName]({ version, auth: oauth2Client });
        } else {
          logger.error(`[getAuthenticatedGoogleService] Unsupported Google service: ${serviceName}`);
          throw new Error(`Unsupported Google service: ${serviceName}`);
        }
    }
    
    logger.info(`[getAuthenticatedGoogleService] Successfully created ${serviceName} service for user: ${userId} with validated scopes`);
    return service;

  } catch (error) {
    logger.error(`[getAuthenticatedGoogleService] Failed to create ${serviceName} service for user: ${userId}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      errorType: error.errorType || 'UNKNOWN'
    });
    throw error;
  }
}

/**
 * Get authenticated Gmail service
 */
async function getAuthenticatedGmailService(userId, scopeGroup = 'gmail_read') {
  return await getAuthenticatedGoogleService(userId, 'gmail', 'v1', SCOPE_GROUPS[scopeGroup] || []);
}

/**
 * Get authenticated Drive service
 */
async function getAuthenticatedDriveService(userId, scopeGroup = 'drive_read') {
  return await getAuthenticatedGoogleService(userId, 'drive', 'v3', SCOPE_GROUPS[scopeGroup] || []);
}

/**
 * Get authenticated Calendar service
 */
async function getAuthenticatedCalendarService(userId, scopeGroup = 'calendar_read') {
  return await getAuthenticatedGoogleService(userId, 'calendar', 'v3', SCOPE_GROUPS[scopeGroup] || []);
}

/**
 * Handle Google API errors with automatic retry and reauthentication
 * 
 * @param {Function} operation - The async operation to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {boolean} isReadOnly - Whether the operation is read-only
 * @param {string} userId - User ID for credential refresh
 * @param {string} serviceType - Service type (gmail, drive, calendar) for credential refresh
 * @param {Array<string>} requiredScopes - Required scopes for the operation
 */
async function handleGoogleApiErrors(operation, maxRetries = 3, isReadOnly = true, userId = null, serviceType = 'gmail', requiredScopes = []) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's an authentication error
      if (error.code === 401 || error.message?.includes('invalid_grant') || error.message?.includes('invalid_token')) {
        logger.warn(`[handleGoogleApiErrors] Authentication error on attempt ${attempt}, trying to refresh credentials`);
        
        if (userId && serviceType) {
          try {
            // Try to refresh credentials with proper service type and scopes
            const credentials = await getCredentials(userId, serviceType, requiredScopes);
            await credentials.refresh();
            
            // Retry the operation with refreshed credentials
            logger.info(`[handleGoogleApiErrors] Credentials refreshed successfully, retrying operation`);
            continue;
          } catch (refreshError) {
            logger.error(`[handleGoogleApiErrors] Failed to refresh credentials:`, refreshError.message);
            
            // If refresh token is invalid, user needs to re-authenticate
            if (refreshError.errorType === 'REFRESH_TOKEN_INVALID' || refreshError.errorType === 'INSUFFICIENT_SCOPES') {
              throw new GoogleAuthenticationError(
                'Authentication failed and could not refresh credentials. User needs to re-authenticate with proper permissions.',
                refreshError.errorType,
                refreshError
              );
            }
            
            throw new GoogleAuthenticationError(
              'Authentication failed and could not refresh credentials.',
              'REFRESH_FAILED',
              refreshError
            );
          }
        } else {
          logger.error(`[handleGoogleApiErrors] Authentication error but missing userId or serviceType for refresh`);
          throw new GoogleAuthenticationError(
            'Authentication failed. User needs to re-authenticate.',
            'AUTH_ERROR',
            error
          );
        }
      }
      
      // Check if it's a retryable error
      if (attempt < maxRetries && (
        error.code === 429 || // Rate limit
        error.code === 500 || // Server error
        error.code === 502 || // Bad gateway
        error.code === 503 || // Service unavailable
        error.code === 504    // Gateway timeout
      )) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`[handleGoogleApiErrors] Retryable error (${error.code}) on attempt ${attempt}, retrying in ${delay}ms`);
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
 * Extract text content from Office XML files (DOCX, XLSX, PPTX)
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<string>} Extracted text content
 */
async function extractOfficeXmlText(buffer) {
  try {
    // Validate input buffer
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Invalid buffer provided - expected Buffer object');
    }
    
    if (buffer.length === 0) {
      throw new Error('Empty buffer provided');
    }
    
    logger.info(`[extractOfficeXmlText] Processing buffer of size: ${buffer.length} bytes`);
    
    const JSZip = require('jszip');
    let zip;
    
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch (zipError) {
      throw new Error(`Failed to load ZIP archive: ${zipError.message}. This may not be a valid Office document.`);
    }
    
    const fileNames = Object.keys(zip.files);
    logger.info(`[extractOfficeXmlText] ZIP contains ${fileNames.length} files: ${fileNames.slice(0, 10).join(', ')}${fileNames.length > 10 ? '...' : ''}`);
    
    let extractedText = '';
    let documentType = 'unknown';
    
    // Check if it's a Word document (DOCX)
    if (zip.files['word/document.xml']) {
      documentType = 'DOCX';
      logger.info('[extractOfficeXmlText] Detected Word document (DOCX)');
      try {
        const documentXml = await zip.files['word/document.xml'].async('text');
        // Simple XML text extraction - remove XML tags
        extractedText = documentXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        logger.info(`[extractOfficeXmlText] Extracted ${extractedText.length} characters from DOCX`);
      } catch (docError) {
        throw new Error(`Failed to extract DOCX content: ${docError.message}`);
      }
    }
    // Check if it's an Excel file (XLSX)
    else if (zip.files['xl/sharedStrings.xml']) {
      documentType = 'XLSX';
      logger.info('[extractOfficeXmlText] Detected Excel document (XLSX)');
      try {
        const sharedStringsXml = await zip.files['xl/sharedStrings.xml'].async('text');
        // Extract shared strings which contain most text content
        const textMatches = sharedStringsXml.match(/<t[^>]*>([^<]*)<\/t>/g);
        if (textMatches) {
          extractedText = textMatches.map(match => match.replace(/<[^>]*>/g, '')).join(' ');
          logger.info(`[extractOfficeXmlText] Extracted ${extractedText.length} characters from XLSX shared strings`);
        } else {
          logger.warn('[extractOfficeXmlText] No text content found in XLSX shared strings');
        }
      } catch (xlsError) {
        throw new Error(`Failed to extract XLSX content: ${xlsError.message}`);
      }
    }
    // Check if it's a PowerPoint file (PPTX)
    else if (zip.files['ppt/slides/']) {
      documentType = 'PPTX';
      logger.info('[extractOfficeXmlText] Detected PowerPoint document (PPTX)');
      try {
        const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
        logger.info(`[extractOfficeXmlText] Found ${slideFiles.length} slides to process`);
        const slideTexts = [];
        
        for (const slideFile of slideFiles) {
          try {
            const slideXml = await zip.files[slideFile].async('text');
            const slideText = slideXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (slideText) {
              slideTexts.push(slideText);
            }
          } catch (slideError) {
            logger.warn(`[extractOfficeXmlText] Failed to process slide ${slideFile}: ${slideError.message}`);
          }
        }
        extractedText = slideTexts.join('\n\n');
        logger.info(`[extractOfficeXmlText] Extracted ${extractedText.length} characters from ${slideTexts.length} slides`);
      } catch (pptError) {
        throw new Error(`Failed to extract PPTX content: ${pptError.message}`);
      }
    }
    else {
      // Try to identify the document type from available files
      const hasWordStructure = fileNames.some(name => name.startsWith('word/'));
      const hasExcelStructure = fileNames.some(name => name.startsWith('xl/'));
      const hasPowerPointStructure = fileNames.some(name => name.startsWith('ppt/'));
      
      if (hasWordStructure) {
        throw new Error('Detected Word document structure but missing word/document.xml file');
      } else if (hasExcelStructure) {
        throw new Error('Detected Excel document structure but missing xl/sharedStrings.xml file');
      } else if (hasPowerPointStructure) {
        throw new Error('Detected PowerPoint document structure but missing ppt/slides/ directory');
      } else {
        throw new Error(`Unrecognized Office document format. Available files: ${fileNames.slice(0, 5).join(', ')}`);
      }
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      logger.warn(`[extractOfficeXmlText] No text content extracted from ${documentType} document`);
      return `[No text content found in ${documentType} document]`;
    }
    
    logger.info(`[extractOfficeXmlText] Successfully extracted ${extractedText.length} characters from ${documentType} document`);
    return extractedText;
    
  } catch (error) {
    logger.error('[extractOfficeXmlText] Error extracting text from Office document:', {
      message: error.message,
      stack: error.stack,
      bufferSize: buffer ? buffer.length : 'undefined'
    });
    return `[Error extracting text: ${error.message}]`;
  }
}

/**
 * Diagnostic utility function to help troubleshoot Google authentication issues
 * This function provides detailed information about the current state of authentication
 */
async function diagnoseGoogleAuthIssues(userId, serviceType = 'gmail') {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    userId,
    serviceType,
    configurationStatus: {},
    userDataStatus: {},
    credentialsStatus: {},
    networkStatus: {},
    recommendations: []
  };

  try {
    // Check configuration
    diagnosis.configurationStatus = {
      clientIdExists: !!config.GOOGLE_OAUTH?.CLIENT_ID,
      clientSecretExists: !!config.GOOGLE_OAUTH?.CLIENT_SECRET,
      redirectUriConfigured: !!config.GOOGLE_OAUTH?.REDIRECT_URI,
      baseUrl: process.env.BASE_URL,
      configErrors: validateGoogleOAuthConfig()
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

    // Determine service key
    let serviceKey;
    switch (serviceType.toLowerCase()) {
      case 'gmail':
        serviceKey = 'GMAIL';
        break;
      case 'drive':
      case 'google_drive':
        serviceKey = 'GOOGLE_DRIVE';
        break;
      case 'calendar':
      case 'google_calendar':
        serviceKey = 'GOOGLE_CALENDAR';
        break;
      default:
        serviceKey = serviceType.toUpperCase();
    }

    const mcpData = user.mcpdata[serviceKey];
    diagnosis.userDataStatus.serviceKey = serviceKey;
    diagnosis.userDataStatus.serviceDataExists = !!mcpData;

    if (!mcpData) {
      diagnosis.recommendations.push(`No authentication data found for ${serviceType}. Available services: ${diagnosis.userDataStatus.availableServices.join(', ')}`);
      return diagnosis;
    }

    // Check credentials
    try {
      const credentials = new GoogleCredentials(userId, serviceType, mcpData);
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
      const testResponse = await axios.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status
      });
      
      diagnosis.networkStatus = {
        googleApisReachable: testResponse.status < 500,
        responseStatus: testResponse.status,
        responseTime: testResponse.headers['x-response-time'] || 'unknown'
      };

      if (testResponse.status >= 500) {
        diagnosis.recommendations.push('Google APIs appear to be experiencing issues (5xx response)');
      }

    } catch (networkError) {
      diagnosis.networkStatus = {
        googleApisReachable: false,
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
  GOOGLE_SCOPES,
  SCOPE_GROUPS,
  GoogleAuthenticationError,
  GoogleCredentials,
  getCredentials,
  getAuthenticatedGoogleService,
  getAuthenticatedGmailService,
  getAuthenticatedDriveService,
  getAuthenticatedCalendarService,
  handleGoogleApiErrors,
  extractOfficeXmlText,
  diagnoseGoogleAuthIssues,
  validateGoogleOAuthConfig
};