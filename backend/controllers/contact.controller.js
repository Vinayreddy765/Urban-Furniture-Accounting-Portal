const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { type, includeArchived } = req.query;
  const clauses = [];
  const params = [];
  if (!(includeArchived === true || includeArchived === 'true')) clauses.push('c.is_archived = FALSE');
  if (type) { clauses.push('c.type = ?'); params.push(type); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`
    SELECT c.*, u.id AS user_id, u.login_id AS portal_login_id, u.is_active AS portal_active
    FROM contacts c LEFT JOIN users u ON u.contact_id = c.id
    ${where} ORDER BY c.name
  `, params);
  return ok(res, rows);
});

const getById = asyncHandler(async (req, res) => {
  const [[contact]] = await pool.query(`
    SELECT c.*, u.id AS user_id, u.login_id AS portal_login_id, u.is_active AS portal_active
    FROM contacts c LEFT JOIN users u ON u.contact_id = c.id WHERE c.id = ?
  `, [req.params.id]);
  if (!contact) throw new AppError('Contact not found', 404);
  return ok(res, contact);
});

const create = asyncHandler(async (req, res) => {
  const { name, type, email, mobile, street, city, state, country, pincode, profileImage, createUser, portalUser } = req.body;
  const shouldCreateUser = createUser === true || !!portalUser;
  if (shouldCreateUser) {
    if (!portalUser || !portalUser.loginId || !/^[A-Za-z0-9._-]{6,12}$/.test(portalUser.loginId)) throw new AppError('Portal Login Id must be 6-12 characters and use letters, numbers, dot, underscore, or hyphen', 422);
    if (!portalUser.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portalUser.email)) throw new AppError('A valid portal user email is required', 422);
    if (!portalUser.password || portalUser.password.length < 9 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/.test(portalUser.password)) throw new AppError('Portal password must be more than 8 characters and contain lowercase, uppercase, and special characters', 422);
    const [users] = await pool.query('SELECT password_hash FROM users');
    for (const user of users) {
      if (await bcrypt.compare(portalUser.password, user.password_hash)) {
        throw new AppError('This password is already in use - please choose a different one', 422);
      }
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO contacts (name, type, email, mobile, street, city, state, country, pincode, profile_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type, email, mobile || null, street || null, city || null, state || null, country || null, pincode || null, profileImage || null]
    );
    const contactId = result.insertId;
    let portalAccount = null;

    if (shouldCreateUser) {
      if (!portalUser?.loginId || !portalUser?.email || !portalUser?.password) {
        throw new AppError('Portal user requires loginId, email, and password', 422);
      }
      const [[existingLogin]] = await conn.query('SELECT id FROM users WHERE login_id = ?', [portalUser.loginId]);
      if (existingLogin) throw new AppError('This Login Id is already taken', 409);
      const [[existingEmail]] = await conn.query('SELECT id FROM users WHERE email = ?', [portalUser.email]);
      if (existingEmail) throw new AppError('This email is already registered as a user', 409);
      const hash = await bcrypt.hash(portalUser.password, 10);
      const [userResult] = await conn.query(
        `INSERT INTO users (name, login_id, email, password_hash, role, contact_id) VALUES (?, ?, ?, ?, 'User', ?)`,
        [name, portalUser.loginId, portalUser.email, hash, contactId]
      );
      portalAccount = { id: userResult.insertId, loginId: portalUser.loginId, email: portalUser.email, role: 'User', contactId };
    }

    await conn.commit();
    const [[contact]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [contactId]);
    return ok(res, { contact, portalAccount }, 201);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const update = asyncHandler(async (req, res) => {
  const { name, type, email, mobile, street, city, state, country, pincode, profileImage } = req.body;
  const [[existing]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  if (!existing) throw new AppError('Contact not found', 404);
  if (existing.is_archived) throw new AppError('Restore the contact before editing it', 422);
  await pool.query(
    `UPDATE contacts SET name=?, type=?, email=?, mobile=?, street=?, city=?, state=?, country=?, pincode=?, profile_image=? WHERE id=?`,
    [name ?? existing.name, type ?? existing.type, email ?? existing.email, mobile ?? existing.mobile, street ?? existing.street, city ?? existing.city, state ?? existing.state, country ?? existing.country, pincode ?? existing.pincode, profileImage ?? existing.profile_image, req.params.id]
  );
  const [[updated]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

const archive = asyncHandler(async (req, res) => {
  const [[contact]] = await pool.query(
    'SELECT * FROM contacts WHERE id = ?',
    [req.params.id]
  );

  if (!contact) throw new AppError('Contact not found', 404);

  // true = archive, false = restore
  const archived = req.body?.archived !== false;

  await pool.query(
    'UPDATE contacts SET is_archived = ? WHERE id = ?',
    [archived, req.params.id]
  );

  const [[updated]] = await pool.query(
    'SELECT * FROM contacts WHERE id = ?',
    [req.params.id]
  );

  return ok(res, updated);
});

const mine = asyncHandler(async (req, res) => {
  const [[contact]] = await pool.query('SELECT * FROM contacts WHERE id = ? AND is_archived = FALSE', [req.user.contactId]);
  if (!contact) throw new AppError('Linked contact not found', 404);
  return ok(res, contact);
});

module.exports = { list, getById, create, update, archive, mine };
