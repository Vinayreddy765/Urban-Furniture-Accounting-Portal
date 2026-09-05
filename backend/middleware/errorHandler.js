const { fail } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);

  if (err.isOperational) {
    return fail(res, err.message, err.statusCode, err.details);
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return fail(res, 'A record with this unique value already exists', 409);
  }

  return fail(res, 'Something went wrong. Please try again.', 500);
}

function notFound(req, res) {
  return fail(res, `Route ${req.originalUrl} not found`, 404);
}

module.exports = { errorHandler, notFound };
