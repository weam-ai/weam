const mongoose = require('../config/db');
const mongoosePaginate = require('mongoose-paginate-v2');
const { CUSTOM_PAGINATE_LABELS, USER_THEMES, FILE, JOB_TYPE } = require('../config/constants/common');
const bcrypt = require('bcrypt');
mongoosePaginate.paginate.options = { customLabels: CUSTOM_PAGINATE_LABELS };
const { COLLECTION_REF_UPDATE } = require('../config/constants/schemaref');
const { createJob } = require('../jobs');
const { fileSchema, companySchema } = require('../utils/commonSchema');

const Schema = mongoose.Schema;

const schema = new Schema(
    {
        fname: {
            type: String,
        },
        lname: {
            type: String,
        },
        email: {
            type: String,
            unique: true,
            lowercase: true
        },
        password: {
            type: String,
        },
        roleId: {
            type: Schema.Types.ObjectId,
            ref: 'role',
            index: true,
        },
        roleCode: {
            type: String,
        },
        mobNo: {
            type: String,
        },
        fcmTokens: {
            type: Array,
            default: []
        },
        loginCode: {
            type: String
        },
        codeExpiresOn: {
            type: String
        },
        lastLogin: { type: Date },
        verifiedAt: { type: Date },
        resetHash: { type: String },
        inviteLink: { type: String },
        inviteExpireOn: {
            type: String
        },
        invited: { type: Boolean },
        mcpdata: { type: Object },
        fileSize: {
            type: Number,
            default: FILE.DEFAULT_SIZE,
        },
        usedSize: {
            type: Number,
            default: FILE.USED_SIZE
        },
        requestSize: {
            type: Number, // increase storage limit
        },
        company: companySchema,
        stripeCustomerId: {
            type: String, 
        },
        msgCredit: {
            type: Number,
            default: 1000
        },
        profile: fileSchema, // profile image of an user,
        mfa: {
            type: Boolean, // Multi factor authentication
            default: false
        },
        mfaSecret: { type: String },
        isActive: {
            type: Boolean,
            default: true,
        },
        isProfile: {
            type: Boolean,
            default: false
        }, // profile update flag

        inviteSts: { type: String }, // PENDING, ACCEPT AND EXPIRE
        
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: 'company',
        },
        allowuser: { type: Number }, // temp flag for manually billing management
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
        },
        deletedAt: { type: Date },
        isPrivateBrainVisible :{
            type: Boolean,
            default: true
        },
        tempblocked: {
            type: Boolean,
            default: false
        },
        onboard: {
            type: Boolean,
            default: true
        },
    },
    {
        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.__v;
            },
        },
        timestamps: true,
    },
);

schema.pre('save', function (next) {
    // Convert email to lowercase
    if (this.email) {
        this.email = this.email.toLowerCase();
    }
    // when user invited through magic link in that case there is no need of password
    if (this.invited) return next();
    bcrypt.hash(this.password, 10, (error, hash) => {
        if (error) {
            return next(error);
        } else {
            this.password = hash;
            next();
        }
    });
});

schema.methods.comparePassword = async function (passw) {
    return bcrypt.compare(passw, this.password);
};

schema.post(['findOneAndUpdate', 'updateOne'], async function (doc) {
    if (doc) {
        const updatedData = await this.model.findOne(this.getQuery());
        if (updatedData)
            await createJob(JOB_TYPE.UPDATE_DBREF, { collectionDetails: COLLECTION_REF_UPDATE.USER, updatedData: updatedData._doc });
    }
});

schema.method('toJSON', function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    object._id = _id;
    delete object.password;
    return object;
});

schema.plugin(mongoosePaginate);

const user = mongoose.model('user', schema, 'user');

module.exports = user;
