const chatService = require('../../services/chat');

const addChat = catchAsync(async (req, res) => {
    const result = await chatService.addChat(req);
    res.message = _localize('module.create', req, 'new chat');
    return util.successResponse(result, res);
})

const updateChat = catchAsync(async (req, res) => {
    const result = await chatService.updateChat(req);
    res.message = _localize('module.update', req, 'chat');
    return util.successResponse(result, res);
})

const removeChat = catchAsync(async (req, res) => {
    await chatService.removeChat(req);
    res.message = _localize('module.delete', req, 'chat');
    return util.successResponse(true, res);
})

const getAllChat = catchAsync(async (req, res) => {
    const result = await chatService.getAllChat(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'chat list');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'chat list');
    return util.recordNotFound(null, res);
})

const getChatById = catchAsync(async (req, res) => {
    const result = await chatService.getChatById(req);
    if (result) {
        res.message = _localize('module.get', req, 'chat');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.getError', req, 'chat'), res);
})

const forkChat = catchAsync(async (req, res) => {
    const result = await chatService.forkChat(req);
    res.message = _localize('module.create', req, 'fork chat');
    return util.successResponse(result, res);
})

const checkChatAccess = catchAsync(async (req, res) => {
    const result = await chatService.checkChatAccess(req);
    if (result) {
        res.message = _localize('module.get', req, 'chat');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('auth.access_denied', req), res);
})
const enhancePrompt = catchAsync(async (req, res) => {
    const result = await chatService.enhancePrompt(req);
    res.message = _localize('module.create', req, 'prompt');
    return util.successResponse(result, res);
})

const getSearchMetadata = catchAsync(async (req, res) => {
    const result = await chatService.getSearchMetadata(req);
    res.message = _localize('module.get', req, 'search metadata');
    return util.successResponse(result, res);
})

module.exports = {
    addChat,
    getAllChat,
    removeChat,
    getChatById,
    forkChat,
    updateChat,
    checkChatAccess,
    enhancePrompt,
    getSearchMetadata
}