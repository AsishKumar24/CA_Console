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
clientRouter.get('/', auth, requireAdmin, clientController.getPaginatedClients)

// ---------------------------------------------
// GET SINGLE CLIENT (Admin only)
// GET /api/clients/:clientId
// ---------------------------------------------
clientRouter.get('/:clientId', auth, requireAdmin, clientController.getClientById)

module.exports = clientRouter
