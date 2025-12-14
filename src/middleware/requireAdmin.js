module.exports.requireAdmin = (req, res, next) => {
    // auth middleware must already have set req.user
if (!req.user) {
  return res.status(401).json({ error: 'Unauthorized' })
}

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}
