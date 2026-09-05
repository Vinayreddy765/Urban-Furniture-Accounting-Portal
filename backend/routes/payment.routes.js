const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/payment.controller');

router.use(authenticate, authorize('Administrator', 'Accountant'));

router.get('/', ctrl.list);

router.post(
  '/',
  [
    body('contactId').isInt().withMessage('A contact must be selected'),
    body('paymentType').isIn(['Pay', 'Receive']).withMessage('Payment type must be Pay or Receive'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('paymentDate').isISO8601().withMessage('A valid payment date is required'),
    body('method').isIn(['Cash', 'Bank']).withMessage('Method must be Cash or Bank'),
  ],
  validate,
  ctrl.create
);

module.exports = router;
