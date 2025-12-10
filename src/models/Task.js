const { Schema, model, Types } = require('mongoose')

const checklistItemSchema = new Schema(
  {
    label: String,
    isDone: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { type: Types.ObjectId, ref: 'User' }
  },
  { _id: false }
)

const statusHistorySchema = new Schema(
  {
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Types.ObjectId, ref: 'User' },
    note: String
  },
  { _id: false }
)

const taskSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true },
    client: { type: Types.ObjectId, ref: 'Client', required: true },
    title: { type: String, required: true },
    serviceType: String,
    assessmentYear: String,
    period: String,
    priority: { type: String, default: 'NORMAL' },
    status: { type: String, default: 'NOT_STARTED' },
    assignedTo: { type: Types.ObjectId, ref: 'User' },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    dueDate: Date,
    completedAt: Date,

    billing: {
      billingType: String,
      feeAmount: Number,
      isInvoiced: Boolean,
      invoiceId: String
    },

    reminders: {
      email: Boolean,
      whatsapp: Boolean
    },

    checklist: [checklistItemSchema],
    notesInternal: String,
    attachments: [
      { document: { type: Types.ObjectId, ref: 'Document' }, label: String }
    ],

    statusHistory: [statusHistorySchema]
  },
  { timestamps: true }
)

module.exports = model('Task', taskSchema)
