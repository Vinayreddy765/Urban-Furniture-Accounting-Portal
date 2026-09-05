const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/purchaseOrder.controller');

router.use(authenticate, authorize('Administrator', 'Accountant'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

router.post(
  '/',
  [
    body('vendorId').isInt().withMessage('A vendor must be selected'),
    body('orderDate').isISO8601().withMessage('A valid order date is required'),
    body('lines').isArray({ min: 1 }).withMessage('At least one line item is required'),
  ],
  validate,
  ctrl.create
);

router.patch('/:id/confirm', ctrl.confirm);

module.exports = router;
