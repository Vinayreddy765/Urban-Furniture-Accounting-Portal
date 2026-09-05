const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/vendorBill.controller');

router.use(authenticate, authorize('Administrator', 'Accountant'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

router.post(
  '/from-po',
  [
    body('poId').isInt().withMessage('A Purchase Order must be selected'),
    body('invoiceDate').isISO8601().withMessage('A valid invoice date is required'),
  ],
  validate,
  ctrl.createFromPO
);

module.exports = router;
