const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/budget.controller');

router.use(
  authenticate,
  authorize('Administrator', 'Accountant')
);

const rules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Budget name is required'),

  body('periodStart')
    .isISO8601()
    .withMessage('A valid budget start date is required'),

  body('periodEnd')
    .isISO8601()
    .withMessage('A valid budget end date is required'),

  body('analyticAccountId')
    .isInt({ min: 1 })
    .withMessage('A valid analytic account is required'),

  body('plannedAmount')
    .isFloat({ min: 0 })
    .withMessage('Planned amount must be 0 or greater'),

  body('responsiblePerson')
    .optional({ nullable: true })
    .trim()
];

router.get('/', ctrl.list);

router.post(
  '/',
  rules,
  validate,
  ctrl.create
);

router.put(
  '/:id',
  authorize('Administrator'),
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid budget ID'),

    ...rules
  ],
  validate,
  ctrl.update
);

module.exports = router;