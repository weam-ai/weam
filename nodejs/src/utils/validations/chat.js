const joi = require('joi');
const { userSchemaKeys, brainSchemaKeys } = require('./commonref');

const addChatMemberKeys = joi.object({
    members: joi.array().items(
        joi.object({
            chatId: joi
                .string()
                .regex(/^[0-9a-fA-F]{24}$/)
                .required(),
            user: joi.object(userSchemaKeys).required(),
            brain: joi.object(brainSchemaKeys).required(),
        }),
    ),
    isBulk: joi.boolean().required(),
});

const createNewChatKeys = joi.object({
    brain: joi.object(brainSchemaKeys).allow({},null).optional(),
    isShare: joi.boolean().optional(),
    addDefaultBrain:joi.boolean().optional(),
    workspaceId:joi.string().optional()
})

const updateChatKeys = joi.object({
    title: joi.string().required(),
})

const favouriteKeys = joi.object({
    isFavourite: joi.boolean().required()
})

const createForkChatKeys = joi.object({
    brain: joi.object(brainSchemaKeys).required(),
    title: joi.string().required(),
    conversation: joi
        .array()
        .items(
            joi
                .object({
                    message: joi.string().required(),
                    response: joi.string().required(),
                    responseModel: joi.string().required(),
                    id: joi
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/)
                        .required(),
                })
                .unknown(true),
        )
        .required(),
});

const createShareChatKeys = joi.object({
    brainId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    chatId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    access: joi.number().required(),
    uri: joi.string().required(),
    conversation: joi.array().items(joi.object().unknown(true)).required()
});

const deleteShareChatKeys = joi.object({
    id: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .optional(),
    isBulk: joi.boolean().required(),
});

const getSearchMetadataKeys = joi.object({
    query: joi.string().required(),
    messageId: joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
});

module.exports = {
    addChatMemberKeys,
    favouriteKeys,
    createNewChatKeys,
    createForkChatKeys,
    updateChatKeys,
    createShareChatKeys,
    deleteShareChatKeys,
    getSearchMetadataKeys
};
