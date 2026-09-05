const router = require('express').Router();
const { body, param } = require('express-validator');
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
    body('lines.*.productId').isInt({ min: 1 }).withMessage('Every line needs a valid product'),
    body('lines.*.quantity').isFloat({ gt: 0 }).withMessage('Every line needs a positive quantity'),
    body('lines.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Every line needs a non-negative unit price'),
    body('lines.*.analyticAccountId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Analytic Account must be valid'),
  ],
  validate,
  ctrl.create
);

router.patch('/:id/confirm', [param('id').isInt({ min: 1 })], validate, ctrl.confirm);

module.exports = router;
