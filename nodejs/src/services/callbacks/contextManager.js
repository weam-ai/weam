const { createCostCalcCallbackHandler } = require('./costCalcHandler');
const { createGeminiCostCalcCallbackHandler } = require('./geminiCallbackHandler');
const { createAnthropicCostCalcCallbackHandler } = require('./anthropicCallbackHandler');
const threadService = require('../thread');
const { AI_MODAL_PROVIDER } = require('../../config/constants/aimodal');

/**
 * Create a custom callback context for managing cost tracking and callbacks
 * @param {string} modelName - Model name
 * @param {object} options - Configuration options
 * @returns {object} Callback context
 */
function createCustomCallbackContext(modelName, options = {}) {
    const state = {
        modelName,
        options,
        callbackHandler: null,
        threadRepo: null,
        isInitialized: false
    };

    /**
     * Initialize the callback context
     * @returns {Promise<CostCalcCallbackHandler>} The callback handler
     */
    async function initialize() {
        try {
            // Use thread service if threadId is provided
            if (state.options.threadId) {
                state.threadRepo = threadService;
            }

            // Create callback handler using provider-specific logic
            const provider = determineProvider(state.modelName);
            
            switch (provider) {
                case AI_MODAL_PROVIDER.GEMINI:
                    state.callbackHandler = createGeminiCostCalcCallbackHandler(state.modelName, {
                        ...state.options,
                        threadRepo: state.threadRepo
                    });
                    break;
                    
                case AI_MODAL_PROVIDER.ANTHROPIC:
                    state.callbackHandler = createAnthropicCostCalcCallbackHandler(state.modelName, {
                        ...state.options,
                        threadRepo: state.threadRepo
                    });
                    break;
                    
                case AI_MODAL_PROVIDER.OPEN_AI:
                default:
                    state.callbackHandler = createCostCalcCallbackHandler(state.modelName, {
                        ...state.options,
                        threadRepo: state.threadRepo
                    });
                    break;
            }

            state.isInitialized = true;
            
            return state.callbackHandler;
        } catch (error) {
            logger.error('Error initializing custom callback context:', error);
            throw error;
        }
    }

    /**
     * Get the callback handler
     * @returns {CostCalcCallbackHandler|null} The callback handler
     */
    function getCallbackHandler() {
        if (!state.isInitialized) {
            logger.warn('Callback context not initialized. Call initialize() first.');
            return null;
        }
        return state.callbackHandler;
    }

    /**
     * Get current usage statistics
     * @returns {object|null} Usage statistics
     */
    function getUsage() {
        if (!state.callbackHandler) {
            return null;
        }
        return state.callbackHandler.getUsage();
    }

    /**
     * Reset the callback handler's counters
     */
    function reset() {
         if (state.callbackHandler && state.callbackHandler.reset) {
             state.callbackHandler.reset();
         }
     }

    /**
     * Cleanup resources
     */
    async function cleanup() {
        try {
            if (state.callbackHandler) {
                // Log final usage before cleanup
                const finalUsage = getUsage();
            }
            
            state.callbackHandler = null;
            state.threadRepo = null;
            state.isInitialized = false;
        } catch (error) {
            logger.error('Error during callback context cleanup:', error);
        }
    }

    return {
        initialize,
        getCallbackHandler,
        getUsage,
        reset,
        cleanup,
        getState: () => ({ ...state })
    };
}

/**
 * Factory function to create and initialize a custom callback context
 * Similar to Python's get_custom_openai_callback function
 * 
 * @param {string} modelName - The model name
 * @param {object} options - Configuration options
 * @param {string} options.threadId - Thread ID for database updates
 * @param {string} options.collectionName - Collection name (default: 'messages')
 * @param {string} options.encryptedKey - Encrypted API key
 * @param {string} options.companyRedisId - Company Redis ID
 * @param {object} options.additionalData - Additional data for context
 * @returns {Promise<CustomCallbackContext>} Initialized callback context
 */
async function getCustomCallbackContext(modelName, options = {}) {
    try {
        const context = createCustomCallbackContext(modelName, options);
        await context.initialize();
        return context;
    } catch (error) {
        logger.error('Error creating custom callback context:', error);
        throw error;
    }
}

/**
 * Async function wrapper that provides callback context management
 * Similar to Python's async with context manager pattern
 * 
 * @param {string} modelName - The model name
 * @param {object} options - Configuration options
 * @param {Function} asyncFunction - The async function to execute with callback context
 * @returns {Promise<any>} Result of the async function
 */
async function withCustomCallback(modelName, options, asyncFunction) {
    let context = null;
    
    try {
        
        // Initialize callback context
        context = await getCustomCallbackContext(modelName, options);
        const callbackHandler = context.getCallbackHandler();
        
        if (!callbackHandler) {
            throw new Error('Failed to initialize callback handler');
        }
        
        // Execute the function with the callback handler
        const result = await asyncFunction(callbackHandler, context);
        
        const usage = context.getUsage();
        
        // Return both result and usage statistics
        return {
            result,
            usage,
            context
        };
        
    } catch (error) {
        logger.error('❌ [CONTEXT_MGR] Error in withCustomCallback:', error);
        throw error;
    } finally {
        // Cleanup context
        if (context) {
            await context.cleanup();
        }
    }
}

/**
 * Determine the AI provider from model name
 * @param {string} modelName - Model name
 * @returns {string} Provider name
 */
function determineProvider(modelName) {
    if (!modelName || typeof modelName !== 'string') {
        return AI_MODAL_PROVIDER.OPEN_AI; // Default fallback
    }
    
    const lowerModelName = modelName.toLowerCase();
    
    // Gemini models
    if (lowerModelName.includes('gemini') || lowerModelName.includes('google')) {
        return AI_MODAL_PROVIDER.GEMINI;
    }
    
    // Anthropic models
    if (lowerModelName.includes('claude') || lowerModelName.includes('anthropic')) {
        return AI_MODAL_PROVIDER.ANTHROPIC;
    }
    
    // OpenAI models
    if (lowerModelName.includes('gpt') || lowerModelName.includes('openai') || lowerModelName.includes('davinci')) {
        return AI_MODAL_PROVIDER.OPEN_AI;
    }
    
    // Default to OpenAI for unknown models
    return AI_MODAL_PROVIDER.OPEN_AI;
}

/**
 * Create a cost callback handler for the given model using the appropriate provider-specific handler
 * @param {string} modelName - The model name
 * @param {object} options - Configuration options
 * @returns {Promise<CostCalcCallbackHandler>} The callback handler
 */
async function createCostCallback(modelName, options = {}) {
    try {
        
        const provider = determineProvider(modelName);
        
        let callbackHandler;
        
        switch (provider) {
            case AI_MODAL_PROVIDER.GEMINI:
                callbackHandler = createGeminiCostCalcCallbackHandler(modelName, {
                    ...options,
                    threadRepo: options.threadId ? threadService : null
                });
                break;
                
            case AI_MODAL_PROVIDER.ANTHROPIC:
                callbackHandler = createAnthropicCostCalcCallbackHandler(modelName, {
                    ...options,
                    threadRepo: options.threadId ? threadService : null
                });
                break;
                
            case AI_MODAL_PROVIDER.OPEN_AI:
            default:
                // Use the existing context-based approach for OpenAI
                const context = createCustomCallbackContext(modelName, options);
                callbackHandler = await context.initialize();
                break;
        }
        return callbackHandler;
    } catch (error) {
        logger.error('❌ [CONTEXT_MGR] Error creating cost callback:', error);
        throw error;
    }
}

/**
 * Utility function to extract model name from LLM instance or configuration
 * @param {object} llmOrConfig - LLM instance or configuration object
 * @returns {string} Model name
 */
function extractModelName(llmOrConfig) {
    if (!llmOrConfig) return 'unknown';
    
    // Try different properties where model name might be stored
    if (llmOrConfig.modelName) return llmOrConfig.modelName;
    if (llmOrConfig.model) return llmOrConfig.model;
    if (llmOrConfig._modelName) return llmOrConfig._modelName;
    if (llmOrConfig.name) return llmOrConfig.name;
    
    // For LangChain LLM instances
    if (llmOrConfig.constructor && llmOrConfig.constructor.name) {
        return llmOrConfig.constructor.name;
    }
    
    return 'unknown';
}

module.exports = {
    createCustomCallbackContext,
    getCustomCallbackContext,
    withCustomCallback,
    createCostCallback,
    extractModelName,
    determineProvider
};