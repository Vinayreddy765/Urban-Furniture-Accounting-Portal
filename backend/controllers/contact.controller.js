const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { type, includeArchived } = req.query;
  const clauses = [];
  const params = [];

  if (!includeArchived) clauses.push('is_archived = FALSE');
  if (type) { clauses.push('type = ?'); params.push(type); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM contacts ${where} ORDER BY name`, params);
  return ok(res, rows);
});

const getById = asyncHandler(async (req, res) => {
  const [[contact]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  if (!contact) throw new AppError('Contact not found', 404);
  return ok(res, contact);
});

const create = asyncHandler(async (req, res) => {
  const { name, type, email, mobile, street, city, state, country, pincode, profileImage } = req.body;

  const [result] = await pool.query(
    `INSERT INTO contacts (name, type, email, mobile, street, city, state, country, pincode, profile_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, type, email, mobile || null, street || null, city || null, state || null, country || null, pincode || null, profileImage || null]
  );

  const [[contact]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [result.insertId]);
  return ok(res, contact, 201);
});

const update = asyncHandler(async (req, res) => {
  const { name, type, email, mobile, street, city, state, country, pincode, profileImage } = req.body;

  const [[existing]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  if (!existing) throw new AppError('Contact not found', 404);

  await pool.query(
    `UPDATE contacts SET name = ?, type = ?, email = ?, mobile = ?, street = ?, city = ?, state = ?, country = ?, pincode = ?, profile_image = ?
     WHERE id = ?`,
    [
      name ?? existing.name,
      type ?? existing.type,
      email ?? existing.email,
      mobile ?? existing.mobile,
      street ?? existing.street,
      city ?? existing.city,
      state ?? existing.state,
      country ?? existing.country,
      pincode ?? existing.pincode,
      profileImage ?? existing.profile_image,
      req.params.id,
    ]
  );

  const [[updated]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

// Archive, never delete — historical journal entries and transactions reference
// this contact and must keep resolving correctly.
const archive = asyncHandler(async (req, res) => {
  const [[contact]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  if (!contact) throw new AppError('Contact not found', 404);

  await pool.query('UPDATE contacts SET is_archived = TRUE WHERE id = ?', [req.params.id]);
  const [[updated]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  return ok(res, updated);
});

module.exports = { list, getById, create, update, archive };
