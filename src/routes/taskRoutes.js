const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const taskCtrl = require('../controller/taskController')
// // console.log({
// //   createTask: taskCtrl.createTask,
// //   editTask: taskCtrl.editTask,
// //   assignTask: taskCtrl.assignTask
// // })

// // Create task
// /**
//  * @openapi
//  * /api/tasks:
//  *   post:
//  *     summary: Create a new task (Admin only)
//  *     description: |
//  *       Creates a task for a specific client.
//  *       The task is owned by the admin and can later be assigned to staff.
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - title
//  *               - client
//  *             properties:
//  *               title:
//  *                 type: string
//  *                 example: Income tax filing
//  *               client:
//  *                 type: string
//  *                 description: Client ObjectId
//  *               serviceType:
//  *                 type: string
//  *                 example: IT
//  *               priority:
//  *                 type: string
//  *                 enum: [LOW, NORMAL, HIGH]
//  *                 example: NORMAL
//  *               dueDate:
//  *                 type: string
//  *                 format: date
//  *                 example: 2025-12-15
//  *     responses:
//  *       '201':
//  *         description: Task created successfully
//  *       '401':
//  *         description: Unauthorized
//  *       '403':
//  *         description: Admin only
//  */



// router.post('/', auth, requireAdmin, taskCtrl.createTask)

// // Edit task
// /**
//  * @openapi
//  * /api/tasks/{taskId}/edit:
//  *   patch:
//  *     summary: Edit task details (Admin only)
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: taskId
//  *         required: true
//  *         schema:
//  *           type: string
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               title:
//  *                 type: string
//  *               priority:
//  *                 type: string
//  *               dueDate:
//  *                 type: string
//  *                 format: date
//  *     responses:
//  *       '200':
//  *         description: Task updated
//  *       '403':
//  *         description: Admin only
//  */

// router.patch('/:taskId/edit', auth, requireAdmin, taskCtrl.editTask)

// // Assign task
// /**
//  * @openapi
//  * /api/tasks/{taskId}/assign:
//  *   patch:
//  *     summary: Assign a task to staff (Admin only)
//  *     description: |
//  *       Assigns a task to a staff member.
//  *       Archived tasks cannot be assigned.
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: taskId
//  *         required: true
//  *         schema:
//  *           type: string
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - staffId
//  *             properties:
//  *               staffId:
//  *                 type: string
//  *                 description: Staff user ObjectId
//  *     responses:
//  *       '200':
//  *         description: Task assigned successfully
//  *       '400':
//  *         description: Invalid task or staff
//  *       '403':
//  *         description: Admin only
//  */


// router.patch('/:taskId/assign', auth, requireAdmin, taskCtrl.assignTask)

// // Archive task
// /**
//  * @openapi
//  * /api/tasks/{taskId}/archive:
//  *   patch:
//  *     summary: Archive a task (Admin only)
//  *     description: |
//  *       Archives a task so it can no longer be assigned or updated.
//  *       Archived tasks are hidden from active task lists.
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: taskId
//  *         required: true
//  *         description: Task ObjectId
//  *         schema:
//  *           type: string
//  *     responses:
//  *       '200':
//  *         description: Task archived successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 _id:
//  *                   type: string
//  *                 title:
//  *                   type: string
//  *                 isArchived:
//  *                   type: boolean
//  *                   example: true
//  *                 archivedAt:
//  *                   type: string
//  *                   format: date-time
//  *       '400':
//  *         description: Task already archived or invalid request
//  *       '401':
//  *         description: Unauthorized (not logged in)
//  *       '403':
//  *         description: Forbidden (admin only)
//  *       '404':
//  *         description: Task not found
//  */


// router.patch('/:taskId/archive', auth, taskCtrl.archiveTask)

// // Restore task
// /**
//  * @openapi
//  * /api/tasks/{taskId}/restore:
//  *   patch:
//  *     summary: Restore an archived task (Admin only)
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: taskId
//  *         required: true
//  *         schema:
//  *           type: string
//  *     responses:
//  *       '200':
//  *         description: Task restored
//  */


// router.patch('/:taskId/restore', auth, taskCtrl.restoreTask)

// // Update task status
// /**
//  * @openapi
//  * /api/tasks/{taskId}/status:
//  *   patch:
//  *     summary: Update task status
//  *     description: |
//  *       Allows staff or admin to update the task status.
//  *       Status history is recorded internally.
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: taskId
//  *         required: true
//  *         schema:
//  *           type: string
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - status
//  *             properties:
//  *               status:
//  *                 type: string
//  *                 enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
//  *               note:
//  *                 type: string
//  *                 example: Documents verified
//  *     responses:
//  *       '200':
//  *         description: Task status updated
//  *       '401':
//  *         description: Unauthorized
//  */

// router.patch('/:taskId/status', auth, taskCtrl.updateTaskStatus)

// // Add note
// router.post('/:taskId/notes', auth, taskCtrl.addNote)

// // Staff tasks
// /**
//  * @openapi
//  * /api/tasks/my:
//  *   get:
//  *     summary: Get tasks assigned to the logged-in staff
//  *     description: |
//  *       Returns a list of tasks that are assigned to the authenticated staff user.
//  *       Archived tasks are excluded.
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       '200':
//  *         description: List of assigned tasks
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 type: object
//  *                 properties:
//  *                   _id:
//  *                     type: string
//  *                   title:
//  *                     type: string
//  *                   status:
//  *                     type: string
//  *                   priority:
//  *                     type: string
//  *                   dueDate:
//  *                     type: string
//  *                     format: date
//  *                   client:
//  *                     type: object
//  *                     properties:
//  *                       _id:
//  *                         type: string
//  *                       name:
//  *                         type: string
//  *       '401':
//  *         description: Unauthorized
//  */


// router.get('/my', auth, taskCtrl.getMyTasks)

// // Admin tasks
// /**
//  * @openapi
//  * /api/tasks:
//  *   get:
//  *     summary: Get all tasks (Admin only)
//  *     description: |
//  *       Returns all tasks created by the admin, including assigned and unassigned tasks.
//  *     tags:
//  *       - Tasks
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       '200':
//  *         description: List of tasks
//  *       '401':
//  *         description: Unauthorized
//  *       '403':
//  *         description: Admin only
//  */


// router.get('/', auth, requireAdmin, taskCtrl.getAdminTasks)

// // Summaries
// router.get('/summary/admin', auth, requireAdmin, taskCtrl.adminSummary)
// router.get('/summary/staff', auth, taskCtrl.staffSummary)
// router.get('/:taskId', auth, taskCtrl.getTaskById)




// Summary routes (unused but available)
router.get('/summary/staff', auth, taskCtrl.staffSummary)
router.get('/summary/admin', auth, requireAdmin, taskCtrl.adminSummary)

// Get all tasks (admin) or my tasks
router.get('/', auth, requireAdmin, taskCtrl.getAdminTasks)
router.get('/my', auth, taskCtrl.getMyTasks)

// ⭐ ADD THIS ROUTE - Get single task by ID
router.get('/:taskId', auth, taskCtrl.getTaskById)

// Create task
router.post('/', auth, requireAdmin, taskCtrl.createTask)

// Task operations (specific routes before /:taskId)
router.post('/:taskId/notes', auth, taskCtrl.addNote)
router.patch('/:taskId/status', auth, taskCtrl.updateTaskStatus)
router.patch('/:taskId/assign', auth, requireAdmin, taskCtrl.assignTask)
router.patch('/:taskId/edit', auth, requireAdmin, taskCtrl.editTask)

// Archive & Restore (Admin only)
router.patch('/:taskId/archive', auth, requireAdmin, taskCtrl.archiveTask)
router.patch('/:taskId/restore', auth, requireAdmin, taskCtrl.restoreTask)



module.exports = router
