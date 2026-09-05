const router=require('express').Router(); const {authenticate,authorize}=require('../middleware/auth'); const ctrl=require('../controllers/journalEntry.controller');
router.use(authenticate,authorize('Administrator','Accountant')); router.get('/',ctrl.list); router.get('/:id',ctrl.getById); module.exports=router;
