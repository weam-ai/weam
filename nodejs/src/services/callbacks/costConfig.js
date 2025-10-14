/**
 * Cost configuration for different AI models
 * Similar to Python's MODEL_COST_PER_1K_TOKENS
 */

const MODEL_COST_PER_1K_TOKENS = {
    // OpenAI Models
    'gpt-4o': {
        prompt_tokens: 0.0025,
        completion_tokens: 0.01
    },
    'gpt-4o-mini': {
        prompt_tokens: 0.00015,
        completion_tokens: 0.0006
    },
    'gpt-4-turbo': {
        prompt_tokens: 0.01,
        completion_tokens: 0.03
    },
    'gpt-4': {
        prompt_tokens: 0.03,
        completion_tokens: 0.06
    },
    'gpt-3.5-turbo': {
        prompt_tokens: 0.0015,
        completion_tokens: 0.002
    },
    'chatgpt-4o-latest': {
        prompt_tokens: 0.005,
        completion_tokens: 0.015
    },
    'gpt-5': {
        prompt_tokens: 0.05,
        completion_tokens: 0.15
    },
    'gpt-5-turbo': {
        prompt_tokens: 0.03,
        completion_tokens: 0.09
    },
    
    // Anthropic Models
    'claude-3-5-sonnet-20241022': {
        prompt_tokens: 0.003,
        completion_tokens: 0.015
    },
    'claude-3-5-haiku-20241022': {
        prompt_tokens: 0.001,
        completion_tokens: 0.005
    },
    'claude-3-opus-20240229': {
        prompt_tokens: 0.015,
        completion_tokens: 0.075
    },
    'claude-3-sonnet-20240229': {
        prompt_tokens: 0.003,
        completion_tokens: 0.015
    },
    'claude-3-haiku-20240307': {
        prompt_tokens: 0.00025,
        completion_tokens: 0.00125
    },
    
    // Google Gemini Models
    'gemini-1.5-pro': {
        prompt_tokens: 0.00125,
        completion_tokens: 0.005
    },
    'gemini-1.5-flash': {
        prompt_tokens: 0.000075,
        completion_tokens: 0.0003
    },
    'gemini-pro': {
        prompt_tokens: 0.0005,
        completion_tokens: 0.0015
    },
    
    // DeepSeek Models
    'deepseek-chat': {
        prompt_tokens: 0.00014,
        completion_tokens: 0.00028
    },
    'deepseek-coder': {
        prompt_tokens: 0.00014,
        completion_tokens: 0.00028
    },
    
    // Meta Llama Models
    'llama-3.1-405b-instruct': {
        prompt_tokens: 0.005,
        completion_tokens: 0.015
    },
    'llama-3.1-70b-instruct': {
        prompt_tokens: 0.0009,
        completion_tokens: 0.0009
    },
    'llama-3.1-8b-instruct': {
        prompt_tokens: 0.00018,
        completion_tokens: 0.00018
    },
    
    // Grok Models
    'grok-beta': {
        prompt_tokens: 0.005,
        completion_tokens: 0.015
    },
    
    // Qwen Models
    'qwen-2.5-72b-instruct': {
        prompt_tokens: 0.0009,
        completion_tokens: 0.0009
    },
    'qwen-2.5-7b-instruct': {
        prompt_tokens: 0.00018,
        completion_tokens: 0.00018
    },

    // Perplexity Models
    'sonar': {
        prompt_tokens: 0.001,
        completion_tokens: 0.001
    },
    'sonar-reasoning-pro': {
        prompt_tokens: 0.002,
        completion_tokens: 0.008
    },
};

/**
 * Get cost configuration for a specific model
 * @param {string} modelName - The name of the model
 * @returns {object|null} Cost configuration or null if not found
 */
function getModelCostConfig(modelName) {
    if (!modelName) return null;
    
    // Direct match
    if (MODEL_COST_PER_1K_TOKENS[modelName]) {
        return MODEL_COST_PER_1K_TOKENS[modelName];
    }
    
    // Fuzzy matching for model variants
    const normalizedModelName = modelName.toLowerCase();
    
    for (const [configModelName, config] of Object.entries(MODEL_COST_PER_1K_TOKENS)) {
        if (normalizedModelName.includes(configModelName.toLowerCase()) || 
            configModelName.toLowerCase().includes(normalizedModelName)) {
            return config;
        }
    }
    
    return {
        prompt_tokens: 0.001,
        completion_tokens: 0.002
    };
}

/**
 * Calculate cost based on token usage
 * @param {number} promptTokens - Number of prompt tokens
 * @param {number} completionTokens - Number of completion tokens
 * @param {string} modelName - The name of the model
 * @returns {number} Total cost in USD
 */
function calculateCost(promptTokens, completionTokens, modelName) {
    const costConfig = getModelCostConfig(modelName);
    if (!costConfig) return 0;
    
    const promptCost = (promptTokens / 1000) * costConfig.prompt_tokens;
    const completionCost = (completionTokens / 1000) * costConfig.completion_tokens;
    
    return promptCost + completionCost;
}

module.exports = {
    MODEL_COST_PER_1K_TOKENS,
    getModelCostConfig,
    calculateCost
};