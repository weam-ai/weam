const joi = require('joi');
const { brainSchemaKeys, companySchemaKeys, botSchemaKeys } = require('./commonref');

const wordCount = (value, helpers, maxWords) => {
    const words = value.trim().split(/\s+/);
    if (words.length > maxWords) {
        return helpers.message(`{#label} should not exceed ${maxWords} words`);
    }
    return value;
};

const createCustomGptKeys = joi.object({
    title: joi.string().required(),
    systemPrompt: joi.string().required(),
    type: joi.string().valid('agent', 'supervisor').required().default('agent'),
    description: joi.string().required(),
    Agents: joi.when('type', {
        is: 'supervisor',
        then: joi.alternatives().try(
            joi.string(),
            joi.array().items(joi.string())
        ).required(),
        otherwise: joi.forbidden()
    }),
    coverImg: joi.alternatives().try(
        joi.array(),
        joi.valid(null),
        joi.string().valid("null")
    ).optional(),
    doc: joi.array().optional(),
    // systemPrompt: joi.string().required().custom((value, helpers) => wordCount(value, helpers, 400)),
    responseModel: joi
        .object({
            name: joi.string().required(),
            company: joi.object(companySchemaKeys).required(),
            id: joi
                .string()
                .regex(/^[0-9a-fA-F]{24}$/)
                .required(),
            bot: joi.object(botSchemaKeys).required(),
            provider: joi.string().optional()
        })
        .required(),
    maxItr: joi.number().optional().allow(null),
    itrTimeDuration: joi.string().allow('').optional(),
    brain: joi.object(brainSchemaKeys).required(),
    imageEnable: joi.boolean().optional(),
    charimg: joi.string().optional(),
    // mcpTools: joi.array().items(joi.string()).optional()
}).unknown(true);

const updateCustomGptKeys = joi.object({
    title: joi.string().required(),
    type: joi.string().valid('agent', 'supervisor').optional(),
    description: joi.string().required(),
    Agents: joi.when('type', {
        is: 'supervisor',
        then: joi.alternatives().try(
            joi.string(),
            joi.array().items(joi.string())
        ).required(),
        otherwise: joi.forbidden()
    }),
    coverImg: joi.alternatives().try(
        joi.array(),
        joi.valid(null),
        joi.string().valid("null")
    ).optional(),
    doc: joi.array().optional(),
    systemPrompt: joi.string().required(),
    // systemPrompt: joi.string().required().custom((value, helpers) => wordCount(value, helpers, 400)),
    responseModel: joi
        .object({
            name: joi.string().required(),
            company: joi.object(companySchemaKeys).required(),
            id: joi
                .string()
                .regex(/^[0-9a-fA-F]{24}$/)
                .required(),
            bot: joi.object(botSchemaKeys).required(),
            provider: joi.string().optional()
        })
        .required(),
    maxItr: joi.number().optional().allow(null),
    itrTimeDuration: joi.string().allow('').optional(),
    brain: joi.object(brainSchemaKeys).required(),
    imageEnable: joi.boolean().optional(),
    removeDoc: joi.string().optional(),
    charimg: joi.string().optional(),
    // mcpTools: joi.array().items(joi.string()).optional()
});

const assignDefaultGpt = joi.object({
    title: joi.string().required(),
    systemPrompt: joi.string().required(),
    // systemPrompt: joi.string().required().custom((value, helpers) => wordCount(value, helpers, 400)),
    responseModel: joi
        .object({
            name: joi.string().optional(),
            company: joi.object(companySchemaKeys).required()            
        })
        .required(),
    maxItr: joi.number().optional().allow(null),
    itrTimeDuration: joi.string().allow('').optional(),
    selectedBrain: joi.array()
        .items(brainSchemaKeys)
        .min(1)
        .required()
        .messages({
            'array.base': 'The brain must be an array',
            'array.min': 'At least one brain is required',
            'any.required': 'Please select brain',
        }),
    imageEnable: joi.boolean().optional(),
    charimg: joi.string().optional()
}).unknown(true);

module.exports = {
    createCustomGptKeys,
    updateCustomGptKeys,
    assignDefaultGpt
};
