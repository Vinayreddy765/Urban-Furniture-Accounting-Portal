const pool=require('../config/db');
const {ok}=require('../utils/apiResponse'); const AppError=require('../utils/AppError'); const asyncHandler=require('../utils/asyncHandler');
const list=asyncHandler(async(req,res)=>{const [rows]=await pool.query('SELECT * FROM analytic_accounts ORDER BY name');return ok(res,rows);});
const create=asyncHandler(async(req,res)=>{const [r]=await pool.query('INSERT INTO analytic_accounts(name,type) VALUES(?,?)',[req.body.name,req.body.type]);const [[row]]=await pool.query('SELECT * FROM analytic_accounts WHERE id=?',[r.insertId]);return ok(res,row,201);});
const update=asyncHandler(async(req,res)=>{const [[row]]=await pool.query('SELECT * FROM analytic_accounts WHERE id=?',[req.params.id]);if(!row)throw new AppError('Analytic Account not found',404);await pool.query('UPDATE analytic_accounts SET name=?,type=? WHERE id=?',[req.body.name??row.name,req.body.type??row.type,req.params.id]);const [[u]]=await pool.query('SELECT * FROM analytic_accounts WHERE id=?',[req.params.id]);return ok(res,u);});
module.exports={list,create,update};
