const mongoose = require('mongoose')
const {User} = require('../models/User')
const Client = require('../models/Client')
const Task = require('../models/Task')

// ============================================
// DATABASE HEALTH & STORAGE STATISTICS
// ============================================
// Monitor MongoDB storage usage for M0 tier (512 MB limit)
// ============================================

exports.getDatabaseHealth = async (req, res) => {
  try {
    console.log('📊 Fetching database health statistics...')

    // 1. Get database statistics
    const db = mongoose.connection.db
    const stats = await db.stats()

    // 2. Get collection counts
    const [
      totalUsers,
      activeUsers,
      totalClients,
      activeClients,
      totalTasks,
      activeTasks,
      archivedTasks,
      completedTasks
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: { $ne: false } }),
      Client.countDocuments(),
      Client.countDocuments({ isActive: { $ne: false } }),
      Task.countDocuments(),
      Task.countDocuments({ isArchived: false }),
      Task.countDocuments({ isArchived: true }),
      Task.countDocuments({ status: 'COMPLETED' })
    ])

    // 3. Calculate storage metrics
    const dataSize = stats.dataSize // Actual data size in bytes
    const storageSize = stats.storageSize // Storage size including overhead
    const indexSize = stats.indexSize // Index size
    const totalSize = storageSize + indexSize

    // M0 Free Tier Limit
    const M0_LIMIT_BYTES = 512 * 1024 * 1024 // 512 MB
    const usagePercentage = ((totalSize / M0_LIMIT_BYTES) * 100).toFixed(2)

    // 4. Determine health status
    let healthStatus = 'HEALTHY'
    let warningMessage = null

    if (usagePercentage >= 90) {
      healthStatus = 'CRITICAL'
      warningMessage = '🚨 URGENT: Database near capacity! Export old data immediately.'
    } else if (usagePercentage >= 75) {
      healthStatus = 'WARNING'
      warningMessage = '⚠️ WARNING: Database at 75% capacity. Plan data export soon.'
    } else if (usagePercentage >= 50) {
      healthStatus = 'CAUTION'
      warningMessage = '⚡ CAUTION: Database over 50%. Monitor usage regularly.'
    }

    // 5. Calculate estimated runway
    const tasksPerMonth = Math.round(totalTasks / 12) // Rough estimate
    const avgTaskSize = totalTasks > 0 ? dataSize / totalTasks : 5000 // ~5KB default
    const remainingBytes = M0_LIMIT_BYTES - totalSize
    const estimatedTasksRemaining = Math.floor(remainingBytes / avgTaskSize)
    const estimatedMonthsRemaining = tasksPerMonth > 0 
      ? Math.floor(estimatedTasksRemaining / tasksPerMonth) 
      : 999

    // 6. Build response
    const healthData = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      
      // Storage Statistics
      storage: {
        dataSize: formatBytes(dataSize),
        dataSizeBytes: dataSize,
        storageSize: formatBytes(storageSize),
        storageSizeBytes: storageSize,
        indexSize: formatBytes(indexSize),
        indexSizeBytes: indexSize,
        totalSize: formatBytes(totalSize),
        totalSizeBytes: totalSize,
        
        // M0 Tier Info
        tierLimit: formatBytes(M0_LIMIT_BYTES),
        tierLimitBytes: M0_LIMIT_BYTES,
        usagePercentage: parseFloat(usagePercentage),
        remainingSpace: formatBytes(M0_LIMIT_BYTES - totalSize),
        remainingSpaceBytes: M0_LIMIT_BYTES - totalSize
      },
      
      // Collection Statistics
      collections: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        clients: {
          total: totalClients,
          active: activeClients,
          inactive: totalClients - activeClients
        },
        tasks: {
          total: totalTasks,
          active: activeTasks,
          archived: archivedTasks,
          completed: completedTasks,
          inProgress: totalTasks - completedTasks - archivedTasks
        }
      },
      
      // Capacity Planning
      capacity: {
        avgTaskSizeKB: (avgTaskSize / 1024).toFixed(2),
        estimatedTasksRemaining,
        estimatedMonthsRemaining: estimatedMonthsRemaining > 12 
          ? '12+ months' 
          : `${estimatedMonthsRemaining} months`,
        tasksPerMonth
      },
      
      // Warnings & Recommendations
      health: {
        status: healthStatus,
        message: warningMessage,
        recommendations: getRecommendations(usagePercentage, archivedTasks)
      }
    }

    console.log(`✅ Database health: ${healthStatus} (${usagePercentage}% used)`)

    res.json(healthData)

  } catch (error) {
    console.error('❌ Error fetching database health:', error)
    res.status(500).json({ 
      error: 'Failed to fetch database health statistics',
      details: error.message 
    })
  }
}

// Helper: Format bytes to human-readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Helper: Get recommendations based on usage
function getRecommendations(usagePercentage, archivedTasks) {
  const recommendations = []
  
  if (usagePercentage >= 90) {
    recommendations.push('🚨 URGENT: Export archived tasks older than 2 years immediately')
    recommendations.push('🚨 Consider upgrading to M2 cluster ($9/month, 2GB storage)')
    recommendations.push('🚨 Delete test/duplicate tasks if any exist')
  } else if (usagePercentage >= 75) {
    recommendations.push('⚠️ Plan to export tasks older than 3 years within 2 weeks')
    recommendations.push('⚠️ Review and archive completed tasks regularly')
    recommendations.push('⚠️ Monitor usage monthly')
  } else if (usagePercentage >= 50) {
    recommendations.push('⚡ Start planning export strategy for old data')
    recommendations.push('⚡ Archive completed tasks after 7 days (auto-enabled)')
  } else {
    recommendations.push('✅ Storage is healthy - no action needed')
    recommendations.push('✅ Continue monitoring quarterly')
  }
  
  if (archivedTasks > 5000) {
    recommendations.push(`📦 You have ${archivedTasks} archived tasks - consider exporting tasks older than 3 years`)
  }
  
  return recommendations
}
