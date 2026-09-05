const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/journal.controller');
router.use(authenticate);
router.get('/', authorize('Administrator','Accountant'), ctrl.list);
router.post('/', authorize('Administrator','Accountant'), [
  body('name').trim().notEmpty().withMessage('Journal name is required'),
  body('type').isIn(['Sales','Purchase','Bank','Cash']).withMessage('Invalid journal type'),
], validate, ctrl.create);
router.put('/:id', authorize('Administrator'), [param('id').isInt({ min: 1 }), body('name').optional().trim().notEmpty(), body('type').optional().isIn(['Sales', 'Purchase', 'Bank', 'Cash']), body('defaultDebitAccountId').optional({ nullable: true }).isInt({ min: 1 }), body('defaultCreditAccountId').optional({ nullable: true }).isInt({ min: 1 }), body('cashOrBankAccountId').optional({ nullable: true }).isInt({ min: 1 })], validate, ctrl.update);
router.patch('/:id/archive', authorize('Administrator'), [param('id').isInt({ min: 1 }), body('archived').optional().isBoolean()], validate, ctrl.archive);
module.exports = router;
