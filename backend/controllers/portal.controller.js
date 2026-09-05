const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const requireContact = (req) => {
  if (!req.user.contactId) throw new AppError('Portal account is not linked to a Contact', 403);
  return req.user.contactId;
};

const dashboard = asyncHandler(async (req,res)=>{
  const contactId=requireContact(req);
  const [[contact]]=await pool.query('SELECT id,name,type,email,mobile FROM contacts WHERE id=? AND is_archived=FALSE',[contactId]);
  if(!contact) throw new AppError('Linked contact not found',404);
  const [[invoiceStats]]=await pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total-amount_paid),0) AS outstanding FROM customer_invoices WHERE customer_id=? AND status IN ('Posted','PartiallyPaid')`,[contactId]);
  const [[billStats]]=await pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total-amount_paid),0) AS outstanding FROM vendor_bills WHERE vendor_id=? AND status IN ('Posted','PartiallyPaid')`,[contactId]);
  return ok(res,{contact,invoices:{count:Number(invoiceStats.count),outstanding:Number(invoiceStats.outstanding)},bills:{count:Number(billStats.count),outstanding:Number(billStats.outstanding)}});
});

const invoices=asyncHandler(async(req,res)=>{
  const id=requireContact(req);
  const [rows]=await pool.query(`SELECT ci.id,ci.so_id,ci.invoice_date,ci.due_date,ci.status,ci.subtotal,ci.tax_total,ci.total,ci.amount_paid,(ci.total-ci.amount_paid) AS balance_due FROM customer_invoices ci WHERE ci.customer_id=? ORDER BY ci.id DESC`,[id]);
  return ok(res,rows);
});

const invoice=asyncHandler(async(req,res)=>{
  const id=requireContact(req);
  const [[row]]=await pool.query(`SELECT ci.*,c.name AS customer_name FROM customer_invoices ci JOIN contacts c ON c.id=ci.customer_id WHERE ci.id=? AND ci.customer_id=?`,[req.params.id,id]);
  if(!row) throw new AppError('Invoice not found',404);
  const [lines]=await pool.query(`SELECT cil.*,p.name AS product_name FROM customer_invoice_lines cil JOIN products p ON p.id=cil.product_id WHERE cil.invoice_id=?`,[row.id]);
  return ok(res,{...row,lines});
});

const bills=asyncHandler(async(req,res)=>{
  const id=requireContact(req);
  const [rows]=await pool.query(`SELECT vb.id,vb.po_id,vb.invoice_date,vb.due_date,vb.status,vb.total,vb.amount_paid,(vb.total-vb.amount_paid) AS balance_due FROM vendor_bills vb WHERE vb.vendor_id=? ORDER BY vb.id DESC`,[id]);
  return ok(res,rows);
});

module.exports={dashboard,invoices,invoice,bills};
