const Task = require('../models/Task')
const PaymentSettings = require('../models/PaymentSettings')
const { logActivity } = require('../utils/activityLogger')

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
// LETTERHEAD MANAGEMENT
// ==========================================

/**
 * @route   POST /api/billing/settings/letterhead
 * @desc    Add new letterhead/firm
 * @access  Admin only
 */
exports.addLetterhead = async (req, res) => {
  try {
    const adminId = req.user.id
    const { firmName, firmSubtitle, proprietorName, designation, isDefault } = req.body
    
    if (!firmName) {
      return res.status(400).json({
        success: false,
        error: 'Firm name is required'
      })
    }
    
    let settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      settings = await PaymentSettings.create({ adminId })
    }
    
    // If this is set as default, unset other defaults
    if (isDefault) {
      settings.letterheads.forEach(lh => lh.isDefault = false)
    }
    
    settings.letterheads.push({
      firmName,
      firmSubtitle: firmSubtitle || '',
      proprietorName: proprietorName || '',
      designation: designation || 'Proprietor',
      isDefault: isDefault || settings.letterheads.length === 0 // First one is default
    })
    
    await settings.save()
    
    res.json({
      success: true,
      message: 'Letterhead added successfully',
      settings
    })
  } catch (error) {
    console.error('Error adding letterhead:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add letterhead'
    })
  }
}

/**
 * @route   PATCH /api/billing/settings/letterhead/:letterheadId
 * @desc    Update letterhead
 * @access  Admin only
 */
exports.updateLetterhead = async (req, res) => {
  try {
    const adminId = req.user.id
    const { letterheadId } = req.params
    const { firmName, firmSubtitle, proprietorName, designation } = req.body
    
    const settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Payment settings not found'
      })
    }
    
    const letterhead = settings.letterheads.id(letterheadId)
    if (!letterhead) {
      return res.status(404).json({
        success: false,
        error: 'Letterhead not found'
      })
    }
    
    // Update fields
    if (firmName) letterhead.firmName = firmName
    if (firmSubtitle !== undefined) letterhead.firmSubtitle = firmSubtitle
    if (proprietorName !== undefined) letterhead.proprietorName = proprietorName
    if (designation !== undefined) letterhead.designation = designation
    
    await settings.save()
    
    res.json({
      success: true,
      message: 'Letterhead updated successfully',
      settings
    })
  } catch (error) {
    console.error('Error updating letterhead:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update letterhead'
    })
  }
}

/**
 * @route   DELETE /api/billing/settings/letterhead/:letterheadId
 * @desc    Delete letterhead
 * @access  Admin only
 */
exports.deleteLetterhead = async (req, res) => {
  try {
    const adminId = req.user.id
    const { letterheadId } = req.params
    
    const settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Payment settings not found'
      })
    }
    
    settings.letterheads.pull(letterheadId)
    await settings.save()
    
    res.json({
      success: true,
      message: 'Letterhead deleted successfully',
      settings
    })
  } catch (error) {
    console.error('Error deleting letterhead:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete letterhead'
    })
  }
}

/**
 * @route   PATCH /api/billing/settings/letterhead/:letterheadId/default
 * @desc    Set default letterhead
 * @access  Admin only
 */
exports.setDefaultLetterhead = async (req, res) => {
  try {
    const adminId = req.user.id
    const { letterheadId } = req.params
    
    const settings = await PaymentSettings.findOne({ adminId })
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Payment settings not found'
      })
    }
    
    // Update all letterheads
    settings.letterheads.forEach(lh => {
      lh.isDefault = lh._id.toString() === letterheadId
    })
    
    await settings.save()
    
    res.json({
      success: true,
      message: 'Default letterhead updated successfully',
      settings
    })
  } catch (error) {
    console.error('Error setting default letterhead:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to set default letterhead'
    })
  }
}

// ==========================================
// BILLING OPERATIONS ON TASKS
// ==========================================

/**
 * @route   PATCH /api/billing/tasks/:taskId/issue
 * @desc    Issue bill for a task (payment mode is set later when marking payment)
 * @access  Admin only
 */
exports.issueBill = async (req, res) => {
  try {
    const { taskId } = req.params
    const adminId = req.user.id
    const {
      amount,
      dueDate,
      invoiceNumber,
      taxAmount,
      discount,
      letterhead
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
      try {
        const settings = await PaymentSettings.findOne({ adminId })
        if (settings && settings.generateInvoiceNumber) {
          finalInvoiceNumber = settings.generateInvoiceNumber()
          await settings.save()
        } else {
          // Simple fallback: INV-YYYYMMDD-RANDOM
          const today = new Date()
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
          finalInvoiceNumber = `INV-${dateStr}-${random}`
        }
      } catch (invErr) {
        // Fallback invoice number
        const timestamp = Date.now().toString().slice(-8)
        finalInvoiceNumber = `INV-${timestamp}`
      }
    }
    
    // Preserve existing advance payment data (only if it exists)
    let advanceData = null
    if (task.billing?.advance && task.billing.advance.isPaid) {
      // Convert mongoose subdoc to plain object and only take defined values
      const adv = task.billing.advance
      advanceData = {
        isPaid: adv.isPaid || false,
        amount: adv.amount || 0,
        receiptNumber: adv.receiptNumber || '',
        paymentMode: adv.paymentMode || 'NOT_SPECIFIED',
        transactionId: adv.transactionId || '',
        paidAt: adv.paidAt || new Date(),
        notes: adv.notes || ''
      }
      if (adv.receivedBy) {
        advanceData.receivedBy = adv.receivedBy
      }
    }
    
    // Build billing object
    const billingData = {
      // Bill details
      amount,
      dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days
      paymentMode: 'NOT_SPECIFIED', // Set when marking payment
      paymentStatus: 'UNPAID',
      issuedBy: adminId,
      issuedAt: new Date(),
      invoiceNumber: finalInvoiceNumber,
      taxAmount: taxAmount || 0,
      discount: discount || 0,
      paidAmount: 0
    }
    
    // Only add advance if it exists and is valid
    if (advanceData) {
      billingData.advance = advanceData
    }
    
    if (letterhead && letterhead.firmName) {
      billingData.letterhead = {
        firmName: letterhead.firmName,
        firmSubtitle: letterhead.firmSubtitle || '',
        proprietorName: letterhead.proprietorName || '',
        designation: letterhead.designation || 'Proprietor'
      }
    }
    
    // Update billing information
    task.billing = billingData
    
    await task.save()

    // Log Activity
    await logActivity({
      user: req.user._id,
      type: 'BILLING',
      action: 'ISSUE_BILL',
      description: `Issued bill ${task.billing.invoiceNumber} for task: ${task.title}`,
      priority: 'IMPORTANT',
      relatedId: task._id,
      relatedModel: 'Task'
    })
    
    await task.populate([
      { path: 'client', select: 'name code email phone mobile address' },
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
      error: error.message || 'Failed to issue bill'
    })
  }
}

/**
 * @route   PATCH /api/billing/tasks/:taskId/edit
 * @desc    Edit an issued bill (amount, due date, tax, discount)
 * @access  Admin only
 */
exports.editBill = async (req, res) => {
  try {
    const { taskId } = req.params
    const { amount, dueDate, taxAmount, discount } = req.body
    
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
        error: 'No bill issued for this task. Issue a bill first.'
      })
    }
    
    // Don't allow editing if already fully paid
    if (task.billing.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit a fully paid bill'
      })
    }
    
    // Update only the editable fields
    if (amount !== undefined && amount > 0) {
      task.billing.amount = amount
    }
    if (dueDate !== undefined) {
      task.billing.dueDate = new Date(dueDate)
    }
    if (taxAmount !== undefined) {
      task.billing.taxAmount = taxAmount
    }
    if (discount !== undefined) {
      task.billing.discount = discount
    }
    
    await task.save()
    
    await task.populate([
      { path: 'client', select: 'name code email phone mobile address' },
      { path: 'billing.issuedBy', select: 'firstName lastName email' }
    ])
    
    res.json({
      success: true,
      message: 'Bill updated successfully',
      task
    })
  } catch (error) {
    console.error('Error editing bill:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to edit bill'
    })
  }
}

/**
 * @route   PATCH /api/billing/tasks/:taskId/payment
 * @desc    Mark bill as paid (with payment mode)
 * @access  Admin only
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { taskId } = req.params
    const { 
      paidAmount, 
      paidAt, 
      transactionId, 
      paymentNotes,
      paymentMode,
      selectedQRCode 
    } = req.body
    
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
    
    // Calculate the actual total (amount + tax - discount)
    const baseAmount = task.billing.amount || 0
    const taxAmount = task.billing.taxAmount || 0
    const discountAmount = task.billing.discount || 0
    const totalBillAmount = baseAmount + taxAmount - discountAmount
    
    // Advance payment
    const advancePaid = task.billing.advance?.amount || 0
    const previouslyPaid = task.billing.paidAmount || 0
    
    // Calculate remaining before this payment
    const remainingBeforePayment = totalBillAmount - advancePaid - previouslyPaid
    
    // New payment amount
    const newPayment = paidAmount || remainingBeforePayment
    const totalPaidAmount = previouslyPaid + newPayment
    
    // Calculate total paid including advance
    const totalReceived = totalPaidAmount + advancePaid
    
    // Determine payment status
    let paymentStatus = 'UNPAID'
    if (totalReceived >= totalBillAmount) {
      paymentStatus = 'PAID'
    } else if (totalReceived > 0) {
      paymentStatus = 'PARTIALLY_PAID'
    }
    
    // Add to payment history
    const paymentRecord = {
      amount: newPayment,
      mode: paymentMode || 'NOT_SPECIFIED',
      transactionId: transactionId || '',
      notes: paymentNotes || '',
      paidAt: paidAt || new Date()
    }
    
    // Initialize payment history if not exists
    if (!task.billing.paymentHistory) {
      task.billing.paymentHistory = []
    }
    task.billing.paymentHistory.push(paymentRecord)
    
    // Update billing information
    task.billing.paidAmount = totalPaidAmount
    task.billing.paidAt = paidAt || new Date()
    task.billing.transactionId = transactionId || ''
    task.billing.paymentNotes = paymentNotes || ''
    task.billing.paymentStatus = paymentStatus
    
    // Set payment mode at payment time (not at bill issuance)
    if (paymentMode) {
      task.billing.paymentMode = paymentMode
    }
    
    // Set QR code if UPI payment
    if (paymentMode === 'UPI' && selectedQRCode) {
      task.billing.selectedQRCode = selectedQRCode
    }
    
    await task.save()

    // Log Activity
    await logActivity({
      user: req.user._id,
      type: 'PAYMENT',
      action: 'MARK_PAID',
      description: `Payment received for task: ${task.title} (Amount: ₹${newPayment})`,
      priority: 'CRITICAL',
      relatedId: task._id,
      relatedModel: 'Task',
      metadata: { amount: newPayment, mode: paymentMode }
    })
    
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
 * @desc    Get billing dashboard stats with pagination
 * @access  Admin only
 */
exports.getBillingDashboard = async (req, res) => {
  try {
    const { status, clientId, fromDate, toDate, search, page = 1, limit = 20 } = req.query
    
    // Parse pagination params
    const parsedPage = parseInt(page, 10)
    const parsedLimit = parseInt(limit, 10)
    const skip = (parsedPage - 1) * parsedLimit
    
    // Build query
    const query = { 'billing.paymentStatus': { $ne: 'NOT_ISSUED' } }
    
    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
        const today = new Date()
        query['billing.paymentStatus'] = 'UNPAID'
        query['billing.dueDate'] = { $lt: today }
      } else {
        query['billing.paymentStatus'] = status
      }
    }
    
    if (clientId) {
      query.client = clientId
    }
    
    if (fromDate || toDate) {
      query['billing.issuedAt'] = {}
      if (fromDate) query['billing.issuedAt'].$gte = new Date(fromDate)
      if (toDate) query['billing.issuedAt'].$lte = new Date(toDate)
    }

    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      
      // Find matching clients first
      const Client = require('../models/Client')
      const matchingClients = await Client.find({
        $or: [
          { name: searchRegex },
          { code: searchRegex }
        ]
      }).select('_id')
      const clientIds = matchingClients.map(c => c._id)

      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { title: searchRegex },
            { 'billing.invoiceNumber': searchRegex },
            { client: { $in: clientIds } }
          ]
        }
      ]
    }
    
    // Get total count for pagination (before limit/skip)
    const totalCount = await Task.countDocuments(query)
    
    // Fetch paginated tasks
    const tasks = await Task.find(query)
      .populate('client', 'name code email')
      .populate('billing.issuedBy', 'firstName lastName')
      .sort({ 'billing.issuedAt': -1 })
      .skip(skip)
      .limit(parsedLimit)
    
    // Calculate statistics based on FULL FILTERED dataset (not just current page)
    // This ensures stats reflect all filtered bills, not just the paginated view
    const allFilteredTasks = await Task.find(query)
      .select('billing')
      .lean()
    
    const stats = {
      totalBills: allFilteredTasks.length,
      // Total amount includes tax and subtracts discount
      totalAmount: allFilteredTasks.reduce((sum, t) => {
        const base = t.billing?.amount || 0
        const tax = t.billing?.taxAmount || 0
        const disc = t.billing?.discount || 0
        return sum + base + tax - disc
      }, 0),
      // Total paid includes advance + paidAmount
      totalPaid: allFilteredTasks.reduce((sum, t) => {
        const advance = t.billing?.advance?.amount || 0
        const paid = t.billing?.paidAmount || 0
        return sum + advance + paid
      }, 0),
      unpaid: allFilteredTasks.filter(t => t.billing?.paymentStatus === 'UNPAID').length,
      paid: allFilteredTasks.filter(t => t.billing?.paymentStatus === 'PAID').length,
      overdue: allFilteredTasks.filter(t => 
        t.billing?.paymentStatus === 'UNPAID' && 
        new Date(t.billing.dueDate) < new Date()
      ).length,
      partiallyPaid: allFilteredTasks.filter(t => t.billing?.paymentStatus === 'PARTIALLY_PAID').length
    }
    
    res.json({
      success: true,
      stats,
      tasks,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(totalCount / parsedLimit)
      }
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
