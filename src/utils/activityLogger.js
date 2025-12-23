const Activity = require('../models/Activity');

/**
 * Logs an activity in the system
 * @param {Object} params - Activity parameters
 * @param {ObjectId} params.user - User performing the action
 * @param {String} params.type - Activity type (TASK, CLIENT, BILLING, etc.)
 * @param {String} params.action - Short action name (CREATE, UPDATE, DELETE, etc.)
 * @param {String} params.description - Human readable description
 * @param {ObjectId} [params.relatedId] - ID of the related object (optional)
 * @param {String} [params.relatedModel] - Model name of related object (optional)
 * @param {Object} [params.metadata] - Additional metadata (optional)
 */
const logActivity = async ({
  user,
  type,
  action,
  description,
  relatedId,
  relatedModel,
  metadata = {}
}) => {
  try {
    const activity = new Activity({
      user,
      type,
      action,
      description,
      relatedId,
      relatedModel,
      metadata
    });
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    // We don't want activity logging to crash the main process
    return null;
  }
};

module.exports = { logActivity };
