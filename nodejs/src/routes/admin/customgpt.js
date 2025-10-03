const express = require('express');
const router = express.Router();
const customgptController = require('../../controller/admin/customgptController');
const { createCustomGptKeys, updateCustomGptKeys } = require('../../utils/validations/customgpt');
const { partialUpdateKeys } = require('../../utils/validations/common');
const { authentication, checkPermission } = require('../../middleware/authentication');
const { upload, checkAndUpdateStorage } = require('../../middleware/multer');
const { checkPromptLimit } = require('../../middleware/promptlimit');
const { parseFormData } = require('../../utils/helper');

router.post('/create', authentication, checkPromptLimit, upload.fields([{ name: 'coverImg', maxCount: 1 }, { name: 'doc', maxCount: 1 }]), checkAndUpdateStorage, parseFormData, validate(createCustomGptKeys), customgptController.addCustomGpt).descriptor('customgpt.create');
router.put('/update/:id', authentication, checkPromptLimit, upload.fields([{ name: 'coverImg', maxCount: 1 }, { name: 'doc', maxCount: 1 }]), checkAndUpdateStorage, parseFormData, validate(updateCustomGptKeys), customgptController.updateCustomGpt).descriptor('customgpt.update');
router.get('/:id', authentication, checkPermission, customgptController.viewCustomGpt).descriptor('customgpt.view');
router.delete('/delete/:id', authentication, checkPermission, customgptController.deleteCustomGpt).descriptor('customgpt.delete');
router.post('/list', authentication, checkPromptLimit, customgptController.getAll).descriptor('customgpt.list');
router.patch('/partial/:id', validate(partialUpdateKeys), authentication, checkPermission, customgptController.partialUpdate).descriptor('country.partialupdate');
router.get('/agents/:brainId', authentication, customgptController.getAgents);

module.exports = router;