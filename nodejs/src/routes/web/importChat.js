const { Router } = require('express');
const importChatController = require('../../controller/web/importChatController');
const { authentication } = require('../../middleware/authentication');
const { importChatUpload } = require('../../middleware/multer');
const { uploadImportChatSchema, getImportChatStatusSchema, getImportChatsSchema } = require('../../utils/validations/importChat');
const router = Router();

// Upload import chat JSON file
router.post(
    '/upload',
    authentication,
    importChatUpload.single('file'),
    validate(uploadImportChatSchema),
    importChatController.uploadImportChat
);

// Get import chat status by ID
router.get(
    '/status/:importId',
    authentication,
    validate(getImportChatStatusSchema),
    importChatController.getImportChatStatus
);

// Get all import chats for current user
router.get(
    '/list',
    authentication,
    validate(getImportChatsSchema),
    importChatController.getImportChats
);

module.exports = router;
