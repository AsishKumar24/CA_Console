const mongoose = require('mongoose')
const sanitize = require('express-mongo-sanitize')
const Task = require('../models/Task')
const {User} = require('../models/User')
const Client = require('../models/Client')

// ---------------------------------------
// Helper: Prevent operations on archived tasks
// ---------------------------------------
function checkArchived (res, task) {
  if (task.isArchived) {
    return res.status(400).json({
      error: 'Task is archived. Restore it before performing this action.'
    })
  }
}

// ---------------------------------------
// CREATE TASK (Admin)
// ---------------------------------------
exports.createTask = async (req, res) => {
  try {
    const data = req.body

    if (!data.title)
      return res.status(400).json({
        error: 'Title is required'
      })
    if (!data.client)
      return res.status(400).json({
        error: 'Client ID required'
      })

    if (!mongoose.Types.ObjectId.isValid(data.client)) {
      return res.status(400).json({
        error: 'Invalid client ID'
      })
    }

    const client = await Client.findById(data.client)
    if (!client)
      return res.status(404).json({
        error: 'Client not found'
      })

    if (data.assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(data.assignedTo)) {
        return res.status(400).json({
          error: 'Invalid staff ID'
        })
      }

      const staff = await User.findById(data.assignedTo)
      if (!staff)
        return res.status(404).json({
          error: 'Assigned staff not found'
        })
    }

    // Prepare task data
    const taskData = {
      ...data,
      owner: req.user._id
    }

    // If notes are provided, add createdBy to each note
    if (data.notes && Array.isArray(data.notes)) {
      taskData.notes = data.notes.map(note => ({
        message: note.message,
        createdBy: req.user._id
      }))
    }

    const task = await Task.create(taskData)

    // Add NOT_STARTED status
    task.statusHistory.push({
      status: 'NOT_STARTED',
      changedBy: req.user._id
    })

    // If task is assigned during creation, add ASSIGNED status
    if (data.assignedTo) {
      task.statusHistory.push({
        status: 'ASSIGNED',
        changedBy: req.user._id
      })
    }

    await task.save()

    res.status(201).json({
      task
    })
  } catch (err) {
    console.error('createTask error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
}



// ---------------------------------------
// EDIT TASK (Admin only)
// ---------------------------------------
exports.editTask = async (req, res) => {
  try {
    const { taskId } = req.params
    const { title, serviceType, priority, dueDate, assessmentYear, period } =
      req.body

    console.log('✏️ Editing task:', taskId)

    // Check admin permission
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only administrators can edit tasks'
      })
    }

    const task = await Task.findById(taskId)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Prevent editing completed or archived tasks
    if (task.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Cannot edit completed tasks. Please restore first if needed.'
      })
    }

    if (task.isArchived) {
      return res.status(400).json({
        error: 'Cannot edit archived tasks. Please restore first.'
      })
    }

    // Update fields
    if (title) task.title = title
    if (serviceType !== undefined) task.serviceType = serviceType
    if (priority) task.priority = priority
    if (dueDate !== undefined) task.dueDate = dueDate
    if (assessmentYear !== undefined) task.assessmentYear = assessmentYear
    if (period !== undefined) task.period = period

    await task.save()

    console.log('✅ Task updated successfully')

    // Return populated task
    const updatedTask = await Task.findById(taskId)
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName email')
      .populate('owner', 'firstName')

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    })
  } catch (error) {
    console.error('❌ Error editing task:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
}


// ---------------------------------------
// ASSIGN TASK (Admin only)
// ---------------------------------------
exports.assignTask = async (req, res) => {
  try {
    const { taskId } = req.params
    const { staffId } = req.body

    if (!mongoose.Types.ObjectId.isValid(taskId))
      return res.status(400).json({
        error: 'Invalid task ID'
      })

    if (!mongoose.Types.ObjectId.isValid(staffId))
      return res.status(400).json({
        error: 'Invalid staff ID'
      })

    const task = await Task.findById(taskId)
    if (!task)
      return res.status(404).json({
        error: 'Task not found'
      })

    if (task.owner.toString() !== req.user._id.toString())
      return res.status(403).json({
        error: 'Not permitted'
      })

    if (task.isArchived) return checkArchived(res, task)

    task.assignedTo = staffId

    task.statusHistory.push({
      status: 'ASSIGNED',
      changedBy: req.user._id
    })

    await task.save()

    res.json({
      message: 'Task assigned',
      task
    })
  } catch (err) {
    console.error('assignTask error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
}

// ---------------------------------------
// UPDATE STATUS (Admin + Staff)
// ---------------------------------------
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params
    const { status, note } = req.body

    console.log('🔄 Updating task status:', taskId, '→', status)

    const task = await Task.findById(taskId)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Permission check
    const isAdmin = req.user.role === 'ADMIN'
    const isAssigned = task.assignedTo?.toString() === req.user.id

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({
        error: 'You do not have permission to update this task'
      })
    }

    // Cannot update archived tasks
    if (task.isArchived) {
      return res.status(400).json({
        error: 'Cannot update status of archived tasks'
      })
    }

    // Store old status
    const oldStatus = task.status

    // Update status
    task.status = status

    // Track completion time
    if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      task.completedAt = new Date()
      console.log('✅ Task marked as completed, will auto-archive in 7 days')
    }

    // Add to status history
    task.statusHistory.push({
      status: status,
      changedBy: req.user.id,
      changedAt: new Date(),
      note: note || `Status changed from ${oldStatus} to ${status}`
    })

    await task.save()

    console.log('✅ Status updated successfully')

    const updatedTask = await Task.findById(taskId)
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName email')
      .populate('statusHistory.changedBy', 'firstName')

    res.json({
      message: 'Status updated successfully',
      task: updatedTask
    })
  } catch (error) {
    console.error('❌ Error updating status:', error)
    res.status(500).json({ error: 'Failed to update status' })
  }
}

// ---------------------------------------
// ADD NOTE (Admin + Staff)
// ---------------------------------------
exports.addNote = async (req, res) => {
  try {
    const { taskId } = req.params
    const { message } = req.body

    if (!message)
      return res.status(400).json({
        error: 'Message required'
      })

    const task = await Task.findById(taskId)
    if (!task)
      return res.status(404).json({
        error: 'Task not found'
      })

    if (task.isArchived) return checkArchived(res, task)

    task.notes.push({
      message,
      createdBy: req.user._id
    })

    await task.save()
    res.json({
      message: 'Note added',
      task
    })
  } catch (err) {
    console.error('addNote error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
}

// ---------------------------------------
// ARCHIVE TASK (Admin only)
// ---------------------------------------
exports.archiveTask = async (req, res) => {
  try {
    const { taskId } = req.params

    console.log('📦 Archiving task:', taskId)

    // Check admin permission
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only administrators can archive tasks'
      })
    }

    const task = await Task.findById(taskId)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Already archived?
    if (task.isArchived) {
      return res.status(400).json({ error: 'Task is already archived' })
    }

    // ⭐ CRITICAL: Update fields
    task.isArchived = true
    task.archivedAt = new Date()
    task.archivedBy = req.user.id
    task.autoArchived = false // Manual archive

    // ⭐ CRITICAL: Save to database
    await task.save()

    console.log('✅ Task archived successfully (manual)')

    res.json({
      message: 'Task archived successfully',
      task: {
        _id: task._id,
        isArchived: task.isArchived,
        archivedAt: task.archivedAt
      }
    })
  } catch (error) {
    console.error('❌ Error archiving task:', error)
    res.status(500).json({ error: 'Failed to archive task' })
  }
}



// ---------------------------------------
// RESTORE TASK (Admin only)
// ---------------------------------------
exports.restoreTask = async (req, res) => {
  try {
    const { taskId } = req.params

    console.log('🔄 Restoring task:', taskId)

    // Check admin permission
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only administrators can restore tasks'
      })
    }

    const task = await Task.findById(taskId)

    if (!task) {
      console.log('❌ Task not found:', taskId)
      return res.status(404).json({ error: 'Task not found' })
    }

    // Not archived?
    if (!task.isArchived) {
      return res.status(400).json({ error: 'Task is not archived' })
    }

    console.log('📋 Task before restore:', {
      id: task._id,
      isArchived: task.isArchived,
      archivedAt: task.archivedAt,
      autoArchived: task.autoArchived
    })

    // ⭐ CRITICAL: Update fields
    task.isArchived = false
    task.archivedAt = undefined // or null
    task.archivedBy = undefined // or null
    task.autoArchived = false

    // ⭐ CRITICAL: Save to database
    await task.save()

    console.log('✅ Task restored successfully:', {
      id: task._id,
      isArchived: task.isArchived,
      archivedAt: task.archivedAt
    })

    // Return populated task
    const restoredTask = await Task.findById(taskId)
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName email')
      .populate('owner', 'firstName')

    res.json({
      message: 'Task restored successfully',
      task: restoredTask
    })
  } catch (error) {
    console.error('❌ Error restoring task:', error)
    res.status(500).json({ error: 'Failed to restore task' })
  }
}




// ---------------------------------------
// GET STAFF TASKS (Paginated)
// ---------------------------------------
exports.getMyTasks = async (req, res) => {
  try {
    const { archived } = req.query

    let filter = {
      $or: [{ assignedTo: req.user.id }, { owner: req.user.id }]
    }

    // ⭐ Filter by archived status
    if (archived === 'true') {
      filter.isArchived = true
    } else {
      filter.isArchived = { $ne: true }
    }

    const tasks = await Task.find(filter)
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName email')
      .populate('owner', 'firstName')
      .sort({ createdAt: -1 })

    res.json({ tasks })
  } catch (error) {
    console.error('❌ Error fetching my tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
}


// ---------------------------------------
// GET ADMIN ALL TASKS (Paginated + Filters)
// ---------------------------------------
exports.getAdminTasks = async (req, res) => {
  try {
    const { archived, status, assignedTo, client } = req.query

    let filter = {}

    // ⭐ Filter by archived status
    if (archived === 'true') {
      filter.isArchived = true
    } else {
      filter.isArchived = { $ne: true } // Exclude archived by default
    }

    // Additional filters
    if (status) filter.status = status
    if (assignedTo) filter.assignedTo = assignedTo
    if (client) filter.client = client

    // If staff user, only show their tasks
    if (req.user.role !== 'ADMIN') {
      filter.$or = [{ assignedTo: req.user.id }, { owner: req.user.id }]
    }

    const tasks = await Task.find(filter)
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName email')
      .populate('owner', 'firstName')
      .sort({ createdAt: -1 })

    console.log(
      `📊 Found ${tasks.length} tasks (archived: ${archived || 'false'})`
    )

    res.json({ tasks })
  } catch (error) {
    console.error('❌ Error fetching tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
}


// ---------------------------------------
// ADMIN SUMMARY
// ---------------------------------------
exports.adminSummary = async (req, res) => {
  const owner = req.user._id

  const total = await Task.countDocuments({
    owner,
    isArchived: false
  })
  const assigned = await Task.countDocuments({
    owner,
    isArchived: false,
    assignedTo: {
      $ne: null
    }
  })
  const completed = await Task.countDocuments({
    owner,
    isArchived: false,
    status: 'COMPLETED'
  })

  res.json({
    total,
    assigned,
    completed
  })
}

// ---------------------------------------
// STAFF SUMMARY
// ---------------------------------------
exports.staffSummary = async (req, res) => {
  const uid = req.user._id

  const assigned = await Task.countDocuments({
    assignedTo: uid,
    isArchived: false
  })

  const completed = await Task.countDocuments({
    assignedTo: uid,
    isArchived: false,
    status: 'COMPLETED'
  })

  res.json({
    assigned,
    completed
  })
}
exports.getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params

    console.log('📋 Fetching task:', taskId)

    const task = await Task.findById(taskId)
      .populate('client', 'name code email phone')
      .populate('assignedTo', 'firstName email role')
      .populate('owner', 'firstName email role')
      .populate('notes.createdBy', 'firstName')
      .populate('statusHistory.changedBy', 'firstName')

    if (!task) {
      console.log('❌ Task not found:', taskId)
      return res.status(404).json({ error: 'Task not found' })
    }

    // Permission check: Admin OR Owner OR Assigned User
    const isAdmin = req.user.role === 'ADMIN'
    const isOwner = task.owner._id.toString() === req.user.id
    const isAssigned = task.assignedTo?._id.toString() === req.user.id

    if (!isAdmin && !isOwner && !isAssigned) {
      console.log('❌ Permission denied for user:', req.user.id)
      return res.status(403).json({
        error: 'You do not have permission to view this task'
      })
    }

    console.log('✅ Task fetched successfully')
    res.json({ task })
  } catch (error) {
    console.error('❌ Error fetching task:', error)
    res.status(500).json({ error: 'Failed to fetch task details' })
  }
}


