const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { CUSTOM_PAGINATE_LABELS, JOB_TYPE } = require('../config/constants/common');
const { COLLECTION_REF_UPDATE } = require('../config/constants/schemaref');
const { userSchema, teamSchema } = require('../utils/commonSchema');
const { createJob } = require('../jobs');

mongoosePaginate.paginate.options = { customLabels: CUSTOM_PAGINATE_LABELS };

const schema = new Schema(
    {
        title: {
            type: String,
        },
        slug: {
            type: String,
            index: true
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'workspace'
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'company'
        },
        // user who created the brain
        user: { ...userSchema },
        isShare: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDefault: {
            type: Boolean,
        },
        deletedAt: {
            type: Date
        },
        archiveBy: {
            name: {
                type: String
            },
            id: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            }            
        },
        teams:[teamSchema],
        customInstruction: {
            type: String,
            required: false
        },
        charimg: {
            type: String
        }
     },
    { timestamps: true },
);

// Scoped unique indexes:
// 1) Shared brains: unique per workspace
schema.index(
    { slug: 1, 'workspaceId': 1 },
    { unique: true, partialFilterExpression: { isShare: true } }
);

// 2) Private brains: unique per user within the workspace
schema.index(
    { slug: 1, 'workspaceId': 1, 'user.id': 1 },
    { unique: true, partialFilterExpression: { isShare: false } }
);

// Ensure that slug is unique with correct scoping
schema.pre('save', async function (next) {
    if (this.isModified('slug') || this.isModified('title') || this.isNew) {
        const baseQuery = {
            slug: this.slug,
            'workspaceId': this.workspaceId
            // NOTE: archived (deletedAt) should still block duplicates by requirement
        };

        const scopeQuery = this.isShare
            ? { isShare: true }
            : { isShare: false, 'user.id': this?.user?.id };

        const exists = await this.constructor.exists({ ...baseQuery, ...scopeQuery, _id: { $ne: this._id } });
        if (exists) {
            const error = new Error(`${this.title} brain already exists`)
            return next(error);
        }
    }
    next();
});


schema.post(/^find/, async function (docs) {
    if (docs) {
       
        const docsArray = Array.isArray(docs) ? docs : [docs];

       
        await this.model.populate(docsArray, {
            path: 'teams.id',
            model: 'teamUser', 
        });

        
    }
});

schema.plugin(mongoosePaginate);

schema.post(['findOneAndUpdate', 'updateOne'], async function (doc) {
    if (doc) {
        const updatedData = await this.model.findOne(this.getQuery());
        if (updatedData)
            await createJob(JOB_TYPE.UPDATE_DBREF, { collectionDetails: COLLECTION_REF_UPDATE.BRAINS, updatedData: updatedData._doc });
    }
});

const brain = model('brain', schema, 'brain');

// Drop old index after model creation (if it exists)
// This runs asynchronously and won't block app startup
brain.collection.dropIndex("slug_1_workspaceId_1").catch(err => {
    logger.info(`🚀 ~ err:${err}`);
        // Ignore error if index doesn't exist
        if (err.code !== 27) { // 27 = IndexNotFound
            logger.info('Old index slug_1_workspaceId_1 already dropped or does not exist');
        }
    });

module.exports = brain;
