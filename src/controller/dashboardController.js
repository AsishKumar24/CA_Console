const Task = require('../models/Task')
const Client = require('../models/Client')
const { User } = require('../models/User')
const Activity = require('../models/Activity')
const { getTenantId } = require('../utils/tenant')

/**
 * @route   GET /api/dashboard/activities
 * @desc    Get recent system activities (prioritized, completed tasks only)
 * @access  Admin only
 */
exports.getRecentActivities = async (req, res) => {
  try {
    // Today's window: midnight to now
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Fetch only CRITICAL + IMPORTANT activities from today, across all relevant types
    // INFO (routine status updates, notes) are excluded — too noisy for a dashboard
    const activities = await Activity.find({
      owner: getTenantId(req),
      priority: { $in: ['CRITICAL', 'IMPORTANT'] },
      type: { $in: ['TASK', 'BILLING', 'PAYMENT'] },
      createdAt: { $gte: startOfToday }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName')
      .lean();

    // Map to a clean format for the frontend
    const formattedActivities = activities.map(activity => {
      let icon = '🔔';
      if (activity.type === 'TASK')    icon = '📋';
      if (activity.type === 'BILLING') icon = '📄';
      if (activity.type === 'PAYMENT') icon = '💰';

      return {
        type: activity.type,
        description: activity.description,
        user: activity.user?.firstName || 'Unknown',
        priority: activity.priority,
        icon,
        time: activity.createdAt
      };
    });

    res.json({
      success: true,
      activities: formattedActivities,
      date: startOfToday  // so frontend knows what day this is for
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities'
    });
  }
};

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const tenantId = getTenantId(req)

    // Get current date for today's calculations
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Task Statistics (this firm only)
    const totalTasks = await Task.countDocuments({ owner: tenantId, isArchived: false })
    const notStartedTasks = await Task.countDocuments({ owner: tenantId, status: 'NOT_STARTED', isArchived: false })
    const inProgressTasks = await Task.countDocuments({ owner: tenantId, status: 'IN_PROGRESS', isArchived: false })
    const completedTasks = await Task.countDocuments({ owner: tenantId, status: 'COMPLETED', isArchived: false })

    const completedTodayTasks = await Task.countDocuments({
      owner: tenantId,
      status: 'COMPLETED',
      completedAt: { $gte: today },
      isArchived: false
    })

    const dueThisWeekTasks = await Task.countDocuments({
      owner: tenantId,
      dueDate: { $lte: nextWeek, $gte: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })

    const overdueTasks = await Task.countDocuments({
      owner: tenantId,
      dueDate: { $lt: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })

    // Client Statistics (this firm only)
    const totalClients = await Client.countDocuments({ owner: tenantId })
    const activeClients = await Client.countDocuments({ owner: tenantId, isActive: true })
    const inactiveClients = totalClients - activeClients

    // Billing Statistics (this firm only)
    const billingTasks = await Task.find({
      owner: tenantId,
      'billing.paymentStatus': { $ne: 'NOT_ISSUED' }
    })
    
    const totalBills = billingTasks.length
    const totalAmount = billingTasks.reduce((sum, task) => sum + (task.billing?.amount || 0), 0)
    const paidAmount = billingTasks.reduce((sum, task) => sum + (task.billing?.paidAmount || 0), 0)
    const pendingAmount = totalAmount - paidAmount
    
    const overdueBills = billingTasks.filter(task => 
      task.billing?.paymentStatus !== 'PAID' && 
      new Date(task.billing?.dueDate) < today
    ).length

    // Staff Statistics — this firm = the admin plus the staff they own
    const firmUsers = { $or: [{ _id: tenantId }, { owner: tenantId }] }

    const totalStaff = await User.countDocuments(firmUsers)

    // Active staff = Admin + Active Staff members
    const activeStaffCount = await User.countDocuments({ ...firmUsers, isActive: { $ne: false } })

    // Active staff today (users who are active AND have logged in today)
    // If no tracking exists, we show total active users
    const loggedInToday = await User.countDocuments({
      ...firmUsers,
      isActive: { $ne: false },
      lastActive: { $gte: today }
    })

    // Return all stats
    res.json({
      success: true,
      stats: {
        tasks: {
          total: totalTasks,
          notStarted: notStartedTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          completedToday: completedTodayTasks,
          dueThisWeek: dueThisWeekTasks,
          overdue: overdueTasks
        },
        clients: {
          total: totalClients,
          active: activeClients,
          inactive: inactiveClients
        },
        billing: {
          totalBills,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueCount: overdueBills
        },
        staff: {
          total: totalStaff,
          activeToday: loggedInToday || activeStaffCount
        }
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    })
  }
}

/**
 * @route   GET /api/dashboard/overdue
 * @desc    Get list of overdue tasks and bills
 * @access  Admin only
 */
exports.getOverdueItems = async (req, res) => {
  try {
    const tenantId = getTenantId(req)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get overdue tasks (this firm only)
    const overdueTasks = await Task.find({
      owner: tenantId,
      dueDate: { $lt: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName lastName')
      .sort({ dueDate: 1 })
      .lean()

    // Get overdue bills (this firm only)
    const overdueBills = await Task.find({
      owner: tenantId,
      'billing.paymentStatus': { $nin: ['NOT_ISSUED', 'PAID'] },
      'billing.dueDate': { $lt: today }
    })
      .populate('client', 'name code')
      .sort({ 'billing.dueDate': 1 })
      .lean()

    // Calculate days overdue for tasks
    const overdueTasksWithDays = overdueTasks.map(task => ({
      ...task,
      daysOverdue: Math.floor((today - new Date(task.dueDate)) / (1000 * 60 * 60 * 24)),
      type: 'TASK'
    }))

    // Calculate days overdue for bills
    const overdueBillsWithDays = overdueBills.map(task => ({
      ...task,
      daysOverdue: Math.floor((today - new Date(task.billing.dueDate)) / (1000 * 60 * 60 * 24)),
      type: 'BILL'
    }))

    res.json({
      success: true,
      data: {
        tasks: overdueTasksWithDays,
        bills: overdueBillsWithDays,
        totalOverdue: overdueTasksWithDays.length + overdueBillsWithDays.length
      }
    })
  } catch (error) {
    console.error('Error fetching overdue items:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue items'
    })
  }
}

/**
 * @route   GET /api/dashboard/staff-stats
 * @desc    Get staff dashboard statistics (only their tasks)
 * @access  Staff/Admin
 */
exports.getStaffStats = async (req, res) => {
  try {
    const userId = req.user._id
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Get tasks assigned to this user
    const totalMyTasks = await Task.countDocuments({ 
      assignedTo: userId,
      isArchived: false 
    })
    
    const notStartedTasks = await Task.countDocuments({ 
      assignedTo: userId,
      status: 'NOT_STARTED',
      isArchived: false 
    })
    
    const inProgressTasks = await Task.countDocuments({ 
      assignedTo: userId,
      status: 'IN_PROGRESS',
      isArchived: false 
    })
    
    const completedTasks = await Task.countDocuments({ 
      assignedTo: userId,
      status: 'COMPLETED',
      isArchived: false 
    })
    
    const dueTodayTasks = await Task.countDocuments({
      assignedTo: userId,
      dueDate: { $gte: today, $lt: tomorrow },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })
    
    const dueThisWeekTasks = await Task.countDocuments({
      assignedTo: userId,
      dueDate: { $lte: nextWeek, $gte: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })
    
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      dueDate: { $lt: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })

    res.json({
      success: true,
      stats: {
        myTasks: {
          total: totalMyTasks,
          notStarted: notStartedTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          dueToday: dueTodayTasks,
          dueThisWeek: dueThisWeekTasks,
          overdue: overdueTasks
        }
      }
    })
  } catch (error) {
    console.error('Error fetching staff stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff statistics'
    })
  }
}

/**
 * @route   DELETE /api/dashboard/activities/clear
 * @desc    Clear all activities from the database
 * @access  Admin only
 */
exports.clearAllActivities = async (req, res) => {
  try {
    const result = await Activity.deleteMany({ owner: getTenantId(req) });
    
    res.json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} activities`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear activities'
    });
  }
}
