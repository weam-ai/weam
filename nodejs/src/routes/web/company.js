const express = require('express');
const router = express.Router();
const companyController = require('../../controller/web/companyController');
const { companyCreateKeys, checkApiKeys, resendVerification } = require('../../utils/validations/common');
const { authentication, checkPermission } = require('../../middleware/authentication');
const { huggingFaceAuthKeys, anthropicAuthKeys } = require('../../utils/validations/aimodelkey');

router.post('/weam/register', validate(companyCreateKeys), companyController.registerCompany);
router.post('/check/apikey', validate(checkApiKeys), authentication, checkPermission, companyController.checkApiKey).descriptor('check.apikey');
router.post('/resend-verification', validate(resendVerification), companyController.resendVerification);
router.post('/huggingface/apikey', validate(huggingFaceAuthKeys), authentication, companyController.huggingFaceApiChecker);
router.post('/anthropic/apikey', validate(anthropicAuthKeys), authentication, companyController.anthropicApiChecker);
router.post('/gemini/apikey', authentication, companyController.geminiApiKeyChecker);
router.post('/blocked-domain', authentication, companyController.addBlockedDomain);
module.exports = router;
