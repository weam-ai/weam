const AWS = require('aws-sdk');
const { AWS_CONFIG } = require('../config/config');
const dbService = require('../utils/dbService');
require('aws-sdk/lib/maintenance_mode_message').suppress = true; // remove aws v3 migrate warning
const File = require('../models/file');
const mime = require('mime-types');
const fs = require('fs').promises;
const { COST_AND_USAGE, ROLE_TYPE, ENV_VAR_VALUE } = require('../config/constants/common');
const ChatDocs = require('../models/chatdocs');
const UserBot = require('../models/userBot');
const sharp = require('sharp');
const { storeVectorData } = require('./customgpt');
const mongoose = require('mongoose');
const { getFileNameWithoutExtension, getFileExtension, hasNotRestrictedExtension, handleError } = require('../utils/helper');

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

// For internal Node.js service uploads (inside Docker)
const internalS3 = new AWS.S3({
    accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    endpoint: AWS_CONFIG.ENDPOINT, // accessible from container
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    sslEnabled: false,
});
// For generating presigned URLs to return to browser
const publicS3 = new AWS.S3({
    accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    endpoint: AWS_CONFIG.INTERNAL_ENDPOINT, // accessible from browser
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    sslEnabled: false,
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
        // await internalS3.upload(params).promise();
        logger.info(`File uploaded successfully to S3: ${filename}`);
    } catch (error) {
        logger.error('Error in uploadFileToS3', error);
        return;
    }
}


async function deleteFromS3 (filename) {
    try {
        const params = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Key: filename.replace(/^\/+/g, ''),
        }
        await internalS3.deleteObject(params).promise();
        logger.info(`File deleted successfully from S3: ${filename}`);
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

        const s3Object = await internalS3.getObject(s3Params).promise();

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
            chatDocsToCreate.length > 0 ? ChatDocs.insertMany(chatDocsToCreate) : null,
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
        const objectList = await internalS3.listObjectsV2(params).promise();

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
        ChatDocs.deleteOne({ fileId: fileId }),
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
            
            // Use publicS3 for presigned URLs (accessible from browser)
            const url = await publicS3.getSignedUrlPromise('putObject', { 
                ...params, 
                Key: fileName, 
                ContentType: fileKey.type 
            });
            
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
    createFileRecord
}