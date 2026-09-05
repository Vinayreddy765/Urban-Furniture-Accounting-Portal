const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/product.controller');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/categories', ctrl.listCategories);
router.get('/:id', ctrl.getById);

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

router.put('/:id', authorize('Administrator', 'Accountant'), ctrl.update);
router.patch('/:id/archive', authorize('Administrator', 'Accountant'), ctrl.archive);

module.exports = router;
