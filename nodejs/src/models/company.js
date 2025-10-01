const mongoose = require('../config/db');
const mongoosePaginate = require('mongoose-paginate-v2');
const { CUSTOM_PAGINATE_LABELS } = require('../config/constants/common');
const { userSchema } = require('../utils/commonSchema');
const config = require('../config/config');
const moment = require('moment');

mongoosePaginate.paginate.options = { customLabels: CUSTOM_PAGINATE_LABELS };
const Schema = mongoose.Schema;

const schema = new Schema(
    {
        companyNm: {
            type: String,
        },
        slug: {
            type: String,
            unique: true,
            index: true,
        },
        getRef: {
            type: String
        },
        // if ref type is other then specify other contain
        other: {
            type: String
        },
        users: [userSchema],
        freeCredit: {
            type: Number,
            default: 0
        },
        freeTrialStartDate: {
            type: Date,
            default: Date.now()
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
        },
        deletedAt: {
            type: Date,
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
        },
        countryName: {
            type: String,
        },
        countryCode: {
            type: String,
        },
        freshCRMContactId: {
            type: String,
        },
        ollamaSettings: {
            enabled: {
                type: Boolean,
                default: true
            },
            allowedModels: [{
                type: String
            }],
            restrictedModels: [{
                type: String
            }],
            defaultModel: {
                type: String
            },
            maxConcurrentRequests: {
                type: Number,
                default: 5
            },
            defaultBaseUrl: {
                type: String
            },
            teamSettings: {
                allowModelPulling: {
                    type: Boolean,
                    default: false
                },
                allowModelDeletion: {
                    type: Boolean,
                    default: false
                }
            },
            updatedAt: {
                type: Date,
                default: Date.now
            }
        },
    },
    { timestamps: true },
);

schema.plugin(mongoosePaginate);

const company = mongoose.model('company', schema, 'company');

module.exports = company;
