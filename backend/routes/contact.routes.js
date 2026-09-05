const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/contact.controller');

router.use(authenticate);

// Admin + Accountant can manage contacts; a portal User never hits this list
// (they only ever see their own linked contact via /api/portal/*, added later).
router.get('/', authorize('Administrator', 'Accountant'), ctrl.list);
router.get('/:id', authorize('Administrator', 'Accountant'), ctrl.getById);

router.post(
  '/',
  authorize('Administrator', 'Accountant'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type').isIn(['Customer', 'Vendor', 'Both']).withMessage('Type must be Customer, Vendor, or Both'),
    body('email')
      .isEmail().withMessage('A valid, unique email is required')
      .custom(async (email) => {
        const pool = require('../config/db');
        const [[existing]] = await pool.query('SELECT id FROM contacts WHERE email = ?', [email]);
        if (existing) throw new Error('This email is already used by another contact');
        return true;
      }),
  ],
  validate,
  ctrl.create
);

router.put('/:id', authorize('Administrator', 'Accountant'), ctrl.update);
router.patch('/:id/archive', authorize('Administrator', 'Accountant'), ctrl.archive);

module.exports = router;
