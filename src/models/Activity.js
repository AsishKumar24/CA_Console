const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['TASK', 'CLIENT', 'BILLING', 'PAYMENT', 'SYSTEM'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['INFO', 'IMPORTANT', 'CRITICAL'],
    default: 'INFO'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  relatedModel: {
    type: String,
    enum: ['Task', 'Client', 'User'],
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    index: { expires: 0 } // TTL index - MongoDB will auto-delete when expiresAt is reached
  }
}, {
  timestamps: true
});

// Index for faster fetching of recent activities
activitySchema.index({ createdAt: -1 });

// Compound index for priority-based queries
activitySchema.index({ priority: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
