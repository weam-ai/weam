const joi = require('joi');
const { userSchemaKeys, botSchemaKeys, brainSchemaKeys } = require('./commonref');

const createConversationKeys = joi.object({
    message: joi.object({}).required().unknown(true),
    chatId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    model: joi.object(botSchemaKeys).required(),
    brain: joi.object(brainSchemaKeys).required(),
    responseModel: joi.string().required(),
    media: joi.object({
        name: joi.string().optional(),
        uri: joi.string().optional(),
        mime_type: joi.string().optional(),
    }).unknown(true).optional(),
    messageId: joi.string().regex(/^[0-9a-fA-F]{24}$/).optional()
}).unknown(true);

const editMsgKeys = joi.object({
    message: joi.string().optional(),
    ai: joi.string().optional(),
}).min(1);

const replyInThreadKeys = joi.object({
    chatId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    messageId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    content: joi.string().optional().allow(''),
    type: joi.string().required(),
    attachment: joi.array().items().optional(),
    tagusers: joi.array().items().optional(),
}).unknown(true);

const addReactionKeys = joi.object({
    id: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    user: joi.object(userSchemaKeys).required(),
    emoji: joi.string().required(),
});

const saveResponseTimeKeys = joi.object({
    id: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    responseTime: joi.string().required(),
})
module.exports = {
    createConversationKeys,
    editMsgKeys,
    replyInThreadKeys,
    addReactionKeys,
    saveResponseTimeKeys
};
