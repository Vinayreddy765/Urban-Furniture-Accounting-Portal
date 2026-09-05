const router=require('express').Router();
const {authenticate,authorize}=require('../middleware/auth');
const ctrl=require('../controllers/portal.controller');
router.use(authenticate,authorize('User'));
router.get('/dashboard',ctrl.dashboard);
router.get('/invoices',ctrl.invoices);
router.get('/invoices/:id',ctrl.invoice);
router.get('/bills',ctrl.bills);
module.exports=router;
