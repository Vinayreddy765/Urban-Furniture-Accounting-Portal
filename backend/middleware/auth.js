const jwt = require('jsonwebtoken');
const { fail } = require('../utils/apiResponse');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'Authentication required', 401);
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
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
