const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const PO_SELECT = `
  SELECT po.*, c.name AS vendor_name
  FROM purchase_orders po
  JOIN contacts c ON c.id = po.vendor_id
`;

const list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) { where = 'WHERE po.status = ?'; params.push(status); }

  const [rows] = await pool.query(`${PO_SELECT} ${where} ORDER BY po.id DESC`, params);
  return ok(res, rows);
});

const getById = asyncHandler(async (req, res) => {
  const [[po]] = await pool.query(`${PO_SELECT} WHERE po.id = ?`, [req.params.id]);
  if (!po) throw new AppError('Purchase Order not found', 404);

  const [lines] = await pool.query(
    `SELECT pol.*, p.name AS product_name
     FROM purchase_order_lines pol JOIN products p ON p.id = pol.product_id
     WHERE pol.po_id = ?`,
    [req.params.id]
  );

  return ok(res, { ...po, lines });
});

// lines: [{ productId, quantity, unitPrice }]
const create = asyncHandler(async (req, res) => {
  const { vendorId, orderDate, lines } = req.body;

  if (!lines || lines.length === 0) {
    throw new AppError('A Purchase Order needs at least one line item', 422);
  }

  const [[vendor]] = await pool.query('SELECT * FROM contacts WHERE id = ?', [vendorId]);
  if (!vendor) throw new AppError('Selected vendor does not exist', 404);
  if (!['Vendor', 'Both'].includes(vendor.type)) {
    throw new AppError(`${vendor.name} is not registered as a Vendor`, 422);
  }

  const total = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO purchase_orders (vendor_id, order_date, status, total) VALUES (?, ?, 'Draft', ?)`,
      [vendorId, orderDate, total]
    );
    const poId = result.insertId;

    for (const line of lines) {
      await conn.query(
        `INSERT INTO purchase_order_lines (po_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
        [poId, line.productId, line.quantity, line.unitPrice]
      );
    }

    await conn.commit();
    const [[po]] = await pool.query(`${PO_SELECT} WHERE po.id = ?`, [poId]);
    return ok(res, po, 201);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const confirm = asyncHandler(async (req, res) => {
  const [[po]] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
  if (!po) throw new AppError('Purchase Order not found', 404);
  if (po.status !== 'Draft') throw new AppError('Only Draft purchase orders can be confirmed', 422);

  await pool.query(`UPDATE purchase_orders SET status = 'Confirmed' WHERE id = ?`, [req.params.id]);
  const [[updated]] = await pool.query(`${PO_SELECT} WHERE po.id = ?`, [req.params.id]);
  return ok(res, updated);
});

module.exports = { list, getById, create, confirm };
