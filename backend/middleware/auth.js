const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { fail } = require('../utils/apiResponse');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'Authentication required', 401);
  }
  try {
    const tokenUser = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const [[user]] = await pool.query(
      'SELECT id, name, login_id, role, contact_id, is_active FROM users WHERE id = ?',
      [tokenUser.id]
    );
    if (!user || !user.is_active || user.role !== tokenUser.role) {
      return fail(res, 'Invalid or expired session', 401);
    }
    req.user = {
      ...tokenUser,
      id: user.id,
      name: user.name,
      loginId: user.login_id,
      role: user.role,
      contactId: user.contact_id || null,
    };
    next();
  } catch {
    return fail(res, 'Invalid or expired session', 401);
  }
}

// Usage: authorize('Administrator', 'Accountant')
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 'Authentication required', 401);
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 'You do not have permission to perform this action', 403);
    }
    next();
  };
}

module.exports = { authenticate, authorize };
