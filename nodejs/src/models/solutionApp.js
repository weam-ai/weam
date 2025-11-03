const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { CUSTOM_PAGINATE_LABELS } = require('../config/constants/common');

mongoosePaginate.paginate.options = { customLabels: CUSTOM_PAGINATE_LABELS };

const schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        icon: {
            type: String
        },
        category: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        deletedAt: {
            type: Date
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        pathToOpen: {
            type: String,
            trim: true
        },
        sequence: {
            type: Number,
        },
        charimg:{
            type: String
        }
    },
    {
        timestamps: true
    }
);

schema.plugin(mongoosePaginate);

const solutionApp = model('solutionapp', schema, 'solutionapp');

module.exports = solutionApp;
