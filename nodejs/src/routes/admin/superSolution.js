const { Router } = require('express');
const router = Router();
const superSolutionController = require('../../controller/admin/superSolutionController');

const { authentication } = require('../../middleware/authentication');
const { checkPermission } = require('../../middleware/authentication');


router.post('/list', authentication, checkPermission, superSolutionController.getAllSolutionApps).descriptor('solutionApp.list');

// Solution Members Routes
router.post('/members/list', authentication, checkPermission, superSolutionController.getSolutionMember).descriptor('solutionApp.member-list');
router.post('/members/add', authentication, checkPermission, superSolutionController.addSolutionMember).descriptor('solutionApp.member-add');
router.post('/members/remove', authentication, checkPermission, superSolutionController.removeSolutionMember).descriptor('solutionApp.member-remove');

// Solution Teams Routes
router.post('/teams/list', authentication, checkPermission, superSolutionController.getSolutionTeam).descriptor('solutionApp.team-list');
router.post('/teams/add', authentication, checkPermission, superSolutionController.addSolutionTeam).descriptor('solutionApp.team-add');
router.post('/teams/remove', authentication, checkPermission, superSolutionController.removeSolutionTeam).descriptor('solutionApp.team-remove');

//get-by-user-id/${id}
router.get('/get-by-user-id/:id', authentication, superSolutionController.getSolutionAccessByUserId);


module.exports = router;