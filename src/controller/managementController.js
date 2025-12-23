const { User } = require('../models/User')
const Client = require('../models/Client')
const Task = require('../models/Task')
const mongoose = require('mongoose')

/**
 * @desc Get all inactive staff and clients for cleanup
 * @route GET /api/management/inactive-entities
 * @access Admin only
 */
exports.getInactiveEntities = async (req, res) => {
  try {
    // 1. Get inactive staff (role STAFF and isActive false)
    const inactiveStaff = await User.find({
      role: 'STAFF',
      isActive: false
    }).select('firstName lastName email phone lastActive createdAt')

    // 2. Get inactive clients (isActive false)
    const inactiveClients = await Client.find({
      isActive: false
    }).select('name code email mobile gstin createdAt')

    res.json({
      success: true,
      data: {
        staff: inactiveStaff,
        clients: inactiveClients
      }
    })
  } catch (error) {
    console.error('Error fetching inactive entities:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inactive entities'
    })
  }
}

/**
 * @desc Permanently delete an inactive staff member
 * @route DELETE /api/management/staff/:staffId
 * @access Admin only
 */
exports.deleteInactiveStaff = async (req, res) => {
  try {
    const { staffId } = req.params

    const staff = await User.findOne({ _id: staffId, role: 'STAFF', isActive: false })
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Inactive staff member not found'
      })
    }

    // Check if they have active tasks
    const activeTasksCount = await Task.countDocuments({ assignedTo: staffId, isArchived: false })
    if (activeTasksCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete staff with ${activeTasksCount} active tasks. Reassign them first.`
      })
    }

    // 2. Snapshot their name into all their tasks (active + archived)
    // This preserves history after the staff object is gone
    const staffName = `${staff.firstName} ${staff.lastName || ''}`.trim()
    
    //console.log(`📸 Snapshotting name "${staffName}" into all tasks for staff: ${staffId}`)
    
    const updateResult = await Task.updateMany(
      { assignedTo: staffId },
      { 
        $set: { legacyAssignedName: staffName },
        assignedTo: null  // Remove dangling reference
      }
    )

    //console.log(`✅ Updated ${updateResult.modifiedCount} tasks with legacy name`)

    // 3. Delete the user account
    await User.findByIdAndDelete(staffId)

   // console.log(`🗑️ Deleted staff account: ${staffId}`)

    res.json({
      success: true,
      message: `Staff member deleted successfully. ${updateResult.modifiedCount} tasks preserved with legacy attribution.`,
      stats: {
        tasksPreserved: updateResult.modifiedCount,
        staffName: staffName
      }
    })
  } catch (error) {
    console.error('Error deleting staff:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete staff member'
    })
  }
}

/**
 * @desc Permanently delete an inactive client
 * @route DELETE /api/management/clients/:clientId
 * @access Admin only
 */
exports.deleteInactiveClient = async (req, res) => {
  try {
    const { clientId } = req.params

    const client = await Client.findOne({ _id: clientId, isActive: false })
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Inactive client not found'
      })
    }

    // Check if they have active tasks
    const activeTasksCount = await Task.countDocuments({ client: clientId, isArchived: false })
    if (activeTasksCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete client with ${activeTasksCount} active tasks.`
      })
    }

    // If they have archived tasks, they will be deleted too
    await Task.deleteMany({ client: clientId, isArchived: true })
    await Client.findByIdAndDelete(clientId)

    res.json({
      success: true,
      message: 'Client and their archived tasks permanently deleted'
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete client'
    })
  }
}

/**
 * @desc Get all tasks assigned to inactive or deleted staff
 * @route GET /api/management/inactive-staff-tasks
 * @access Admin only
 */
exports.getInactiveStaffTasks = async (req, res) => {
  try {
    // 1. Find all inactive staff IDs
    const inactiveStaff = await User.find({ role: 'STAFF', isActive: false }).select('_id')
    const inactiveStaffIds = inactiveStaff.map(s => s._id)

    // 2. Find tasks assigned to these IDs OR tasks that have a legacy name saved
    const tasks = await Task.find({
      $or: [
        { assignedTo: { $in: inactiveStaffIds } },
        { legacyAssignedName: { $exists: true, $ne: null } }
      ]
    })
    .populate('client', 'name code')
    .populate('assignedTo', 'firstName lastName email')
    .sort({ updatedAt: -1 })

    res.json({
      success: true,
      tasks
    })
  } catch (error) {
    console.error('Error fetching inactive staff tasks:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks for inactive staff'
    })
  }
}
