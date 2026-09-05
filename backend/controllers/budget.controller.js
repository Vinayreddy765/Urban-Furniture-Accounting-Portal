const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT
      b.*,
      aa.name AS analytic_account_name
    FROM budgets b
    JOIN analytic_accounts aa
      ON aa.id = b.analytic_account_id
    ORDER BY b.period_start DESC, b.name
  `);

  return ok(res, rows);
});

const create = asyncHandler(async (req, res) => {
  const {
    name,
    periodStart,
    periodEnd,
    responsiblePerson,
    analyticAccountId,
    plannedAmount
  } = req.body;

  if (periodStart > periodEnd) {
    throw new AppError(
      'Budget start date cannot be after end date',
      422
    );
  }

  const [[aa]] = await pool.query(
    'SELECT id FROM analytic_accounts WHERE id = ? AND is_archived = FALSE',
    [analyticAccountId]
  );

  if (!aa) {
    throw new AppError('Analytic Account not found', 404);
  }

  const [result] = await pool.query(
    `INSERT INTO budgets
      (
        name,
        period_start,
        period_end,
        responsible_person,
        analytic_account_id,
        planned_amount
      )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      name,
      periodStart,
      periodEnd,
      responsiblePerson || null,
      analyticAccountId,
      plannedAmount
    ]
  );

  const [[budget]] = await pool.query(
    `SELECT
       b.*,
       aa.name AS analytic_account_name
     FROM budgets b
     JOIN analytic_accounts aa
       ON aa.id = b.analytic_account_id
     WHERE b.id = ?`,
    [result.insertId]
  );

  return ok(res, budget, 201);
});

const update = asyncHandler(async (req, res) => {
  const [[existing]] = await pool.query(
    'SELECT * FROM budgets WHERE id = ?',
    [req.params.id]
  );

  if (!existing) {
    throw new AppError('Budget not found', 404);
  }

  const {
    name,
    periodStart,
    periodEnd,
    responsiblePerson,
    analyticAccountId,
    plannedAmount
  } = req.body;

  // PUT requires the complete budget data.
  const updatedName = name;
  const updatedStart = periodStart;
  const updatedEnd = periodEnd;
  const updatedResponsiblePerson = responsiblePerson ?? null;
  const updatedAnalyticAccountId = analyticAccountId;
  const updatedPlannedAmount = plannedAmount;

  if (updatedStart > updatedEnd) {
    throw new AppError(
      'Budget start date cannot be after end date',
      422
    );
  }

  const [[aa]] = await pool.query(
    'SELECT id FROM analytic_accounts WHERE id = ? AND is_archived = FALSE',
    [updatedAnalyticAccountId]
  );

  if (!aa) {
    throw new AppError('Analytic Account not found', 404);
  }

  await pool.query(
    `UPDATE budgets
     SET
       name = ?,
       period_start = ?,
       period_end = ?,
       responsible_person = ?,
       analytic_account_id = ?,
       planned_amount = ?
     WHERE id = ?`,
    [
      updatedName,
      updatedStart,
      updatedEnd,
      updatedResponsiblePerson,
      updatedAnalyticAccountId,
      updatedPlannedAmount,
      req.params.id
    ]
  );

  const [[updated]] = await pool.query(
    `SELECT
       b.*,
       aa.name AS analytic_account_name
     FROM budgets b
     JOIN analytic_accounts aa
       ON aa.id = b.analytic_account_id
     WHERE b.id = ?`,
    [req.params.id]
  );

  return ok(res, updated);
});

module.exports = {
  list,
  create,
  update
};