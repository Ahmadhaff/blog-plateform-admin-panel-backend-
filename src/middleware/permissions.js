const hasRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  return next();
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
};

const isAdminOrEditor = (req, res, next) => {
  if (!req.user || !['Admin', 'Éditeur'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin or Editor access required' });
  }
  return next();
};

export { hasRole, isAdmin, isAdminOrEditor };

