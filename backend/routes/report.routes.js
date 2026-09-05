const router=require('express').Router(); const {authenticate,authorize}=require('../middleware/auth'); const ctrl=require('../controllers/report.controller');
router.use(authenticate,authorize('Administrator','Accountant'));
router.get('/balance-sheet',ctrl.balanceSheet); router.get('/profit-loss',ctrl.profitLoss); router.get('/budget',ctrl.budget); router.get('/stock',ctrl.stock); router.get('/trial-balance',ctrl.trialBalance);
module.exports=router;
