const bcrypt = require('bcrypt')
const validator = require('validator')
const { User } = require('../models/User')

// Creates a firm ADMIN account (a new tenant). Admins have no `owner` — an
// admin *is* the tenant. This is the ONLY code path that creates an admin;
// it is invoked by the super-admin platform panel (never a public route).
//
// Throws { status, message } for bad input / conflicts so callers can map
// straight to an HTTP response.
async function createFirmAdmin ({ firstName, lastName, email, phone, password, mustChangePassword = false }) {
  if (!firstName || !lastName || !email || !password) {
    throw { status: 400, message: 'firstName, lastName, email and password are required' }
  }
  if (!validator.isEmail(email)) {
    throw { status: 400, message: 'Invalid email address' }
  }
  if (!validator.isStrongPassword(password)) {
    throw {
      status: 400,
      message: 'Password must be at least 8 characters and include uppercase, lowercase, number and special character'
    }
  }

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    throw { status: 400, message: 'Email already in use' }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const admin = await User.create({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      role: 'ADMIN',
      mustChangePassword
    })
    return admin
  } catch (err) {
    if (err.code === 11000) {
      throw { status: 400, message: 'A user with those details already exists' }
    }
    throw err
  }
}

module.exports = { createFirmAdmin }
