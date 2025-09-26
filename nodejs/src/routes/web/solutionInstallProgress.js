const { Router } = require('express');
const router = Router();
const solutionInstallProgressController = require('../../controller/web/solutionInstallProgressController');

router.get('/progress', solutionInstallProgressController.getInstallationProgress);
router.get('/uninstall', solutionInstallProgressController.getUninstallationProgress);
router.get('/sync', solutionInstallProgressController.getSyncProgress);
router.get('/health', solutionInstallProgressController.checkInstallationHealth);

module.exports = router;
