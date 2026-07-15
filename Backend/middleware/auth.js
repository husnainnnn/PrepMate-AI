const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

/**
 * Extract and verify JWT from the Authorization header.
 * Returns decoded token payload { id, email, role } or null.
 */
function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Middleware: Require any authenticated user.
 * Returns 401 if no valid token.
 */
function requireAuth(req, res, next) {
  const tokenData = getUserFromToken(req);
  if (!tokenData) {
    return res.status(401).json({ error: 'Not authenticated. Please login.' });
  }
  req.user = tokenData;
  next();
}

/**
 * Middleware: Require a specific role (student | company | admin).
 * Must be used AFTER requireAuth (or standalone — it calls getUserFromToken internally).
 * Accepts one or more roles: requireRole('admin') or requireRole('student', 'company')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const tokenData = req.user || getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated. Please login.' });
    }
    if (!roles.includes(tokenData.role)) {
      return res.status(403).json({ error: `Access denied. ${roles.join(' or ')} role required.` });
    }
    req.user = tokenData;
    next();
  };
}

module.exports = { getUserFromToken, requireAuth, requireRole };
