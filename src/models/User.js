const { Schema, model } = require('mongoose')
const validator = require('validator')
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
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: validator.isEmail
    },

    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['ADMIN', 'STAFF'],
      default: 'STAFF'
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      validate: v => /^[6-9]\d{9}$/.test(v)
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

const User = model('User', userSchema)
module.exports = {
  User
}

