const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/;

const credentialRules = [
  body('loginId')
    .trim()
    .isLength({ min: 6, max: 12 }).withMessage('Login Id must be between 6 and 12 characters')
    .matches(/^[A-Za-z0-9._-]+$/).withMessage('Login Id contains invalid characters')
    .custom(async (loginId) => {
      const pool = require('../config/db');
      const [[existing]] = await pool.query('SELECT id FROM users WHERE login_id = ?', [loginId]);
      if (existing) throw new Error('This Login Id is already taken');
      return true;
    }),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail()
    .custom(async (email) => {
      const pool = require('../config/db');
      const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) throw new Error('This email is already registered');
      return true;
    }),
  body('password')
    .isLength({ min: 9 }).withMessage('Password must be more than 8 characters')
    .matches(PASSWORD_REGEX).withMessage('Password must contain a lowercase letter, an uppercase letter, and a special character'),
];

router.post('/signup', [body('name').optional().trim().isLength({ max: 120 }), ...credentialRules], validate, ctrl.signup);

router.post('/create-user', authenticate, authorize('Administrator'), [
  ...credentialRules,
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').isIn(['User', 'Accountant', 'Administrator']).withMessage('Invalid role'),
  body('contactId').if(body('role').equals('User')).isInt().withMessage('A Contact must be selected for a User account'),
], validate, ctrl.createUser);

router.get('/users', authenticate, authorize('Administrator'), ctrl.listUsers);
router.patch('/users/:id/status', authenticate, authorize('Administrator'), [body('isActive').isBoolean()], validate, ctrl.setActive);

router.post('/login', [body('loginId').trim().notEmpty().withMessage('Login Id is required'), body('password').notEmpty().withMessage('Password is required')], validate, ctrl.login);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
