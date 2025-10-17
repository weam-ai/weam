const joi = require('joi');
const { userSchemaKeys, teamSchemaKeys } = require('./commonref');

const createBrainKeys = joi.object({
    title: joi.string().required(),
    isShare: joi.boolean().required(),
    shareWith: joi
        .array()
        .items(
            joi
                .object(userSchemaKeys)
                // .required(),
        )
        .optional(),
    workspaceId: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    teams: joi
    .array()
    .items(
      joi
        .object({
          ...teamSchemaKeys,
        })
        .optional()
    )
    .optional(),
    customInstruction: joi.string().optional().allow(''),
    charimg: joi.string().optional().allow(''),
});

const updateBrainKeys = joi.object({
    title: joi.string().optional(),
    isShare: joi.boolean().required(),
    workspaceId:joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
    shareWith: joi
        .array()
        .items(
            joi
                .object(userSchemaKeys)
                .unknown(true)
                .required(),
        )
        .optional(),
        customInstruction: joi.string().optional().allow(''),
});

const deleteBrainKeys = joi.object({
    isShare: joi.boolean().required(),
});

const convertToSharedKeys = joi.object({
    shareWith: joi
        .array()
        .items(joi.object(userSchemaKeys).unknown(true))
        .optional(),
    teams: joi
        .array()
        .items(joi.object(teamSchemaKeys).optional())
        .optional(),
    customInstruction: joi.string().optional().allow(''),
});

const shareBrainKeys = joi.object({
    isShare: joi.boolean().required(),
    slug: joi.string().required(),
    shareWith: joi.array().items(joi.object(userSchemaKeys).unknown(true)).required(),
}).unknown(true);

const unshareBrainKeys = joi.object({
    user_id: joi
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
})

const shareDocKeys = joi.object({
    slug: joi.string().required(),
    shareDoc: joi
        .array()
        .items(
            joi.object({
                ...userSchemaKeys,
                file: joi.string().required(),
            }),
        )
        .required(),
});

module.exports = {
    createBrainKeys,
    updateBrainKeys,
    shareBrainKeys,
    unshareBrainKeys,
    shareDocKeys,
    deleteBrainKeys,
    convertToSharedKeys
};
