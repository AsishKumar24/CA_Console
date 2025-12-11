const { Schema, model } = require('mongoose')

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 30
    },
    lastName: {
      type: String
    },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
    phone: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

const User = model('User', userSchema)
module.exports = { User }

