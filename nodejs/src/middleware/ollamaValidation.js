const Joi = require('joi');

const ollamaValidation = {
    chatRequest: Joi.object({
        messages: Joi.array().items(
            Joi.object({
                role: Joi.string().valid('user', 'assistant', 'system').required(),
                content: Joi.string().required()
            })
        ).required(),
        model: Joi.string().required(),
        baseUrl: Joi.string().uri().optional(),
        stream: Joi.boolean().default(false),
        options: Joi.object({
            temperature: Joi.number().min(0).max(2).optional(),
            top_p: Joi.number().min(0).max(1).optional(),
            top_k: Joi.number().min(1).max(100).optional(),
            repeat_penalty: Joi.number().min(0.1).max(2.0).optional(),
            seed: Joi.number().optional(),
            num_ctx: Joi.number().min(1).optional(),
            num_predict: Joi.number().min(-1).optional()
        }).optional()
    }),

    generateRequest: Joi.object({
        prompt: Joi.string().required(),
        model: Joi.string().required(),
        baseUrl: Joi.string().uri().optional(),
        stream: Joi.boolean().default(false),
        options: Joi.object({
            temperature: Joi.number().min(0).max(2).optional(),
            top_p: Joi.number().min(0).max(1).optional(),
            top_k: Joi.number().min(1).max(100).optional(),
            repeat_penalty: Joi.number().min(0.1).max(2.0).optional(),
            seed: Joi.number().optional(),
            num_ctx: Joi.number().min(1).optional(),
            num_predict: Joi.number().min(-1).optional()
        }).optional()
    }),

    pullRequest: Joi.object({
        model: Joi.string().required(),
        baseUrl: Joi.string().uri().optional()
    }),

    embeddingsRequest: Joi.object({
        input: Joi.string().required(),
        model: Joi.string().required(),
        baseUrl: Joi.string().uri().optional()
    }),

    copyRequest: Joi.object({
        source: Joi.string().required(),
        destination: Joi.string().required(),
        baseUrl: Joi.string().uri().optional()
    }),

    deleteRequest: Joi.object({
        model: Joi.string().required(),
        baseUrl: Joi.string().uri().optional()
    }),

    settingsUpdate: Joi.object({
        settings: Joi.object({
            enabled: Joi.boolean().optional(),
            allowedModels: Joi.array().items(Joi.string()).optional(),
            restrictedModels: Joi.array().items(Joi.string()).optional(),
            defaultModel: Joi.string().optional(),
            maxConcurrentRequests: Joi.number().min(1).max(20).optional(),
            defaultBaseUrl: Joi.string().uri().optional(),
            teamSettings: Joi.object({
                allowModelPulling: Joi.boolean().optional(),
                allowModelDeletion: Joi.boolean().optional()
            }).optional()
        }).required()
    }),

    modelName: Joi.string().pattern(/^[a-zA-Z0-9._:-]+$/).required(),

    timeRange: Joi.string().valid('1d', '7d', '30d', '90d').default('7d')
};

const validateOllamaRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                details: error.details
            });
        }
        next();
    };
};

const validateOllamaQuery = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                details: error.details
            });
        }
        next();
    };
};

const validateOllamaParams = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.params);
        if (error) {
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                details: error.details
            });
        }
        next();
    };
};

module.exports = {
    ollamaValidation,
    validateOllamaRequest,
    validateOllamaQuery,
    validateOllamaParams
};
