const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

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

