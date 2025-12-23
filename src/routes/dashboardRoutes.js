const express = require('express')
const router = express.Router()
const dashboardController = require('../controller/dashboardController')
const auth = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')

// Get dashboard statistics (Admin only)
router.get('/stats', auth, requireAdmin, dashboardController.getDashboardStats)

// Get overdue items list (Admin only)
router.get('/overdue', auth, requireAdmin, dashboardController.getOverdueItems)

// Get staff dashboard statistics (Staff/Admin)
router.get('/staff-stats', auth, dashboardController.getStaffStats)

// Get recent activities (Admin only)
router.get('/activities', auth, requireAdmin, dashboardController.getRecentActivities)

module.exports = router
