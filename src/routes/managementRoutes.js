const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const managementController = require('../controller/managementController')

// All management routes are Admin only
router.use(auth, requireAdmin)

// Get inactive entities
router.get('/inactive-entities', managementController.getInactiveEntities)

// Delete inactive staff
router.delete('/staff/:staffId', managementController.deleteInactiveStaff)

// Delete inactive client
router.delete('/clients/:clientId', managementController.deleteInactiveClient)

// Get tasks of inactive staff
router.get('/inactive-staff-tasks', managementController.getInactiveStaffTasks)

module.exports = router
