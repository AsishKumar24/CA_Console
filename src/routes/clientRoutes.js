// routes/clientRoutes.js
const express = require('express')
const clientRouter = express.Router()

// Middlewares
const auth = require('../middleware/auth') // Validates JWT (cookie/header)
const { requireAdmin } = require('../middleware/requireAdmin') // Only admin can access

// Controller
const clientController = require('../controller/clientController')

// ---------------------------------------------
// CREATE CLIENT (Admin only)
// POST /api/clients
// ---------------------------------------------
/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create a new client (Admin only)
 *     tags: [Clients]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code, mobile]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tech Solutions Pvt Ltd"
 *               code:
 *                 type: string
 *                 example: "TSPL001"
 *               pan:
 *                 type: string
 *               gstin:
 *                 type: string
 *               mobile:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */

clientRouter.post(
  '/',
  auth, // user must be logged in
  requireAdmin, // user must be ADMIN
  clientController.createClient
)

// ---------------------------------------------
// GET PAGINATED CLIENT LIST (Admin only)
// GET /api/clients?page=1&limit=10&search=xyz
// ---------------------------------------------
/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Get paginated client list (Admin only)
 *     tags: [Clients]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Tech"
 *     responses:
 *       200:
 *         description: Paginated list of clients
 */

clientRouter.get('/', auth, clientController.getClients)

// ---------------------------------------------
// GET SINGLE CLIENT (Admin only)
// GET /api/clients/:clientId
// ---------------------------------------------
/**
 * @swagger
 * /api/clients/{clientId}:
 *   get:
 *     summary: Get client by ID (Admin only)
 *     tags: [Clients]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client details
 *       404:
 *         description: Client not found
 */

clientRouter.get('/:clientId', auth, clientController.getClientById)
clientRouter.patch('/:clientId', auth, requireAdmin, clientController.updateClient)

// ==================== STAFF-ONLY ROUTES (READ-ONLY) ====================
// Staff can view clients from their assigned tasks only
clientRouter.get('/staff', auth, clientController.getStaffClients)
clientRouter.get('/staff/:clientId', auth, clientController.getStaffClientById)

module.exports = clientRouter
