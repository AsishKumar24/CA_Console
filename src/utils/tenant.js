// Multi-tenancy helper.
//
// Every firm is identified by its ADMIN user's id ("tenant id"). Data rows
// (Client, Task, PaymentSettings, Activity, staff Users) carry an `owner`/
// `adminId` pointing at that tenant id. Use getTenantId(req) everywhere you
// build a query so reads/writes stay inside the caller's firm:
//   - ADMIN  -> their own _id
//   - STAFF  -> their `owner` (the admin who created them)
//
// Returns a Mongoose ObjectId, or null if it can't be resolved (e.g. a staff
// row that predates the migration and has no owner). Callers should treat a
// null tenant as "no access" rather than an unscoped query.
function getTenantId(req) {
  if (!req || !req.user) return null
  return req.user.role === 'ADMIN' ? req.user._id : req.user.owner || null
}

module.exports = { getTenantId }
