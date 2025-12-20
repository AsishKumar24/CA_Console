const { Schema, model, Types, models } = require('mongoose')

// ------------------------------------------------------
// Notes on the task (admin & staff)
// ------------------------------------------------------
const noteSchema = new Schema(
  {
    message: { type: String, required: true },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

// ------------------------------------------------------
// Status history entries
// ------------------------------------------------------
const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Types.ObjectId, ref: 'User', required: true },
    note: String
  },
  { _id: false }
)

// ------------------------------------------------------
// Main Task Schema
// ------------------------------------------------------
const taskSchema = new Schema(
  {
   title: {
    type: String,
    required: true
  },
  serviceType: String,
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH'],
    default: 'NORMAL'
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'NOT_STARTED'
  },
  dueDate: Date,
  assessmentYear: String,
  period: String,
  
  // Relationships
  client: {
    type: Types.ObjectId,
    ref: 'Client',
    required: true
  },
  assignedTo: {
    type: Types.ObjectId,
    ref: 'User'
  },
  owner: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Archive fields
  isArchived: {
    type: Boolean,
    default: false,
    index: true  // Index for faster queries
  },
  archivedAt: Date,
  archivedBy: {
    type: Types.ObjectId,
    ref: 'User'
  },
  autoArchived: {
    type: Boolean,
    default: false
  },
  
  // Completion tracking
  completedAt: Date,  // Added for auto-archive
  
  // Billing Section
  billing: {
    // Bill Issuance
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    dueDate: Date,
    
    // Payment Mode
    paymentMode: {
      type: String,
      enum: ['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'NOT_SPECIFIED'],
      default: 'NOT_SPECIFIED'
    },
    
    // Selected QR Code (if UPI)
    selectedQRCode: {
      name: String,
      qrImageUrl: String,
      upiId: String
    },
    
    // Payment Status
    paymentStatus: {
      type: String,
      enum: ['NOT_ISSUED', 'UNPAID', 'PAID', 'OVERDUE', 'PARTIALLY_PAID'],
      default: 'NOT_ISSUED',
      index: true  // Index for filtering
    },
    
    // Payment Tracking
    paidAt: Date,
    paidAmount: {
      type: Number,
      default: 0
    },
    transactionId: String,
    paymentNotes: String,
    
    // Bill Metadata
    issuedBy: {
      type: Types.ObjectId,
      ref: 'User'
    },
    issuedAt: Date,
    
    // Invoice Details
    invoiceNumber: String,  // Auto-generated or manual
    taxAmount: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    }
  },
  
  // Notes
  notes: [{
    message: String,
    createdBy: {
      type: Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status History
  statusHistory: [{
    status: String,
    changedBy: {
      type: Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    note: String
  }]
  },
  { timestamps: true }
)

module.exports = models.Task || model('Task', taskSchema)
