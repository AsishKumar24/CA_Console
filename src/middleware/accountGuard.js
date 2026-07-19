const { User } = require('../models/User')

// Gate for all firm DATA routes (mounted after `auth`, which sets req.user).
// Blocks, with a clean JSON body the frontend can branch on:
//   - users who must change their password first (temp-password admins)
//   - suspended firms — the admin's own flag, or a staff member's owning admin
// The SUPER_ADMIN is exempt (they operate the platform routes, not firm data).
module.exports = async (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (user.role === 'SUPER_ADMIN') {
    return next()
  }

  // Force the first-login password change before any data access.
  if (user.mustChangePassword) {
    return res.status(403).json({
      error: 'You must change your password before continuing.',
      mustChangePassword: true
    })
  }

  // Firm suspension: an admin's own flag, or the staff member's owning admin.
  let suspended = false
  if (user.role === 'ADMIN') {
    suspended = !!user.suspended
  } else {
    const admin = await User.findById(user.owner).select('suspended')
    suspended = !admin || !!admin.suspended
  }

  if (suspended) {
    return res.status(403).json({
      error: 'This account has been suspended. Please contact support.',
      suspended: true
    })
  }

  next()
}
