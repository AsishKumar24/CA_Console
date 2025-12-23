const { User } = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { validateSignUpData } = require('../utils/validation')
const validator = require('validator')
const crypto = require('crypto')
const nodemailer = require('nodemailer')

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      })
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      })
    }

    const user = await User.findOne({
      email
    }).exec()
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({
        error: 'Invalid credentials'
      })
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    )

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      sameSite: 'lax', // REQUIRED for cross-site cookies (none)
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    //console.log("user is logged in")
    // Send sanitized user info
    return res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        role: user.role
      },
      message: 'login successfuly'
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}

exports.registerStaff = async (req, res) => {
  try {
    validateSignUpData(req)
    const { firstName, lastName, email, password, phone } = req.body

    if (!password) {
      return res.status(400).json({
        error: 'Password is required'
      })
    }

    const existing = await User.findOne({
      email
    })
    if (existing) {
      return res.status(400).json({
        error: 'Email in use'
      })
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
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}
exports.logout = (req, res) => {
  res.clearCookie('token')
  return res.json({
    message: 'Logged out'
  })
}
exports.getInfo = (req, res) => {
  const user = req.user
 // console.log(user)
  return res.json({
    id: user._id,
    firstName: user.firstName, // or fullName depending on schema
    email: user.email,
    role: user.role
  })
}

// controllers/user.controller.js
exports.getAssignableUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const ownerId = req.user._id

    const users = await User.find({
      role: { $in: ['ADMIN', 'STAFF'] },
      isActive: { $ne: false } // Only return active users
    })
      .select('_id firstName email role')
      .sort({ role: 1, firstName: 1 })

    res.json({ users })
  } catch (err) {
    console.error('getAssignableUsers error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}




// ============ PASSWORD RESET FUNCTIONALITY ============

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Forgot Password - Send reset link to user
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success (security: don't reveal if email exists)
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Save hashed token and expiry to user
      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Create reset link
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      // Email content - sent to user
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email, // Send to the actual user
        subject: 'Password Reset Request - CA Console',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hello ${user.firstName || 'User'},</p>
            <p>You requested to reset your password for your CA Console account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${resetLink}
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email and contact your administrator.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              CA Console - Chartered Accountant Management System
            </p>
          </div>
        `,
      };

      // Send email to user
      await transporter.sendMail(mailOptions);
    }

    // Return success message
    res.status(200).json({ 
      message: 'If the email exists, a reset link has been sent' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

/**
 * Reset Password - Update password with token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Hash the provided token
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }, // Check if not expired
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token' 
      });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email to user
    const confirmationEmail = {
      from: process.env.EMAIL_USER,
      to: user.email, // Send to the actual user
      subject: 'Password Changed Successfully - CA Console',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Password Changed Successfully</h2>
          <p>Hello ${user.firstName || 'User'},</p>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact your administrator immediately.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/signin" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Sign In
            </a>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            CA Console - Chartered Accountant Management System
          </p>
        </div>
      `,
    };

    await transporter.sendMail(confirmationEmail);

    res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
