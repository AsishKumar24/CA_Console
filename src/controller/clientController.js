const Client = require('../models/Client')
const mongoose = require('mongoose')
const validator = require('validator') // optional, if you want to validate email/phone

// Create a client - ADMIN only
exports.createClient = async (req, res) => {
  try {
    const { name, code, type, pan, gstin, mobile, email, address, notes } =
      req.body

    // basic validation
    if (!name || !mobile) {
      return res.status(400).json({
        error: 'Name and mobile are required'
      })
    }

    if (email && !validator.isEmail(email))
      return res.status(400).json({
        error: 'Invalid email'
      })

    // ensure req.user exists (auth middleware)
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized'
      })
    }

    // create client and set owner to the logged-in admin
    const client = await Client.create({
      owner: req.user._id,
      name,
      code,
      type,
      pan,
      gstin,
      mobile,
      email,
      address,
      notes
    })
    // console.log(client)
    return res.status(201).json({
      message: 'Client created',
      client
    })
  } catch (err) {
    console.error('createClient error:', err)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}

// List clients - ADMIN sees all, STAFF sees only clients from their assigned tasks
exports.getClients = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: 'Unauthorized' })

    const { page = 1, limit = 20, search = '', statusFilter = 'all' } = req.query;
    
    let clients;
    let total;

    if (req.user.role === 'ADMIN') {
      // Build query for admin
      const query = { owner: req.user._id };
      
      // Filter by isActive based on statusFilter
      if (statusFilter === 'active') {
        query.isActive = true;
      } else if (statusFilter === 'inactive') {
        query.isActive = false;
      }
      // 'all' - don't add isActive filter
      
      // Search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } }
        ];
      }

      clients = await Client.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
        
      total = await Client.countDocuments(query);
    } else {
      // Staff: Only return clients from tasks assigned to them
      const Task = require('../models/Task')
      
      // Find all tasks assigned to this staff member
      const assignedTasks = await Task.find({
        assignedTo: req.user._id,
        isArchived: false
      })
        .select('client')
        .lean()

      // Extract unique client IDs
      const clientIds = [...new Set(assignedTasks.map(task => task.client).filter(Boolean))]

      // Build query for staff
      const query = { _id: { $in: clientIds } };
      
      // Filter by isActive
      if (statusFilter === 'active') {
        query.isActive = true;
      } else if (statusFilter === 'inactive') {
        query.isActive = false;
      }
      
      // Search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } }
        ];
      }

      // Fetch those clients
      clients = await Client.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec()
        
      total = await Client.countDocuments(query);
    }
    
    return res.json({
      clients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('getClients error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Get single client - ADMIN can view their clients, STAFF can only view clients from their assigned tasks
exports.getClientById = async (req, res) => {
  try {
    const { clientId } = req.params

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        error: 'Invalid client id'
      })
    }

    const client = await Client.findById(clientId).exec()
    if (!client)
      return res.status(404).json({
        error: 'Client not found'
      })

    // Check access permissions
    if (req.user.role === 'ADMIN') {
      // Admin: only owner can view
      if (String(client.owner) !== String(req.user._id)) {
        return res.status(403).json({
          error: 'Forbidden'
        })
      }
    } else {
      // Staff: can only view if they have tasks assigned for this client
      const Task = require('../models/Task')
      
      const hasAccess = await Task.exists({
        assignedTo: req.user._id,
        client: clientId,
        isArchived: false
      })

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden - You do not have tasks assigned for this client'
        })
      }
    }

    return res.json({
      client
    })
  } catch (err) {
    console.error('getClientById error:', err)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}

// GET /api/clients?page=1&limit=10&search=ravi
// Only ADMIN can access this route.
// Responds with paginated data + metadata for frontend to use.

exports.getPaginatedClients = async (req, res) => {
  try {
    // 1. Pagination params
    let page = parseInt(req.query.page, 10) || 1
    let limit = parseInt(req.query.limit, 10) || 10

    // Safety cap (prevents abuse)
    limit = Math.min(limit, 50)

    // 2. Optional search
    const search = req.query.search?.trim() || ''

    // 3. Skip calculation
    const skip = (page - 1) * limit

    // 4. Base filter (owner scope)
    const filter = {
      owner: req.user._id
    }

    // 5. Apply search only if provided
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ]
    }

    // 6. Fetch clients
    const clients = await Client.find(filter)
      .sort({
            isActive: -1,    // true (1) first, false (0) last
            createdAt: -1    // newest first within each group
            }) // newest first
      .skip(skip)
      .limit(limit)
      .select('name mobile email type code isActive createdAt') // send only needed fields

    // 7. Count total for pagination
    const total = await Client.countDocuments(filter)

    // 8. Response
    return res.json({
      clients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    console.error('Pagination error:', err)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}
exports.updateClient = async (req, res) => {
  try {
    const { clientId } = req.params
    const updates = req.body

    const client = await Client.findById(clientId)

    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    // owner check
    if (String(client.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Allowed fields only (IMPORTANT)
    const allowedUpdates = [
      'name',
      'mobile',
      'alternateMobile',
      'email',
      'pan',
      'gstin',
      'address',
      'notes',
      'isActive'
    ]

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        client[field] = updates[field]
      }
    })

    await client.save()

    return res.json({
      message: 'Client updated successfully',
      client
    })
  } catch (err) {
    console.error('Update client error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}




// ==================== STAFF-ONLY ROUTES (READ-ONLY) ====================

/**
 * Get clients for staff - only clients from their assigned tasks
 * @route GET /api/clients/staff
 * @access Staff & Admin
 */
exports.getStaffClients = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const Task = require('../models/Task')
    
    // Find all tasks assigned to this staff member
    const assignedTasks = await Task.find({
      assignedTo: req.user._id,
      isArchived: false
    })
      .select('client')
      .lean()

    // Extract unique client IDs
    const clientIds = [...new Set(assignedTasks.map(task => task.client).filter(Boolean))]

    // Fetch those clients
    const clients = await Client.find({
      _id: { $in: clientIds }
    })
      .sort({ createdAt: -1 })
      .exec()

    return res.json({
      clients
    })
  } catch (err) {
    console.error('getStaffClients error:', err)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}

/**
 * Get single client for staff - only if they have tasks for this client
 * @route GET /api/clients/staff/:clientId
 * @access Staff & Admin
 */
exports.getStaffClientById = async (req, res) => {
  try {
    const { clientId } = req.params

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        error: 'Invalid client id'
      })
    }

    const client = await Client.findById(clientId).exec()
    if (!client) {
      return res.status(404).json({
        error: 'Client not found'
      })
    }

    // Staff: can only view if they have tasks assigned for this client
    const Task = require('../models/Task')
    
    const hasAccess = await Task.exists({
      assignedTo: req.user._id,
      client: clientId,
      isArchived: false
    })

    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not have access to view this client'
      })
    }

    return res.json({
      client
    })
  } catch (err) {
    console.error('getStaffClientById error:', err)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
}
