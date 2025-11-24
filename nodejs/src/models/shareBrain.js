const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const { brainSchema, userSchema } = require("../utils/commonSchema");

const schema = new Schema(
  {
    brain: brainSchema,
    user: userSchema,
    role: { type: String },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "teamUser",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    charimg : {
      type: String,
      
    }
  },
  { timestamps: true }
);

schema.plugin(mongoosePaginate);

const shareBrain = model("sharebrain", schema, "sharebrain");

module.exports = shareBrain;
