const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const taskCtrl = require('../controller/taskController')
// console.log({
//   createTask: taskCtrl.createTask,
//   editTask: taskCtrl.editTask,
//   assignTask: taskCtrl.assignTask
// })

// Create task
router.post('/', auth, requireAdmin, taskCtrl.createTask)

// Edit task
router.patch('/:taskId/edit', auth, requireAdmin, taskCtrl.editTask)

// Assign task
router.patch('/:taskId/assign', auth, requireAdmin, taskCtrl.assignTask)

// Archive task
router.patch('/:taskId/archive', auth, requireAdmin, taskCtrl.archiveTask)

// Restore task
router.patch('/:taskId/restore', auth, requireAdmin, taskCtrl.restoreTask)

// Update task status
router.patch('/:taskId/status', auth, taskCtrl.updateTaskStatus)

// Add note
router.post('/:taskId/notes', auth, taskCtrl.addNote)

// Staff tasks
router.get('/my', auth, taskCtrl.getMyTasks)

// Admin tasks
router.get('/', auth, requireAdmin, taskCtrl.getAdminTasks)

// Summaries
router.get('/summary/admin', auth, requireAdmin, taskCtrl.adminSummary)
router.get('/summary/staff', auth, taskCtrl.staffSummary)

module.exports = router
