/**
 * NoSQL-injection-safe version of common MongoDB operators.
 * Blocks keys containing $ or . to prevent query injection.
 */
function cleanKey(key) {
  return key.replace(/[$.]/g, '');
}

/**
 * Recursively sanitize an object to remove NoSQL injection (
 * operators (keys starting with $).
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const result = {};
  for (const key of Object.keys(obj)) {
    const clean = cleanKey(key);
    if (clean) {
      result[clean] = sanitizeObject(obj[key]);
    }
  }
  return result;
}

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
 * Also strips NoSQL $ operators from object keys.
 * Use as middleware: router.post('/path', sanitizeBody, handler)
 */
function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    // Remove NoSQL injection operators from the entire body
    const cleaned = sanitizeObject(req.body);
    // Sanitize string fields
    for (const key of Object.keys(cleaned)) {
      if (typeof cleaned[key] === 'string') {
        cleaned[key] = sanitize(cleaned[key]);
      }
    }
    req.body = cleaned;
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
 * Password strength validation — min 8 chars, at least 1 letter and 1 number.
 */
function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (!/[A-Za-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

module.exports = { requireFields, sanitize, sanitizeBody, isValidEmail, isValidPassword, sanitizeObject };
