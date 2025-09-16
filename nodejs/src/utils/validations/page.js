const joi = require('joi');
const { userSchemaKeys, botSchemaKeys, brainSchemaKeys } = require('./commonref');

const createPageKeys = joi.object({
    originalMessageId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    title: joi.string().required(),
    content: joi.string().required(),
    chatId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    user: joi.object().unknown(true).required(),
    brain: joi.object().unknown(true).optional(),
    model: joi.object().unknown(true).required(),
    tokens: joi.object({
        totalUsed: joi.number().optional(),
        promptT: joi.number().optional(),
        completion: joi.number().optional(),
        totalCost: joi.string().optional(),
        imageT: joi.number().optional()
    }).optional(),
    responseModel: joi.string().optional(),
    responseAPI: joi.string().optional(),
    companyId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
}).unknown(true);

const updatePageKeys = joi.object({
    title: joi.string().optional(),
    content: joi.string().optional(),
}).min(1);

const getAllPagesKeys = joi.object({
    query: joi.object().optional(),
    options: joi.object().optional()
}).unknown(true);

module.exports = {
    createPageKeys,
    updatePageKeys,
    getAllPagesKeys
};


