const express = require('express');
const router = express.Router();
const commonController = require('../controller/commonController');
const { emailTemplateKeys, kafkaTopicKeys } = require('../utils/validations/common');
const { authentication, checkPermission } = require('../middleware/authentication');
const authController = require('../controller/web/authController');
const superSolutionController = require('../controller/admin/superSolutionController');
const { apiBasicAuth} = require('../middleware/apiBasicAuth');
const { updateCreditKeys } = require('../utils/validations/user');

//manage email contain apis
router.post('/email-template/create', validate(emailTemplateKeys), authentication, commonController.updateEmailTemplate);
router.get('/email-template/:id', authentication, commonController.viewEmailTemplate);
router.delete('/email-template/:id', authentication, commonController.deleteEmailTemplate);
router.post('/email-template/list', authentication, commonController.listEmailTemplate);


// developer apis
router.post('/create-kakfa/topic', validate(kafkaTopicKeys), authentication, checkPermission, commonController.addKafkaTopic);

// country city state open routes
router.post('/country/list', commonController.getAllCountry);
router.post('/state/list', commonController.getAllState);
router.post('/city/list', commonController.getAllCity);

// migration routes
router.post('/chat-member', commonController.addChatMemberTitle);
router.post('/send-invite-email', apiBasicAuth, commonController.sendInviteEmail);
router.post('/update-credit', validate(updateCreditKeys), apiBasicAuth, commonController.updateCredit);
router.post('/free-message-count-migration', apiBasicAuth, commonController.freeMessageCountMigration);
router.put('/update-mcp-data', authentication, authController.updateMcpData);
router.post('/check-access-solution', apiBasicAuth, superSolutionController.userHasAccessOfSolution);
module.exports = router;
