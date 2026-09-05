const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/journal.controller');

router.use(authenticate);

router.get('/', ctrl.list);

router.post(
  '/',
  authorize('Administrator'),
  [
    body('name').trim().notEmpty().withMessage('Journal name is required'),
    body('type').isIn(['Sales', 'Purchase', 'Bank', 'Cash']).withMessage('Invalid journal type'),
  ],
  validate,
  ctrl.create
);

module.exports = router;
