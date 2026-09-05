const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { postJournalEntry } = require('../utils/ledger');

const BILL_SELECT = `
  SELECT vb.*, c.name AS vendor_name
  FROM vendor_bills vb JOIN contacts c ON c.id = vb.vendor_id
`;

const list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) { where = 'WHERE vb.status = ?'; params.push(status); }

  const [rows] = await pool.query(`${BILL_SELECT} ${where} ORDER BY vb.id DESC`, params);
  return ok(res, rows);
});

const getById = asyncHandler(async (req, res) => {
  const [[bill]] = await pool.query(`${BILL_SELECT} WHERE vb.id = ?`, [req.params.id]);
  if (!bill) throw new AppError('Vendor Bill not found', 404);
  return ok(res, bill);
});

// Converts a Confirmed PO into a posted Vendor Bill:
//   Debit  Purchase Expense  — total
//   Credit Creditors         — total
// This is the moment the transaction becomes a real accounting entry — the PO
// itself never touches the ledger, only the Bill does.
const createFromPO = asyncHandler(async (req, res) => {
  const { poId, invoiceDate, dueDate } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[po]] = await conn.query('SELECT * FROM purchase_orders WHERE id = ? FOR UPDATE', [poId]);
    if (!po) throw new AppError('Purchase Order not found', 404);
    if (po.status !== 'Confirmed') {
      throw new AppError('Only a Confirmed Purchase Order can be converted to a Bill', 422);
    }
    if (dueDate && dueDate < invoiceDate) throw new AppError('Due date cannot be before invoice date', 422);

    const [[existingBill]] = await conn.query('SELECT id FROM vendor_bills WHERE po_id = ?', [poId]);
    if (existingBill) throw new AppError('This Purchase Order already has a Bill', 422);

    const [[vendor]] = await conn.query('SELECT id, is_archived FROM contacts WHERE id = ?', [po.vendor_id]);
    if (!vendor || vendor.is_archived) throw new AppError('Cannot bill an archived vendor', 422);

    const [poLines] = await conn.query(
      `SELECT pol.product_id, pol.quantity, pol.unit_price, pol.analytic_account_id, p.type, p.is_archived
       FROM purchase_order_lines pol JOIN products p ON p.id = pol.product_id
       WHERE pol.po_id = ?`,
      [poId]
    );
    if (!poLines.length) throw new AppError('Purchase Order has no line items', 422);
    if (poLines.some(line => line.is_archived)) throw new AppError('Cannot bill a Purchase Order containing an archived product', 422);

    const [[purchaseJournal]] = await conn.query(`
      SELECT id, default_debit_account_id, default_credit_account_id
      FROM journals WHERE type = 'Purchase' AND is_archived = FALSE LIMIT 1
    `);
    if (!purchaseJournal || !purchaseJournal.default_debit_account_id || !purchaseJournal.default_credit_account_id) {
      throw new AppError('Required Purchase Journal/accounts are missing. Run the seed script.', 500);
    }
    const [postingAccounts] = await conn.query(
      'SELECT id FROM accounts WHERE id IN (?, ?) AND is_archived = FALSE',
      [purchaseJournal.default_debit_account_id, purchaseJournal.default_credit_account_id]
    );
    if (postingAccounts.length !== 2) throw new AppError('Purchase Journal has an invalid or archived default account', 422);

    const [billResult] = await conn.query(
      `INSERT INTO vendor_bills (po_id, vendor_id, invoice_date, due_date, status, total)
       VALUES (?, ?, ?, ?, 'Posted', ?)`,
      [poId, po.vendor_id, invoiceDate, dueDate || null, po.total]
    );
    const billId = billResult.insertId;

    const journalEntryId = await postJournalEntry(conn, {
      journalId: purchaseJournal.id,
      entryDate: invoiceDate,
      reference: `Vendor Bill #${billId} (PO #${poId})`,
      sourceType: 'VendorBill',
      sourceId: billId,
      lines: [
        ...poLines.map(line => ({
          accountId: purchaseJournal.default_debit_account_id,
          debit: Number(line.quantity) * Number(line.unit_price),
          credit: 0,
          analyticAccountId: line.analytic_account_id,
        })),
        { accountId: purchaseJournal.default_credit_account_id, debit: 0, credit: po.total },
      ],
    });

    await conn.query('UPDATE vendor_bills SET journal_entry_id = ? WHERE id = ?', [journalEntryId, billId]);
    for (const line of poLines) {
      if (line.type === 'Goods') {
        await conn.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [line.quantity, line.product_id]);
      }
    }

    await conn.commit();
    const [[bill]] = await pool.query(`${BILL_SELECT} WHERE vb.id = ?`, [billId]);
    return ok(res, bill, 201);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = { list, getById, createFromPO };
