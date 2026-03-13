/**
 * Middleware to restrict access to admin or moderator users.
 * Must be used AFTER the authenticate middleware.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};
