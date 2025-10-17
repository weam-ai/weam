const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { CUSTOM_PAGINATE_LABELS } = require('../config/constants/common');
const { userSchema, teamSchema } = require('../utils/commonSchema');

mongoosePaginate.paginate.options = { customLabels: CUSTOM_PAGINATE_LABELS };

const schema = new Schema(
    {
        appId: {
            type: Schema.Types.ObjectId,
            ref: 'solutionapp',
            required: true
        },
        user: userSchema,
        roleCode: {
            type: String,
            required: true,
            enum: ['ADMIN', 'MANAGER', 'USER'],
            default: 'USER'
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        invitedAt: {
            type: Date,
            default: Date.now
        },
        team: teamSchema
    },
    {
        timestamps: true
    }
);


schema.plugin(mongoosePaginate);

const solutionMember = model('solutionmember', schema, 'solutionmember');

module.exports = solutionMember;
