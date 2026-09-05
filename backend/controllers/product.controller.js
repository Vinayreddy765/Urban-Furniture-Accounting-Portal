const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Category arrives as a plain name string from the form. Find-or-create it —
// this is what makes the dropdown "create and save on the fly" per the mockup,
// instead of requiring categories to be set up as a separate prior step.
async function findOrCreateCategory(name) {
  if (!name) return null;
  const [[existing]] = await pool.query('SELECT id FROM product_categories WHERE name = ?', [name]);
  if (existing) return existing.id;

  const [result] = await pool.query('INSERT INTO product_categories (name) VALUES (?)', [name]);
  return result.insertId;
}

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category
  FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
`;

const list = asyncHandler(async (req, res) => {
  const { includeArchived, categoryId } = req.query;
  const clauses = [];
  const params = [];

  if (!(includeArchived === true || includeArchived === 'true')) clauses.push('p.is_archived = FALSE');
  if (categoryId) { clauses.push('p.category_id = ?'); params.push(categoryId); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`${PRODUCT_SELECT} ${where} ORDER BY p.name`, params);
  return ok(res, rows);
});

const getById = asyncHandler(async (req, res) => {
  const [[product]] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [req.params.id]);
  if (!product) throw new AppError('Product not found', 404);
  return ok(res, product);
});

const create = asyncHandler(async (req, res) => {
  const { name, type, salesPrice, costPrice, category, profileImage } = req.body;
  const categoryId = await findOrCreateCategory(category);

  const [result] = await pool.query(
    `INSERT INTO products (name, type, sales_price, cost_price, category_id, profile_image) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, type, salesPrice, costPrice || 0, categoryId, profileImage || null]
  );

  const [[product]] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [result.insertId]);
  return ok(res, product, 201);
});

const update = asyncHandler(async (req, res) => {
  const { name, type, salesPrice, costPrice, category, profileImage } = req.body;

  const [[existing]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) throw new AppError('Product not found', 404);

  const categoryId = category !== undefined ? await findOrCreateCategory(category) : existing.category_id;

  await pool.query(
    `UPDATE products SET name = ?, type = ?, sales_price = ?, cost_price = ?, category_id = ?, profile_image = ? WHERE id = ?`,
    [
      name ?? existing.name,
      type ?? existing.type,
      salesPrice ?? existing.sales_price,
      costPrice ?? existing.cost_price,
      categoryId,
      profileImage ?? existing.profile_image,
      req.params.id,
    ]
  );

  const [[updated]] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [req.params.id]);
  return ok(res, updated);
});

const archive = asyncHandler(async (req, res) => {
  const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) throw new AppError('Product not found', 404);

  await pool.query('UPDATE products SET is_archived = TRUE WHERE id = ?', [req.params.id]);
  const [[updated]] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [req.params.id]);
  return ok(res, updated);
});

const listCategories = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM product_categories ORDER BY name');
  return ok(res, rows);
});

module.exports = { list, getById, create, update, archive, listCategories };
