const express = require('express');
const teamBrainRouter = require('./teamBrain');
const teamMemberRouter = require('../web/teamMember');
const teamWorkspaceRouter = require('./teamWorkspace');

const router = express.Router();

router.use('/notification', require('./notification'));
router.use('/auth', require('./auth'));
router.use('/userbot', require('./userbot'));
router.use('/chatlog', require('./chatlog'));
router.use('/message', require('./messages'));
router.use('/reply-thread', require('./replythread'));
router.use('/favourite', require('./favourite'));
router.use('/prompt-limit', require('./promptlimit'));
router.use('/company', require('./company'));
router.use('/brain', require('./brains'));
router.use('/brainuser', require('./brainuser'));
router.use('/role', require('./role'));
router.use('/chat', require('./chat'));
router.use('/chat-member', require('./chatmember'));
router.use('/prompt', require('./prompts'))
router.use('/chat-doc', require('./chatdocs'));
router.use('/workspaceuser', require('./workspaceuser'));
router.use('/sharechat', require('./sharechat'));
router.use('/workspace', require('./workspace'));
router.use('/customgpt', require('./customgpt'));
router.use('/user', require('./user'));
router.use("/team",teamMemberRouter)
router.use('/teamBrain',teamBrainRouter)
router.use('/teamWorkspace',teamWorkspaceRouter)
router.use('/bookmark', require('./bookmark'));
router.use('/page', require('./pages'));
// router.use('/solution-install', require('./solutionInstall')); // No longer needed - using only progress endpoint
router.use('/solution-install-progress', require('./solutionInstallProgress'));
router.use('/import-chat', require('./importChat'));


module.exports = router;