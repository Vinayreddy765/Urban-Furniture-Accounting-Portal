const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { postJournalEntry } = require('../utils/ledger');

const list = asyncHandler(async (req, res) => {
  const clauses = []; const params = [];
  if (req.user.role === 'User') { clauses.push('p.contact_id = ?'); params.push(req.user.contactId); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`
    SELECT p.*, c.name AS contact_name
    FROM payments p JOIN contacts c ON c.id = p.contact_id
    ${where} ORDER BY p.id DESC
  `, params);
  return ok(res, rows);
});

// paymentType 'Pay'     -> against a Vendor Bill:      Debit Creditors, Credit Cash/Bank
// paymentType 'Receive' -> against a Customer Invoice:  Debit Cash/Bank, Credit Debtors
const create = asyncHandler(async (req, res) => {
  let { contactId, paymentType, amount, paymentDate, method, linkedBillId, linkedInvoiceId } = req.body;
  if (req.user.role === 'User') {
    if (!req.user.contactId) throw new AppError('Portal account is not linked to a Contact', 403);
    contactId = req.user.contactId;
  }

  if (!contactId) throw new AppError('A contact must be selected', 422);
  const [[contact]] = await pool.query('SELECT id, type, is_archived FROM contacts WHERE id = ?', [contactId]);
  if (!contact) throw new AppError('Contact not found', 404);
  if (contact.is_archived) throw new AppError('Cannot record a payment for an archived contact', 422);

  if (paymentType === 'Pay' && !linkedBillId) {
    throw new AppError('A Vendor Bill must be selected for a Pay transaction', 422);
  }
  if (paymentType === 'Receive' && !linkedInvoiceId) {
    throw new AppError('A Customer Invoice must be selected for a Receive transaction', 422);
  }
  if (linkedBillId && linkedInvoiceId) throw new AppError('A payment can be linked to a bill OR an invoice, never both', 422);
  if (paymentType === 'Pay' && linkedInvoiceId) throw new AppError('Pay transactions must reference a Vendor Bill', 422);
  if (paymentType === 'Receive' && linkedBillId) throw new AppError('Receive transactions must reference a Customer Invoice', 422);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[cashOrBankAccount]] = await conn.query('SELECT id FROM accounts WHERE name = ? AND is_archived = FALSE', [method]);
    const [[journal]] = await conn.query('SELECT id FROM journals WHERE type = ? AND is_archived = FALSE LIMIT 1', [method]);
    if (!cashOrBankAccount || !journal) throw new AppError(`Required ${method} account/journal is missing. Run the seed script.`, 500);

    let journalEntryId;
    let paymentId;

    if (paymentType === 'Pay') {
      const [[bill]] = await conn.query('SELECT * FROM vendor_bills WHERE id = ? FOR UPDATE', [linkedBillId]);
      if (!bill) throw new AppError('Vendor Bill not found', 404);
      if (Number(bill.vendor_id) !== Number(contactId)) throw new AppError('Payment contact does not match the Vendor Bill', 422);
      if (!['Posted','PartiallyPaid'].includes(bill.status)) throw new AppError('Only Posted or PartiallyPaid Vendor Bills can be paid', 422);
      if (bill.status === 'Paid') throw new AppError('This bill is already fully paid', 422);

      const remaining = Number(bill.total) - Number(bill.amount_paid);
      if (Number(amount) > remaining + 0.005) {
        throw new AppError(`Payment (${amount}) exceeds the remaining balance due (${remaining.toFixed(2)})`, 422);
      }

      const [[creditorsAccount]] = await conn.query(`SELECT id FROM accounts WHERE name = 'Creditors' AND is_archived=FALSE`);
      if (!creditorsAccount) throw new AppError('Creditors account is missing. Run the seed script.', 500);

      const [paymentResult] = await conn.query(
        `INSERT INTO payments (contact_id, payment_type, amount, payment_date, method, linked_bill_id, created_by)
         VALUES (?, 'Pay', ?, ?, ?, ?, ?)`,
        [contactId, amount, paymentDate, method, linkedBillId, req.user.id]
      );
      paymentId = paymentResult.insertId;

      journalEntryId = await postJournalEntry(conn, {
        journalId: journal.id,
        entryDate: paymentDate,
        reference: `Payment #${paymentId} for Vendor Bill #${linkedBillId}`,
        sourceType: 'Payment',
        sourceId: paymentId,
        lines: [
          { accountId: creditorsAccount.id, debit: amount, credit: 0 },
          { accountId: cashOrBankAccount.id, debit: 0, credit: amount },
        ],
      });

      const newAmountPaid = Number(bill.amount_paid) + Number(amount);
      const newStatus = newAmountPaid >= Number(bill.total) - 0.005 ? 'Paid' : 'PartiallyPaid';
      await conn.query('UPDATE vendor_bills SET amount_paid = ?, status = ? WHERE id = ?', [newAmountPaid, newStatus, linkedBillId]);
    } else {
      const [[invoice]] = await conn.query('SELECT * FROM customer_invoices WHERE id = ? FOR UPDATE', [linkedInvoiceId]);
      if (!invoice) throw new AppError('Customer Invoice not found', 404);
      if (Number(invoice.customer_id) !== Number(contactId)) throw new AppError('Payment contact does not match the Customer Invoice', 422);
      if (!['Posted','PartiallyPaid'].includes(invoice.status)) throw new AppError('Only Posted or PartiallyPaid Customer Invoices can be paid', 422);
      if (invoice.status === 'Paid') throw new AppError('This invoice is already fully paid', 422);

      const remaining = Number(invoice.total) - Number(invoice.amount_paid);
      if (Number(amount) > remaining + 0.005) {
        throw new AppError(`Payment (${amount}) exceeds the remaining balance due (${remaining.toFixed(2)})`, 422);
      }

      const [[debtorsAccount]] = await conn.query(`SELECT id FROM accounts WHERE name = 'Debtors' AND is_archived=FALSE`);
      if (!debtorsAccount) throw new AppError('Debtors account is missing. Run the seed script.', 500);

      const [paymentResult] = await conn.query(
        `INSERT INTO payments (contact_id, payment_type, amount, payment_date, method, linked_invoice_id, created_by)
         VALUES (?, 'Receive', ?, ?, ?, ?, ?)`,
        [contactId, amount, paymentDate, method, linkedInvoiceId, req.user.id]
      );
      paymentId = paymentResult.insertId;

      journalEntryId = await postJournalEntry(conn, {
        journalId: journal.id,
        entryDate: paymentDate,
        reference: `Payment #${paymentId} for Customer Invoice #${linkedInvoiceId}`,
        sourceType: 'Payment',
        sourceId: paymentId,
        lines: [
          { accountId: cashOrBankAccount.id, debit: amount, credit: 0 },
          { accountId: debtorsAccount.id, debit: 0, credit: amount },
        ],
      });

      const newAmountPaid = Number(invoice.amount_paid) + Number(amount);
      const newStatus = newAmountPaid >= Number(invoice.total) - 0.005 ? 'Paid' : 'PartiallyPaid';
      await conn.query('UPDATE customer_invoices SET amount_paid = ?, status = ? WHERE id = ?', [newAmountPaid, newStatus, linkedInvoiceId]);
    }

    await conn.query('UPDATE payments SET journal_entry_id = ? WHERE id = ?', [journalEntryId, paymentId]);

    await conn.commit();
    const [[payment]] = await pool.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
    return ok(res, payment, 201);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = { list, create };
