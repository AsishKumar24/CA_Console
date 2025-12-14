// middleware/auth.js
const jwt = require('jsonwebtoken')
const {User}= require('../models/User')

module.exports = async (req, res, next) => {
  let token = null

  // 1. Try cookie first (real browser login)
  if (req.cookies?.token) {
    token = req.cookies.token
  }
  //console.log(req.headers.authorization)
  // 2. Fallback to Authorization header (Postman testing)
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }
  //console.log(token)

  // 3. If still no token → unauthorized
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  try {
    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    //console.log(payload)
    // Check if user exists
    const user = await User.findById(payload.id)
    //console.log(user) 

    if (!user) {
      console.log("no user")
      return res.status(401).json({ error: 'Invalid tokens' })
    }

    if (!user.isActive) {
  return res.status(403).json({ error: 'Account disabled' })
    };


    // Attach user to request 
    req.user = user
    next()
  } catch (err) {
  
    return res.status(401).json({ error: 'Invalid token' })
  }
}
