// CORRECTED getClients function with ADMIN/STAFF support + isActive filter

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
