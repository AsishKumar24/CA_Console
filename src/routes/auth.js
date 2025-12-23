const express = require('express')
const authRouter = express.Router()
// const { User } = require('../models/User')
// const { validateSignUpData } = require('../utils/validation')
// const bcrypt = require('bcrypt')
// const validator = require('validator')
const authController = require('../controller/authController')
const auth = require("../middleware/auth")
const { requireAdmin } = require("../middleware/requireAdmin")
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

authRouter.post('/login', authController.login)
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register staff (Admin only)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff created
 *       403:
 *         description: Admin only
 */

authRouter.post('/register', auth, requireAdmin, authController.registerStaff)
authRouter.post('/logout', authController.logout)
authRouter.get('/me', auth, authController.getInfo)
authRouter.get('/assignable',auth , requireAdmin,authController.getAssignableUsers)

// Password Reset Routes
authRouter.post('/forgot-password', authController.forgotPassword)
authRouter.post('/reset-password', authController.resetPassword)

module.exports = authRouter
