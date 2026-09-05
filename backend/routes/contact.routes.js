const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/contact.controller');

router.use(authenticate);
router.get('/mine', authorize('User'), ctrl.mine);
router.get('/', authorize('Administrator', 'Accountant'), ctrl.list);
router.get('/:id', authorize('Administrator', 'Accountant'), ctrl.getById);
router.post('/', authorize('Administrator', 'Accountant'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(['Customer', 'Vendor']).withMessage('Type must be Customer or Vendor'),
  body('email').isEmail().withMessage('A valid, unique email is required').custom(async email => {
    const pool = require('../config/db');
    const [[existing]] = await pool.query('SELECT id FROM contacts WHERE email = ?', [email]);
    if (existing) throw new Error('This email is already used by another contact');
    return true;
  }),
  body('createUser').optional().isBoolean(),
], validate, ctrl.create);

// Per the specification: Admin can modify/archive master data; Accountant is
// responsible for creating master data and recording transactions.
router.put('/:id', authorize('Administrator'), ctrl.update);
router.patch('/:id/archive', authorize('Administrator'), ctrl.archive);

module.exports = router;
