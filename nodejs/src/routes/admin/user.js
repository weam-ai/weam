const express = require('express');
const userController = require('../../controller/admin/userController');
const { createSchemaKeys, updateSchemaKeys, storageRequestKeys, changeRoleKeys } = require('../../utils/validations/user');
const { authentication, checkPermission } = require('../../middleware/authentication');
const router = express.Router();

router.post('/create', validate(createSchemaKeys), authentication, checkPermission, userController.addUser).descriptor('user.create');
router.put('/update/:id', validate(updateSchemaKeys), authentication, checkPermission, userController.updateUser).descriptor('user.update');
router.get('/get/:id', authentication, checkPermission, userController.getUser).descriptor('user.view');
router.delete('/delete/:id', authentication, checkPermission, userController.deleteUser).descriptor('user.delete');
router.post('/list', authentication, checkPermission, userController.getAllUser).descriptor('user.list');
router.get('/export', userController.exportUser);
router.put('/storage/approve/:id', validate(storageRequestKeys), authentication, checkPermission, userController.approveStorageRequest).descriptor('user.approvestorage');
router.post('/toggle',authentication,checkPermission,userController.toggleUserBrain).descriptor('toggle.create')
router.post('/change-role', validate(changeRoleKeys), authentication, userController.changeUserRole).descriptor('user.changerole');

module.exports = router;