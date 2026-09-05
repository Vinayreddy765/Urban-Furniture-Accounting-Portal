const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

async function validateJournalAccounts(type, debitId, creditId, cashBankId) {
  const requiredIds = type === 'Sales' || type === 'Purchase' ? [debitId, creditId] : [cashBankId];
  if (requiredIds.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)) throw new AppError('Journal default accounts are incomplete', 422);
  const [rows] = await pool.query('SELECT id FROM accounts WHERE id IN (?) AND is_archived = FALSE', [requiredIds]);
  if (rows.length !== requiredIds.length) throw new AppError('Journal references a missing or archived account', 422);
}

const list = asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const [rows] = await pool.query(`
    SELECT j.*,
      da.name AS default_debit_account_name,
      ca.name AS default_credit_account_name,
      cb.name AS cash_or_bank_account_name
    FROM journals j
    LEFT JOIN accounts da ON da.id = j.default_debit_account_id
    LEFT JOIN accounts ca ON ca.id = j.default_credit_account_id
    LEFT JOIN accounts cb ON cb.id = j.cash_or_bank_account_id
    ${includeArchived ? '' : 'WHERE j.is_archived = FALSE'}
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
  await validateJournalAccounts(type, defaultDebitAccountId, defaultCreditAccountId, cashOrBankAccountId);

  const [result] = await pool.query(
    `INSERT INTO journals (name, type, default_debit_account_id, default_credit_account_id, cash_or_bank_account_id)
     VALUES (?, ?, ?, ?, ?)`,
    [name, type, defaultDebitAccountId || null, defaultCreditAccountId || null, cashOrBankAccountId || null]
  );

  const [[journal]] = await pool.query('SELECT * FROM journals WHERE id = ?', [result.insertId]);
  return ok(res, journal, 201);
});

const update = asyncHandler(async (req, res) => {
  const [[journal]] = await pool.query('SELECT * FROM journals WHERE id = ?', [req.params.id]);
  if (!journal) throw new AppError('Journal not found', 404);
  if (journal.is_archived) throw new AppError('Restore the journal before editing it', 422);
  const { name, type, defaultDebitAccountId, defaultCreditAccountId, cashOrBankAccountId } = req.body;
  const updatedType = type ?? journal.type;
  const updatedDebit = defaultDebitAccountId ?? journal.default_debit_account_id;
  const updatedCredit = defaultCreditAccountId ?? journal.default_credit_account_id;
  const updatedCashBank = cashOrBankAccountId ?? journal.cash_or_bank_account_id;
  await validateJournalAccounts(updatedType, updatedDebit, updatedCredit, updatedCashBank);
  await pool.query(`UPDATE journals SET name=?, type=?, default_debit_account_id=?, default_credit_account_id=?, cash_or_bank_account_id=? WHERE id=?`, [
    name ?? journal.name, updatedType, updatedDebit, updatedCredit, updatedCashBank, req.params.id
  ]);
  const [[updated]] = await pool.query('SELECT * FROM journals WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

const archive = asyncHandler(async (req, res) => {
  const [[journal]] = await pool.query('SELECT * FROM journals WHERE id = ?', [req.params.id]);
  if (!journal) throw new AppError('Journal not found', 404);
  const archived = req.body?.archived !== false;
  await pool.query('UPDATE journals SET is_archived = ? WHERE id = ?', [archived, req.params.id]);
  return ok(res, { ...journal, is_archived: archived });
});

module.exports = { list, create, update, archive };
