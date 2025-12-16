const mongoose = require('mongoose')
const sanitize = require('express-mongo-sanitize')
const Task = require('../models/Task')
const User = require('../models/User')
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

    const task = await Task.create({
      ...data,
      owner: req.user._id,
      createdBy: req.user._id
    })

    task.statusHistory.push({
      status: 'NOT_STARTED',
      changedBy: req.user._id
    })

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

    if (!mongoose.Types.ObjectId.isValid(taskId))
      return res.status(400).json({
        error: 'Invalid task ID'
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

    const allowedFields = [
      'title',
      'serviceType',
      'priority',
      'dueDate',
      'assessmentYear',
      'period'
    ]

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) task[field] = req.body[field]
    })

    await task.save()
    res.json({
      message: 'Task updated',
      task
    })
  } catch (err) {
    console.error('editTask error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
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

    if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status))
      return res.status(400).json({
        error: 'Invalid status'
      })

    const task = await Task.findById(taskId)
    if (!task)
      return res.status(404).json({
        error: 'Task not found'
      })

    if (task.isArchived) return checkArchived(res, task)

    if (
      req.user.role === 'STAFF' &&
      task.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        error: 'Not your task'
      })
    }

    task.status = status

    if (status === 'COMPLETED') task.completedAt = new Date()

    task.statusHistory.push({
      status,
      note,
      changedBy: req.user._id
    })

    await task.save()

    res.json({
      message: 'Status updated',
      task
    })
  } catch (err) {
    console.error('updateTaskStatus error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
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

    if (!mongoose.Types.ObjectId.isValid(taskId))
      return res.status(400).json({
        error: 'Invalid task ID'
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

    task.isArchived = true
    task.archivedAt = new Date()

    await task.save()
    res.json({
      message: 'Task archived',
      task
    })
  } catch (err) {
    console.error('archiveTask error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
}

// ---------------------------------------
// RESTORE TASK (Admin only)
// ---------------------------------------
exports.restoreTask = async (req, res) => {
  try {
    const { taskId } = req.params

    if (!mongoose.Types.ObjectId.isValid(taskId))
      return res.status(400).json({
        error: 'Invalid task ID'
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

    task.isArchived = false
    task.archivedAt = null

    await task.save()
    res.json({
      message: 'Task restored',
      task
    })
  } catch (err) {
    console.error('restoreTask error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
}

// ---------------------------------------
// GET STAFF TASKS (Paginated)
// ---------------------------------------
exports.getMyTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1')
    const limit = parseInt(req.query.limit || '20')
    const skip = (page - 1) * limit

    const filter = {
      assignedTo: req.user._id,
      isArchived: false
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('client', 'name code')
        .sort({
          dueDate: 1
        })
        .skip(skip)
        .limit(limit),

      Task.countDocuments(filter)
    ])

    res.json({
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    console.error('getMyTasks error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
}

// ---------------------------------------
// GET ADMIN ALL TASKS (Paginated + Filters)
// ---------------------------------------
exports.getAdminTasks = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, assignedTo } = req.query

    const filter = {
      owner: req.user._id,
      isArchived: false
    }

    if (status) filter.status = status
    if (assignedTo) filter.assignedTo = assignedTo

    const skip = (page - 1) * limit

    const tasks = await Task.find(filter)
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName email')
      .sort({
        createdAt: -1
      })
      .skip(skip)
      .limit(Number(limit))

    const total = await Task.countDocuments(filter)

    res.json({
      tasks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    console.error('getAdminTasks error:', err)
    res.status(500).json({
      error: 'Internal server error'
    })
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
