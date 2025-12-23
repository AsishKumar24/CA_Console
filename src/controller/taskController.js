const mongoose = require('mongoose')
const sanitize = require('express-mongo-sanitize')
const Task = require('../models/Task')
const {User} = require('../models/User')
const Client = require('../models/Client')
const nodemailer = require('nodemailer')
const { logActivity } = require('../utils/activityLogger')

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

    // ========== HANDLE ADVANCE PAYMENT ==========
    if (data.advance && data.advance.isPaid && data.advance.amount > 0) {
      // Generate receipt number: ADV-YYYYMMDD-XXX
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      
      // Count existing advance receipts for today to generate sequence
      const todayStart = new Date(today.setHours(0, 0, 0, 0))
      const todayEnd = new Date(today.setHours(23, 59, 59, 999))
      const count = await Task.countDocuments({
        'billing.advance.paidAt': { $gte: todayStart, $lte: todayEnd },
        'billing.advance.isPaid': true,
        owner: req.user._id
      })
      
      const receiptNumber = `ADV-${dateStr}-${String(count + 1).padStart(3, '0')}`
      
      taskData.billing = {
        ...taskData.billing,
        advance: {
          isPaid: true,
          amount: data.advance.amount,
          receiptNumber: receiptNumber,
          paymentMode: data.advance.paymentMode || 'NOT_SPECIFIED',
          transactionId: data.advance.transactionId || '',
          paidAt: data.advance.paidAt || new Date(),
          notes: data.advance.notes || '',
          receivedBy: req.user._id
        }
      }
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

    // Log Activity
    await logActivity({
      user: req.user._id,
      type: 'TASK',
      action: 'CREATE',
      description: `Created new task: ${task.title}`,
      relatedId: task._id,
      relatedModel: 'Task'
    })

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
    const { title, serviceType, priority, dueDate, assessmentYear, period, assignedTo } =
      req.body

   // console.log('✏️ Editing task:', taskId)

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

    // Handle re-assignment if provided
    if (assignedTo !== undefined) {
       // BLOCK reassignment for COMPLETED tasks
       if (task.status === 'COMPLETED') {
         // Silently ignore or you could return error. 
         // User requested: "if the task is completed then it cant be reassigned"
         // So we skip updating the field.
        // console.log('⚠️ Reassignment blocked: Task is COMPLETED')
       } else {
          const oldAssignee = task.assignedTo?.toString();
          const newAssignee = assignedTo || null;
          
          if (oldAssignee !== newAssignee) {
            task.assignedTo = newAssignee;
            task.statusHistory.push({
              status: 'REASSIGNED',
              changedBy: req.user.id,
              changedAt: new Date(),
              note: `Task re-assigned during edit`
            });
          }
       }
    }

    await task.save()

  //  console.log('✅ Task updated successfully')

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

    //console.log('🔄 Updating task status:', taskId, '→', status)

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
      //console.log('✅ Task marked as completed, will auto-archive in 7 days')
    }

    // Add to status history
    task.statusHistory.push({
      status: status,
      changedBy: req.user.id,
      changedAt: new Date(),
      note: note || `Status changed from ${oldStatus} to ${status}`
    })

    await task.save()

    // Log Activity
    await logActivity({
      user: req.user._id,
      type: 'TASK',
      action: 'UPDATE_STATUS',
      description: `Updated status to ${status} for task: ${task.title}`,
      relatedId: task._id,
      relatedModel: 'Task'
    })

   // console.log('✅ Status updated successfully')

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

   // console.log('📦 Archiving task:', taskId)

    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const isAdmin = req.user.role === 'ADMIN'
    const isAssigned = task.assignedTo?.toString() === req.user.id
    
    if (!isAdmin && !(isAssigned && task.status === 'COMPLETED')) {
      return res.status(403).json({
        error: 'Only administrators or the assigned staff (for completed tasks) can archive tasks'
      })
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

   // console.log('✅ Task archived successfully (manual)')

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
// PERMANENT DELETE TASK (Admin only, strict safeguards)
// ---------------------------------------
exports.permanentDeleteTask = async (req, res) => {
  try {
    const { taskId } = req.params

    //console.log('🗑️ Attempting permanent deletion of task:', taskId)

    // 1. Admin-only check
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Only administrators can permanently delete tasks' 
      })
    }

    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // 2. CRITICAL SAFETY CHECKS - Prevent deletion of important records

    // Block deletion of completed tasks (audit requirement)
    if (task.status === 'COMPLETED') {
      return res.status(400).json({
        error: '🚫 Cannot delete COMPLETED tasks - required for audit trail. Use Archive instead.'
      })
    }

    // Block deletion if task has billing records
    if (task.billing && task.billing.invoiceNumber) {
      return res.status(400).json({
        error: '🚫 Cannot delete tasks with issued invoices. This would violate financial records integrity.'
      })
    }

    // Block deletion if task has payment history
    if (task.billing && task.billing.paymentHistory && task.billing.paymentHistory.length > 0) {
      return res.status(400).json({
        error: '🚫 Cannot delete tasks with payment history. Financial records must be preserved.'
      })
    }

    // Block deletion if task has advance payment
    if (task.advance && task.advance.isPaid) {
      return res.status(400).json({
        error: '🚫 Cannot delete tasks with advance payments. Refund the advance first.'
      })
    }

    // 3. Additional warning for IN_PROGRESS tasks
    if (task.status === 'IN_PROGRESS') {
      //console.log('⚠️ Warning: Deleting IN_PROGRESS task')
    }

    // 4. Log deletion for audit trail (before deleting)
    // //console.log(`🗑️ PERMANENT DELETION:`, {
    //   taskId: task._id,
    //   title: task.title,
    //   client: task.client,
    //   status: task.status,
    //   deletedBy: req.user.id,
    //   deletedAt: new Date().toISOString()
    // })

    // 5. Perform deletion
    await Task.findByIdAndDelete(taskId)

    //console.log('✅ Task permanently deleted')

    res.json({
      success: true,
      message: 'Task permanently deleted',
      deletedTask: {
        id: task._id,
        title: task.title,
        status: task.status
      }
    })
  } catch (error) {
    console.error('❌ Error deleting task:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
}



// ---------------------------------------
// RESTORE TASK (Admin only)
// ---------------------------------------
exports.restoreTask = async (req, res) => {
  try {
    const { taskId } = req.params

    //console.log('🔄 Restoring task:', taskId)

    // Check admin permission
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only administrators can restore tasks'
      })
    }

    const task = await Task.findById(taskId)

    if (!task) {
      //console.log('❌ Task not found:', taskId)
      return res.status(404).json({ error: 'Task not found' })
    }

    // Not archived?
    if (!task.isArchived) {
      return res.status(400).json({ error: 'Task is not archived' })
    }

    // console.log('📋 Task before restore:', {
    //   id: task._id,
    //   isArchived: task.isArchived,
    //   archivedAt: task.archivedAt,
    //   autoArchived: task.autoArchived
    // })

    // ⭐ CRITICAL: Update fields
    task.isArchived = false
    task.archivedAt = undefined // or null
    task.archivedBy = undefined // or null
    task.autoArchived = false

    // ⭐ CRITICAL: Save to database
    await task.save()

    // console.log('✅ Task restored successfully:', {
    //   id: task._id,
    //   isArchived: task.isArchived,
    //   archivedAt: task.archivedAt
    // })

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

    let tasks = await Task.find(filter)
      .populate('client', 'name code isActive')
      .populate('assignedTo', 'firstName email')
      .populate('owner', 'firstName')
      .sort({ createdAt: -1 })

    // Filter out archived tasks of inactive clients
    tasks = tasks.filter(task => {
      if (task.isArchived && task.client && task.client.isActive === false) {
        return false;
      }
      return true;
    });

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
    const { archived, status, assignedTo, client, search, page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

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

    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      // We'll search by title. Client search usually requires populating first or using aggregation.
      // For now, let's just search by title.
      // If we want to search by client name/code, we'd need to find client IDs first or use aggregate.
      
      // OPTION: Find matching clients first
      const Client = require('../models/Client')
      const matchingClients = await Client.find({
        $or: [
          { name: searchRegex },
          { code: searchRegex }
        ]
      }).select('_id')
      const clientIds = matchingClients.map(c => c._id)

      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { title: searchRegex },
            { serviceType: searchRegex },
            { client: { $in: clientIds } }
          ]
        }
      ]
    }

    let query = Task.find(filter)
      .populate('client', 'name code isActive')
      .populate('assignedTo', 'firstName email')
      .populate('owner', 'firstName')
      .sort({ createdAt: -1 })

    // If paginated (like on All Tasks)
    if (req.query.page) {
       query = query.skip(skip).limit(parseInt(limit))
    }

    let tasksData = await query.exec()

    // Filter out archived tasks of inactive clients (Post-fetch filter because of populate)
    tasksData = tasksData.filter(task => {
      if (task.isArchived && task.client && task.client.isActive === false) {
        return false;
      }
      return true;
    });

    const total = await Task.countDocuments(filter)

    res.json({ 
      tasks: tasksData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
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

    //console.log('📋 Fetching task:', taskId)

    const task = await Task.findById(taskId)
      .populate('client', 'name code email phone')
      .populate('assignedTo', 'firstName email role')
      .populate('owner', 'firstName email role')
      .populate('notes.createdBy', 'firstName')
      .populate('statusHistory.changedBy', 'firstName')

    if (!task) {
      //console.log('❌ Task not found:', taskId)
      return res.status(404).json({ error: 'Task not found' })
    }

    // Permission check: Admin OR Owner OR Assigned User
    const isAdmin = req.user.role === 'ADMIN'
    const isOwner = task.owner._id.toString() === req.user.id
    const isAssigned = task.assignedTo?._id.toString() === req.user.id

    if (!isAdmin && !isOwner && !isAssigned) {
     //('❌ Permission denied for user:', req.user.id)
      return res.status(403).json({
        error: 'You do not have permission to view this task'
      })
    }

   // console.log('✅ Task fetched successfully')
    res.json({ task })
  } catch (error) {
    console.error('❌ Error fetching task:', error)
    res.status(500).json({ error: 'Failed to fetch task details' })
  }
}

// ---------------------------------------
// SEND TASK REMINDER (Admin only)
// ---------------------------------------
exports.sendTaskReminder = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check admin permission
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only administrators can send reminders'
      });
    }

    const task = await Task.findById(taskId)
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName lastName email');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.assignedTo) {
      return res.status(400).json({ 
        error: 'Task is not assigned to anyone' 
      });
    }

    if (!task.assignedTo.email) {
      return res.status(400).json({ 
        error: 'Assigned user does not have an email address' 
      });
    }

    // Calculate days overdue
    const daysOverdue = Math.floor((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));

    // Email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Send reminder email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: task.assignedTo.email,
      subject: `⚠️ Reminder: Overdue Task - ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Task Overdue Reminder</h2>
          <p>Hello ${task.assignedTo.firstName},</p>
          <p>This is a reminder that the following task is <strong style="color: #dc2626;">${daysOverdue} days overdue</strong>:</p>
          
          <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #111827;">${task.title}</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
              <li><strong>Client:</strong> ${task.client?.name || 'N/A'}</li>
              <li><strong>Service:</strong> ${task.serviceType || 'N/A'}</li>
              <li><strong>Priority:</strong> ${task.priority}</li>
              <li><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString('en-IN')}</li>
              <li><strong>Days Overdue:</strong> <span style="color: #dc2626; font-weight: bold;">${daysOverdue} days</span></li>
              <li><strong>Status:</strong> ${task.status}</li>
            </ul>
          </div>

          <p>Please update the task status as soon as possible.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks/${task._id}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              View Task
            </a>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            CA Console - Automated Task Reminder
          </p>
        </div>
      `,
    });

   // console.log(`✅ Reminder sent to ${task.assignedTo.email} for task ${task._id}`);

    // Log Activity
    await logActivity({
      user: req.user._id,
      type: 'TASK',
      action: 'REMINDER_SENT',
      description: `Sent overdue reminder for task: ${task.title}`,
      relatedId: task._id,
      relatedModel: 'Task'
    })

    res.json({
      message: `Reminder sent successfully to ${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
      sentTo: task.assignedTo.email
    });

  } catch (error) {
    console.error('❌ Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
};

