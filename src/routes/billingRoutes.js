const express = require('express')
const router = express.Router()
const billingController = require('../controller/billingController')
const auth = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const { upload } = require('../middleware/upload')

// ==========================================
// FILE UPLOAD ROUTE (Admin Only)
// ==========================================

// Upload QR code image
router.post('/upload/qr', auth, requireAdmin, upload.single('qrImage'), billingController.uploadQRCode)

// ==========================================
// PAYMENT SETTINGS ROUTES (Admin Only)
// ==========================================

// Get payment settings (QR codes, bank accounts)
router.get('/settings', auth, requireAdmin, billingController.getPaymentSettings)

// QR Code Management
router.post('/settings/qr', auth, requireAdmin, billingController.addQRCode)
router.patch('/settings/qr/:qrId', auth, requireAdmin, billingController.updateQRCode)
router.delete('/settings/qr/:qrId', auth, requireAdmin, billingController.deleteQRCode)

// Bank Account Management
router.post('/settings/bank', auth, requireAdmin, billingController.addBankAccount)

// ==========================================
// BILLING OPERATIONS ROUTES (Admin Only)
// ==========================================

// Issue bill for a task
router.patch('/tasks/:taskId/issue', auth, requireAdmin, billingController.issueBill)

// Mark payment as received
router.patch('/tasks/:taskId/payment', auth, requireAdmin, billingController.markAsPaid)

// Get billing dashboard (all bills with filters)
router.get('/dashboard', auth, requireAdmin, billingController.getBillingDashboard)

// Get billing details for specific task
router.get('/tasks/:taskId', auth, requireAdmin, billingController.getTaskBilling)

module.exports = router
