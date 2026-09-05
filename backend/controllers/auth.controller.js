const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      loginId: user.login_id,
      contactId: user.contact_id || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

async function isPasswordAlreadyUsed(plainPassword, excludeUserId = null) {
  const [rows] = await pool.query(
    `SELECT id, password_hash FROM users ${excludeUserId ? 'WHERE id <> ?' : ''}`,
    excludeUserId ? [excludeUserId] : []
  );
  for (const row of rows) {
    if (await bcrypt.compare(plainPassword, row.password_hash)) return true;
  }
  return false;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    loginId: user.login_id,
    email: user.email,
    role: user.role,
    contactId: user.contact_id || null,
    isActive: !!user.is_active,
  };
}

// Public signup is intentionally limited to the Accountant role. An
// Administrator can also create an Accountant from the protected user API.
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

  const user = { id: result.insertId, role: 'Accountant', login_id: loginId, email, name, contact_id: null, is_active: true };
  return ok(res, { token: signToken(user), user: publicUser(user) }, 201);
});

// Administrator-only. Creates an internal Administrator/Accountant or an
// external Contact portal User. A User must always be linked to a Contact.
const createUser = asyncHandler(async (req, res) => {
  const { name, loginId, email, password, role, contactId } = req.body;
  if (!['User', 'Accountant', 'Administrator'].includes(role)) {
    throw new AppError('Role must be User, Accountant, or Administrator', 422);
  }
  if (role === 'User' && !contactId) {
    throw new AppError('A User account must be linked to a Contact', 422);
  }
  if (role === 'User') {
    const [[contact]] = await pool.query('SELECT id, is_archived FROM contacts WHERE id = ?', [contactId]);
    if (!contact) throw new AppError('Selected contact does not exist', 404);
    if (contact.is_archived) throw new AppError('Cannot create a portal account for an archived contact', 422);

    const [[existingUser]] = await pool.query('SELECT id FROM users WHERE contact_id = ?', [contactId]);
    if (existingUser) throw new AppError('This contact already has a portal account', 409);
  }
  if (await isPasswordAlreadyUsed(password)) {
    throw new AppError('This password is already in use — please choose a different one', 422);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (name, login_id, email, password_hash, role, contact_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, loginId, email, passwordHash, role, role === 'User' ? contactId : null]
  );
  const [[user]] = await pool.query('SELECT id, name, login_id, email, role, contact_id, is_active FROM users WHERE id = ?', [result.insertId]);
  return ok(res, publicUser(user), 201);
});

const listUsers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id, u.name, u.login_id AS loginId, u.email, u.role, u.contact_id AS contactId,
           u.is_active AS isActive, c.name AS contactName
    FROM users u
    LEFT JOIN contacts c ON c.id = u.contact_id
    ORDER BY u.id DESC
  `);
  return ok(res, rows);
});

const setActive = asyncHandler(async (req, res) => {
  const [[user]] = await pool.query('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!user) throw new AppError('User not found', 404);
  if (Number(user.id) === Number(req.user.id) && req.body.isActive === false) {
    throw new AppError('You cannot deactivate your own account', 422);
  }
  await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [!!req.body.isActive, req.params.id]);
  const [[updated]] = await pool.query('SELECT id, name, login_id AS loginId, email, role, contact_id AS contactId, is_active AS isActive FROM users WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

const login = asyncHandler(async (req, res) => {
  const { loginId, password } = req.body;
  const [[user]] = await pool.query('SELECT * FROM users WHERE login_id = ?', [loginId]);
  if (!user || !user.is_active) throw new AppError('Invalid Login Id or Password', 401);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new AppError('Invalid Login Id or Password', 401);

  return ok(res, { token: signToken(user), user: publicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  const [[user]] = await pool.query(
    'SELECT id, name, login_id, email, role, contact_id, is_active FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user || !user.is_active) throw new AppError('User not found', 404);
  return ok(res, publicUser(user));
});

module.exports = { signup, createUser, listUsers, setActive, login, me };
