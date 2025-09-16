const express = require('express');
const router = express.Router();
const fileController = require('../controller/fileController');
const { upload, normalMedia, checkAndUpdateStorage } = require('../middleware/multer');
const { authentication } = require('../middleware/authentication');
const { s3FileDelete, generatePresignedUrl } = require('../utils/validations/s3media');
const { checkPromptLimit } = require('../middleware/promptlimit');

router.post('/file', authentication, checkPromptLimit, upload.array('files', 10), checkAndUpdateStorage, fileController.fileUpload);
router.post('/allmedia', authentication, normalMedia.array('attachment',5), fileController.allMediaUploadToBucket);
router.delete('/delete/s3media',validate(s3FileDelete), authentication, fileController.deleteS3Media);
router.delete('/delete/:id', authentication, fileController.removeFile);
router.post('/generate-presigned-url', validate(generatePresignedUrl), authentication, fileController.generatePresignedUrl);
router.post('/file-via-streams', authentication, fileController.uploadFileViaStreams);

module.exports = router;