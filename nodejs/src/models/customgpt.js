const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { CUSTOM_PAGINATE_LABELS } = require('../config/constants/common');
const { fileSchema, userSchema, brainSchema, companySchema, botSchema } = require('../utils/commonSchema');

mongoosePaginate.paginate.options = { customLabels: CUSTOM_PAGINATE_LABELS };

const schema = new Schema(
    {
        title: {
            type: String,
        },
        slug: {
            type: String,
        },
        type: {
            type: String,
            enum: ['agent', 'supervisor'],
            default: 'agent',
        },
        description: {
            type: String,
        },
        systemPrompt: {
            type: String,
        },
        Agents: [{
            type: Schema.Types.ObjectId,
            ref: 'customgpt'
        }],
        // MCP disabled: remove mcpTools field
        // mcpTools: [{
        //     type: String // Store MCP tool names/identifiers
        // }],
        responseModel: {
            name: {
                type: String,
            },
            company: companySchema,
            id: {
                type: Schema.Types.ObjectId,
                ref: 'companymodel'
            },
            bot: botSchema,
            provider: {
                type: String
            }
        },
        embedding_model: {
            name: {
                type: String,
            },
            company: companySchema,
            id: {
                type: Schema.Types.ObjectId,
                ref: 'companymodel'
            }
        },
        maxItr: {
            type: Number,
        },
        itrTimeDuration: {
            type: String,
        },
        favoriteByUsers: [{
            type: Schema.Types.ObjectId,
            ref: 'users'
        }],
        coverImg: fileSchema, // image of custom gpt
        doc: [fileSchema], // uploaded document
        owner: userSchema,
        brain: brainSchema,
        isActive: {
            type: Boolean,
            default: true,
        },
        defaultgpt: { type: Boolean },
        imageEnable: { type: Boolean, default: false },
        charimg: { type: String }
    },
    { timestamps: true },
);

schema.plugin(mongoosePaginate);

const customgpt = model('customgpt', schema, 'customgpt');

module.exports = customgpt;
