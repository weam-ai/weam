const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { CUSTOM_PAGINATE_LABELS } = require('../config/constants/common');
const { userSchema, botSchema, brainSchema, fileSchema } = require('../utils/commonSchema');

mongoosePaginate.paginate.options = { customLabels: CUSTOM_PAGINATE_LABELS };

const tokensSchema = {
    totalUsed: {
        type: Number
    },
    promptT: {
        type: Number
    },
    completion: {
        type: Number
    },
    totalCost: {
        type: String
    },
    imageT: {
        type: Number,
        default: 0
    }
}

const schema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        content: {}, // store the edited response content
        originalMessageId: {
            type: Schema.Types.ObjectId,
            ref: 'thread',
            index: true
        },
        chatId: {
            type: Schema.Types.ObjectId,
            ref: 'chat',
            index: true
        },
        chat_session_id: {
            type: Schema.Types.ObjectId,
            ref: 'chat',
            index: true
        },
        reaction: [
            {
                user: userSchema,
                emoji: {
                    type: Schema.Types.Mixed,
                }
            }
        ],
        tokens: tokensSchema,
        model: botSchema,
        user: userSchema,
        brain: brainSchema,
        isActive: {
            type: Boolean,
            default: true,
        },
        ai: {}, // store ai response in same format as thread
        system: {},
        sumhistory_checkpoint: {},
        responseModel: {
            type: String // ai answer response model name
        },
        responseAPI: {
            type: String // ai answer response api name
        },
        proAgentData: {},
        media: [fileSchema],
        cloneMedia: [],
        isMedia: {
            type: Boolean // uploaded doc flag 
        },
        isFork: {
            type: Boolean // fork chat flag
        },
        seq: {
            type: Date // sequence for fork chat 
        },
        promptId: {
            type: Schema.Types.ObjectId,
            ref: 'prompts',
            index: true
        },
        customGptId: {
            type: Schema.Types.ObjectId,
            ref: 'customgpt',
            index: true
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'company',
            index: true
        },
        responseTime: {
            type: String // how much time saved 
        },
        usedCredit: {
            type: Number,
            default: 0
        },
        isPaid: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });

schema.plugin(mongoosePaginate);

module.exports = model('page', schema);

