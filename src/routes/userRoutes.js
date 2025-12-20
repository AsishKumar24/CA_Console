const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const { User } = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * @openapi
 * /api/users/staff:
 *   get:
 *     summary: Get all staff members (Admin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of staff users
 */
router.get('/staff', auth, requireAdmin, async (req, res) => {
  try {
    const staff = await User.find({ role: 'STAFF' })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    
    res.json({ staff });
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /api/users/{userId}:
 *   patch:
 *     summary: Update user details (Admin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch('/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, phone, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow changing role
    if (req.body.role) {
      return res.status(403).json({ error: 'Cannot change user role' });
    }

    // Check if email is already in use by another user
    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
