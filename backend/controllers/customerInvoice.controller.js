const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { postJournalEntry } = require('../utils/ledger');

const SELECT=`SELECT ci.*,c.name AS customer_name FROM customer_invoices ci JOIN contacts c ON c.id=ci.customer_id`;

const list=asyncHandler(async(req,res)=>{
  const {status,customerId}=req.query; const clauses=[]; const params=[];
  if(status){clauses.push('ci.status=?');params.push(status);} if(customerId){clauses.push('ci.customer_id=?');params.push(customerId);}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const [rows]=await pool.query(`${SELECT} ${where} ORDER BY ci.id DESC`,params); return ok(res,rows);
});

const getById=asyncHandler(async(req,res)=>{
  const [[invoice]]=await pool.query(`${SELECT} WHERE ci.id=?`,[req.params.id]);
  if(!invoice) throw new AppError('Customer Invoice not found',404);
  if(req.user.role==='User' && Number(invoice.customer_id)!==Number(req.user.contactId)) throw new AppError('You do not have permission to view this invoice',403);
  const [lines]=await pool.query(`SELECT cil.*,p.name AS product_name,aa.name AS analytic_account_name FROM customer_invoice_lines cil JOIN products p ON p.id=cil.product_id LEFT JOIN analytic_accounts aa ON aa.id=cil.analytic_account_id WHERE cil.invoice_id=?`,[req.params.id]);
  return ok(res,{...invoice,lines});
});

const createFromSO=asyncHandler(async(req,res)=>{
  const {soId,invoiceDate,dueDate}=req.body;
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [[so]]=await conn.query('SELECT * FROM sales_orders WHERE id=? FOR UPDATE',[soId]);
    if(!so) throw new AppError('Sales Order not found',404);
    if(so.status!=='Confirmed') throw new AppError('Only a Confirmed Sales Order can be converted to an Invoice',422);
    const [[existing]]=await conn.query('SELECT id FROM customer_invoices WHERE so_id=?',[soId]);
    if(existing) throw new AppError('This Sales Order already has an Invoice',422);
    const [soLines]=await conn.query('SELECT * FROM sales_order_lines WHERE so_id=? ORDER BY id',[soId]);
    if(!soLines.length) throw new AppError('Sales Order has no line items',422);

    let subtotal=0,taxTotal=0;
    for(const l of soLines){ const lineSubtotal=Number(l.quantity)*Number(l.unit_price); subtotal += lineSubtotal; taxTotal += lineSubtotal*Number(l.tax_percent)/100; }
    const total=subtotal+taxTotal;
    const [[debtors]]=await conn.query("SELECT id FROM accounts WHERE name='Debtors'");
    const [[sales]]=await conn.query("SELECT id FROM accounts WHERE name='Sales Income'");
    const [[tax]]=await conn.query("SELECT id FROM accounts WHERE name='Tax Payable'");
    const [[journal]]=await conn.query("SELECT id FROM journals WHERE type='Sales' AND is_archived=FALSE LIMIT 1");
    if(!debtors||!sales||!tax||!journal) throw new AppError('Required Sales Journal/accounts are missing. Run the seed script.',500);

    const [r]=await conn.query(`INSERT INTO customer_invoices(so_id,customer_id,invoice_date,due_date,status,subtotal,tax_total,total) VALUES(?,?,?,?, 'Posted',?,?,?)`,[soId,so.customer_id,invoiceDate,dueDate||null,subtotal,taxTotal,total]);
    const invoiceId=r.insertId;
    for(const l of soLines){
      const lineSubtotal=Number(l.quantity)*Number(l.unit_price), lineTax=lineSubtotal*Number(l.tax_percent)/100;
      await conn.query(`INSERT INTO customer_invoice_lines(invoice_id,product_id,quantity,unit_price,tax_percent,line_subtotal,tax_amount,line_total,analytic_account_id) VALUES(?,?,?,?,?,?,?,?,?)`,[invoiceId,l.product_id,l.quantity,l.unit_price,l.tax_percent,lineSubtotal,lineTax,lineSubtotal+lineTax,l.analytic_account_id]);
    }

    const lines=[{accountId:debtors.id,debit:total,credit:0}];
    if(subtotal>0) lines.push({accountId:sales.id,debit:0,credit:subtotal});
    if(taxTotal>0) lines.push({accountId:tax.id,debit:0,credit:taxTotal});
    const je=await postJournalEntry(conn,{journalId:journal.id,entryDate:invoiceDate,reference:`Customer Invoice #${invoiceId} (SO #${soId})`,sourceType:'CustomerInvoice',sourceId:invoiceId,lines});
    await conn.query('UPDATE customer_invoices SET journal_entry_id=? WHERE id=?',[je,invoiceId]);
    await conn.commit();
    const [[invoice]]=await pool.query(`${SELECT} WHERE ci.id=?`,[invoiceId]); return ok(res,invoice,201);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
});

module.exports={list,getById,createFromSO};
