const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin')
const platformController = require('../controller/platformController')

// Entire platform panel is super-admin only.
router.use(auth, requireSuperAdmin)

// Create a firm admin (temp password, must change on first login)
router.post('/firms', platformController.createFirm)

// List all firms with basic stats
router.get('/firms', platformController.listFirms)

// Suspend / reactivate a firm
router.patch('/firms/:adminId/suspend', platformController.suspendFirm)
router.patch('/firms/:adminId/reactivate', platformController.reactivateFirm)

module.exports = router
