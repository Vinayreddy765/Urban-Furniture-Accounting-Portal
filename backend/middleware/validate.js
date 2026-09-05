const { validationResult } = require('express-validator');
const { fail } = require('../utils/apiResponse');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, 'Validation failed', 422, errors.array().map(e => ({
      field: e.path,
      message: e.msg,
    })));
  }
  next();
}

module.exports = validate;
