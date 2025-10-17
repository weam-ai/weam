const multer = require('multer');
const { FILE, ENV_VAR_VALUE } = require('../config/constants/common');
const User = require('../models/user');
const { AWS_CONFIG } = require('../config/config');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const mime = require('mime-types');
const { hasNotRestrictedExtension, getFileExtension } = require('../utils/helper');

AWS.config.update({
    region: AWS_CONFIG.REGION,
    apiVersion: AWS_CONFIG.AWS_S3_API_VERSION,
    accessKeyId: AWS_CONFIG.ACCESS_KEY_ID,
    secretAccessKey: AWS_CONFIG.SECRET_ACCESS_KEY,
    accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    ...(AWS_CONFIG.BUCKET_TYPE === ENV_VAR_VALUE.MINIO && {
        endpoint: AWS_CONFIG.ENDPOINT,
        s3ForcePathStyle: true,
        signatureVersion: 'v4',
        sslEnabled: AWS_CONFIG.MINIO_USE_SSL
    })
})

const AWS_storage = multerS3({
    s3: new AWS.S3(),
    bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    // Removed server-side encryption that was causing errors
    // ...(AWS_CONFIG.ENDPOINT ? {} : { serverSideEncryption: 'AES256' }),
    cacheControl: 'max-age=1800',
    metadata: function (req, file, cb) {
        cb(null, { fieldname: file.fieldname });
    },
    key: function (req, file, cb) {
        let filepath;
        const id = new mongoose.Types.ObjectId();

        // Extract file extension from mimetype
        let fileExtension = mime.extension(file.mimetype);
        const originalExtension = getFileExtension(file.originalname);
        
        if (hasNotRestrictedExtension(originalExtension)) {
            fileExtension = originalExtension;
        }

        const fileName = `${id}.${fileExtension}`;
        if (file.originalname.match(/\.(jpg|jpeg|webp|png|svg|gif|JPG|JPEG|WEBP|PNG|SVG|GIF)$/))
            filepath = 'images/';
        else
            filepath = 'documents/';
        cb(null, filepath + fileName);
    }
})

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/x-png",
    "image/png",
    "image/gif",
    "image/bmp",
    "text/plain",
    'application/vnd.ms-excel',
    "application/wps-office.xlsx",
    "application/wps-office.xls",
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'message/rfc822',
    'text/html',
    'text/php',
    'text/x-php',
    'application/x-httpd-php',
    'text/javascript',
    'text/css',
    'application/x-javascript',
    'application/javascript',
    'text/x-javascript',
    'application/x-php',
    'application/sql'
  ];

  const imageAllowedTypes = [
    "image/jpeg",
    "image/x-png",
    "image/png",
    "image/gif",
    "image/bmp"
  ];

const upload = multer({
    storage: AWS_storage,
    limits: { fileSize: FILE.SIZE },
    fileFilter: async (req, file, cb) => {
        
        if (!imageAllowedTypes.includes(file.mimetype) && file.fieldname === 'coverImg') {
            const error = new Error(_localize('file.format', req, 'agent cover image'));
            error.code = FILE.INVALID_FILE_CODE;
            return cb(error, false);
        }

        if (!allowedTypes.includes(file.mimetype)) {
            if (!hasNotRestrictedExtension(file.originalname)) {
                const error = new Error(_localize('file.type', req, 'pdf doc or image'));
                error.code = FILE.INVALID_FILE_CODE;
                return cb(error, false);
            }
        }

        const size = parseInt(req.headers['content-length']);
        const checklimit = await User.findOne({ _id: req.userId }, { usedSize: 1, fileSize: 1 });
       
        if (checklimit.usedSize + size >= checklimit.fileSize) {
            const error = new Error(_localize('file.limit_expire', req));
            error.code = FILE.STORAGE_LIMIT_EXCEED;
            return cb(error, false);
        } 
        cb(null, true);
    },
});

const normalMedia = multer({ storage: AWS_storage });
// Multer instance for import chat JSON files
const importChatUpload = multer({
    storage: multer.memoryStorage(), // Store in memory for JSON processing
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for import files
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/json') {
            const error = new Error(_localize('file.type', req, 'JSON'));
            error.code = FILE.INVALID_FILE_CODE;
            return cb(error, false);
        }
        cb(null, true);
    }
});

const checkAndUpdateStorage = async (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }

    const user = await User.findOne({ _id: req.userId || req.params.id }, { usedSize: 1, fileSize: 1 });
    if (!user) {
        return next();
    }

    let totalUploadSize = 0;

    // Handle single file upload (upload.single)
    if (req.file) {
        totalUploadSize = req.file.size;
    } 
    // Handle array of files (upload.array)
    else if (Array.isArray(req.files)) {
        req.files.forEach(file => {
            totalUploadSize += file.size;
        });
    } 
    // Handle multiple fields (upload.fields)
    else if (typeof req.files === 'object') {
        Object.values(req.files).forEach(fileArray => {
            if (Array.isArray(fileArray)) {
                fileArray.forEach(file => {
                    totalUploadSize += file.size;
                });
            }
        });
    }
    await User.updateOne(
        {
          _id: req.userId,
          $expr: {
            $lt: [{ $add: ["$usedSize", totalUploadSize] }, user.fileSize],
          },
        },
        { $inc: { usedSize: totalUploadSize } }
    );

    next();
};

module.exports = {
    upload,
    normalMedia,
    checkAndUpdateStorage,
    importChatUpload
};