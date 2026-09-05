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
    if(dueDate && dueDate < invoiceDate) throw new AppError('Due date cannot be before invoice date',422);
    const [[existing]]=await conn.query('SELECT id FROM customer_invoices WHERE so_id=?',[soId]);
    if(existing) throw new AppError('This Sales Order already has an Invoice',422);
    const [soLines]=await conn.query('SELECT * FROM sales_order_lines WHERE so_id=? ORDER BY id',[soId]);
    if(!soLines.length) throw new AppError('Sales Order has no line items',422);

    const [[customer]]=await conn.query('SELECT id,is_archived FROM contacts WHERE id=?',[so.customer_id]);
    if(!customer||customer.is_archived) throw new AppError('Cannot invoice an archived customer',422);
    const productIds=[...new Set(soLines.map(line=>line.product_id))];
    const [products]=await conn.query('SELECT id,type,is_archived,stock_quantity,cost_price FROM products WHERE id IN (?)',[productIds]);
    if(products.length!==productIds.length||products.some(product=>product.is_archived)) throw new AppError('Cannot invoice a Sales Order containing an archived product',422);
    const productById=new Map(products.map(product=>[product.id,product]));

    const roundCurrency=value=>Math.round((value+Number.EPSILON)*100)/100;
    let subtotal=0,taxTotal=0;
    for(const l of soLines){
      const lineSubtotal=roundCurrency(Number(l.quantity)*Number(l.unit_price));
      const lineTax=roundCurrency(lineSubtotal*Number(l.tax_percent)/100);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
      const product=productById.get(l.product_id);
      if(product.type==='Goods' && Number(product.stock_quantity)<Number(l.quantity)) throw new AppError(`Insufficient stock for product ${l.product_id}`,422);
    }
    subtotal=roundCurrency(subtotal);
    taxTotal=roundCurrency(taxTotal);
    const total=roundCurrency(subtotal+taxTotal);
    const [[journal]]=await conn.query("SELECT id,default_debit_account_id,default_credit_account_id FROM journals WHERE type='Sales' AND is_archived=FALSE LIMIT 1");
    const [[tax]]=await conn.query("SELECT id FROM accounts WHERE name='Tax Payable' AND is_archived=FALSE");
    const [[cogs]]=await conn.query("SELECT id FROM accounts WHERE name='Cost of Goods Sold' AND is_archived=FALSE");
    const [[inventory]]=await conn.query("SELECT id FROM accounts WHERE name='Inventory' AND is_archived=FALSE");
    const needsInventoryPosting=soLines.some(line=>productById.get(line.product_id).type==='Goods');
    if(!journal||!journal.default_debit_account_id||!journal.default_credit_account_id||!tax||(needsInventoryPosting&&(!cogs||!inventory))) throw new AppError('Required Sales Journal/accounts are missing. Run the seed script.',500);
    const accountIds=[journal.default_debit_account_id,journal.default_credit_account_id,tax?.id,cogs?.id,inventory?.id].filter(Boolean);
    const [postingAccounts]=await conn.query(`SELECT id FROM accounts WHERE id IN (?) AND is_archived=FALSE`,[accountIds]);
    if(postingAccounts.length!==accountIds.length) throw new AppError('Sales Journal has an invalid or archived default account',422);

    const [r]=await conn.query(`INSERT INTO customer_invoices(so_id,customer_id,invoice_date,due_date,status,subtotal,tax_total,total) VALUES(?,?,?,?, 'Posted',?,?,?)`,[soId,so.customer_id,invoiceDate,dueDate||null,subtotal,taxTotal,total]);
    const invoiceId=r.insertId;
    for(const l of soLines){
      const lineSubtotal=roundCurrency(Number(l.quantity)*Number(l.unit_price)), lineTax=roundCurrency(lineSubtotal*Number(l.tax_percent)/100);
      await conn.query(`INSERT INTO customer_invoice_lines(invoice_id,product_id,quantity,unit_price,tax_percent,line_subtotal,tax_amount,line_total,analytic_account_id) VALUES(?,?,?,?,?,?,?,?,?)`,[invoiceId,l.product_id,l.quantity,l.unit_price,l.tax_percent,lineSubtotal,lineTax,lineSubtotal+lineTax,l.analytic_account_id]);
    }

    const lines=[{accountId:journal.default_debit_account_id,debit:total,credit:0}];
    for(const l of soLines){
      const lineSubtotal=roundCurrency(Number(l.quantity)*Number(l.unit_price));
      if(lineSubtotal>0) lines.push({accountId:journal.default_credit_account_id,debit:0,credit:lineSubtotal,analyticAccountId:l.analytic_account_id});
      const product=productById.get(l.product_id);
      if(product.type==='Goods'){
        const cost=roundCurrency(Number(l.quantity)*Number(product.cost_price));
        if(cost>0){
          lines.push({accountId:cogs.id,debit:cost,credit:0,analyticAccountId:l.analytic_account_id});
          lines.push({accountId:inventory.id,debit:0,credit:cost,analyticAccountId:l.analytic_account_id});
        }
      }
    }
    if(taxTotal>0) lines.push({accountId:tax.id,debit:0,credit:taxTotal});
    const je=await postJournalEntry(conn,{journalId:journal.id,entryDate:invoiceDate,reference:`Customer Invoice #${invoiceId} (SO #${soId})`,sourceType:'CustomerInvoice',sourceId:invoiceId,lines});
    await conn.query('UPDATE customer_invoices SET journal_entry_id=? WHERE id=?',[je,invoiceId]);
    for(const l of soLines){
      if(productById.get(l.product_id).type==='Goods'){
        await conn.query('UPDATE products SET stock_quantity=stock_quantity-? WHERE id=?',[l.quantity,l.product_id]);
      }
    }
    await conn.commit();
    const [[invoice]]=await pool.query(`${SELECT} WHERE ci.id=?`,[invoiceId]); return ok(res,invoice,201);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
});

module.exports={list,getById,createFromSO};
