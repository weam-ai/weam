const customGptService = require('../../services/customgpt');

const CUSTOM_GPT = 'customgpt';

const addCustomGpt = catchAsync(async (req, res) => {
    const result = await customGptService.addCustomGpt(req);
    if (result) {
        res.message = _localize('module.create', req, CUSTOM_GPT);
        return util.createdDocumentResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, CUSTOM_GPT), res);
})

const updateCustomGpt = catchAsync(async (req, res) => {
    const result = await customGptService.updateCustomGpt(req);
    if (result) {
        res.message = _localize('module.update', req, CUSTOM_GPT);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.updateError', req, CUSTOM_GPT), res);
})

const viewCustomGpt = catchAsync(async (req, res) => {
    const result = await customGptService.viewCustomGpt(req);
    if (result) {
        res.message = _localize('module.get', req, CUSTOM_GPT);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.getError', req, CUSTOM_GPT), res);
})

const deleteCustomGpt = catchAsync(async (req, res) => {
    const result = await customGptService.deleteCustomGpt(req);
    if (result) {
        res.message = _localize('module.delete', req, CUSTOM_GPT);
        return util.successResponse(null, res);
    }
    return util.failureResponse(_localize('module.deleteError', req, CUSTOM_GPT), res);
})

const getAll = catchAsync(async (req, res) => {
    const result = await customGptService.getAll(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, CUSTOM_GPT);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, CUSTOM_GPT);
    return util.recordNotFound(null, res);
})

const partialUpdate = catchAsync(async (req, res) => {
    const result = await customGptService.partialUpdate(req);
    const messageKey = result.isActive ? 'module.active' : 'module.deActive';
    res.message = _localize(messageKey, req, CUSTOM_GPT);
    return util.successResponse(result, res);
})

const getAgents = catchAsync(async (req, res) => {
    const result = await customGptService.getAgents(req);
    if (result) {
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.getError', req, CUSTOM_GPT), res);
})

module.exports = {
    addCustomGpt,
    updateCustomGpt,
    viewCustomGpt,
    deleteCustomGpt,
    getAll,
    partialUpdate,
    getAgents
}