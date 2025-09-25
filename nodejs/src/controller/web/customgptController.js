const customGptService = require('../../services/customgpt');

const CUSTOM_GPT = 'agent';

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

    if (result.status === 302) {
        res.message = _localize("module.unAuthorized", req, "custom bot");
        return util.redirectResponse(res);
    }

    if (result.data.length) {
        res.message = _localize('module.list', req, CUSTOM_GPT);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, CUSTOM_GPT);
    return util.recordNotFound(null, res);
})

const assignGpt = catchAsync(async (req, res) => {
    const result = await customGptService.assignDefaultGpt(req);
    if (result) {
        res.message = _localize('module.create', req, CUSTOM_GPT);
        return util.createdDocumentResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, CUSTOM_GPT), res);
})

const usersWiseGetAll = catchAsync(async (req, res) => {
    const result = await customGptService.usersWiseGetAll(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, CUSTOM_GPT);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, CUSTOM_GPT);
    return util.recordNotFound(null, res);
})

const favoriteCustomGpt = catchAsync(async (req, res) => {
    const result = await customGptService.favoriteCustomGpt(req);
    if (result) {
        if(req.body.isFavorite){
            res.message = _localize('module.favorite', req, CUSTOM_GPT);
        }else{
            res.message = _localize('module.unfavorite', req, CUSTOM_GPT);
        }
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.favoriteError', req, CUSTOM_GPT), res);
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
    assignGpt,
    usersWiseGetAll,
    favoriteCustomGpt,
    getAgents
}