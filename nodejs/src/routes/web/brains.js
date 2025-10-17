const express = require('express');
const router = express.Router();
const brainController = require('../../controller/web/brainController');
const { createBrainKeys, updateBrainKeys, shareBrainKeys, unshareBrainKeys, shareDocKeys, convertToSharedKeys } = require('../../utils/validations/brain');
const { partialUpdateKeys } = require('../../utils/validations/common');
const { authentication } = require('../../middleware/authentication');
const { checkPromptLimit } = require('../../middleware/promptlimit');

router.post('/create', validate(createBrainKeys), authentication,checkPromptLimit, brainController.createBrain);
router.put('/update/:id', validate(updateBrainKeys), authentication,checkPromptLimit, brainController.updateBrain);
router.get('/:slug', authentication, brainController.getBrain);
router.delete('/delete/:id', authentication, brainController.deleteBrain);
router.delete('/deleteall', authentication, brainController.deleteAllBrain);
router.post('/list', authentication, checkPromptLimit, brainController.getAll);
router.patch('/partial/:slug', validate(partialUpdateKeys), authentication, brainController.partialUpdate);
router.post('/unshare', validate(unshareBrainKeys), authentication, brainController.unShareBrain);
router.post('/share-doc', validate(shareDocKeys), authentication, brainController.shareBrainDocs);
router.post('/share/list', authentication, checkPromptLimit, brainController.shareList);
router.post('/restore/:id', authentication, brainController.restoreBrain);
router.post('/list-all', authentication, checkPromptLimit, brainController.workspaceWiseList);
router.put('/convert-to-shared/:id', validate(convertToSharedKeys), authentication, checkPromptLimit, brainController.convertToShared);
 
module.exports = router;