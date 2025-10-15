const express = require('express');
const router = express.Router();
const companyController = require('../../controller/admin/companyController');
const { companyUpdateKeys, partialUpdateKeys, companyCreateKeys, addTeamMembersKeys } = require('../../utils/validations/common');
const { authentication, checkPermission } = require('../../middleware/authentication');
const { apiBasicAuth } = require('../../middleware/apiBasicAuth');

router.post('/create', validate(companyCreateKeys), authentication, checkPermission, companyController.addCompany).descriptor('company.create');
router.put('/update/:slug', validate(companyUpdateKeys), authentication, checkPermission, companyController.updateCompany).descriptor('company.update');
router.patch('/partial/:slug', validate(partialUpdateKeys), authentication, checkPermission, companyController.partialUpdate).descriptor('company.partialupdate');
router.get('/:slug', authentication, checkPermission, companyController.viewCompany).descriptor('company.view');
router.post('/list', authentication, checkPermission, companyController.getAll).descriptor('company.list');
router.delete('/delete/:slug', authentication, checkPermission, companyController.deleteCompany).descriptor('company.delete');
router.get('/export/list', companyController.exportCompanies);

// company members
router.post('/add-member', validate(addTeamMembersKeys), authentication, checkPermission, companyController.addTeamMembers).descriptor('company.addmember');

// migration endpoint
router.post('/migrate-company-models', apiBasicAuth, companyController.migrateCompanyModels).descriptor('company.migrate');

module.exports = router;