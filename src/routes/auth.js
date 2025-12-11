const express = require('express')
const authRouter = express.Router()
// const { User } = require('../models/User')
// const { validateSignUpData } = require('../utils/validation')
// const bcrypt = require('bcrypt')
// const validator = require('validator')
const authController = require('../controller/authController')


authRouter.post('/login', authController.login)
//authRouter.post('/register', auth, requireAdmin, registerStaff)

module.exports = authRouter
