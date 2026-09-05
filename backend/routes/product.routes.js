const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/product.controller');

router.use(authenticate);

router.get('/', authorize('Administrator', 'Accountant'), ctrl.list);
router.get('/categories', authorize('Administrator', 'Accountant'), ctrl.listCategories);
router.get('/:id', authorize('Administrator', 'Accountant'), ctrl.getById);

router.post(
  '/',
  authorize('Administrator', 'Accountant'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('type').isIn(['Goods', 'Service', 'Combo']).withMessage('Type must be Goods, Service, or Combo'),
    body('salesPrice').isFloat({ gt: 0 }).withMessage('Sales price must be a positive number'),
  ],
  validate,
  ctrl.create
);

router.put('/:id', authorize('Administrator'), [param('id').isInt({ min: 1 }), body('name').optional().trim().notEmpty(), body('type').optional().isIn(['Goods', 'Service', 'Combo']), body('salesPrice').optional().isFloat({ gt: 0 }), body('costPrice').optional().isFloat({ min: 0 })], validate, ctrl.update);
router.patch('/:id/archive', authorize('Administrator'), [param('id').isInt({ min: 1 }), body('archived').optional().isBoolean()], validate, ctrl.archive);

module.exports = router;
