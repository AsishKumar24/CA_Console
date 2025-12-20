const Task = require('../models/Task')
const PaymentSettings = require('../models/PaymentSettings')

// ==========================================
// FILE UPLOAD
// ==========================================

/**
 * @route   POST /api/billing/upload/qr
 * @desc    Upload QR code image
 * @access  Admin only
 */
exports.uploadQRCode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    // Return the file URL
    const fileUrl = `/uploads/qr-codes/${req.file.filename}`

    res.json({
      success: true,
      message: 'QR code uploaded successfully',
      fileUrl,
      filename: req.file.filename
    })
  } catch (error) {
    console.error('Error uploading QR code:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to upload QR code'
    })
  }
}

// ==========================================
// PAYMENT SETTINGS (QR Codes & Bank Accounts)
// ==========================================

/**
 * @route   GET /api/billing/settings
 * @desc    Get payment settings (QR codes, bank accounts)
 * @access  Admin only
 */
exports.getPaymentSettings = async (req, res) => {
  try {
    const adminId = req.user.id
    
    let settings = await PaymentSettings.findOne({ adminId })
    
    // Create default settings if none exist
    if (!settings) {
      settings = await PaymentSettings.create({ adminId })
    }
    
    res.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment settings'
    })
  }
}

/**
 * @route   POST /api/billing/settings/qr
 * @desc    Add new QR code
 * @access  Admin only
 */
exports.addQRCode = async (req, res) => {
  try {
    const adminId = req.user.id
    const { name, upiId, qrImageUrl } = req.body
    
    if (!name || !qrImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Name and QR image URL are required'
      })
    }
    
    let settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      settings = await PaymentSettings.create({ adminId })
    }
    
    settings.qrCodes.push({
      name,
      upiId,
      qrImageUrl,
      isActive: true
    })
    
    await settings.save()
    
    res.json({
      success: true,
      message: 'QR code added successfully',
      settings
    })
  } catch (error) {
    console.error('Error adding QR code:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add QR code'
    })
  }
}

/**
 * @route   PATCH /api/billing/settings/qr/:qrId
 * @desc    Update QR code
 * @access  Admin only
 */
exports.updateQRCode = async (req, res) => {
  try {
    const adminId = req.user.id
    const { qrId } = req.params
    const { name, upiId, qrImageUrl, isActive } = req.body
    
    const settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Payment settings not found'
      })
    }
    
    const qrCode = settings.qrCodes.id(qrId)
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found'
      })
    }
    
    if (name !== undefined) qrCode.name = name
    if (upiId !== undefined) qrCode.upiId = upiId
    if (qrImageUrl !== undefined) qrCode.qrImageUrl = qrImageUrl
    if (isActive !== undefined) qrCode.isActive = isActive
    
    await settings.save()
    
    res.json({
      success: true,
      message: 'QR code updated successfully',
      settings
    })
  } catch (error) {
    console.error('Error updating QR code:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update QR code'
    })
  }
}

/**
 * @route   DELETE /api/billing/settings/qr/:qrId
 * @desc    Delete QR code
 * @access  Admin only
 */
exports.deleteQRCode = async (req, res) => {
  try {
    const adminId = req.user.id
    const { qrId } = req.params
    
    const settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Payment settings not found'
      })
    }
    
    settings.qrCodes.pull(qrId)
    await settings.save()
    
    res.json({
      success: true,
      message: 'QR code deleted successfully',
      settings
    })
  } catch (error) {
    console.error('Error deleting QR code:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete QR code'
    })
  }
}

/**
 * @route   POST /api/billing/settings/bank
 * @desc    Add bank account
 * @access  Admin only
 */
exports.addBankAccount = async (req, res) => {
  try {
    const adminId = req.user.id
    const { name, accountNumber, ifscCode, accountHolderName, bankName, branch } = req.body
    
    if (!name || !accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      })
    }
    
    let settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      settings = await PaymentSettings.create({ adminId })
    }
    
    settings.bankAccounts.push({
      name,
      accountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      branch,
      isActive: true
    })
    
    await settings.save()
    
    res.json({
      success: true,
      message: 'Bank account added successfully',
      settings
    })
  } catch (error) {
    console.error('Error adding bank account:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add bank account'
    })
  }
}

// ==========================================
// BILLING OPERATIONS ON TASKS
// ==========================================

/**
 * @route   PATCH /api/billing/tasks/:taskId/issue
 * @desc    Issue bill for a task
 * @access  Admin only
 */
exports.issueBill = async (req, res) => {
  try {
    const { taskId } = req.params
    const adminId = req.user.id
    const {
      amount,
      dueDate,
      paymentMode,
      selectedQRCode,
      invoiceNumber,
      taxAmount,
      discount
    } = req.body
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      })
    }
    
    const task = await Task.findById(taskId)
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }
    
    // Generate invoice number if not provided
    let finalInvoiceNumber = invoiceNumber
    if (!finalInvoiceNumber) {
      const settings = await PaymentSettings.findOne({ adminId })
      if (settings) {
        finalInvoiceNumber = settings.generateInvoiceNumber()
        await settings.save()
      } else {
        finalInvoiceNumber = `INV-${Date.now()}`
      }
    }
    
    // Update billing information
    task.billing = {
      amount,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      paymentMode: paymentMode || 'NOT_SPECIFIED',
      selectedQRCode: selectedQRCode || null,
      paymentStatus: 'UNPAID',
      issuedBy: adminId,
      issuedAt: new Date(),
      invoiceNumber: finalInvoiceNumber,
      taxAmount: taxAmount || 0,
      discount: discount || 0,
      paidAmount: 0
    }
    
    await task.save()
    
    await task.populate([
      { path: 'client', select: 'name code email phone' },
      { path: 'billing.issuedBy', select: 'firstName lastName email' }
    ])
    
    res.json({
      success: true,
      message: 'Bill issued successfully',
      task
    })
  } catch (error) {
    console.error('Error issuing bill:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to issue bill'
    })
  }
}

/**
 * @route   PATCH /api/billing/tasks/:taskId/payment
 * @desc    Mark bill as paid
 * @access  Admin only
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { taskId } = req.params
    const { paidAmount, paidAt, transactionId, paymentNotes } = req.body
    
    const task = await Task.findById(taskId)
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }
    
    if (!task.billing || task.billing.paymentStatus === 'NOT_ISSUED') {
      return res.status(400).json({
        success: false,
        error: 'No bill issued for this task'
      })
    }
    
    const amountPaid = paidAmount || task.billing.amount
    
    // Determine payment status
    let paymentStatus = 'PAID'
    if (amountPaid < task.billing.amount) {
      paymentStatus = 'PARTIALLY_PAID'
    }
    
    task.billing.paidAmount = amountPaid
    task.billing.paidAt = paidAt || new Date()
    task.billing.transactionId = transactionId || ''
    task.billing.paymentNotes = paymentNotes || ''
    task.billing.paymentStatus = paymentStatus
    
    await task.save()
    
    await task.populate([
      { path: 'client', select: 'name code email phone' },
      { path: 'billing.issuedBy', select: 'firstName lastName email' }
    ])
    
    res.json({
      success: true,
      message: `Payment recorded successfully (${paymentStatus})`,
      task
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to record payment'
    })
  }
}

/**
 * @route   GET /api/billing/dashboard
 * @desc    Get billing dashboard stats
 * @access  Admin only
 */
exports.getBillingDashboard = async (req, res) => {
  try {
    const { status, clientId, fromDate, toDate } = req.query
    
    // Build query
    const query = { 'billing.paymentStatus': { $ne: 'NOT_ISSUED' } }
    
    if (status && status !== 'ALL') {
      query['billing.paymentStatus'] = status
    }
    
    if (clientId) {
      query.client = clientId
    }
    
    if (fromDate || toDate) {
      query['billing.issuedAt'] = {}
      if (fromDate) query['billing.issuedAt'].$gte = new Date(fromDate)
      if (toDate) query['billing.issuedAt'].$lte = new Date(toDate)
    }
    
    const tasks = await Task.find(query)
      .populate('client', 'name code email')
      .populate('billing.issuedBy', 'firstName lastName')
      .sort({ 'billing.issuedAt': -1 })
    
    // Calculate statistics
    const stats = {
      totalBills: tasks.length,
      totalAmount: tasks.reduce((sum, t) => sum + (t.billing?.amount || 0), 0),
      totalPaid: tasks.reduce((sum, t) => sum + (t.billing?.paidAmount || 0), 0),
      unpaid: tasks.filter(t => t.billing?.paymentStatus === 'UNPAID').length,
      paid: tasks.filter(t => t.billing?.paymentStatus === 'PAID').length,
      overdue: tasks.filter(t => 
        t.billing?.paymentStatus === 'UNPAID' && 
        new Date(t.billing.dueDate) < new Date()
      ).length,
      partiallyPaid: tasks.filter(t => t.billing?.paymentStatus === 'PARTIALLY_PAID').length
    }
    
    res.json({
      success: true,
      stats,
      tasks
    })
  } catch (error) {
    console.error('Error fetching billing dashboard:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing dashboard'
    })
  }
}

/**
 * @route   GET /api/billing/tasks/:taskId
 * @desc    Get billing details for a task
 * @access  Admin only
 */
exports.getTaskBilling = async (req, res) => {
  try {
    const { taskId } = req.params
    
    const task = await Task.findById(taskId)
      .populate('client', 'name code email phone address')
      .populate('billing.issuedBy', 'firstName lastName email')
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }
    
    res.json({
      success: true,
      task
    })
  } catch (error) {
    console.error('Error fetching task billing:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task billing'
    })
  }
}
