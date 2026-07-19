// scripts/migrateMultiTenancy.js
//
// Backfills the `owner`/`adminId` tenant pointer onto data that predates
// multi-tenancy, assigning everything to the single existing ADMIN (the one
// firm that ran single-tenant in production).
//
// SAFE TO RE-RUN: idempotent — it only touches rows that are still missing a
// tenant pointer, so a second run reports 0 changes.
//
// SAFETY GUARD: if there is more than one ADMIN it refuses to guess and exits,
// unless you explicitly pass MIGRATE_ADMIN_ID=<adminUserId>. This prevents it
// from silently mis-assigning data once real multi-tenant admins exist.
//
// Usage (from the backend container / server, against the intended DB):
//   node src/scripts/migrateMultiTenancy.js
//   MIGRATE_ADMIN_ID=<id> node src/scripts/migrateMultiTenancy.js
require('dotenv').config()
const mongoose = require('mongoose')
const { connectDB } = require('../config/database')
const { User } = require('../models/User')
const Client = require('../models/Client')
const Task = require('../models/Task')
const Activity = require('../models/Activity')
const PaymentSettings = require('../models/PaymentSettings')

// Matches rows where the given field is absent or null.
const missing = field => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }] })

async function migrate () {
  await connectDB()

  // 1. Resolve the tenant (admin) id to assign everything to.
  let adminId = process.env.MIGRATE_ADMIN_ID
  if (adminId) {
    console.log(`Using MIGRATE_ADMIN_ID override: ${adminId}`)
  } else {
    // Only true firm ADMINs count here — the SUPER_ADMIN (role SUPER_ADMIN,
    // no firm) is never a tenant and is left untouched by this migration.
    const admins = await User.find({ role: 'ADMIN' }).select('_id email')
    if (admins.length === 0) {
      console.error('❌ No ADMIN user found — nothing to migrate. Aborting.')
      await mongoose.connection.close()
      process.exit(1)
    }
    if (admins.length > 1) {
      console.error(
        `❌ Found ${admins.length} ADMIN users. Refusing to guess which one owns legacy data.\n` +
        '   Re-run with MIGRATE_ADMIN_ID=<adminUserId> to choose explicitly.'
      )
      await mongoose.connection.close()
      process.exit(1)
    }
    adminId = admins[0]._id
    console.log(`Single admin detected: ${admins[0].email} (${adminId})`)
  }

  // 2. Backfill each collection. Only rows still missing the pointer are touched.
  const staffRes = await User.updateMany(
    { role: 'STAFF', ...missing('owner') },
    { $set: { owner: adminId } }
  )
  console.log(`STAFF users      → owner set on ${staffRes.modifiedCount}`)

  const clientRes = await Client.updateMany(missing('owner'), { $set: { owner: adminId } })
  console.log(`Clients          → owner set on ${clientRes.modifiedCount}`)

  const taskRes = await Task.updateMany(missing('owner'), { $set: { owner: adminId } })
  console.log(`Tasks            → owner set on ${taskRes.modifiedCount}`)

  const actRes = await Activity.updateMany(missing('owner'), { $set: { owner: adminId } })
  console.log(`Activities       → owner set on ${actRes.modifiedCount}`)

  const psRes = await PaymentSettings.updateMany(missing('adminId'), { $set: { adminId } })
  console.log(`PaymentSettings  → adminId set on ${psRes.modifiedCount}`)

  console.log('✅ Migration complete.')
  await mongoose.connection.close()
  process.exit(0)
}

migrate().catch(async err => {
  console.error('❌ Migration failed:', err)
  try { await mongoose.connection.close() } catch {}
  process.exit(1)
})
