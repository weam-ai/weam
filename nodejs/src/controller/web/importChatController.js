const importChatService = require('../../services/importChat');
const util = require('../../utils/messages');
const { localize: _localize } = require('../../utils/helper');
const { catchAsync } = require('../../utils/helper');

const uploadImportChat = catchAsync(async (req, res) => {
    const result = await importChatService.processImportChatJson(req);
    if (result) {
        res.message = _localize('module.create', req, 'import chat');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, 'import chat'), res);
});

const getImportChatStatus = catchAsync(async (req, res) => {
    const { importId } = req.params;
    const result = await importChatService.getImportChatStatus(importId);
    res.message = _localize('module.get', req, 'import chat status');
    return util.successResponse(result, res);
});

const getImportChats = catchAsync(async (req, res) => {
    const result = await importChatService.getImportChats(req);
    res.message = _localize('module.list', req, 'import chat list');
    return util.successResponse(result, res);
});

module.exports = {
    uploadImportChat,
    getImportChatStatus,
    getImportChats
};
