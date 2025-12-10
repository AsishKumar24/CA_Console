const { Schema, model, Types } = require('mongoose')

const clientSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    code: String,
    type: String,
    pan: String,
    gstin: String,
    mobile: String,
    email: String,
    address: String,
    notes: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

module.exports = model('Client', clientSchema)
