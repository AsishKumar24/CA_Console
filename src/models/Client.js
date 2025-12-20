const { Schema, model, Types } = require('mongoose')

const clientSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true },

    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      trim: true,
      uppercase : true
    },

    type: {
      type: String,
      trim: true
    },

    pan: {
      type: String,
      trim: true,
      uppercase: true
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true
    },

    mobile: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    address: {
      type: String,
      trim: true
    },

    notes: {
      type: String,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },
    alternateMobile: {
    type: String,
    trim: true
    }
  },
  { timestamps: true }
)


module.exports = model('Client', clientSchema)
