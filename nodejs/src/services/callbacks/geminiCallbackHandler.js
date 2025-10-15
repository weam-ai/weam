const { createCostCalculator } = require('./costCalcHandler');
const logger = require('../../utils/logger');

/**
 * Create a specialized Cost Calculation Callback Handler for Gemini models
 * Handles Gemini's specific response format with input_tokens/output_tokens
 * @param {string} modelName - The model name
 * @param {object} options - Configuration options
 * @returns {object} Callback handler instance
 */
function createGeminiCostCalcCallbackHandler(modelName, options = {}) {
    const state = {
        name: 'GeminiCostCalcCallbackHandler',
        modelName,
        threadId: options.threadId,
        collectionName: options.collectionName,
        encryptedKey: options.encryptedKey,
        companyRedisId: options.companyRedisId,
        additionalData: options.additionalData || {},
        threadRepo: options.threadRepo,
        currentRunId: null,
        startTime: null,
        estimatedPromptTokens: 0
    };
    
    // Initialize cost calculator
    const costCalculator = createCostCalculator();

    /**
     * Extract token usage from Gemini response format
     * @param {object} output - LLM output
     * @returns {object} Token usage data
     */
    function extractGeminiTokenUsage(output) {
        let promptTokens = 0;
        let completionTokens = 0;
        let tokenExtractionMethod = 'none';
        
        // Check for Gemini's specific response format
        if (output && output.generations && Array.isArray(output.generations) && output.generations.length > 0) {
            const firstGeneration = output.generations[0];
            
            // Handle case where generations[0] is an array (primary Gemini format)
            if (Array.isArray(firstGeneration) && firstGeneration.length > 0) {
                const generation = firstGeneration[0];
                
                // Primary path: Check for usage_metadata in message.kwargs
                if (generation.message && generation.message.kwargs && generation.message.kwargs.usage_metadata) {
                    const usageMetadata = generation.message.kwargs.usage_metadata;
                    promptTokens = usageMetadata.input_tokens || 0;
                    completionTokens = usageMetadata.output_tokens || 0;
                    tokenExtractionMethod = 'generations[0][0].message.kwargs.usage_metadata';
                }
                // Alternative path: Check for usage_metadata in generationInfo.kwargs
                else if (generation.generationInfo && generation.generationInfo.kwargs && generation.generationInfo.kwargs.usage_metadata) {
                    const usageMetadata = generation.generationInfo.kwargs.usage_metadata;
                    promptTokens = usageMetadata.input_tokens || 0;
                    completionTokens = usageMetadata.output_tokens || 0;
                    tokenExtractionMethod = 'generations[0][0].generationInfo.kwargs.usage_metadata';
                }
                // New path: Check directly in generationInfo
                else if (generation.generationInfo && generation.generationInfo.usage_metadata) {
                    const usageMetadata = generation.generationInfo.usage_metadata;
                    promptTokens = usageMetadata.input_tokens || 0;
                    completionTokens = usageMetadata.output_tokens || 0;
                    tokenExtractionMethod = 'generations[0][0].generationInfo.usage_metadata';
                }
            }
            // Handle case where generations[0] is a direct object
            else if (firstGeneration && !Array.isArray(firstGeneration)) {
                const generation = firstGeneration;
                
                // Check for usage_metadata in message.kwargs
                if (generation.message && generation.message.kwargs && generation.message.kwargs.usage_metadata) {
                    const usageMetadata = generation.message.kwargs.usage_metadata;
                    promptTokens = usageMetadata.input_tokens || 0;
                    completionTokens = usageMetadata.output_tokens || 0;
                    tokenExtractionMethod = 'generations[0].message.kwargs.usage_metadata';
                }
                // Check directly in generationInfo
                else if (generation.generationInfo && generation.generationInfo.usage_metadata) {
                    const usageMetadata = generation.generationInfo.usage_metadata;
                    promptTokens = usageMetadata.input_tokens || 0;
                    completionTokens = usageMetadata.output_tokens || 0;
                    tokenExtractionMethod = 'generations[0].generationInfo.usage_metadata';
                }
            }
        }
        
        // Fallback: Check llmOutput for token usage
        if (promptTokens === 0 && completionTokens === 0) {
            if (output && output.llmOutput && output.llmOutput.tokenUsage) {
                const tokenUsage = output.llmOutput.tokenUsage;
                promptTokens = tokenUsage.promptTokens || tokenUsage.input_tokens || state.estimatedPromptTokens || 0;
                completionTokens = tokenUsage.completionTokens || tokenUsage.output_tokens || 0;
                tokenExtractionMethod = 'llmOutput.tokenUsage';
            }
        }
        
        // Final fallback: Use estimated prompt tokens if we still have 0
        if (promptTokens === 0 && state.estimatedPromptTokens > 0) {
            promptTokens = state.estimatedPromptTokens;
            tokenExtractionMethod += ' + estimatedPromptTokens';
        }
        
        return {
            promptTokens,
            completionTokens,
            tokenExtractionMethod
        };
    }

    /**
     * Handle LLM end event for Gemini
     * @param {object} output - LLM output
     * @param {string} runId - Run ID
     * @param {string} parentRunId - Parent run ID
     */
    async function handleLLMEnd(output, runId, parentRunId) {
        try {
            
            const { promptTokens, completionTokens, tokenExtractionMethod } = extractGeminiTokenUsage(output);
            
            if (promptTokens > 0 || completionTokens > 0) {
                // Add token usage to cost calculator
                costCalculator.addTokenUsage(promptTokens, completionTokens, state.modelName);
                
                // Save to thread if threadRepo is available
                if (state.threadRepo && state.threadId) {
                    await saveTokenUsageToThread(promptTokens, completionTokens);
                }
            }
        } catch (error) {
            logger.error('❌ [GEMINI_COST] Error in handleLLMEnd:', error);
        }
    }

    /**
     * Save token usage to thread
     * @param {number} promptTokens - Number of prompt tokens
     * @param {number} completionTokens - Number of completion tokens
     */
    async function saveTokenUsageToThread(promptTokens, completionTokens) {
        try {
            if (!state.threadRepo || !state.threadId) {
                return;
            }

            const costSummary = costCalculator.getUsageSummary();
            const threadData = {
                promptT: promptTokens,
                completion: completionTokens,
                totalUsed: promptTokens + completionTokens,
                totalCost: costSummary.totalCost,
                modelName: state.modelName,
                provider: 'gemini',
                timestamp: new Date().toISOString(),
                ...state.additionalData
            };

            await state.threadRepo.updateTokenUsage(state.threadId, threadData);
        } catch (error) {
            logger.error('❌ [GEMINI_COST] Error saving to thread:', error);
        }
    }

    /**
     * Estimate tokens from text (rough estimation)
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    function estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    /**
     * Extract text from messages array
     * @param {Array} messages - Array of messages
     * @returns {string} Concatenated text
     */
    function extractTextFromMessages(messages) {
        if (!Array.isArray(messages)) return '';
        return messages.map(msg => {
            if (typeof msg === 'string') return msg;
            if (msg && msg.content) return msg.content;
            if (msg && msg.text) return msg.text;
            return JSON.stringify(msg);
        }).join(' ');
    }

    /**
     * Handle Chat Model start event
     * @param {object} llm - The LLM instance
     * @param {Array} messages - Array of messages
     * @param {string} runId - Run ID
     * @param {string} parentRunId - Parent run ID
     * @param {object} extraParams - Extra parameters
     */
    async function handleChatModelStart(llm, messages, runId, parentRunId, extraParams) {
        try {
            
            const messageText = extractTextFromMessages(messages);
            const estimatedPromptTokens = estimateTokens(messageText);
            
            state.currentRunId = runId;
            state.startTime = Date.now();
            state.estimatedPromptTokens = estimatedPromptTokens;
        } catch (error) {
            logger.error('❌ [GEMINI_COST] Error in handleChatModelStart:', error);
        }
    }

    // Return the callback handler interface
    return {
        name: state.name,
        handleLLMStart: async () => {}, // Not used for Gemini
        handleChatModelStart,
        handleLLMEnd,
        handleChatModelEnd: handleLLMEnd, // Use same handler
        handleLLMError: async (error) => {
            console.error(`❌ [GEMINI_COST] LLM Error:`, error);
        },
        getCostSummary: () => costCalculator.getUsageSummary(),
        reset: () => costCalculator.reset()
    };
}

module.exports = {
    createGeminiCostCalcCallbackHandler
};