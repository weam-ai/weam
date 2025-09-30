/**
 * Shared HTTP Client Utilities for MCP Tools
 * Centralized timeout, retry, and error handling configuration
 * Ensures consistent behavior across all MCP tool integrations
 */

const axios = require('axios');
const logger = require('./logger');

// Unified timeout and retry configuration for all MCP tools
const MCP_HTTP_CONFIG = {
    // Base timeout for all requests (increased for reliability)
    timeout: 90000, // 90 seconds - sufficient for slow API responses

    // Retry configuration
    maxRetries: 3,
    baseRetryDelay: 20000, // 2 seconds
    maxRetryDelay: 30000, // 30 seconds max

    // Connection pooling for better performance
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 100,
    maxFreeSockets: 10,

    // Common headers
    defaultHeaders: {
        'User-Agent': 'Weam-MCP-Client/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
};

// Create a shared HTTP agent with optimal settings
const httpAgent = new (require('http').Agent)({
    keepAlive: MCP_HTTP_CONFIG.keepAlive,
    keepAliveMsecs: MCP_HTTP_CONFIG.keepAliveMsecs,
    maxSockets: MCP_HTTP_CONFIG.maxSockets,
    maxFreeSockets: MCP_HTTP_CONFIG.maxFreeSockets,
    timeout: MCP_HTTP_CONFIG.timeout
});

const httpsAgent = new (require('https').Agent)({
    keepAlive: MCP_HTTP_CONFIG.keepAlive,
    keepAliveMsecs: MCP_HTTP_CONFIG.keepAliveMsecs,
    maxSockets: MCP_HTTP_CONFIG.maxSockets,
    maxFreeSockets: MCP_HTTP_CONFIG.maxFreeSockets,
    timeout: MCP_HTTP_CONFIG.timeout,
    rejectUnauthorized: true
});

/**
 * Enhanced error class for HTTP requests
 */
class HttpRequestError extends Error {
    constructor(message, errorType = 'UNKNOWN', originalError = null, retryable = false) {
        super(message);
        this.name = 'HttpRequestError';
        this.errorType = errorType;
        this.originalError = originalError;
        this.retryable = retryable;
    }
}

/**
 * Determine if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
    // Network connectivity issues
    if (error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'SOCKET_TIMEOUT') {
        return true;
    }

    // Timeout messages
    if (error.message && (
        error.message.includes('timeout') ||
        error.message.includes('TIMEOUT') ||
        error.message.includes('Request timeout')
    )) {
        return true;
    }

    // HTTP status codes that indicate temporary issues
    if (error.response) {
        const status = error.response.status;
        return status >= 500 || // Server errors
               status === 429 || // Rate limiting
               status === 502 || // Bad Gateway
               status === 503 || // Service Unavailable
               status === 504;   // Gateway Timeout
    }

    return false;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 * @param {number} retryCount - Current retry attempt (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(retryCount, baseDelay = MCP_HTTP_CONFIG.baseRetryDelay, maxDelay = MCP_HTTP_CONFIG.maxRetryDelay) {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Enhanced HTTP request with unified timeout, retry, and error handling
 * @param {Object} config - Axios request configuration
 * @param {Object} options - Additional options
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {boolean} options.isReadOnly - Whether the operation is read-only (affects retry logic)
 * @param {string} options.serviceName - Service name for logging
 * @param {string} options.userId - User ID for logging
 * @returns {Promise<Object>} Response data
 */
async function makeHttpRequest(config, options = {}) {
    const {
        maxRetries = MCP_HTTP_CONFIG.maxRetries,
        isReadOnly = true,
        serviceName = 'unknown',
        userId = 'unknown'
    } = options;

    // Apply default configuration
    const requestConfig = {
        ...config,
        timeout: config.timeout || MCP_HTTP_CONFIG.timeout,
        httpAgent: httpAgent,
        httpsAgent: httpsAgent,
        headers: {
            ...MCP_HTTP_CONFIG.defaultHeaders,
            ...config.headers
        }
    };

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`[makeHttpRequest] ${serviceName} request attempt ${attempt + 1}/${maxRetries + 1} for user ${userId}`, {
                url: requestConfig.url,
                method: requestConfig.method || 'GET',
                timeout: requestConfig.timeout
            });

            const response = await axios(requestConfig);

            if (attempt > 0) {
                logger.info(`[makeHttpRequest] ${serviceName} request succeeded on retry ${attempt} for user ${userId}`);
            }

            return response.data;

        } catch (error) {
            lastError = error;

            logger.warn(`[makeHttpRequest] ${serviceName} request attempt ${attempt + 1} failed for user ${userId}:`, {
                error: error.message,
                code: error.code,
                status: error.response?.status,
                isRetryable: isRetryableError(error)
            });

            // Don't retry on the last attempt or if error is not retryable
            if (attempt >= maxRetries || !isRetryableError(error)) {
                break;
            }

            // Only retry read-only operations by default
            if (!isReadOnly && attempt > 0) {
                logger.warn(`[makeHttpRequest] Skipping retry for non-read-only ${serviceName} operation`);
                break;
            }

            // Calculate and apply retry delay
            const delay = calculateRetryDelay(attempt);
            logger.info(`[makeHttpRequest] Retrying ${serviceName} request in ${delay}ms for user ${userId}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // Handle final error
    logger.error(`[makeHttpRequest] ${serviceName} request failed after ${maxRetries + 1} attempts for user ${userId}:`, {
        error: lastError.message,
        code: lastError.code,
        status: lastError.response?.status
    });

    // Create enhanced error with context
    let errorMessage = `${serviceName} request failed`;
    let errorType = 'REQUEST_FAILED';
    let retryable = false;

    if (lastError.code === 'ETIMEDOUT' || lastError.message?.includes('timeout')) {
        errorMessage = `${serviceName} service is currently slow to respond. This may be due to high server load or network issues.`;
        errorType = 'TIMEOUT';
        retryable = true;
    } else if (lastError.code === 'ECONNRESET' || lastError.code === 'ENOTFOUND' || lastError.code === 'ECONNABORTED') {
        errorMessage = `Cannot connect to ${serviceName} service. Please check your internet connection.`;
        errorType = 'CONNECTION_ERROR';
        retryable = true;
    } else if (lastError.response) {
        const status = lastError.response.status;
        if (status === 401 || status === 403) {
            errorMessage = `Authentication required for ${serviceName}. Please re-authenticate.`;
            errorType = 'AUTH_ERROR';
        } else if (status === 429) {
            errorMessage = `${serviceName} API rate limit exceeded. Please wait before trying again.`;
            errorType = 'RATE_LIMIT';
            retryable = true;
        } else if (status >= 500) {
            errorMessage = `${serviceName} service is temporarily unavailable. Please try again in a few minutes.`;
            errorType = 'SERVER_ERROR';
            retryable = true;
        } else {
            errorMessage = `${serviceName} API error: ${lastError.response.data?.message || lastError.message}`;
            errorType = 'API_ERROR';
        }
    }

    throw new HttpRequestError(errorMessage, errorType, lastError, retryable);
}

/**
 * Create a service-specific HTTP client with pre-configured settings
 * @param {string} serviceName - Name of the service (for logging)
 * @param {Object} defaultConfig - Default configuration for this service
 * @returns {Object} Service-specific HTTP client
 */
function createServiceClient(serviceName, defaultConfig = {}) {
    return {
        /**
         * Make a GET request
         */
        get: async (url, config = {}, options = {}) => {
            return makeHttpRequest({
                method: 'GET',
                url,
                ...defaultConfig,
                ...config
            }, {
                serviceName,
                isReadOnly: true,
                ...options
            });
        },

        /**
         * Make a POST request
         */
        post: async (url, data = null, config = {}, options = {}) => {
            return makeHttpRequest({
                method: 'POST',
                url,
                data,
                ...defaultConfig,
                ...config
            }, {
                serviceName,
                isReadOnly: false,
                ...options
            });
        },

        /**
         * Make a PUT request
         */
        put: async (url, data = null, config = {}, options = {}) => {
            return makeHttpRequest({
                method: 'PUT',
                url,
                data,
                ...defaultConfig,
                ...config
            }, {
                serviceName,
                isReadOnly: false,
                ...options
            });
        },

        /**
         * Make a PATCH request
         */
        patch: async (url, data = null, config = {}, options = {}) => {
            return makeHttpRequest({
                method: 'PATCH',
                url,
                data,
                ...defaultConfig,
                ...config
            }, {
                serviceName,
                isReadOnly: false,
                ...options
            });
        },

        /**
         * Make a DELETE request
         */
        delete: async (url, config = {}, options = {}) => {
            return makeHttpRequest({
                method: 'DELETE',
                url,
                ...defaultConfig,
                ...config
            }, {
                serviceName,
                isReadOnly: false,
                ...options
            });
        },

        /**
         * Make a request with custom method
         */
        request: async (config, options = {}) => {
            return makeHttpRequest({
                ...defaultConfig,
                ...config
            }, {
                serviceName,
                ...options
            });
        }
    };
}

module.exports = {
    MCP_HTTP_CONFIG,
    HttpRequestError,
    isRetryableError,
    calculateRetryDelay,
    makeHttpRequest,
    createServiceClient,
    httpAgent,
    httpsAgent
};