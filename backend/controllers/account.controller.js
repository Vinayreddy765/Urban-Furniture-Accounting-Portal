const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { type, includeArchived } = req.query;
  const clauses = [];
  const params = [];

  if (!(includeArchived === true || includeArchived === 'true')) clauses.push('is_archived = FALSE');
  if (type) { clauses.push('type = ?'); params.push(type); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM accounts ${where} ORDER BY type, name`, params);
  return ok(res, rows);
});

const create = asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  const [result] = await pool.query('INSERT INTO accounts (name, type) VALUES (?, ?)', [name, type]);
  const [[account]] = await pool.query('SELECT * FROM accounts WHERE id = ?', [result.insertId]);
  return ok(res, account, 201);
});

// Archive only — an account with existing journal_entry_lines must never be
// deleted, or historical reports would silently lose data.
const update = asyncHandler(async (req, res) => {
  const [[account]] = await pool.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
  if (!account) throw new AppError('Account not found', 404);
  if (account.is_archived) throw new AppError('Restore the account before editing it', 422);
  const { name, type } = req.body;
  await pool.query('UPDATE accounts SET name = ?, type = ? WHERE id = ?', [name ?? account.name, type ?? account.type, req.params.id]);
  const [[updated]] = await pool.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

const archive = asyncHandler(async (req, res) => {
  const [[account]] = await pool.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
  if (!account) throw new AppError('Account not found', 404);

  const archived = req.body?.archived !== false;
  await pool.query('UPDATE accounts SET is_archived = ? WHERE id = ?', [archived, req.params.id]);
  const [[updated]] = await pool.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

module.exports = { list, create, update, archive };
