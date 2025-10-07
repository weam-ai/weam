const { Router } = require('express');
const chatController = require('../../controller/web/chatController');
const { authentication } = require('../../middleware/authentication');
const router = Router();
const { createNewChatKeys, createForkChatKeys, updateChatKeys } = require('../../utils/validations/chat');
const { checkPromptLimit } = require('../../middleware/promptlimit');

router.post('/create', validate(createNewChatKeys), authentication, chatController.addChat);
router.post('/list', authentication, checkPromptLimit, chatController.getAllChat);
router.put('/update/:id', validate(updateChatKeys), authentication,checkPromptLimit, chatController.updateChat).descriptor('chat.update');
router.delete('/delete/:id', authentication, chatController.removeChat);
router.get('/:id', authentication, chatController.getChatById);
router.post('/fork', validate(createForkChatKeys), authentication, chatController.forkChat);
router.post('/check-access', authentication, chatController.checkChatAccess);
router.post('/enhance-prompt', authentication, chatController.enhancePrompt);

module.exports = router;