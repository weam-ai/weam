const express = require('express');
const router = express.Router();
const brainController = require('../../controller/web/brainController');
const { createBrainKeys, updateBrainKeys, shareBrainKeys, unshareBrainKeys, shareDocKeys } = require('../../utils/validations/brain');
const { partialUpdateKeys } = require('../../utils/validations/common');
const { authentication } = require('../../middleware/authentication');
const checkPermission = require('../../middleware/authorization');
const { checkPromptLimit } = require('../../middleware/promptlimit');

router.post('/create', validate(createBrainKeys), authentication,checkPromptLimit, brainController.createBrain);
router.put('/update/:id', validate(updateBrainKeys), authentication,checkPromptLimit, brainController.updateBrain);
router.get('/:slug', authentication, brainController.getBrain);
router.delete('/delete/:id', authentication, brainController.deleteBrain);
router.delete('/deleteall', authentication, checkPermission('brain.delete_all'), brainController.deleteAllBrain);
router.post('/list', authentication, checkPromptLimit, brainController.getAll);
router.patch('/partial/:slug', validate(partialUpdateKeys), authentication, brainController.partialUpdate);
router.post('/unshare', validate(unshareBrainKeys), authentication, brainController.unShareBrain);
router.post('/share-doc', validate(shareDocKeys), authentication, brainController.shareBrainDocs);
router.post('/share/list', authentication, checkPromptLimit, brainController.shareList);
router.post('/restore/:id', authentication, brainController.restoreBrain);
router.post('/list-all', authentication, checkPromptLimit, brainController.workspaceWiseList);
 
module.exports = router;