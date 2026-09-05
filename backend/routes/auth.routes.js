const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

// Shared rules, exactly as annotated on the mockup:
// - Login Id: unique, 6-12 characters
// - Email: must not be a duplicate
// - Password: lowercase + uppercase + special char, more than 8 characters, unique
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/;

const credentialRules = [
  body('loginId')
    .trim()
    .isLength({ min: 6, max: 12 }).withMessage('Login Id must be between 6 and 12 characters')
    .custom(async (loginId) => {
      const pool = require('../config/db');
      const [[existing]] = await pool.query('SELECT id FROM users WHERE login_id = ?', [loginId]);
      if (existing) throw new Error('This Login Id is already taken');
      return true;
    }),
  body('email')
    .isEmail().withMessage('A valid email is required')
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

router.post('/signup', credentialRules, validate, ctrl.signup);

router.post(
  '/create-user',
  authenticate,
  authorize('Administrator'),
  [
    ...credentialRules,
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').isIn(['User', 'Administrator']).withMessage('Role must be User or Administrator'),
    body('contactId').if(body('role').equals('User')).notEmpty().withMessage('A Contact must be selected for a User account'),
  ],
  validate,
  ctrl.createUser
);

router.post(
  '/login',
  [
    body('loginId').trim().notEmpty().withMessage('Login Id is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.me);

module.exports = router;
