const pool=require('../config/db');
const {ok}=require('../utils/apiResponse');
const asyncHandler=require('../utils/asyncHandler');
const AppError=require('../utils/AppError');

function period(req){
  const {from,to}=req.query;
  if(!from||!to) throw new AppError('Both from and to dates are required',422);
  const isDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if(!isDate(from)||!isDate(to)) throw new AppError('Dates must use YYYY-MM-DD format',422);
  if(from>to) throw new AppError('from date cannot be after to date',422);
  return [from,to];
}

const balanceSheet=asyncHandler(async(req,res)=>{
  const [,to]=period(req);
  const [rows]=await pool.query(`
    SELECT a.id,a.name,a.type,
      COALESCE(SUM(CASE WHEN je.entry_date <= ? THEN jel.debit ELSE 0 END),0) AS debit,
      COALESCE(SUM(CASE WHEN je.entry_date <= ? THEN jel.credit ELSE 0 END),0) AS credit,
      CASE WHEN a.type='Asset' THEN COALESCE(SUM(CASE WHEN je.entry_date <= ? THEN jel.debit-jel.credit ELSE 0 END),0)
           WHEN a.type IN ('Liability','Capital') THEN COALESCE(SUM(CASE WHEN je.entry_date <= ? THEN jel.credit-jel.debit ELSE 0 END),0) ELSE 0 END AS balance
    FROM accounts a
    LEFT JOIN journal_entry_lines jel ON jel.account_id=a.id
    LEFT JOIN journal_entries je ON je.id=jel.journal_entry_id
    WHERE a.type IN ('Asset','Liability','Capital')
    GROUP BY a.id ORDER BY a.type,a.name`,[to,to,to,to]);
  const clean=rows.map(r=>({...r,debit:Number(r.debit),credit:Number(r.credit),balance:Number(r.balance)}));
  const assets=clean.filter(r=>r.type==='Asset').reduce((s,r)=>s+r.balance,0);
  const liabilities=clean.filter(r=>r.type==='Liability').reduce((s,r)=>s+r.balance,0);
  const capital=clean.filter(r=>r.type==='Capital').reduce((s,r)=>s+r.balance,0);
  const [[profitRow]]=await pool.query(`SELECT
      COALESCE(SUM(CASE WHEN a.type='Income' THEN jel.credit-jel.debit ELSE 0 END),0) -
      COALESCE(SUM(CASE WHEN a.type='Expense' THEN jel.debit-jel.credit ELSE 0 END),0) AS current_profit
    FROM journal_entry_lines jel JOIN accounts a ON a.id=jel.account_id JOIN journal_entries je ON je.id=jel.journal_entry_id
    WHERE je.entry_date <= ? AND a.type IN ('Income','Expense')`,[to]);
  const currentProfit=Number(profitRow.current_profit);
  return ok(res,{asOf:to,accounts:clean,totals:{assets,liabilities,capital,currentProfit,totalEquity:capital+currentProfit,liabilitiesAndEquity:liabilities+capital+currentProfit}});
});

const profitLoss=asyncHandler(async(req,res)=>{
  const [from,to]=period(req);
  const [rows]=await pool.query(`
    SELECT a.id,a.name,a.type,COALESCE(SUM(jel.debit),0) AS debit,COALESCE(SUM(jel.credit),0) AS credit,
      CASE WHEN a.type='Income' THEN COALESCE(SUM(jel.credit-jel.debit),0)
           WHEN a.type='Expense' THEN COALESCE(SUM(jel.debit-jel.credit),0) ELSE 0 END AS amount
    FROM accounts a JOIN journal_entry_lines jel ON jel.account_id=a.id
    JOIN journal_entries je ON je.id=jel.journal_entry_id AND je.entry_date BETWEEN ? AND ?
    WHERE a.type IN ('Income','Expense') GROUP BY a.id ORDER BY a.type,a.name`,[from,to]);
  const clean=rows.map(r=>({...r,debit:Number(r.debit),credit:Number(r.credit),amount:Number(r.amount)}));
  const income=clean.filter(r=>r.type==='Income').reduce((s,r)=>s+r.amount,0);
  const expenses=clean.filter(r=>r.type==='Expense').reduce((s,r)=>s+r.amount,0);
  return ok(res,{period:{from,to},accounts:clean,totals:{income,expenses,netProfit:income-expenses}});
});

const budget=asyncHandler(async(req,res)=>{
  const [from,to]=period(req);
  const [rows]=await pool.query(`
    SELECT b.*,aa.name AS analytic_account_name,aa.type AS analytic_type,
      COALESCE((SELECT SUM(CASE WHEN a.type='Expense' THEN jel.debit-jel.credit ELSE jel.credit-jel.debit END)
                FROM journal_entry_lines jel JOIN accounts a ON a.id=jel.account_id JOIN journal_entries je ON je.id=jel.journal_entry_id
                WHERE jel.analytic_account_id=b.analytic_account_id AND je.entry_date BETWEEN ? AND ?),0) AS actual_amount
    FROM budgets b JOIN analytic_accounts aa ON aa.id=b.analytic_account_id
    WHERE b.period_start <= ? AND b.period_end >= ? ORDER BY b.period_start,b.name`,[from,to,to,from]);
  const clean=rows.map(r=>({...r,planned_amount:Number(r.planned_amount),actual_amount:Number(r.actual_amount),variance:Number(r.planned_amount)-Number(r.actual_amount)}));
  return ok(res,{period:{from,to},budgets:clean});
});

const stock=asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT id,name,type,stock_quantity,is_archived FROM products WHERE type='Goods' ORDER BY name`);
  return ok(res,{products:rows.map(row=>({...row,stock_quantity:Number(row.stock_quantity)}))});
});

const trialBalance=asyncHandler(async(req,res)=>{
  const [from,to]=period(req);
  const [rows]=await pool.query(`SELECT a.id,a.name,a.type,COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN jel.debit ELSE 0 END),0) debit,COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN jel.credit ELSE 0 END),0) credit FROM accounts a LEFT JOIN journal_entry_lines jel ON jel.account_id=a.id LEFT JOIN journal_entries je ON je.id=jel.journal_entry_id GROUP BY a.id ORDER BY a.type,a.name`,[from,to,from,to]);
  const clean=rows.map(r=>({...r,debit:Number(r.debit),credit:Number(r.credit)}));
  return ok(res,{period:{from,to},accounts:clean,totalDebit:clean.reduce((s,r)=>s+r.debit,0),totalCredit:clean.reduce((s,r)=>s+r.credit,0)});
});
module.exports={balanceSheet,profitLoss,budget,stock,trialBalance};
