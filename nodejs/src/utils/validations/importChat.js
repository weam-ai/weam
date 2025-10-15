const joi = require('joi');
const { brainSchemaKeys, companySchemaKeys } = require('./commonref');

/**
 * Validation schema for import chat upload
 */
const uploadImportChatSchema = joi.object({
    user_id: joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    company_id: joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid company ID format',
            'any.required': 'Company ID is required'
        }),
    brain_id: joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid brain ID format',
            'any.required': 'Brain ID is required'
        }),
    brain_title: joi.string()
        .required()
        .messages({
            'any.required': 'Brain title is required'
        }),
    brain_slug: joi.string()
        .required()
        .messages({
            'any.required': 'Brain slug is required'
        }),
    company_name: joi.string()
        .required()
        .messages({
            'any.required': 'Company name is required'
        }),
    code: joi.string()
        .valid('OPENAI', 'ANTHROPIC', 'OPEN_AI')
        .required()
        .messages({
            'any.only': 'Code must be one of OPENAI, ANTHROPIC, or OPEN_AI',
            'any.required': 'Code is required'
        })
}).unknown(true);

/**
 * Validation schema for getting import chat status
 */
const getImportChatStatusSchema = joi.object({
    importId: joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid import ID format',
            'any.required': 'Import ID is required'
        })
});

/**
 * Validation schema for getting all import chats
 */
const getImportChatsSchema = joi.object({
    brain_id: joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Invalid brain ID format'
        })
}).unknown(true);

module.exports = {
    uploadImportChatSchema,
    getImportChatStatusSchema,
    getImportChatsSchema
};