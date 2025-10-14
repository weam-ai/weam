const { BaseCallbackHandler } = require('@langchain/core/callbacks/base');
const { calculateCost } = require('./costConfig');
const logger = require('../../utils/logger');

/**
 * Create a cost calculator with closure-based state management
 * Similar to Python's CostCalculator
 * @returns {object} Cost calculator functions
 */
function createCostCalculator() {
    let state = {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalCost: 0,
        modelName: null,
        callCount: 0,
        startTime: Date.now()
    };

    /**
     * Reset all counters
     */
    function reset() {
        state.totalTokens = 0;
        state.promptTokens = 0;
        state.completionTokens = 0;
        state.totalCost = 0;
        state.modelName = null;
        state.callCount = 0;
        state.startTime = Date.now();
    }

    /**
     * Add token usage data
     * @param {number} promptTokens - Number of prompt tokens
     * @param {number} completionTokens - Number of completion tokens
     * @param {string} modelName - The model name
     */
    function addTokenUsage(promptTokens = 0, completionTokens = 0, modelName = null) {
        const prevTotal = state.totalTokens;
        const prevCost = state.totalCost;
        
        state.promptTokens += promptTokens;
        state.completionTokens += completionTokens;
        state.totalTokens = state.promptTokens + state.completionTokens;
        
        if (modelName) {
            state.modelName = modelName;
        }
        
        // Calculate cost
        const cost = calculateCost(promptTokens, completionTokens, state.modelName);
        state.totalCost += cost;
    }

    /**
     * Get current token usage summary
     * @returns {object} Token usage summary
     */
    function getUsageSummary() {
        return {
            totalTokens: state.totalTokens,
            promptTokens: state.promptTokens,
            completionTokens: state.completionTokens,
            totalCost: state.totalCost,
            modelName: state.modelName,
            callCount: state.callCount
        };
    }

    return {
        reset,
        addTokenUsage,
        getUsageSummary,
        getState: () => ({ ...state })
    };
}

/**
 * Create a Cost Calculation Callback Handler for LangChain.js
 * Similar to Python's CostCalcCallbackHandler
 * @param {string} modelName - The model name
 * @param {object} options - Configuration options
 * @returns {object} Callback handler instance
 */
function createCostCalcCallbackHandler(modelName, options = {}) {
    const state = {
        name: 'CostCalcCallbackHandler',
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
     * Handle LLM start event
     * @param {object} llm - The LLM instance
     * @param {Array} prompts - Array of prompts
     * @param {string} runId - Run ID
     * @param {string} parentRunId - Parent run ID
     * @param {object} extraParams - Extra parameters
     */
    async function handleLLMStart(llm, prompts, runId, parentRunId, extraParams) {
        try {
            
            // Calculate prompt tokens (rough estimation)
            const promptText = Array.isArray(prompts) ? prompts.join(' ') : String(prompts);
            const estimatedPromptTokens = estimateTokens(promptText);
            
            // Store for later use
            state.currentRunId = runId;
            state.startTime = Date.now();
            state.estimatedPromptTokens = estimatedPromptTokens;
        } catch (error) {
            logger.error('Error in handleLLMStart:', error);
        }
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
            
            // Calculate prompt tokens from messages
            const messageText = extractTextFromMessages(messages);
            const estimatedPromptTokens = estimateTokens(messageText);
            
            state.currentRunId = runId;
            state.startTime = Date.now();
            state.estimatedPromptTokens = estimatedPromptTokens;
        } catch (error) {
            logger.error('Error in handleChatModelStart:', error);
        }
    }

    /**
     * Handle LLM end event
     * @param {object} output - LLM output
     * @param {string} runId - Run ID
     * @param {string} parentRunId - Parent run ID
     */
    async function handleLLMEnd(output, runId, parentRunId) {
        try {
            let promptTokens = 0;
            let completionTokens = 0;
            let tokenExtractionMethod = 'none';
            
            // Try multiple ways to extract token usage from output
            // First check for detailed token usage in generations (more accurate)
            if (output && output.generations && Array.isArray(output.generations) && output.generations.length > 0) {
                const firstGeneration = output.generations[0];
                
                // Handle case where generations[0] is an array (Gemini format)
                if (Array.isArray(firstGeneration) && firstGeneration.length > 0) {
                    const generation = firstGeneration[0];
                    
                    if (generation.message && generation.message.kwargs) {
                        // Check for usage metadata in message.kwargs
                    }
                    if (generation.generationInfo && generation.generationInfo.kwargs) {
                        // Check for usage metadata in generationInfo.kwargs
                    }
                    
                    // Check for Google/Gemini's usage_metadata structure in message.kwargs (PRIMARY path for Gemini based on terminal output)
                    if (generation.message && generation.message.kwargs && generation.message.kwargs.usage_metadata) {
                        const usageMetadata = generation.message.kwargs.usage_metadata;
                        promptTokens = usageMetadata.input_tokens || 0;
                        completionTokens = usageMetadata.output_tokens || 0;
                        tokenExtractionMethod = 'generations[0][0].message.kwargs.usage_metadata';
                        // Token usage found in message.kwargs.usage_metadata
                    }
                    // Check for Gemini's usage_metadata structure in generationInfo.kwargs (alternative path)
                    else if (generation.generationInfo && generation.generationInfo.kwargs && generation.generationInfo.kwargs.usage_metadata) {
                        const usageMetadata = generation.generationInfo.kwargs.usage_metadata;
                        promptTokens = usageMetadata.input_tokens || 0;
                        completionTokens = usageMetadata.output_tokens || 0;
                        tokenExtractionMethod = 'generations[0][0].generationInfo.kwargs.usage_metadata';
                        // Token usage found in generationInfo.kwargs.usage_metadata
                    }
                    // Check for Anthropic's usage_metadata structure in nested array
                    else if (generation.generationInfo && generation.generationInfo.usage_metadata) {
                        const usageMetadata = generation.generationInfo.usage_metadata;
                        promptTokens = usageMetadata.input_tokens || 0;
                        completionTokens = usageMetadata.output_tokens || 0;
                        tokenExtractionMethod = 'generations[0][0].generationInfo.usage_metadata';
                        // Token usage found in generationInfo.usage_metadata
                    }
                    else {
                        // No usage_metadata found in array format generation
                    }
                }
                // Handle case where generations[0] is a direct object but contains array of generations (alternative Gemini format)
                else if (firstGeneration && Array.isArray(firstGeneration) === false && firstGeneration.message && firstGeneration.message.kwargs && firstGeneration.message.kwargs.usage_metadata) {
                    const usageMetadata = firstGeneration.message.kwargs.usage_metadata;
                    promptTokens = usageMetadata.input_tokens || 0;
                    completionTokens = usageMetadata.output_tokens || 0;
                    // Token usage found in generations[0].message.kwargs.usage_metadata
                }
                // Handle case where generations[0] is a direct object (Anthropic/Gemini format)
                else {
                    const generation = firstGeneration;
                    
                    // Check for Google/Gemini's usage_metadata structure in message.kwargs (PRIMARY path for Gemini)
                    if (generation.message && generation.message.kwargs && generation.message.kwargs.usage_metadata) {
                        const usageMetadata = generation.message.kwargs.usage_metadata;
                        promptTokens = usageMetadata.input_tokens || 0;
                        completionTokens = usageMetadata.output_tokens || 0;
                        tokenExtractionMethod = 'generations[0].message.kwargs.usage_metadata';
                    }
                    // Check for Gemini's usage_metadata structure in generationInfo.kwargs (alternative path)
                    else if (generation.generationInfo && generation.generationInfo.kwargs && generation.generationInfo.kwargs.usage_metadata) {
                        const usageMetadata = generation.generationInfo.kwargs.usage_metadata;
                        promptTokens = usageMetadata.input_tokens || 0;
                        completionTokens = usageMetadata.output_tokens || 0;
                        tokenExtractionMethod = 'generations[0].generationInfo.kwargs.usage_metadata';
                    }
                    // Check for Anthropic's usage_metadata structure
                    else if (generation.generationInfo && generation.generationInfo.usage_metadata) {
                        const usageMetadata = generation.generationInfo.usage_metadata;
                        promptTokens = usageMetadata.input_tokens || 0;
                        completionTokens = usageMetadata.output_tokens || 0;
                        tokenExtractionMethod = 'generations[0].generationInfo.usage_metadata';
                    }
                }
                
                // If no tokens found, log the structure for debugging
                if (promptTokens === 0 && completionTokens === 0) {
                    // No usage_metadata found in generation info, checking other sources
                }
            }
            
            // If we didn't find tokens in generations or found 0 prompt tokens, check other sources
            if (promptTokens === 0 && completionTokens === 0) {
                if (output && output.llmOutput && output.llmOutput.tokenUsage) {
                    const tokenUsage = output.llmOutput.tokenUsage;
                    promptTokens = tokenUsage.promptTokens || tokenUsage.prompt_tokens || 0;
                    completionTokens = tokenUsage.completionTokens || tokenUsage.completion_tokens || 0;
                    // Found token usage in llmOutput.tokenUsage
                } else if (output && output.tokenUsage) {
                    const tokenUsage = output.tokenUsage;
                    promptTokens = tokenUsage.promptTokens || tokenUsage.prompt_tokens || 0;
                    completionTokens = tokenUsage.completionTokens || tokenUsage.completion_tokens || 0;
                    // Found token usage in output.tokenUsage
                } else if (output && output.usage) {
                    const usage = output.usage;
                    promptTokens = usage.promptTokens || usage.prompt_tokens || 0;
                    completionTokens = usage.completionTokens || usage.completion_tokens || 0;
                    // Found token usage in output.usage
                }
            }
            
            // Final fallback if no tokens found
            if (promptTokens === 0 && completionTokens === 0) {
                // Fallback: estimate tokens from output text
                const outputText = extractTextFromOutput(output);
                completionTokens = estimateTokens(outputText);
                
                // Use stored prompt tokens from start if available
                if (state.estimatedPromptTokens) {
                    promptTokens = state.estimatedPromptTokens;
                }
                
                // Token usage not available in output, using estimation
            }
            
            // Add to cost calculator
            costCalculator.addTokenUsage(promptTokens, completionTokens, state.modelName);
            
            const endTime = Date.now();
            const duration = endTime - (state.startTime || endTime);
            
            // Token extraction summary
            
            const totalUsage = costCalculator.getUsageSummary();
            
            // Update database if thread repository is available
            if (state.threadRepo && state.threadId) {
                await updateTokenUsageInDB();
            }
            
        } catch (error) {
            console.error('Error in handleLLMEnd:', error);
        }
    }

    /**
     * Handle LLM error event
     * @param {Error} error - Error object
     * @param {string} runId - Run ID
     * @param {string} parentRunId - Parent run ID
     */
    async function handleLLMError(error, runId, parentRunId) {
        try {
            console.error(`❌ [COST_TRACKING] LLM Error - Model: ${state.modelName}, Run ID: ${runId}`, error);
            
            // Still try to estimate tokens for the failed request if we have prompt data
            if (state.estimatedPromptTokens) {
                costCalculator.addTokenUsage(state.estimatedPromptTokens, 0, state.modelName);
            }
            
            // Update database if thread repository is available
            if (state.threadRepo && state.threadId) {
                await updateTokenUsageInDB();
            }
            
        } catch (dbError) {
            console.error('Error updating database after LLM error:', dbError);
        }
    }

    /**
     * Extract text from messages array
     * @param {Array} messages - Array of messages
     * @returns {string} Combined text
     */
    function extractTextFromMessages(messages) {
        if (!Array.isArray(messages)) return '';
        
        return messages.map(msg => {
            if (typeof msg === 'string') return msg;
            if (msg.content) return msg.content;
            if (msg.text) return msg.text;
            return JSON.stringify(msg);
        }).join(' ');
    }

    /**
     * Extract text from LLM output
     * @param {object} output - LLM output
     * @returns {string} Output text
     */
    function extractTextFromOutput(output) {
        if (!output) return '';
        
        if (typeof output === 'string') return output;
        if (output.text) return output.text;
        if (output.content) return output.content;
        if (output.generations && Array.isArray(output.generations)) {
            return output.generations.map(gen => gen.text || gen.content || '').join(' ');
        }
        
        return JSON.stringify(output);
    }

    /**
     * Estimate token count from text (rough approximation)
     * @param {string} text - Input text
     * @returns {number} Estimated token count
     */
    function estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        
        // Rough estimation: 1 token ≈ 4 characters for English text
        // This is a simplified approach, real tokenization would be more accurate
        return Math.ceil(text.length / 4);
    }

    /**
     * Update token usage in database
     */
    async function updateTokenUsageInDB() {
        try {
            if (!state.threadRepo) {
                console.warn('⚠️ [COST_TRACKING] Thread repository not available for token usage update');
                return;
            }

            const usage = costCalculator.getUsageSummary();
            const tokenData = {
                totalUsed: usage.totalTokens,
                promptT: usage.promptTokens,
                completion: usage.completionTokens,
                totalCost: usage.totalCost
            };

            await state.threadRepo.updateToolsTokenData(
                state.threadId,
                tokenData,
                null, // tokens_old - will be fetched by the repository
                state.additionalData
            );
        } catch (error) {
            console.error('❌ [COST_TRACKING] Error updating token usage in database:', error);
        }
    }

    return {
        handleLLMStart,
        handleChatModelStart,
        handleLLMEnd,
        handleLLMError,
        extractTextFromMessages,
        extractTextFromOutput,
        estimateTokens,
        updateTokenUsageInDB,
        getUsage: () => costCalculator.getUsageSummary(),
        reset: () => costCalculator.reset(),
        getState: () => ({ ...state })
    };
}

module.exports = {
    createCostCalculator,
    createCostCalcCallbackHandler
};