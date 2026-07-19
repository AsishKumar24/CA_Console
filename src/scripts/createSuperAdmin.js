// scripts/createSuperAdmin.js
//
// Seeds the single platform SUPER_ADMIN (the product owner) from env vars.
// A super admin belongs to no firm (no owner, owns no clients/tasks) and is
// the only account that can create firm admins from the platform panel.
//
// Refuses to create a second super admin — there is exactly one.
//
// Env:
//   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME, SUPER_ADMIN_PHONE
require('dotenv').config()
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const { connectDB } = require('../config/database')
const { User } = require('../models/User')

async function createSuperAdmin () {
  try {
    await connectDB()

    // Exactly one super admin ever.
    const existing = await User.findOne({ role: 'SUPER_ADMIN' })
    if (existing) {
      console.log('Super admin already exists:', existing.email, '— refusing to create another.')
      await mongoose.connection.close()
      return process.exit(0)
    }

    const email = process.env.SUPER_ADMIN_EMAIL
    const password = process.env.SUPER_ADMIN_PASSWORD
    if (!email || !password) {
      console.error('❌ SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.')
      await mongoose.connection.close()
      return process.exit(1)
    }

    // Guard against colliding with an existing (non-super) account.
    const emailTaken = await User.findOne({ email: email.toLowerCase() })
    if (emailTaken) {
      console.error(`❌ Email ${email} is already in use by a ${emailTaken.role} account.`)
      await mongoose.connection.close()
      return process.exit(1)
    }

    const hash = await bcrypt.hash(password, 10)

    const superAdmin = await User.create({
      firstName: process.env.SUPER_ADMIN_NAME || 'Platform Owner',
      email,
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      phone: process.env.SUPER_ADMIN_PHONE || undefined
      // no owner, no mustChangePassword — this is the platform account
    })

    console.log('✅ Super admin created:', superAdmin.email)
    await mongoose.connection.close()
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    try { await mongoose.connection.close() } catch {}
    process.exit(1)
  }
}

createSuperAdmin()
