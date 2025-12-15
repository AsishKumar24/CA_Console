const express = require('express')
const router = express.Router()

/**
 * @openapi
 * /test:
 *   get:
 *     summary: Test endpoint
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/test', (req, res) => res.send('OK'))

module.exports = router
