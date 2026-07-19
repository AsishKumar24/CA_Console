const { User } = require('../models/User')
const Client = require('../models/Client')
const Task = require('../models/Task')
const mongoose = require('mongoose')
const { createFirmAdmin } = require('../services/firmService')

/**
 * @route  POST /api/platform/firms
 * @desc   Super admin creates a firm admin with a temporary password.
 * @access Super admin only
 */
exports.createFirm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, tempPassword } = req.body

    const admin = await createFirmAdmin({
      firstName,
      lastName,
      email,
      phone,
      password: tempPassword,
      mustChangePassword: true // forced to change on first login
    })

    return res.status(201).json({
      message: 'Firm admin created',
      firm: {
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        createdAt: admin.createdAt
      }
    })
  } catch (err) {
    // firmService throws { status, message } for bad input / conflicts
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('createFirm error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * @route  GET /api/platform/firms
 * @desc   List all firms with basic stats (staff/client/task counts).
 * @access Super admin only
 */
exports.listFirms = async (req, res) => {
  try {
    const admins = await User.find({ role: 'ADMIN' })
      .select('firstName lastName email phone suspended createdAt')
      .sort({ createdAt: -1 })
      .lean()

    // One grouped count per collection, keyed by owner (the admin id).
    const [staffCounts, clientCounts, taskCounts] = await Promise.all([
      User.aggregate([{ $match: { role: 'STAFF' } }, { $group: { _id: '$owner', c: { $sum: 1 } } }]),
      Client.aggregate([{ $group: { _id: '$owner', c: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$owner', c: { $sum: 1 } } }])
    ])
    const toMap = arr => arr.reduce((m, x) => { m[String(x._id)] = x.c; return m }, {})
    const staffMap = toMap(staffCounts)
    const clientMap = toMap(clientCounts)
    const taskMap = toMap(taskCounts)

    const firms = admins.map(a => ({
      _id: a._id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: a.phone,
      suspended: !!a.suspended,
      createdAt: a.createdAt,
      stats: {
        staff: staffMap[String(a._id)] || 0,
        clients: clientMap[String(a._id)] || 0,
        tasks: taskMap[String(a._id)] || 0
      }
    }))

    return res.json({ firms })
  } catch (err) {
    console.error('listFirms error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Shared helper for suspend/reactivate.
async function setSuspended (req, res, suspended) {
  const { adminId } = req.params
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return res.status(400).json({ error: 'Invalid firm id' })
  }
  const admin = await User.findOne({ _id: adminId, role: 'ADMIN' })
  if (!admin) {
    return res.status(404).json({ error: 'Firm not found' })
  }
  admin.suspended = suspended
  await admin.save()
  return res.json({
    message: suspended ? 'Firm suspended' : 'Firm reactivated',
    firm: { _id: admin._id, email: admin.email, suspended: admin.suspended }
  })
}

/**
 * @route  PATCH /api/platform/firms/:adminId/suspend
 * @access Super admin only
 */
exports.suspendFirm = (req, res) => setSuspended(req, res, true)

/**
 * @route  PATCH /api/platform/firms/:adminId/reactivate
 * @access Super admin only
 */
exports.reactivateFirm = (req, res) => setSuspended(req, res, false)
