const userService = require('../../services/user');
const { EXPORT_TYPE } = require('../../config/constants/common');

const addUser = catchAsync(async (req, res) => {
    const result = await userService.addUser(req);
    if (result) {
        res.message = _localize('module.create', req, 'user');
        return util.createdDocumentResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, 'user'), res);
});

const updateUser = catchAsync(async (req, res) => {
    const result = await userService.updateUser(req);
    if (result) {
        res.message = _localize('module.update', req, 'user');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.updateError', req, 'user'), res);
});

const getUser = catchAsync(async (req, res) => {
    const result = await userService.getUser(req);
    if (result) {
        res.message = _localize('module.get', req, 'user');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.getError', req, 'user'), res);
})

const deleteUser = catchAsync(async (req, res) => {
    const result = await userService.deleteUser(req);
    if (result) {
        res.message = _localize('module.delete', req, 'user');
        return util.successResponse(null, res);
    }
    return util.failureResponse(_localize('module.deleteError', req, 'user'), res);
})

const getAllUser = catchAsync(async (req, res) => {
    const result = await userService.getAllUser(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'user');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'user');
    return util.recordNotFound(null, res);
})

const exportUser = catchAsync(async (req, res) => {
    const fileType = req.query.type === '1' ? EXPORT_TYPE.EXCEL : EXPORT_TYPE.CSV;

    const { workbook, fileName } = await userService.exportUser(req, fileType);

    let writerPromise;
    if (fileType === EXPORT_TYPE.EXCEL) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        writerPromise = workbook.xlsx.write(res);
    } else if (fileType === EXPORT_TYPE.CSV) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename='${fileName}'`);
        writerPromise = workbook.csv.write(res);
    }

    await writerPromise;
    res.end();
});

const approveStorageRequest = catchAsync(async (req, res) => {
    const result = await userService.approveStorageRequest(req);
    res.message = _localize('module.update', req, 'storage');
    return util.successResponse(result, res);
})

const toggleUserBrain = catchAsync(async (req, res) => {
    const result = await userService.toggleUserBrain(req);
    const {toggleStatus}=req.body
    if (result) {
        res.message = _localize('module.toggle', req, `Private brain ${toggleStatus ? "enable" : "disabled"}`);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, 'Private brain toggle'), res);
})

const changeUserRole = catchAsync(async (req, res) => {
    const result = await userService.changeUserRole(req);
    if (result) {
        res.message = _localize('module.update', req, 'user role');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.updateError', req, 'user role'), res);
})

module.exports = {
    addUser,
    updateUser,
    getUser,
    deleteUser,
    getAllUser,
    exportUser,
    approveStorageRequest,
    toggleUserBrain,
    changeUserRole
}