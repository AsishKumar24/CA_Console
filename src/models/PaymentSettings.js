const { Schema, model, Types } = require('mongoose')

// ------------------------------------------------------
// Payment Settings Schema - For Admin QR Codes & Bank Details
// ------------------------------------------------------

const qrCodeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    upiId: {
      type: String,
      trim: true
    },
    qrImageUrl: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
)

const bankAccountSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    ifscCode: {
      type: String,
      required: true
    },
    accountHolderName: {
      type: String,
      required: true
    },
    bankName: String,
    branch: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
)

const paymentSettingsSchema = new Schema(
  {
    adminId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true  // One settings doc per admin/organization
    },
    
    // QR Codes for UPI payments
    qrCodes: [qrCodeSchema],
    
    // Bank account details for bank transfers
    bankAccounts: [bankAccountSchema],
    
    // General settings
    defaultCurrency: {
      type: String,
      default: 'INR'
    },
    
    // Tax settings
    taxEnabled: {
      type: Boolean,
      default: false
    },
    taxPercentage: {
      type: Number,
      default: 0
    },
    
    // Invoice settings
    invoicePrefix: {
      type: String,
      default: 'INV'
    },
    nextInvoiceNumber: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
)

// Method to generate next invoice number
paymentSettingsSchema.methods.generateInvoiceNumber = function() {
  const invoiceNumber = `${this.invoicePrefix}-${String(this.nextInvoiceNumber).padStart(5, '0')}`
  this.nextInvoiceNumber += 1
  return invoiceNumber
}

module.exports = model('PaymentSettings', paymentSettingsSchema)
