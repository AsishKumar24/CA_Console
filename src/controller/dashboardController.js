const Task = require('../models/Task')
const Client = require('../models/Client')
const { User } = require('../models/User')

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get current date for today's calculations
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Task Statistics
    const totalTasks = await Task.countDocuments({ isArchived: false })
    const notStartedTasks = await Task.countDocuments({ status: 'NOT_STARTED', isArchived: false })
    const inProgressTasks = await Task.countDocuments({ status: 'IN_PROGRESS', isArchived: false })
    const completedTasks = await Task.countDocuments({ status: 'COMPLETED', isArchived: false })
    
    const completedTodayTasks = await Task.countDocuments({
      status: 'COMPLETED',
      completedAt: { $gte: today },
      isArchived: false
    })
    
    const dueThisWeekTasks = await Task.countDocuments({
      dueDate: { $lte: nextWeek, $gte: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })
    
    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })

    // Client Statistics
    const totalClients = await Client.countDocuments()
    const activeClients = await Client.countDocuments({ isActive: true })
    const inactiveClients = totalClients - activeClients

    // Billing Statistics
    const billingTasks = await Task.find({
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

    // Staff Statistics
    const totalStaff = await User.countDocuments()
    
    // Active staff today (you can enhance this with session tracking)
    const activeTodayStaff = await User.countDocuments({
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
          activeToday: activeTodayStaff || totalStaff // Fallback to total if no tracking
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get overdue tasks
    const overdueTasks = await Task.find({
      dueDate: { $lt: today },
      status: { $ne: 'COMPLETED' },
      isArchived: false
    })
      .populate('client', 'name code')
      .populate('assignedTo', 'firstName lastName')
      .sort({ dueDate: 1 })
      .lean()

    // Get overdue bills
    const overdueBills = await Task.find({
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
