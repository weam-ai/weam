const AWS = require('aws-sdk');
const { AWS_CONFIG } = require('../config/config');
const dbService = require('../utils/dbService');
require('aws-sdk/lib/maintenance_mode_message').suppress = true; // remove aws v3 migrate warning
const File = require('../models/file');
const mime = require('mime-types');
const fs = require('fs');
const { COST_AND_USAGE, ROLE_TYPE, ENV_VAR_VALUE } = require('../config/constants/common');
const ChatDocs = require('../models/chatdocs'); // Temporarily disabled
const UserBot = require('../models/userBot');
const sharp = require('sharp');
const { storeVectorData } = require('./customgpt');
const mongoose = require('mongoose');
const { getFileNameWithoutExtension, getFileExtension, hasNotRestrictedExtension, getCompanyId, encodeMetadata } = require('../utils/helper');
const Busboy = require('busboy');
const { PassThrough } = require('stream');
const { EMBEDDINGS } = require('../config/config');
const { SOCKET_ROOM_PREFIX, SOCKET_EVENTS } = require('../config/constants/socket');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const logger = require('../utils/logger');
const User = require('../models/user'); // Added missing import for User
const { FILE } = require('../config/constants/common'); // Added missing import for FILE
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const pdf = require('pdf-parse');
const { embedText, getEmbeddingsClient } = require('./embeddings');

 AWS.config.update({
    apiVersion: AWS_CONFIG.AWS_S3_API_VERSION,
    accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    region: AWS_CONFIG.REGION,
     ...(AWS_CONFIG.BUCKET_TYPE === ENV_VAR_VALUE.MINIO && {
        endpoint: AWS_CONFIG.ENDPOINT,
        s3ForcePathStyle: true,
        signatureVersion: 'v4',
        sslEnabled: AWS_CONFIG.MINIO_USE_SSL
    })
})

const S3 = new AWS.S3({ accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    endpoint: AWS_CONFIG.ENDPOINT, // accessible from container
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    sslEnabled: false,
    useAccelerateEndpoint: false,
    
 });
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: EMBEDDINGS.CHUNK_SIZE_CHARS,
    chunkOverlap: EMBEDDINGS.CHUNK_OVERLAP_CHARS,
    separators: ['\n\n', '\n', '.', ' ', ''],
});

const uploadFileToS3 = async (file, filename) => {
    try {
        // Read the file content asynchronously
        const fileContent = await fs.readFile(file.path);

        const params = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Key: filename,
            Body: fileContent,
            ACL: 'public-read',
            ContentType: file.mimetype,
        };
        // await S3.upload(params).promise();
    } catch (error) {
        logger.error('Error in uploadFileToS3', error);
    }
}


async function deleteFromS3 (filename) {
    try {
        const params = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Key: filename.replace(/^\/+/g, ''),
        }
        await S3.deleteObject(params).promise();
    } catch (error) {
        logger.error('Error in deleteFromS3', error);
    }
}

const viewFile = async (req) => {
    try {
        const result = await File.findById({ _id: req.params.id });
        if (!result) {
            return false;
        }
        return result;
    } catch (error) {
        handleError(error, 'Error - viewFile')
    }
}

const getAll = async (req) => {
    try {
        return dbService.getAllDocuments(File, req.body.query || {} || req.body.options || {});
    } catch (error) {
        handleError(error, 'Error - getall file');
    }
}

const fileData = (file, folder) => {
    // Extract file extension from mimetype
    let fileExtension = mime.extension(file.mimetype);
    const originalExtension = getFileExtension(file.originalname);
    
    // Override with original extension for specific file types
    if (hasNotRestrictedExtension(originalExtension)) {
        fileExtension = originalExtension;
    }

    let pathToStore = folder ? `${folder}/${file.key}` : `${file.key}`;
    // await uploadFileToS3(file, pathToStore);
    return {
        name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        uri: `/${pathToStore}`,
        type: fileExtension, // Change to fileExtension
    };
};

const getImageDimensions = async (req) => {
    try {
        // Extract S3 object parameters from the req.file object
        const { bucket, key } = req.file;

        // Fetch the file from S3
        const s3Params = {
            Bucket: bucket,
            Key: key
        };

        const s3Object = await S3.getObject(s3Params).promise();

        // s3Object.Body contains the file buffer
        const fileBuffer = s3Object.Body;

        // Use sharp to get metadata
        const metadata = await sharp(fileBuffer).metadata();

        return metadata;
    } catch (error) {
        handleError(error, 'Error - getImageDimensions')
    }
};

async function calculateImageTokens(req) {
    let { width, height } = await getImageDimensions(req);
    if (width > 2048 || height > 2048) {
        let aspectRatio = width / height;
        if (aspectRatio > 1) {
            width = 2048;
            height = Math.floor(2048 / aspectRatio);
        } else {
            width = Math.floor(2048 * aspectRatio);
            height = 2048;
        }
    }

    if (width >= height && height > 768) {
        width = Math.floor((768 / height) * width);
        height = 768;
    } else if (height > width && width > 768) {
        width = 768;
        height = Math.floor((768 / width) * height);
    }

    let tilesWidth = Math.ceil(width / 512);
    let tilesHeight = Math.ceil(height / 512);
    let totalTokens = 85 + 170 * (tilesWidth * tilesHeight);

    return totalTokens;
}

const fileUpload = async (req) => {
    try {
        if (!req.files) {
            return false;
        }
        
        const files = Array.isArray(req.files) ? req.files : [req.files];
        const uploadedFiles = [];
        const chatDocsToCreate = [];
        const vectorDataToProcess = [];
        const fileUpdates = [];
        
        for (const file of files) {
            const data = fileData(file, req.body?.folder);
            const fileInfo = (await File.create(data)).toObject();
            
            if (req.body?.brainId) {
                const companyId = req.roleCode === ROLE_TYPE.COMPANY ? req.user.company.id : req.user.invitedBy;
                if (file.mimetype.startsWith('image/')) {
                    const token = await calculateImageTokens({ file });
                    fileInfo.imageToken = token;

                    chatDocsToCreate.push({
                        userId: req.userId,
                        fileId: fileInfo._id,
                        brainId: req.body.brainId,
                        doc: {
                            name: fileInfo.name,
                            uri: fileInfo.uri,
                            mime_type: fileInfo.mime_type,
                            file_size: fileInfo.file_size,
                            createdAt: fileInfo.createdAt
                        }
                    });
                } else {
                    defaultTextModal = await UserBot.findOne(
                        { name: 'text-embedding-3-small', 'company.id': companyId }, 
                        { _id: 1, company: 1 }
                    );
                    
                    fileUpdates.push({
                        updateOne: {
                            filter: { _id: fileInfo._id },
                            update: { $set: { embedding_api_key: defaultTextModal._id } }
                        }
                    });
                    fileInfo.embedding_api_key = defaultTextModal._id;

                    chatDocsToCreate.push({
                        userId: req.userId,
                        fileId: fileInfo._id,
                        brainId: req.body.brainId,
                        company: defaultTextModal.company,
                        embedding_api_key: defaultTextModal._id,
                        doc: {
                            name: fileInfo.name,
                            uri: fileInfo.uri,
                            mime_type: fileInfo.mime_type,
                            file_size: fileInfo.file_size,
                            createdAt: fileInfo.createdAt
                        }
                    });

                    //When doc uploaded from doc page at that time vectorApiCall is true
                    if(req.body.vectorApiCall == 'true') {
                        vectorDataToProcess.push({
                            type: fileInfo.type,
                            uri: fileInfo.uri,
                            companyId: defaultTextModal.company.id,
                            fileId: fileInfo._id,
                            api_key_id: defaultTextModal._id,
                            tag: fileInfo.uri.split('/')[2], // Extract filename from URI: /documents/fileId.extension
                            brainId: req.body.brainId,
                            file_name: fileInfo.name
                        });
                    }
                }
            }
            
            uploadedFiles.push(fileInfo);
        }
        
        // Batch process all operations
        await Promise.all([
            chatDocsToCreate.length > 0 ? File.insertMany(chatDocsToCreate) : null,
            vectorDataToProcess.length > 0 ? (async () => {
                await storeVectorData(req, vectorDataToProcess);
            })() : null,
            fileUpdates.length > 0 ? File.bulkWrite(fileUpdates) : null
        ]);
        
        return uploadedFiles;
    } catch (error) {
        handleError(error, 'Error - file upload')
    }
}

const deleteS3Media = async (req) => {
    try {
        const key = req.body.key;
        return deleteFromS3(key);
    } catch (error) {
        handleError(error, 'Error - s3 file delete')
    }
}

const allMediaUploadToBucket = async (req) => {
    try {
        const fileList = [];
        for (let file of req.files) {
            fileList.push({
                name: file.originalname,
                uri: file.key,
                mime_type: file.mimetype,
                file_size: file.size,
            })
        }
        return fileList;
    } catch (error) {
        handleError(error, 'Error - all media upload')
    }
}

const removeFile = async (req) => {
    const id = req.params.id;
    const checkFile = await File.findById({ _id: id });
    const result = await dbService.deleteDocument(File, { _id: id });
    if (result.deletedCount) {
        await deleteFromS3(checkFile.uri);
        return true;
    }
    return false;
};

const fetchS3UsageAndCost = async (req) => {
    try {
        const { startDate, endDate } = calculateDateRange(req.query.interval);
        const params = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
        }
        const objectList = await S3.listObjectsV2(params).promise();

        // Filter objects based on last modified timestamps within the specified time range
        const filteredObjects = objectList.Contents.filter(object => {
            const lastModified = new Date(object.LastModified);
            return lastModified >= startDate && lastModified <= endDate;
        });

        // Calculate total storage usage
        let totalUsageBytes = 0;
        filteredObjects.forEach(object => {
            totalUsageBytes += object.Size;
        });

        const totalUsageMB = totalUsageBytes / (1024 * 1024);
        const estimatedCost = calculateEstimatedCost(totalUsageMB);

        return {
            totalUsage: totalUsageMB.toFixed(2) + COST_AND_USAGE.MB,
            estimatedCost: COST_AND_USAGE.USD + estimatedCost.toFixed(7)
        };

    } catch (error) {
        handleError(error, 'Error - fetchS3UsageAndCost');
    }
}

function calculateEstimatedCost(totalUsageMB) {
    // Example: Assume $0.023 per GB-month for standard storage
    const costPerGBMonth = 0.023;
    const totalGB = totalUsageMB / 1024; // Convert MB to GB
    return totalGB * costPerGBMonth; // Cost in USD
}

function calculateDateRange(interval) {
    const currentDate = new Date();
    let startDate, endDate;

    switch (interval) {
        case COST_AND_USAGE.WEEKLY:
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
            endDate = currentDate;
            break;
        case COST_AND_USAGE.MONTHLY:
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            endDate = currentDate;
            break;
        case COST_AND_USAGE.YEARLY:
            startDate = new Date(currentDate.getFullYear() - 1, 0, 1);
            endDate = currentDate;
            break;
        default:
            throw new Error('Invalid interval specified.');
    }

    return { startDate, endDate };
}

async function removeExistingDocument(fileId, filePath) {
    Promise.all([
        File.findByIdAndDelete({ _id: fileId }),
        // ChatDocs.deleteOne({ fileId: fileId }), // This line was commented out in the original file
        deleteFromS3(filePath),
    ])
}

async function removeExistingImage(fileId, filePath) {
    Promise.all([
        File.findByIdAndDelete({ _id: fileId }),
        deleteFromS3(filePath),
    ])
}

async function generatePresignedUrl(req) {
    try {
        const params = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Expires: 60
        }
        const presignedUrl = [];
        // don't use forEach because it will not wait for the promise to resolve
        for (let fileKey of req.body.fileKey) {
            const id = new mongoose.Types.ObjectId();
            let fileExtension = mime.extension(fileKey.type);
            const originalExtension = getFileExtension(fileKey.originalname);
    
            // Override with original extension for specific file types
            if (hasNotRestrictedExtension(originalExtension)) {
                fileExtension = originalExtension;
            }

            fileExtension = fileExtension || originalExtension;
            const extractedFileName = getFileNameWithoutExtension(fileKey.key);
            const fileName = `${req.body.folder}/${extractedFileName}-${id}.${fileExtension}`;
            const url = await S3.getSignedUrlPromise('putObject', { ...params, Key: fileName, ContentType: fileKey.type });
            presignedUrl.push(url);
        }
        return presignedUrl;
    } catch (error) {
        handleError(error, 'Error - generatePresignedUrl');
    }
}

function extractFileExtension(fileKey) {
    let originalExtension = fileKey?.originalname?.split('.')?.pop();
    const fileExtensionMap = {
        php: 'php',
        js: 'js',
        css: 'css',
        html: 'html',
    }
    return fileExtensionMap[originalExtension];
}

const createFileRecord = async (req) => {
    try {
        const { name, type, uri, mime_type, file_size, module, isActive } = req.body;
        
        // Create file record in database with proper user data format
        const fileRecord = await File.create({
            name,
            type,
            uri,
            mime_type,
            file_size,
            module,
            isActive: isActive !== undefined ? isActive : true,
            createdBy: {
                email: req.user.email,
                fname: req.user.fname,
                lname: req.user.lname,
                company: req.user.company
            },
            updatedBy: {
                email: req.user.email,
                fname: req.user.fname,
                lname: req.user.lname,
                company: req.user.company
            }
        });
        
        return fileRecord;
    } catch (error) {
        handleError(error, 'Error - createFileRecord');
        return false;
    }
}

async function uploadFileViaStreams(req) {
    const busboy = Busboy({ headers: req.headers, highWaterMark: 1024 * 1024 });
    const tasks = [];
    const fileRecords = [];
    const sockets = global.io.sockets;
    const companyRoom = req.user?.company?.id ? `${SOCKET_ROOM_PREFIX.COMPANY}${req.user.company.id}` : null;
    let customRoom = null;

    // Define allowed file types (same as in multer middleware)
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

    // queue of ids in the exact order they were appended on the client
    let fileIndex = 0;

    // Get user storage limits before processing files
    const userStorageInfo = req.user;
    if (userStorageInfo.usedSize >= userStorageInfo.fileSize) {
        throw new Error(`Storage limit reached. Used: ${Math.round(userStorageInfo.usedSize / 1024 / 1024)} MB, Limit: ${Math.round(userStorageInfo.fileSize / 1024 / 1024)} MB`);
    }
    // Verify S3 bucket accessibility
    try {
        await S3.headBucket({ Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME }).promise();
        
    } catch (error) {
        logger.error('[uploadFileViaStreams] S3 bucket not accessible:', error);
        throw new Error('Storage service temporarily unavailable');
    }
    
    // Check if content-type is multipart
    if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        throw new Error('Content-Type must be multipart/form-data for file uploads');
    }
    
    // Check if boundary is present
    if (!req.headers['content-type'].includes('boundary=')) {
        throw new Error('Content-Type must include boundary parameter for multipart uploads');
    }
    
    busboy.on('file', async (fieldname, file, filename) => {
        const mimetype = filename.mimeType;
        
        // Check if fieldname is expected
        if (!fieldname || fieldname === '') {
            file.resume(); // Drain the stream
            return;
        }
        
        // Check if file object is valid
        if (!file || typeof file.pipe !== 'function') {
            logger.error('[uploadFileViaStreams] Invalid file object:', file);
            return;
        }
        
        // IMPORTANT: do not return here
        const originalName = typeof filename === 'string'
            ? filename
            : (filename?.filename || 'upload.bin');
            
                // Check if filename is valid
        if (!originalName || originalName === 'upload.bin') {
            logger.error('[uploadFileViaStreams] Invalid filename:', originalName);
            file.resume(); // Drain the stream
            return;
        }
        
        // Check if mimetype is valid
        if (!mimetype || mimetype === '') {
            logger.error('[uploadFileViaStreams] Invalid mimetype:', mimetype);
            file.resume(); // Drain the stream
            return;
        }
        
        // Validate file type
        if (!allowedTypes.includes(mimetype) && !hasNotRestrictedExtension(originalName)) {
            const error = new Error(`File type ${mimetype} is not allowed. Only PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, images, and code files are permitted.`);
            error.code = 'INVALID_FILE_TYPE';
            file.resume(); // Drain the stream
            fileIndex++;
            return;
        }

        // Get the next fileId that the frontend appended right after this file
        const fileId = new mongoose.Types.ObjectId();

        if (!fileId) {
            logger.error(`No fileId found for incoming part #${fileIndex}: ${originalName}`);
            // Optionally: drain stream to avoid hanging
            file.resume();
            fileIndex++;
            return;
        }

        const extFromName = getFileExtension(originalName);
        const extFromMime = mime.extension(mimetype);
        const ext = (extFromName || extFromMime || 'bin').toLowerCase();
        const isImage = /\.(jpg|jpeg|webp|png|svg|gif)$/i.test(originalName);
        const key = `${isImage ? 'images' : 'documents'}/${fileId}.${ext}`;
        
        const cleanName = originalName ? originalName.replace(/[^\x00-\x7F]/g, '') : 'unknown';

        // build the DB payload with the exact _id from the frontend
        const fileData = {
            _id: fileId, // <-- preserve frontend id
            name: cleanName,
            mime_type: mimetype,
            file_size: '0',               // updated on 'end'
            uri: `/${key}`,
            type: ext,
            isActive: true,
            module: null,
        };
        
        fileRecords.push(fileData);

        // parallel pipes: one to S3, one to embed (only for non-images)
        const s3Pass = new PassThrough({ highWaterMark: 1024 * 1024 });
        const embedPass = new PassThrough({ highWaterMark: 1024 * 1024 });
        file.pipe(s3Pass);
        
        // Only pipe to embed if it's not an image
        if (!isImage) {
            file.pipe(embedPass);
        }

        // progress & size
        let uploadedBytes = 0;
        let lastEmit = 0;
        file.on('data', (chunk) => {
            uploadedBytes += chunk.length;
            
            // Check file size limit during upload
            if (userStorageInfo && uploadedBytes > FILE.SIZE) {
                const error = new Error(`File size exceeds maximum allowed size of ${FILE.SIZE} bytes (${Math.round(FILE.SIZE / 1024 / 1024)} MB)`);
                error.code = 'FILE_SIZE_EXCEEDED';
                file.destroy(error);
                return;
            }
            
            // Check if file would exceed user's storage limit
            if (userStorageInfo && (userStorageInfo.usedSize + uploadedBytes) > userStorageInfo.fileSize) {
                const error = new Error(`File would exceed storage limit. Used: ${Math.round(userStorageInfo.usedSize / 1024 / 1024)} MB, Limit: ${Math.round(userStorageInfo.fileSize / 1024 / 1024)} MB`);
                error.code = 'STORAGE_LIMIT_EXCEED';
                file.destroy(error);
                return;
            }
            
            const now = Date.now();
            if (now - lastEmit > 300) {
                // emit if you like
                lastEmit = now;
            }
        });

        file.on('end', () => {
            const rec = fileRecords.find(fr => fr._id.toString() === fileId.toString());
            if (rec) {
                rec.file_size = uploadedBytes.toString();
                
                // Check user storage limit
                if (userStorageInfo && (userStorageInfo.usedSize + uploadedBytes) >= userStorageInfo.fileSize) {
                    const error = new Error(`Storage limit exceeded. Used: ${Math.round(userStorageInfo.usedSize / 1024 / 1024)} MB, Limit: ${Math.round(userStorageInfo.fileSize / 1024 / 1024)} MB`);
                    error.code = 'STORAGE_LIMIT_EXCEED';
                    // Note: We can't easily abort the S3 upload here, but we can mark it for cleanup
                    rec.storageLimitExceeded = true;
                }
            }
        });

        file.on('error', (err) => {
            logger.error(`Stream error for ${originalName}:`, err);
        });

        const controller = new AbortController();

        const cleanOriginalName = encodeMetadata(originalName);
        const cleanFieldname = String(fieldname || '');

        const uploader = S3.upload({
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Key: key,
            Body: s3Pass,
            ContentType: mimetype,
            Metadata: { originalName: cleanOriginalName, fieldname: cleanFieldname }
            // Removed ServerSideEncryption: 'AES256' as it's causing errors
        }, { queueSize: 6, partSize: 16 * 1024 * 1024 });
        
        

        uploader.on('httpUploadProgress', (p) => {
            // your socket progress here
        });

        const uploadPromise = uploader.promise()
            .catch(e => { controller.abort(); throw e; });

        // start embedding in parallel for non-images only – DO NOT await
        // Use the brainId extracted from form fields
        const brainId = req.headers['x-brain-id'];
        
        
        if (!isImage) {
            // Get user's embedding API key from database (same logic as vectorApiCall section)
            let embeddingApiKey = null;
            try {
                const companyId = getCompanyId(req.user);
                const userEmbeddingBot = await UserBot.findOne(
                    { name: 'text-embedding-3-small', 'company.id': companyId }
                );
                
                if (userEmbeddingBot && userEmbeddingBot.config && userEmbeddingBot.config.apikey) {
                    const { decryptedData } = require('../utils/helper');
                    embeddingApiKey = decryptedData(userEmbeddingBot.config.apikey);
                    
                } else {
                    
                }
            } catch (error) {
                logger.error(`Failed to get user embedding API key for ${originalName}:`, error.message);
            }
        
            embedInParallel(embedPass, {
                mimetype,
                originalName,
                s3Key: key,
                onProgress: (payload) => {
                    const room = customRoom || companyRoom;
                    if (room) sockets.to(room).emit(SOCKET_EVENTS.FILE_EMBED_PROGRESS, payload);
                },
                signal: controller.signal,
                embeddingApiKey: embeddingApiKey, // Pass the user's API key
                fileId, // pass same id to vector store
                companyId: getCompanyId(req.user),
            }).catch(err => { 
                logger.error(`Pinecone embedding failed for ${originalName}:`, err);
                controller.abort(); 
                throw err; 
            });
        }

        tasks.push(uploadPromise);
        
        fileIndex++;
        
    });

    await new Promise((resolve, reject) => {
        busboy.on('finish', () => {
            
            resolve();
        });
        busboy.on('error', (err) => {
            
            reject(err);
        });
        
        // Check if request is readable
        if (req.readable) {
            
            
            // Check if request has content
            let hasContent = false;
            req.on('data', (chunk) => {
                hasContent = true;
                
            });
            
            req.pipe(busboy);
            
            // Set a timeout to check if we received any content
            setTimeout(() => {
                if (!hasContent) {
                    logger.error('[uploadFileViaStreams] No content received from request');
                    reject(new Error('No content received from request'));
                }
            }, 1000);
        } else {
            logger.error('[uploadFileViaStreams] Request is not readable!');
            reject(new Error('Request stream is not readable'));
        }
    });

    try {
        
        await Promise.all(tasks);
        

        // allow any tail events to settle
        await new Promise(r => setTimeout(r, 500));

        // Check if any files exceeded storage limit
        const filesExceedingLimit = fileRecords.filter(fr => fr.storageLimitExceeded);
        if (filesExceedingLimit.length > 0) {
            // Clean up S3 files that exceeded storage limit
            for (const fr of filesExceedingLimit) {
                try {
                    await S3.deleteObject({
                        Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
                        Key: fr.s3Key
                    }).promise();
                    
                } catch (cleanupError) {
                    logger.error(`Failed to cleanup S3 file ${fr.s3Key}:`, cleanupError);
                }
            }
            throw new Error('Some files exceeded storage limit and were not uploaded');
        }

        // Create MongoDB records using the SAME _id as frontend provided
        // 
        const created = [];
        for (const fr of fileRecords) {
            try {
                
                const brainId = req.headers['x-brain-id'];
                const doc = await File.create(fr);
                ChatDocs.create({
                    userId: req.userId,
                    fileId: doc._id,
                    brainId: brainId,
                    doc: {
                        name: doc.name,
                        uri: doc.uri,
                        mime_type: doc.mime_type,
                        file_size: doc.file_size,
                        createdAt: doc.createdAt
                    }
                });
                created.push(doc);
                
            } catch (e) {
                logger.error(`Mongo create failed for _id=${fr.id}, file: ${fr.originalName}`, e);
                // Try to clean up the S3 file if MongoDB creation fails
                try {
                    await S3.deleteObject({
                        Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
                        Key: fr.s3Key
                    }).promise();
                    
                } catch (cleanupError) {
                    logger.error(`Failed to cleanup S3 file ${fr.s3Key}:`, cleanupError);
                }
            }
        }

        // Update user's used storage size
        if (userStorageInfo && created.length > 0) {
            const totalUploadSize = fileRecords.reduce((sum, fr) => sum + parseInt(fr.file_size, 10), 0);
            try {
                await User.updateOne(
                    {
                        _id: req.userId,
                        $expr: {
                            $lt: [{ $add: ["$usedSize", totalUploadSize] }, userStorageInfo.fileSize],
                        },
                    },
                    { $inc: { usedSize: totalUploadSize } }
                );
                
            } catch (updateError) {
                logger.error('[uploadFileViaStreams] Failed to update user storage:', updateError);
                // Don't fail the upload for this, but log it
            }
        }

        
        
        
        return created;
    } catch (e) {
        logger.error('[uploadFileViaStreams] Upload failed:', e);
        logger.error('[uploadFileViaStreams] Error details:', {
            message: e.message,
            stack: e.stack,
            fileRecordsCount: fileRecords.length,
            tasksCount: tasks.length
        });
        
        // Clean up any uploaded files on error
        for (const fr of fileRecords) {
            try {
                await S3.deleteObject({
                    Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
                    Key: fr.s3Key
                }).promise();
                                    
            } catch (cleanupError) {
                logger.error(`Failed to cleanup S3 file ${fr.s3Key}:`, cleanupError);
            }
        }
        
        throw e; // Re-throw the error so the controller can handle it
    }
}
  

// Commented out qdrant embedding function - using pinecone instead

async function embedInParallel(stream, { mimetype, originalName, s3Key, onProgress, signal, fileId,embeddingApiKey }) {
    let chunkIndex = 0;
    try {
        const { ensureCollection, upsertDocuments } = require('./qdrant');
        await ensureCollection(EMBEDDINGS.VECTOR_SIZE || 1536);
        
        // Get file extension for better type detection
        const fileExtension = getFileExtension(originalName)?.toLowerCase();
        
        // Files that need full content for reliable parsing
        const fullContentFiles = [
            'pdf', 'doc', 'docx', 'xlsx', 'csv', 'xls', 'eml'
        ];
        
        // Code files that can be processed in chunks
        const codeFiles = [
            'php', 'js', 'css', 'html', 'htm', 'sql', 'py', 'json', 'txt', 'text'
        ];
        
        if (fullContentFiles.includes(fileExtension) || 
            mimetype === 'application/pdf' || 
            mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimetype === 'application/vnd.ms-excel' ||
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/msword' ||
            mimetype === 'text/csv' ||
            mimetype === 'message/rfc822') {
            
            // Collect full file content
            const parts = [];
            for await (const piece of stream) {
                if (signal?.aborted) return;
                parts.push(piece);
            }
            const fullBuffer = Buffer.concat(parts);
            chunkIndex = 0;
            await embedAndUpsert(fullBuffer, { mimetype, originalName, s3Key, chunkIndex: 0, onProgress, fileId,embeddingApiKey });
            return;
        }
        
        // For text and code files, process in windows to start embedding earlier
        if (codeFiles.includes(fileExtension) || mimetype?.startsWith('text/')) {
            let buffered = Buffer.alloc(0);
            chunkIndex = 0;
            const windowBytes = 1024 * 1024; // 1MB
            for await (const piece of stream) {
                if (signal?.aborted) return;
                buffered = Buffer.concat([buffered, piece]);
                if (buffered.length >= windowBytes) {
                    await embedAndUpsert(buffered, { mimetype, originalName, s3Key, chunkIndex, onProgress, fileId });
                    chunkIndex += 1;
                    buffered = Buffer.alloc(0);
                }
            }
            if (buffered.length) {
                await embedAndUpsert(buffered, { mimetype, originalName, s3Key, chunkIndex, onProgress, fileId });
            }
        }
    } catch (error) {
        logger.error(`[embed] Failed to process ${originalName}, chunk ${chunkIndex}:`, error.message);
    }
}

async function extractTextFromBuffer(buffer, mimetype, originalName) {
    try {
        const fileExtension = getFileExtension(originalName)?.toLowerCase();
        
        // Handle text files
        if (mimetype?.startsWith('text/')) {
            return buffer.toString('utf8');
        }
        
        // Handle PDF files
        if (mimetype === 'application/pdf' || fileExtension === 'pdf') {
            const data = await pdf(buffer);
            return data.text || '';
        }
        
        // Handle Excel files
        if (fileExtension === 'xlsx' || fileExtension === 'xls' || 
            mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimetype === 'application/vnd.ms-excel') {
            return await extractTextFromExcel(buffer, fileExtension);
        }
        
        // Handle CSV files
        if (fileExtension === 'csv' || mimetype === 'text/csv') {
            return await extractTextFromCSV(buffer);
        }
        
        // Handle Word documents
        if (fileExtension === 'docx' || fileExtension === 'doc' ||
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/msword') {
            return await extractTextFromWord(buffer, fileExtension);
        }
        
        // Handle EML files
        if (fileExtension === 'eml' || mimetype === 'message/rfc822') {
            return await extractTextFromEML(buffer);
        }
        
        // Handle code files
        if (['php', 'js', 'css', 'html', 'htm', 'sql', 'py', 'json'].includes(fileExtension)) {
            return buffer.toString('utf8');
        }
        
        // Handle plain text files
        if (['txt', 'text'].includes(fileExtension)) {
            return buffer.toString('utf8');
        }
        
        return '';
    } catch (e) {
        console.warn(`extractTextFromBuffer failed for ${originalName}:`, e?.message || e);
        return '';
    }
}

/**
 * Extract text from Excel files (xlsx, xls)
 */
async function extractTextFromExcel(buffer, fileExtension) {
    try {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        if (fileExtension === 'xlsx') {
            await workbook.xlsx.load(buffer);
        } else if (fileExtension === 'xls') {
            // Note: ExcelJS has limited support for .xls files
            // You might need to use a different library like 'xlsx' for better .xls support
            console.warn('Limited support for .xls files, consider converting to .xlsx');
            return '';
        }
        
        let extractedText = '';
        
        workbook.eachSheet((worksheet, sheetId) => {
            extractedText += `Sheet: ${worksheet.name}\n`;
            
            worksheet.eachRow((row, rowNumber) => {
                const rowData = [];
                row.eachCell((cell, colNumber) => {
                    if (cell.value) {
                        rowData.push(String(cell.value));
                    }
                });
                if (rowData.length > 0) {
                    extractedText += rowData.join('\t') + '\n';
                }
            });
            extractedText += '\n';
        });
        
        return extractedText.trim();
    } catch (error) {
        logger.error('Error extracting text from Excel file:', error);
        return '';
    }
}

/**
 * Extract text from CSV files
 */
async function extractTextFromCSV(buffer) {
    try {
        const csvContent = buffer.toString('utf8');
        // Simple CSV parsing - split by lines and handle basic comma separation
        const lines = csvContent.split('\n');
        const parsedLines = lines.map(line => {
            // Handle quoted fields
            const fields = [];
            let currentField = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    fields.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            fields.push(currentField.trim());
            
            return fields.join(' | '); // Use pipe separator for better readability
        });
        
        return parsedLines.join('\n');
    } catch (error) {
        logger.error('Error extracting text from CSV file:', error);
        return buffer.toString('utf8');
    }
}

/**
 * Extract text from Word documents (docx, doc)
 */
async function extractTextFromWord(buffer, fileExtension) {
    try {
        if (fileExtension === 'docx') {
            // .docx files are ZIP archives containing XML files
            // We'll extract the main document content from the word/document.xml file
            try {
                // Try to use JSZip if available
                const JSZip = require('jszip');
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(buffer);
                
                // Get the main document content
                const documentXml = zipContent.file('word/document.xml');
                if (documentXml) {
                    const xmlContent = await documentXml.async('string');
                    
                    // Extract text from XML content
                    // Remove XML tags but preserve some structure
                    let textContent = xmlContent
                        .replace(/<w:p[^>]*>/g, '\n') // Paragraph breaks
                        .replace(/<w:br[^>]*>/g, '\n') // Line breaks
                        .replace(/<w:tab[^>]*>/g, '\t') // Tab characters
                        .replace(/<[^>]*>/g, '') // Remove all other XML tags
                        .replace(/&amp;/g, '&') // Decode HTML entities
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();
                    
                    return textContent;
                }
            } catch (zipError) {
                if (zipError.code === 'MODULE_NOT_FOUND') {
                    console.warn('JSZip not available. Install with: npm install jszip for better .docx parsing');
                } else {
                    console.warn('Failed to parse .docx as ZIP:', zipError.message);
                }
                console.warn('Using fallback method for .docx parsing');
                
                // Fallback: try to extract text from the buffer directly
                // This is less reliable but provides basic text extraction
                const content = buffer.toString('utf8');
                const textContent = content
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                return textContent;
            }
        } else if (fileExtension === 'doc') {
            // .doc files are binary and harder to parse
            // You might need to use a library like 'textract' or 'antiword'
            console.warn('Limited support for .doc files, consider converting to .docx');
            return '';
        }
        
        return '';
    } catch (error) {
        logger.error('Error extracting text from Word file:', error);
        return '';
    }
}

/**
 * Extract text from EML files
 */
async function extractTextFromEML(buffer) {
    try {
        const emlContent = buffer.toString('utf8');
        
        // Split EML into headers and body
        const parts = emlContent.split('\n\n');
        if (parts.length < 2) {
            return emlContent;
        }
        
        const headers = parts[0];
        const body = parts.slice(1).join('\n\n');
        
        // Extract relevant information
        let extractedText = '';
        
        // Parse headers
        const headerLines = headers.split('\n');
        for (const line of headerLines) {
            if (line.startsWith('From:') || line.startsWith('To:') || 
                line.startsWith('Subject:') || line.startsWith('Date:')) {
                extractedText += line + '\n';
            }
        }
        
        extractedText += '\n' + body;
        
        return extractedText.trim();
    } catch (error) {
        logger.error('Error extracting text from EML file:', error);
        return '';
    }
}

// Commented out qdrant embedAndUpsert function - using pinecone instead

async function embedAndUpsert(buf, { mimetype, originalName, s3Key, chunkIndex, onProgress, fileId, embeddingApiKey }) {
    try {
        const {  upsertDocuments } = require('./qdrant');
        
        
        const text = await extractTextFromBuffer(buf, mimetype, originalName);
        if (!text || !text.trim()) {
            
            return;
        }

        const size = EMBEDDINGS.CHUNK_SIZE_CHARS || 1800;
        const overlap = EMBEDDINGS.CHUNK_OVERLAP_CHARS || 200;
        // const chunks = splitText(text, size, overlap);
        const chunks = await textSplitter.splitText(text);
        if (!chunks.length) {
            
            return;
        }

        

        const expectDim = EMBEDDINGS.VECTOR_SIZE || 1536;
        const batchSize = EMBEDDINGS.BATCH_SIZE || 32; // tune 32–128
        const client = typeof getEmbeddingsClient === 'function' ? getEmbeddingsClient() : null;

        let processed = 0;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            let vectors = null;

            // 1) Try a single API call for the whole batch (fast path)
            if (client && typeof client.embedDocuments === 'function') {
                try {
                    const out = await client.embedDocuments(batch);
                    // Validate shape & dims
                    if (Array.isArray(out) && out.length === batch.length) {
                        vectors = out.map((v, idx) =>
                            Array.isArray(v) && v.length === expectDim
                                ? v
                                : generateHashVector(batch[idx], expectDim)
                        );
                    }
                } catch (e) {
                    // logger.warn('[embeddings] Batch API failed; falling back per-chunk:', e.message);
                    // vectors stays null → fall back below
                }
            }

            // 2) Fallback: per-chunk (still parallel across network due to pipeline, but one call each)
            if (!vectors) {
                vectors = [];
                for (let j = 0; j < batch.length; j++) {
                    try {
                        const v = await embedText(batch[j], embeddingApiKey); // your existing helper (with hash fallback on error)
                        vectors.push(
                            Array.isArray(v) && v.length === expectDim ? v : generateHashVector(batch[j], expectDim)
                        );
                    } catch (err) {
                        //   logger.warn('[embeddings] Per-chunk embedding failed; hashing:', err.message);
                        vectors.push(generateHashVector(batch[j], expectDim));
                    }
                }
            }

            // 3) Bulk upsert this batch (fewer DB round trips)
            const docs = vectors.map((vector, j) => ({
                id: uuidv4(),
                vector,
                payload: {
                    s3_key: s3Key,
                    filename: originalName,
                    fileId: fileId, // Add MongoDB fileId to payload
                    mimetype,
                    chunk_index: chunkIndex,
                    text: batch[j],
                }
            }));

            

            try {
                const result = await upsertDocuments(docs);
                
            } catch (e) {
                logger.error(`[embed] Batch upsert failed for file: ${originalName} with fileId: ${fileId}:`, e.message);
                // degrade gracefully so we don't lose data
                for (let j = 0; j < docs.length; j++) {
                    try { await upsertDocuments([docs[j]]); }
                    catch (e2) { logger.error(`[embed] Single upsert failed for localIndex=${i + j}:`, e2.message); }
                }
            }

            processed += batch.length;
            onProgress && onProgress({
                filename: originalName,
                s3Key,
                embeddedChunks: processed,
                chunkIndex,
                totalChunks: chunks.length
            });
        }
    } catch (error) {
        
          logger.error(`[embed] Failed to process ${originalName}, chunk ${chunkIndex}:`, error.message);
    }
}
  

/**
 * Download image from OpenAI URL and upload to S3 in background
 * @param {string} imageUrl - OpenAI image URL
 * @param {string} folder - S3 folder path (optional)
 * @param {string} customFileName - Custom filename (optional)
 * @returns {Promise<Object>} - Upload result with S3 URL and metadata
 */
const downloadAndUploadImageToS3 = async (imageUrl) => {
    try {
        // Extract filename from URL or use custom filename
        const id = new mongoose.Types.ObjectId();
        const fileName = extractFileNameFromUrl(imageUrl);
        const fileExtension = getFileExtensionFromUrl(imageUrl) || 'png';
        const s3Key = `images/${fileName}-${id}.${fileExtension}`;

        // Download image from OpenAI URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }

        // Get image buffer
        const imageBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);

        // Get content type from response headers
        const contentType = response.headers.get('content-type') || 'image/png';

        // Upload to S3
        const uploadParams = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read',
            Metadata: {
                originalUrl: imageUrl,
                uploadedAt: new Date().toISOString(),
                source: 'openai-dalle'
            }
        };

        const uploadResult = await S3.upload(uploadParams).promise();

        // Create file record in database
        const fileData = {
            name: `${fileName}.${fileExtension}`,
            mime_type: contentType,
            file_size: buffer.length.toString(),
            uri: `/${s3Key}`,
            type: fileExtension,
            isActive: true,
            module: 'ai-generated',
        };

        const fileRecord = await File.create(fileData);

        return {
            success: true,
            s3Url: uploadResult.Location,
            s3Key: s3Key,
            fileId: fileRecord._id,
            fileSize: buffer.length,
            contentType: contentType,
            originalUrl: imageUrl
        };

    } catch (error) {
        logger.error('Error in downloadAndUploadImageToS3:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Extract filename from OpenAI image URL
 * @param {string} imageUrl - OpenAI image URL
 * @returns {string} - Extracted filename
 */
const extractFileNameFromUrl = (imageUrl) => {
    try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        
        // Extract the img-XXXXXXXXXX part from the path
        const imgMatch = pathname.match(/img-([a-zA-Z0-9]+)/);
        if (imgMatch) {
            return imgMatch[1];
        }
        
        // Fallback: use timestamp as filename
        return `img-${Date.now()}`;
    } catch (error) {
        // Fallback: use timestamp as filename
        return `img-${Date.now()}`;
    }
};

/**
 * Extract file extension from URL or content type
 * @param {string} imageUrl - OpenAI image URL
 * @returns {string} - File extension
 */
const getFileExtensionFromUrl = (imageUrl) => {
    try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        
        // Try to extract extension from pathname
        const extensionMatch = pathname.match(/\.([a-zA-Z0-9]+)$/);
        if (extensionMatch) {
            return extensionMatch[1].toLowerCase();
        }
        
        // Check if URL has content type parameter
        const contentTypeParam = url.searchParams.get('rsct');
        if (contentTypeParam) {
            const mimeMatch = contentTypeParam.match(/image\/([a-zA-Z0-9]+)/);
            if (mimeMatch) {
                const mimeToExt = {
                    'png': 'png',
                    'jpeg': 'jpg',
                    'jpg': 'jpg',
                    'webp': 'webp',
                    'gif': 'gif'
                };
                return mimeToExt[mimeMatch[1]] || 'png';
            }
        }
        
        // Default to png
        return 'png';
    } catch (error) {
        return 'png';
    }
};

/**
 * Background job to upload OpenAI image to S3
 * @param {string} imageUrl - OpenAI image URL
 * @param {string} folder - S3 folder path (optional)
 * @param {string} customFileName - Custom filename (optional)
 */
const uploadOpenAIImageToS3Background = async (imageUrl) => {
    try {
        
        
        // Process the upload
        const result = await downloadAndUploadImageToS3(imageUrl);
        
        if (result.success) {
            
            
        } else {
            logger.error(`Failed to upload image: ${result.error}`);
        }
        
        return result;
    } catch (error) {
        logger.error('Background upload job failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Utility function to upload OpenAI image to S3 - can be called from anywhere
 * @param {string} imageUrl - OpenAI image URL
 * @param {Object} options - Upload options
 * @param {string} options.folder - S3 folder path (default: 'ai-generated-images')
 * @param {string} options.customFileName - Custom filename (optional)
 * @param {string} options.userId - User ID for tracking (optional)
 * @param {string} options.brainId - Brain ID for tracking (optional)
 * @returns {Promise<Object>} - Upload result
 */
const uploadOpenAIImageToS3 = async (imageUrl, options = {}) => {
    const {
        customFileName = null,
        userId = null,
        brainId = null
    } = options;

    try {
        
        
        // Process the upload
        const result = await downloadAndUploadImageToS3(imageUrl);
        
        if (result.success) {
            
            
            // If userId and brainId are provided, create chat docs entry
            if (userId && brainId) {
                try {
                    // Temporarily comment out ChatDocs creation to avoid circular dependency
                    // const ChatDocs = require('../models/chatdocs');
                    // await ChatDocs.create({
                    //     userId: userId,
                    //     fileId: result.fileId,
                    //     brainId: brainId,
                    //     doc: {
                    //         name: result.name || `${customFileName || 'ai-generated'}.${result.contentType.split('/')[1]}`,
                    //         file_size: result.fileSize.toString(),
                    //         createdAt: new Date()
                    //     }
                    // });
                    
                } catch (chatDocsError) {
                    logger.warn(`⚠️ Failed to create chat docs entry: ${chatDocsError.message}`);
                }
            }
            
            return {
                ...result,
                message: 'Image successfully uploaded to S3'
            };
        } else {
            logger.error(`❌ Failed to upload OpenAI image: ${result.error}`);
            return result;
        }
        
    } catch (error) {
        logger.error('💥 OpenAI image upload failed:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to upload image to S3'
        };
    }
};

/**
 * Get S3 URL for an uploaded image by file ID
 * @param {string} fileId - MongoDB file ID
 * @returns {Promise<string|null>} - S3 URL or null if not found
 */
const getS3UrlByFileId = async (fileId) => {
    try {
        const file = await File.findById(fileId);
        if (!file) {
            return null;
        }
        
        // Construct S3 URL from file URI
        const s3Key = file.uri.replace(/^\//, ''); // Remove leading slash
        const s3Url = `https://${AWS_CONFIG.AWS_S3_BUCKET_NAME}.s3.${AWS_CONFIG.REGION}.amazonaws.com/${s3Key}`;
        
        return s3Url;
    } catch (error) {
        logger.error('Error getting S3 URL by file ID:', error);
        return null;
    }
};

/**
 * Get S3 URL for an uploaded image by S3 key
 * @param {string} s3Key - S3 object key
 * @returns {string} - S3 URL
 */
const getS3UrlByKey = (s3Key) => {
    try {
        return `https://${AWS_CONFIG.AWS_S3_BUCKET_NAME}.s3.${AWS_CONFIG.REGION}.amazonaws.com/${s3Key}`;
    } catch (error) {
        logger.error('Error constructing S3 URL:', error);
        return null;
    }
};

/**
 * Get list of supported file types for vector embedding
 * @returns {Object} - Object with categories and file types
 */
const getSupportedFileTypes = () => {
    return {
        documents: ['pdf', 'doc', 'docx', 'txt', 'text'],
        spreadsheets: ['xlsx', 'csv', 'xls'],
        emails: ['eml'],
        code: ['php', 'js', 'css', 'html', 'htm', 'sql', 'py', 'json'],
        all: ['pdf', 'doc', 'docx', 'txt', 'text', 'xlsx', 'csv', 'xls', 'eml', 'php', 'js', 'css', 'html', 'htm', 'sql', 'py', 'json']
    };
};

/**
 * Check if a file type is supported for vector embedding
 * @param {string} filename - Filename or file extension
 * @returns {boolean} - True if supported
 */
const isFileTypeSupported = (filename) => {
    const supportedTypes = getSupportedFileTypes().all;
    const extension = getFileExtension(filename)?.toLowerCase();
    return supportedTypes.includes(extension);
};

/**
 * Get MIME type mapping for supported file types
 * @returns {Object} - MIME type mapping
 */
const getMimeTypeMapping = () => {
    return {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'csv': 'text/csv',
        'eml': 'message/rfc822',
        'txt': 'text/plain',
        'text': 'text/plain',
        'php': 'application/x-httpd-php',
        'js': 'application/javascript',
        'css': 'text/css',
        'html': 'text/html',
        'htm': 'text/html',
        'sql': 'application/sql',
        'py': 'text/x-python',
        'json': 'application/json'
    };
};
/**
 * Generate hash-based vector for fallback when embeddings fail
 * @param {string} text - Text to hash
 * @param {number} size - Vector size
 * @returns {Array} Hash-based vector
 */
function generateHashVector(text, size) {
    try {
        // Generate a deterministic vector based on text hash
        const hash = crypto.createHash('sha256').update(text).digest('hex');
        const vector = new Array(size).fill(0);
        
        // Use hash to populate vector (not semantically meaningful but deterministic)
        for (let i = 0; i < size; i++) {
            const hashIndex = (i * 7) % hash.length; // Spread hash across vector
            const charCode = parseInt(hash[hashIndex], 16);
            vector[i] = (charCode / 15) - 0.5; // Normalize to [-0.5, 0.5] range
        }
        return vector;
        
    } catch (error) {
        // Ultimate fallback: return zero vector
        return new Array(size).fill(0);
    }
}
/**
 * Upload base64 image to S3 for Gemini AI generated images
 * @param {string} base64Data - Base64 encoded image data
 * @param {Object} options - Upload options
 * @param {string} options.customFileName - Custom filename prefix
 * @returns {Promise<Object>} - Result object with success status and S3 URL
 */
const uploadGeminiImageToS3 = async (base64Data, options = {}) => {
    try {
        const { customFileName = 'gemini' } = options;
        
        // Remove data URL prefix if present
        const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Image, 'base64');
        
        const id = new mongoose.Types.ObjectId();
        const fileExtension = 'png'; // Default to PNG for Gemini images
        const s3Key = `images/${customFileName}-${id}.${fileExtension}`;
        
        const uploadParams = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: 'image/png',
            ACL: 'public-read',
            Metadata: {
                uploadedAt: new Date().toISOString(),
                source: 'gemini-nanobanana'
            }
        };
        
        const uploadResult = await S3.upload(uploadParams).promise();    
        
        const fileData = {
            name: `${customFileName}-${id}.${fileExtension}`,
            mime_type: 'image/png',
            file_size: buffer.length.toString(),
            uri: `/${s3Key}`,
            type: 'png',
            isActive: true,
            module: 'ai-generated',
        }

        const fileRecord = await File.create(fileData);

        return {
            success: true,
            s3Url: uploadResult.Location,
            s3Key: s3Key,
            fileId: fileRecord._id,
            fileSize: buffer.length,
            contentType: 'image/png'
        };

    } catch (error) {
        logger.error('❌ [GEMINI_IMAGE] Error uploading base64 image to S3:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to upload image to S3'
        };
    }
};

module.exports = {
    uploadFileToS3,
    deleteFromS3,
    viewFile,
    getAll,
    fileUpload,
    removeFile,
    fetchS3UsageAndCost,
    fileData,
    allMediaUploadToBucket,
    deleteS3Media,
    removeExistingDocument,
    removeExistingImage,
    generatePresignedUrl,
    createFileRecord,
    uploadFileViaStreams,
    downloadAndUploadImageToS3,
    uploadOpenAIImageToS3Background,
    uploadOpenAIImageToS3,
    uploadGeminiImageToS3,
    getS3UrlByFileId,
    getS3UrlByKey,
    getSupportedFileTypes,
    isFileTypeSupported,
    getMimeTypeMapping
}