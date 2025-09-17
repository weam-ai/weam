// Authorization middleware for role/permission checks
module.exports = function checkPermission(permission) {
  return function (req, res, next) {
    const user = req.user;
    // Feature flag: disable endpoint if not enabled
    if (process.env.BULK_DELETE_BRAINS_ENABLED !== 'true') {
      return res.status(403).json({ error: 'Bulk delete is disabled by feature flag.' });
    }
    // Check user and permissions
    if (!user || !user.permissions || !user.roles) {
      return res.status(403).json({ error: 'Unauthorized: missing user roles/permissions.' });
    }
    // Only COMPANY or MANAGER roles allowed
    const allowedRoles = ['COMPANY', 'MANAGER'];
    const hasRole = user.roles.some(role => allowedRoles.includes(role));
    const hasPermission = user.permissions.includes(permission);
    if (hasRole && hasPermission) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
  };
};
