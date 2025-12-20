const cron = require('node-cron')
const Task = require('../models/Task')
function startAutoArchiveCron () {
  cron.schedule('0 0 * * *', async () => {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      console.log('🤖 Running auto-archive job...')
      console.log('📅 Archiving tasks completed before:', sevenDaysAgo)

      const result = await Task.updateMany(
        {
          status: 'COMPLETED',
          isArchived: false,
          completedAt: { $lt: sevenDaysAgo }
        },
        {
          $set: {
            isArchived: true,
            archivedAt: new Date(),
            autoArchived: true
          }
        }
      )

      console.log(`✅ Auto-archived ${result.modifiedCount} completed tasks`)
    } catch (error) {
      console.error('❌ Auto-archive cron failed:', error)
    }
  })

  console.log('🤖 Auto-archive cron job started (runs daily at midnight)')
}
module.exports = { startAutoArchiveCron }
