const { Schema, model } = require('mongoose')

const userSchema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
    phone: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

module.exports = model('User', userSchema)
