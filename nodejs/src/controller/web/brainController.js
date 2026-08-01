const brainService = require('../../services/brain');

const BRAIN = 'brain';

const createBrain = catchAsync(async (req, res) => {
    const result = await brainService.createBrain(req);
    if (result) {
        res.message = _localize('module.create', req, BRAIN);
        return util.createdDocumentResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, BRAIN), res);
})

const updateBrain = catchAsync(async (req, res) => {
    const result = await brainService.updateBrain(req);
    if (result) {
        res.message = _localize('module.update', req, BRAIN);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.updateError', req, BRAIN), res);
})

const getBrain = catchAsync(async (req, res) => {
    const result = await brainService.getBrain(req);
    if (result) {
        res.message = _localize('module.get', req, BRAIN);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.getError', req, BRAIN), res);
})

const deleteBrain = catchAsync(async (req, res) => {
    const result = await brainService.deleteBrain(req);
    if (result) {
        res.message = _localize((req.body.isHardDelete) ? 'module.delete' : 'module.archive', req, BRAIN);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.deleteError', req, BRAIN), res);
})

const deleteAllBrain = catchAsync(async (req, res) => {
    // Feature flag check
    if (process.env.BULK_DELETE_BRAINS_ENABLED !== 'true') {
        return res.status(403).json({ error: 'Bulk delete is disabled by feature flag.' });
    }

    // Confirm param check
    if (req.query.confirm !== 'true' && req.body.confirm !== true) {
        return res.status(400).json({ error: 'Explicit confirmation required (confirm=true).' });
    }

    // Role/permission defense-in-depth
    const allowedRoles = ['COMPANY', 'MANAGER'];
    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];
    if (!userRoles.some(role => allowedRoles.includes(role)) || !userPermissions.includes('brain.delete_all')) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }

    // Rate limiting (simple in-memory, replace with Redis for prod)
    if (!global.bulkDeleteRateLimit) global.bulkDeleteRateLimit = {};
    const userId = req.userId;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxDeletes = 2;
    const userLimit = global.bulkDeleteRateLimit[userId] || { count: 0, last: 0 };
    if (userLimit.last + windowMs > now) {
        if (userLimit.count >= maxDeletes) {
            return res.status(429).json({ error: 'Rate limit exceeded for bulk delete.' });
        }
        userLimit.count++;
    } else {
        userLimit.count = 1;
        userLimit.last = now;
    }
    global.bulkDeleteRateLimit[userId] = userLimit;

    // Audit logging
    const logger = require('../../utils/logger');
    logger.info(`Bulk delete brains requested by user ${userId} (${req.user.email}) at ${new Date().toISOString()}`);

    const result = await brainService.deleteAllBrain(req);
    if (result) {
        logger.info(`Bulk delete brains SUCCESS for user ${userId} (${req.user.email}) at ${new Date().toISOString()}`);
        res.message = _localize('module.delete', req, BRAIN);
        return util.successResponse(result, res);
    }
    logger.error(`Bulk delete brains FAILURE for user ${userId} (${req.user.email}) at ${new Date().toISOString()}`);
    return util.failureResponse(_localize('module.deleteError', req, BRAIN), res);
})

const getAll = catchAsync(async (req, res) => {
    const result = await brainService.getAll(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, BRAIN);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, BRAIN);
    return util.recordNotFound(null, res);
})

const partialUpdate = catchAsync(async (req, res) => {
    const result = await brainService.partialUpdate(req);
    const messageKey = result.isActive ? 'module.active' : 'module.deActive';
    res.message = _localize(messageKey, req, BRAIN);
    return util.successResponse(result, res);
})

const unShareBrain = catchAsync(async (req, res) => {
    const result = await brainService.unShareBrain(req);
    if (result) {
        res.message = _localize('module.unshare', req, "User");
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.unshareError', req, BRAIN), res);
})

const shareBrainDocs = catchAsync(async (req, res) => {
    const result = await brainService.shareBrainDocs(req);
    if (result) {
        res.message = _localize('module.share', req, 'brain doc');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.shareError', req, 'brain doc'), res);
})

const shareList = catchAsync(async (req, res) => {
    const result = await brainService.shareBrainList(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'share brain');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'share brain');
    return util.recordNotFound(null, res);
})

const getAllBrainUser = catchAsync(async (req, res) => {
    const result = await brainService.getAllBrainUser(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'brain users');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'brain users');
    return util.recordNotFound(null, res);
})

const restoreBrain = catchAsync(async (req, res) => {
    const result = await brainService.restoreBrain(req);
    if (result) {
        res.message = _localize('module.restore', req, BRAIN);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.notFound', req, BRAIN), res);
})

const workspaceWiseList = catchAsync(async (req, res) => {
    const result = await brainService.workspaceWiseList(req);
    if (result.length) {
        res.message = _localize('module.list', req, 'workspace');
        return util.successResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'workspace');
    return util.recordNotFound(null, res);
})

const convertToShared = catchAsync(async (req, res) => {
    const result = await brainService.convertToShared(req);
    if (result) {
        res.message = _localize('module.convertToShared', req, BRAIN);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.convertToSharedError', req, BRAIN), res);
})

module.exports = {
    createBrain,
    updateBrain,
    getBrain,
    getAll,
    deleteBrain,
    partialUpdate,
    unShareBrain,
    shareBrainDocs,
    shareList,
    getAllBrainUser,
    restoreBrain,
    deleteAllBrain,
    workspaceWiseList,
    convertToShared
} 

