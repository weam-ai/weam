const { Schema, model } = require('mongoose');
const { userSchema, companySchema, brainSchema } = require('../utils/commonSchema');

const fileDetailsSchema = new Schema({
    fileName: {
        type: String,
        required: true
    },
    fileId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    uri: {
        type: String,
        default: ''
    },
    jsonUri: {
        type: String,
        required: true
    }
}, { _id: false });

const schema = new Schema(
    {
        user: {
            type: userSchema,
            required: true
        },
        company: {
            type: companySchema,
            required: true
        },
        brain: {
            type: brainSchema,
            required: true
        },
        fileDetails: {
            type: fileDetailsSchema,
            required: true
        },
        hashids: {
            type: [String],
            default: []
        },
        conversationData: {
            type: Schema.Types.Mixed,
            default: null
        },
        totalImportChat: {
            type: Number,
            default: 0
        },
        successImportedChat: {
            type: Number,
            default: 0
        },
        totalImportedTokens: {
            type: Number,
            default: 0
        },
        responseAPI: {
            type: Schema.Types.Mixed,
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

const ImportChat = model('importChat', schema, 'importChat');

module.exports = ImportChat;
