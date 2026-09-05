const pool = require('../config/db');
const { ok } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const SELECT = `SELECT so.*, c.name AS customer_name FROM sales_orders so JOIN contacts c ON c.id=so.customer_id`;

const list = asyncHandler(async (req,res) => {
  const { status } = req.query;
  const params=[]; let where='';
  if (status) { where='WHERE so.status=?'; params.push(status); }
  const [rows]=await pool.query(`${SELECT} ${where} ORDER BY so.id DESC`,params);
  return ok(res,rows);
});

const getById = asyncHandler(async(req,res)=>{
  const [[so]]=await pool.query(`${SELECT} WHERE so.id=?`,[req.params.id]);
  if(!so) throw new AppError('Sales Order not found',404);
  const [lines]=await pool.query(`SELECT sol.*,p.name AS product_name FROM sales_order_lines sol JOIN products p ON p.id=sol.product_id WHERE sol.so_id=?`,[req.params.id]);
  return ok(res,{...so,lines});
});

const create = asyncHandler(async(req,res)=>{
  const {customerId,orderDate,lines}=req.body;
  if(!Array.isArray(lines)||!lines.length) throw new AppError('A Sales Order needs at least one line item',422);
  const [[customer]]=await pool.query('SELECT * FROM contacts WHERE id=? AND is_archived=FALSE',[customerId]);
  if(!customer) throw new AppError('Selected customer does not exist',404);
  if(!['Customer'].includes(customer.type)) throw new AppError(`${customer.name} is not registered as a Customer`,422);

  const normalized=[];
  let total=0;
  for(const line of lines){
    const [[product]]=await pool.query('SELECT * FROM products WHERE id=? AND is_archived=FALSE',[line.productId]);
    if(!product) throw new AppError(`Product ${line.productId} does not exist or is archived`,422);
    const qty=Number(line.quantity), price=Number(line.unitPrice ?? product.sales_price), tax=Number(line.taxPercent||0);
    if(!Number.isFinite(qty)||!Number.isFinite(price)||!Number.isFinite(tax)||qty<=0||price<0||tax<0) throw new AppError('Sales Order quantities, prices, and tax must be valid',422);
    if(line.analyticAccountId){
      if(!Number.isInteger(Number(line.analyticAccountId))) throw new AppError('Analytic Account must be a valid integer',422);
      const [[aa]]=await pool.query('SELECT id FROM analytic_accounts WHERE id=? AND is_archived=FALSE',[line.analyticAccountId]);
      if(!aa) throw new AppError(`Analytic Account ${line.analyticAccountId} does not exist or is archived`,422);
    }
    total += qty*price*(1+tax/100);
    normalized.push([line.productId,qty,price,tax,line.analyticAccountId||null]);
  }

  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [r]=await conn.query(`INSERT INTO sales_orders(customer_id,order_date,status,total) VALUES(?,?, 'Draft',?)`,[customerId,orderDate,total]);
    for(const l of normalized) await conn.query(`INSERT INTO sales_order_lines(so_id,product_id,quantity,unit_price,tax_percent,analytic_account_id) VALUES(?,?,?,?,?,?)`,[r.insertId,...l]);
    await conn.commit();
    const [[so]]=await pool.query(`${SELECT} WHERE so.id=?`,[r.insertId]);
    return ok(res,so,201);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
});

const confirm=asyncHandler(async(req,res)=>{
  const [[so]]=await pool.query('SELECT * FROM sales_orders WHERE id=?',[req.params.id]);
  if(!so) throw new AppError('Sales Order not found',404);
  if(so.status!=='Draft') throw new AppError('Only Draft sales orders can be confirmed',422);
  await pool.query("UPDATE sales_orders SET status='Confirmed' WHERE id=?",[req.params.id]);
  const [[updated]]=await pool.query(`${SELECT} WHERE so.id=?`,[req.params.id]);
  return ok(res,updated);
});

module.exports={list,getById,create,confirm};
