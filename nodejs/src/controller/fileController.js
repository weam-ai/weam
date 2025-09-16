const uploadService = require('../services/uploadFile');

const fileUpload = catchAsync(async (req, res) => {
    const result = await uploadService.fileUpload(req);
    if (result) {
        res.message = _localize('file.upload', req);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('file.not_uploaded', req), res);
})

const removeFile = catchAsync(async (req, res) => {
    const result = await uploadService.removeFile(req);
    if (result) {
        res.message = _localize('module.delete', req, 'file');
        return util.successResponse(null, res);
    }
    return util.failureResponse(_localize('module.deleteError', req, 'file'), res);
})

const deleteS3Media = catchAsync(async (req, res) => {
    const result = await uploadService.deleteS3Media(req);
    if (result) {
        res.message = _localize('module.delete', req, 'file');
        return util.successResponse(null, res);
    }
    return util.failureResponse(_localize('module.deleteError', req, 'file'), res);
})

const allMediaUploadToBucket = catchAsync(async (req, res) => {
    const result = await uploadService.allMediaUploadToBucket(req);
    if (result) {
        res.message = _localize('file.upload', req);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('file.not_uploaded', req), res);
})

const generatePresignedUrl = catchAsync(async (req, res) => {
    const result = await uploadService.generatePresignedUrl(req);
    return util.successResponse(result, res);
})

const uploadFileViaStreams = catchAsync(async (req, res) => {
    const result = await uploadService.uploadFileViaStreams(req);
    if (result && result.length > 0) {
        res.message = _localize('file.upload', req);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('file.not_uploaded', req), res);
})

module.exports = {
    fileUpload,
    removeFile,
    allMediaUploadToBucket,
    deleteS3Media,
    generatePresignedUrl,
    uploadFileViaStreams
}