const { Router } = require('express');
const importChatController = require('../../controller/web/importChatController');
const { authentication } = require('../../middleware/authentication');
const { importChatUpload } = require('../../middleware/multer');
const router = Router();

// Upload import chat JSON file
router.post(
    '/upload',
    authentication,
    importChatUpload.single('file'),
    importChatController.uploadImportChat
);

// Get import chat status by ID
router.get(
    '/status/:importId',
    authentication,
    importChatController.getImportChatStatus
);

// Get all import chats for current user
router.get(
    '/list',
    authentication,
    importChatController.getImportChats
);

module.exports = router;
