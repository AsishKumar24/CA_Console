const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const healthCtrl = require('../controller/healthController')
const { testAutoArchive } = require('../jobs/autoArchive')

/**
 * @route   GET /api/health/db
 * @desc    Get database health statistics and storage usage
 * @access  Admin only
 */
router.get('/db',  healthCtrl.getDatabaseHealth)

/**
 * @route   POST /api/health/test-auto-archive
 * @desc    Manually trigger auto-archive job for testing
 * @access  Admin only
 */
router.post('/test-auto-archive', async (req, res) => {
  try {
    console.log('📡 Manual auto-archive triggered by admin:', req.user.id)
    const count = await testAutoArchive()
    
    res.json({
      success: true,
      message: 'Auto-archive job executed successfully',
      tasksArchived: count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Manual auto-archive failed:', error)
    res.status(500).json({
      success: false,
      error: 'Auto-archive job failed',
      details: error.message
    })
  }
})
/**
 * App health check
 * Confirms server is running
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DaddyConsole API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

/**
 * MongoDB health check
 * Confirms database connectivity
 */
router.get('/health/db', (req, res) => {
  const dbState = mongoose.connection.readyState

  /*
    0 = disconnected
    1 = connected
    2 = connecting
    3 = disconnecting
  */

  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }

  const isHealthy = dbState === 1

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'down',
    database: stateMap[dbState],
    timestamp: new Date().toISOString()
  })
})

module.exports = router
