const Client = require('../models/Client')
const mongoose = require('mongoose')
const validator = require('validator') // optional, if you want to validate email/phone

// Create a client - ADMIN only
exports.createClient = async (req, res) => {
  try {
    // don't accept owner from client body
    const { name, code, type, pan, gstin, mobile, email, address, notes } =
      req.body

    // basic validation
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required' })
    }

    // optional: validate phone/email formats
    if (email && !validator.isEmail(email)) return res.status(400).json({ error: "Invalid email" });

    // ensure req.user exists (auth middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
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

    return res.status(201).json({ message: 'Client created', client })
  } catch (err) {
    console.error('createClient error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// List clients for the current admin (ADMIN only)
exports.getClients = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

    // Return clients owned by this admin
    const clients = await Client.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .exec()

    return res.json({ clients })
  } catch (err) {
    console.error('getClients error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Get single client (ADMIN only) — ensure ownership
exports.getClientById = async (req, res) => {
  try {
    const { clientId } = req.params

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ error: 'Invalid client id' })
    }

    const client = await Client.findById(clientId).exec()
    if (!client) return res.status(404).json({ error: 'Client not found' })

    // ensure only owner (admin who created it) can view it
    if (!req.user || String(client.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    return res.json({ client })
  } catch (err) {
    console.error('getClientById error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}



// GET /api/clients?page=1&limit=10&search=ravi
// Only ADMIN can access this route.
// Responds with paginated data + metadata for frontend to use.

exports.getPaginatedClients = async (req, res) => {
  try {
    // 1. Read pagination values from query params
    // Example frontend would call: /api/clients?page=2&limit=10
    let page = parseInt(req.query.page) || 1
    let limit = parseInt(req.query.limit) || 10

    // 2. Optional search query (frontend sends "?search=value")
    const search = req.query.search || ''

    // 3. Calculate how many records to skip
    const skip = (page - 1) * limit

    // 4. Build a MongoDB filter
    // Search multiple fields using regex (case insensitive)
    let filter = {
      owner: req.user._id, // only clients created by this admin
      $or: [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { mobile: new RegExp(search, 'i') },
        { type: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') }
      ]
    }

    // 5. Fetch paginated clients
    const clients = await Client.find(filter)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)

    // 6. Count total records (for frontend pagination UI)
    const total = await Client.countDocuments(filter)

    // 7. Send response to frontend
    return res.json({
      clients,
      pagination: {
        total, // total clients
        page, // current page
        limit, // page size
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    console.error('Pagination error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
