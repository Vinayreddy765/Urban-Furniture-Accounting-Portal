const router=require('express').Router(); const {body}=require('express-validator'); const validate=require('../middleware/validate'); const {authenticate,authorize}=require('../middleware/auth'); const ctrl=require('../controllers/analytic.controller');
router.use(authenticate,authorize('Administrator','Accountant'));
router.get('/',ctrl.list); router.post('/',[body('name').trim().notEmpty(),body('type').isIn(['Income','Expense'])],validate,ctrl.create); router.put('/:id',authorize('Administrator'),ctrl.update);
module.exports=router;
