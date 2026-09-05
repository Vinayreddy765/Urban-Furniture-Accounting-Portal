const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, loginId: user.login_id, contactId: user.contact_id || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

// Checked before hashing, since a bcrypt hash can't be reverse-compared for
// equality. Fine at hackathon scale; a large user base would need a different
// mechanism (e.g. a separate keyed lookup) instead of comparing against every hash.
async function isPasswordAlreadyUsed(plainPassword) {
  const [rows] = await pool.query('SELECT password_hash FROM users');
  for (const row of rows) {
    if (await bcrypt.compare(plainPassword, row.password_hash)) return true;
  }
  return false;
}

// Public self-signup. Per spec, this path ONLY ever creates an Accountant
// (Invoicing User) — never Administrator or User. Those are created by an
// Administrator via createUser below.
const signup = asyncHandler(async (req, res) => {
  const { name, loginId, email, password } = req.body;

  if (await isPasswordAlreadyUsed(password)) {
    throw new AppError('This password is already in use — please choose a different one', 422);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (name, login_id, email, password_hash, role) VALUES (?, ?, ?, ?, 'Accountant')`,
    [name || null, loginId, email, passwordHash]
  );

  const user = { id: result.insertId, role: 'Accountant', login_id: loginId, name };
  const token = signToken(user);
  return ok(res, { token, user: { id: user.id, name, loginId, email, role: 'Accountant' } }, 201);
});

// Admin-only. Creates either a User (must be linked to a Contact) or an
// Administrator. Never creates an Accountant — that's signup's job only.
const createUser = asyncHandler(async (req, res) => {
  const { name, loginId, email, password, role, contactId } = req.body;

  if (!['User', 'Administrator'].includes(role)) {
    throw new AppError('This endpoint can only create User or Administrator accounts', 422);
  }
  if (role === 'User' && !contactId) {
    throw new AppError('A User account must be linked to a Contact', 422);
  }
  if (role === 'User') {
    const [[contact]] = await pool.query('SELECT id FROM contacts WHERE id = ?', [contactId]);
    if (!contact) throw new AppError('Selected contact does not exist', 404);
  }
  if (await isPasswordAlreadyUsed(password)) {
    throw new AppError('This password is already in use — please choose a different one', 422);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (name, login_id, email, password_hash, role, contact_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, loginId, email, passwordHash, role, role === 'User' ? contactId : null]
  );

  return ok(res, { id: result.insertId, name, loginId, email, role }, 201);
});

// Deliberately generic error message on any mismatch — never reveal whether
// the login ID or the password was the one that was wrong.
const login = asyncHandler(async (req, res) => {
  const { loginId, password } = req.body;

  const [[user]] = await pool.query('SELECT * FROM users WHERE login_id = ?', [loginId]);
  if (!user || !user.is_active) throw new AppError('Invalid Login Id or Password', 401);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new AppError('Invalid Login Id or Password', 401);

  const token = signToken(user);
  return ok(res, {
    token,
    user: { id: user.id, name: user.name, loginId: user.login_id, email: user.email, role: user.role, contactId: user.contact_id },
  });
});

const me = asyncHandler(async (req, res) => {
  const [[user]] = await pool.query(
    'SELECT id, name, login_id AS loginId, email, role, contact_id AS contactId FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user) throw new AppError('User not found', 404);
  return ok(res, user);
});

module.exports = { signup, createUser, login, me };
