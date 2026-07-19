const { Schema, model, Types } = require('mongoose')
const validator = require('validator')
const userSchema = new Schema(
  {
    // Multi-tenancy: the ADMIN (firm) this user belongs to.
    // - STAFF: set to the admin who created them (their firm/tenant id).
    // - ADMIN: left unset — an admin *is* the tenant.
    owner: {
      type: Types.ObjectId,
      ref: 'User',
      index: true
    },
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
      enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
      default: 'STAFF'
    },
    // Firm suspension (set on the ADMIN by the super admin). A suspended
    // admin and all their staff are blocked from data routes.
    suspended: {
      type: Boolean,
      default: false
    },
    // Forces a password change on first login (admins created with a temp
    // password by the super admin). Cleared once the password is changed.
    mustChangePassword: {
      type: Boolean,
      default: false
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
    },
    // Password Reset Fields
    resetPasswordToken: {
      type: String,
      default: undefined
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined
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

