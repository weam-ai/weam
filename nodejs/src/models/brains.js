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

// Compound unique index on slug and user.userId
schema.index({ slug: 1, 'workspaceId': 1 }, { unique: true });

// Ensure that slug is unique per user
schema.pre('save', async function (next) {
    if (this.isModified('slug')) {
        // Check if there is any other document with the same slug for the same user
        const count = await this.constructor.countDocuments({
            slug: this.slug,
            'workspaceId': this.workspaceId
        });
        if (count > 0) {
            // this.slug = `${this.slug}-${count}`;
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

module.exports = brain;
