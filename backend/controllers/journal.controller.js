const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT j.*,
      da.name AS default_debit_account_name,
      ca.name AS default_credit_account_name,
      cb.name AS cash_or_bank_account_name
    FROM journals j
    LEFT JOIN accounts da ON da.id = j.default_debit_account_id
    LEFT JOIN accounts ca ON ca.id = j.default_credit_account_id
    LEFT JOIN accounts cb ON cb.id = j.cash_or_bank_account_id
    ORDER BY j.type, j.name
  `);
  return ok(res, rows);
});

const create = asyncHandler(async (req, res) => {
  const { name, type, defaultDebitAccountId, defaultCreditAccountId, cashOrBankAccountId } = req.body;

  if (['Sales', 'Purchase'].includes(type) && (!defaultDebitAccountId || !defaultCreditAccountId)) {
    throw new AppError('Sales/Purchase journals need both a default debit and credit account', 422);
  }
  if (['Bank', 'Cash'].includes(type) && !cashOrBankAccountId) {
    throw new AppError('Bank/Cash journals need a cash-or-bank account', 422);
  }

  const [result] = await pool.query(
    `INSERT INTO journals (name, type, default_debit_account_id, default_credit_account_id, cash_or_bank_account_id)
     VALUES (?, ?, ?, ?, ?)`,
    [name, type, defaultDebitAccountId || null, defaultCreditAccountId || null, cashOrBankAccountId || null]
  );

  const [[journal]] = await pool.query('SELECT * FROM journals WHERE id = ?', [result.insertId]);
  return ok(res, journal, 201);
});

module.exports = { list, create };
