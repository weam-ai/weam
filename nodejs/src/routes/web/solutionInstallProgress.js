const { Router } = require('express');
const router = Router();
const solutionInstallProgressController = require('../../controller/web/solutionInstallProgressController');

router.get('/progress', solutionInstallProgressController.getInstallationProgress);
router.get('/health', solutionInstallProgressController.checkInstallationHealth);

module.exports = router;
