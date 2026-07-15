/**
 * Validates that required fields are present and non-empty.
 * Returns 400 with specific error message if validation fails.
 *
 * Usage: router.post('/path', requireFields('email', 'password'), handler)
 * Usage: router.post('/path', requireFields({ name: 'email', message: 'Email is required' }), handler)
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = [];
    for (const f of fields) {
      const fieldName = typeof f === 'string' ? f : f.name;
      const value = req.body[fieldName];
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        missing.push(fieldName);
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Required fields missing: ${missing.join(', ')}`,
        fields: missing,
      });
    }
    next();
  };
}

/**
 * Sanitizes a string input — trims whitespace and removes HTML tags.
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<[^>]*>/g, '');
}

/**
 * Sanitize all string fields in req.body (mutates in place).
 * Use as middleware: router.post('/path', sanitizeBody, handler)
 */
function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  next();
}

/**
 * Email format validation.
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Password strength validation (min 6 chars, basic check).
 */
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

module.exports = { requireFields, sanitize, sanitizeBody, isValidEmail, isValidPassword };
