// scripts/createAdmin.js
require('dotenv').config()
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const { connectDB } = require('../config/database')
const {User} = require('../models/User') 

async function createAdmin () {
  try {
    await connectDB()

    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'Admin@123'

    const existing = await User.findOne({ email })
    if (existing) {
      console.log('Admin already exists:', existing.email)
      return process.exit(0)
    }

    const hash = await bcrypt.hash(password, 10)

    const admin = await User.create({
    firstName: process.env.ADMIN_NAME || 'Administrator',
      email,
      passwordHash: hash,
      role: 'ADMIN',
      phone: process.env.ADMIN_PHONE || '9999999999'
    })

    // console.log('Admin created:')
    // console.log('Email:', admin.email)
    // console.log('Password:', password)
    await mongoose.connection.close()
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

createAdmin()
