const pool=require('../config/db'); 
const {ok}=require('../utils/apiResponse'); 
const AppError=require('../utils/AppError'); 
const asyncHandler=require('../utils/asyncHandler');
const list=asyncHandler(async(req,res)=>{const {from,to,sourceType}=req.query;
const clauses=[];
const params=[];
if(from){clauses.push('je.entry_date>=?');
    params.push(from);
}
if(to){clauses.push('je.entry_date<=?');
    params.push(to);}if(sourceType)
        {
            clauses.push('je.source_type=?');
            params.push(sourceType);
        }
        const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
        const [rows]=await pool.query(`SELECT je.*,j.name AS journal_name,COALESCE(SUM(jel.debit),0) AS total_debit,COALESCE(SUM(jel.credit),0) AS total_credit FROM journal_entries je JOIN journals j ON j.id=je.journal_id LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id=je.id ${where} GROUP BY je.id ORDER BY je.entry_date DESC,je.id DESC`,params);return ok(res,rows);});
const getById=asyncHandler(async(req,res)=>{const [[entry]]=await pool.query(`SELECT je.*,j.name AS journal_name FROM journal_entries je JOIN journals j ON j.id=je.journal_id WHERE je.id=?`,[req.params.id]);if(!entry)throw new AppError('Journal Entry not found',404);const [lines]=await pool.query(`SELECT jel.*,a.name AS account_name,aa.name AS analytic_account_name FROM journal_entry_lines jel JOIN accounts a ON a.id=jel.account_id LEFT JOIN analytic_accounts aa ON aa.id=jel.analytic_account_id WHERE jel.journal_entry_id=? ORDER BY jel.id`,[req.params.id]);return ok(res,{...entry,lines});});
module.exports={list,getById};
