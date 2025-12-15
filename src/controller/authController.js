const {User} = require("../models/User")
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { validateSignUpData } = require('../utils/validation')
const validator = require('validator')

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body


    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

 
    const user = await User.findOne({ email }).exec()
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

   
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false ,
      sameSite: 'none', // REQUIRED for cross-site cookies
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
   
    // Send sanitized user info
    return res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }, message : "login successfuly" 
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


exports.registerStaff = async (req, res) => {
    try {
    validateSignUpData(req)
    const { firstName, lastName, email, password, phone } = req.body

    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    
    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ error: 'Email in use' })
    }

    // Hash the password
    const hash = await bcrypt.hash(password, 10)

    // Create staff user with passwordHash in DB
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: hash, // Only store hash
      phone,
      role: 'STAFF'
    })

    return res.json({
      message: 'Staff created',
      id: user._id
    })
  } catch (err) {
    console.error('registerStaff error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
exports.logout = (req, res) => {
  res.clearCookie('token')
  return res.json({ message: 'Logged out' })
}
