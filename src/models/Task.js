const { Schema, model, Types } = require('mongoose')

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
    owner: { type: Types.ObjectId, ref: 'User', required: true }, // Administrator
    client: { type: Types.ObjectId, ref: 'Client', required: true },

    title: { type: String, required: true },
    serviceType: String,
    assessmentYear: String,
    period: String,

    assignedTo: { type: Types.ObjectId, ref: 'User' }, // Staff or Admin

    priority: { type: String, default: 'NORMAL' },

    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'NOT_STARTED'
    },

    dueDate: Date,
    completedAt: Date,

    notes: [noteSchema],

    statusHistory: [statusHistorySchema],

    isArchived: { type: Boolean, default: false },
    archivedAt: Date,
  },
  { timestamps: true }
)

module.exports = model('Task', taskSchema)
