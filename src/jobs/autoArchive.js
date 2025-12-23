const cron = require('node-cron')
const Task = require('../models/Task')

// Main auto-archive function (reusable for both cron and manual triggers)
async function runAutoArchive() {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // console.log('🤖 Running auto-archive job...')
    // console.log('📅 Archiving tasks completed before:', sevenDaysAgo.toISOString())

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

    // console.log(`✅ Auto-archived ${result.modifiedCount} completed tasks`)
    return result.modifiedCount
  } catch (error) {
    console.error('❌ Auto-archive cron failed:', error)
    throw error
  }
}

// Start the scheduled cron job
function startAutoArchiveCron() {
  // Schedule to run daily at midnight (00:00)
  const cronJob = cron.schedule('0 0 * * *', runAutoArchive)
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🤖 AUTO-ARCHIVE CRON JOB INITIALIZED')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⏰ Schedule: Daily at 12:00 AM (midnight)')
  console.log('📦 Action: Archive completed tasks older than 7 days')
  console.log('🔄 Status: ACTIVE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return cronJob
}

// Manual trigger for testing (call this via API or console)
async function testAutoArchive() {
  // console.log('\n🧪 TESTING AUTO-ARCHIVE JOB (Manual Trigger)')
  // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const count = await runAutoArchive()
  // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  // console.log(`✅ Test complete: ${count} tasks archived\n`)
  return count
}

module.exports = { 
  startAutoArchiveCron,
  runAutoArchive,
  testAutoArchive
}
