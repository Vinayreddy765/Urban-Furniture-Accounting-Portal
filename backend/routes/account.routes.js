const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/account.controller');

router.use(authenticate);

router.get('/', authorize('Administrator', 'Accountant'), ctrl.list);

router.post(
  '/',
  authorize('Administrator', 'Accountant'),
  [
    body('name').trim().notEmpty().withMessage('Account name is required'),
    body('type').isIn(['Asset', 'Liability', 'Income', 'Expense', 'Capital']).withMessage('Invalid account type'),
  ],
  validate,
  ctrl.create
);

router.put('/:id', authorize('Administrator'), ctrl.update);
router.patch('/:id/archive', authorize('Administrator'), ctrl.archive);

module.exports = router;
