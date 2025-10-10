const express = require('express');
const router = express.Router();
const reportController = require('../../controller/admin/reportController');
const { authentication, checkPermission } = require('../../middleware/authentication');

router.post('/company-usage', authentication, reportController.getCompanyUsage).descriptor("report.companyUsage");
router.post('/user-usage', authentication, reportController.getUserUsage).descriptor("report.userUsage");
router.post('/weekly-usage', authentication, reportController.getWeeklyUsage).descriptor("report.weeklyUsage");
router.post('/ai-adoption', authentication, checkPermission ,reportController.getAiAdoption).descriptor("report.aiAdoption");

module.exports = router;