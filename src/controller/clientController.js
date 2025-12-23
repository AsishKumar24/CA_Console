const Client = require('../models/Client')
const mongoose = require('mongoose')
const validator = require('validator') // optional, if you want to validate email/phone
const { logActivity } = require('../utils/activityLogger')

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
    // Log Activity
    await logActivity({
      user: req.user._id,
      type: 'CLIENT',
      action: 'CREATE',
      description: `Added new client: ${client.name}`,
      relatedId: client._id,
      relatedModel: 'Client'
    })

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
// List clients - ADMIN sees all, STAFF sees only clients from their assigned tasks
exports.getClients = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: 'Unauthorized' })

    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      statusFilter = 'all',
      letter = ''
    } = req.query;
    
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    let query = {};
    let countsScope = {}; // For calculating total active/inactive across all pages

    if (req.user.role === 'ADMIN') {
      // ADMIN: Sees all clients they own
      query.owner = req.user._id;
      countsScope.owner = req.user._id;
    } else {
      // STAFF: Sees ONLY clients from assigned tasks
      const Task = require('../models/Task');
      const assignedTasks = await Task.find({
        assignedTo: req.user._id,
        isArchived: false
      }).select('client').lean();

      const clientIds = [...new Set(assignedTasks.map(task => String(task.client)).filter(Boolean))];
      query._id = { $in: clientIds };
      countsScope._id = { $in: clientIds };
    }

    // --- APPLY FILTERS ---

    // 1. Status Filter
    if (statusFilter === 'active') {
      query.isActive = true;
    } else if (statusFilter === 'inactive') {
      query.isActive = false;
    }

    // 2. Letter Filter (A-Z) - searches Name or Code
    if (letter && /^[A-Z]$/i.test(letter)) {
      query.$or = query.$or || [];
      query.$or.push(
        { name: { $regex: `^${letter}`, $options: 'i' } },
        { code: { $regex: `^${letter}`, $options: 'i' } }
      );
    }

    // 3. Search Filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchOr = [
        { name: searchRegex },
        { code: searchRegex },
        { mobile: searchRegex },
        { email: searchRegex }
      ];
      
      // If $or already exists from letter filter, we need to wrap both in $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchOr }
        ];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // --- EXECUTE ---

    const clients = await Client.find(query)
      .sort({ isActive: -1, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .select('name mobile email type code isActive createdAt')
      .exec();
        
    const total = await Client.countDocuments(query);

    // --- GLOBAL COUNTS (Respecting Privacy Scope) ---
    const activeCount = await Client.countDocuments({ ...countsScope, isActive: true });
    const inactiveCount = await Client.countDocuments({ ...countsScope, isActive: false });

    return res.json({
      clients,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      },
      counts: {
        active: activeCount,
        inactive: inactiveCount,
        total: activeCount + inactiveCount
      }
    });
  } catch (err) {
    console.error('getClients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
    
    // 3. Status filter (all/active/inactive)
    const statusFilter = req.query.statusFilter || 'all'
    
    // 4. Letter filter (A-Z)
    const letter = req.query.letter?.trim()

    // 5. Skip calculation
    const skip = (page - 1) * limit

    // 6. Base filter (owner scope)
    const filter = {
      owner: req.user._id
    }
    
    // 7. Apply status filter
    if (statusFilter === 'active') {
      filter.isActive = true
    } else if (statusFilter === 'inactive') {
      filter.isActive = false
    }
    
    // 8. Apply letter filter - search both name and code
    if (letter && /^[A-Z]$/i.test(letter)) {
      filter.$or = filter.$or || []
      filter.$or.push(
        { name: { $regex: `^${letter}`, $options: 'i' } },
        { code: { $regex: `^${letter}`, $options: 'i' } }
      )
    }

    // 9. Apply search only if provided
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ]
    }

    // 10. Fetch clients
    const clients = await Client.find(filter)
      .sort({
            isActive: -1,    // true (1) first, false (0) last
            createdAt: -1    // newest first within each group
            }) // newest first
      .skip(skip)
      .limit(limit)
      .select('name mobile email type code isActive createdAt') // send only needed fields

    // 11. Count total for pagination (filtered)
    const total = await Client.countDocuments(filter)
    
    // 12. Get global counts (unfiltered, but owner-specific)
    const activeCount = await Client.countDocuments({
      owner: req.user._id,
      isActive: true
    })
    
    const inactiveCount = await Client.countDocuments({
      owner: req.user._id,
      isActive: false
    })

    // 13. Response
    return res.json({
      clients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      counts: {
        active: activeCount,
        inactive: inactiveCount,
        total: activeCount + inactiveCount
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
    
    // 1. Optional filters from staff
    const search = req.query.search?.trim() || ''
    const letter = req.query.letter?.trim()

    // 2. Find all tasks assigned to this staff member
    const assignedTasks = await Task.find({
      assignedTo: req.user._id,
      isArchived: false
    })
      .select('client')
      .lean()

    // 3. Extract unique client IDs
    const clientIds = [...new Set(assignedTasks.map(task => String(task.client)).filter(Boolean))]

    // 4. Build filter
    const filter = {
      _id: { $in: clientIds }
    }

    // 5. Apply Letter Filter (Name or Code)
    if (letter && /^[A-Z]$/i.test(letter)) {
      filter.$or = filter.$or || []
      filter.$or.push(
        { name: { $regex: `^${letter}`, $options: 'i' } },
        { code: { $regex: `^${letter}`, $options: 'i' } }
      )
    }

    // 6. Apply Search
    if (search) {
      filter.$or = filter.$or || []
      filter.$or.push(
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      )
    }

    // 7. Fetch clients
    const clients = await Client.find(filter)
      .sort({ createdAt: -1 })
      .select('name mobile email type code isActive createdAt')

    // 8. Get counts for staff clients
    const activeCount = await Client.countDocuments({
      _id: { $in: clientIds },
      isActive: true
    })
    
    const inactiveCount = await Client.countDocuments({
      _id: { $in: clientIds },
      isActive: false
    })

    return res.json({
      clients,
      pagination: {
        total: clients.length,
        page: 1,
        limit: clients.length,
        totalPages: 1
      },
      counts: {
        active: activeCount,
        inactive: inactiveCount,
        total: activeCount + inactiveCount
      }
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
