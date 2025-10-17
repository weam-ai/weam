const companyService = require('../../services/company');
const { EXPORT_TYPE } = require('../../config/constants/common');

const COMPANY = 'company';
const USER = 'user';

const addCompany = catchAsync(async (req, res) => {
    const result = await companyService.addCompany(req);
    if (result) {
        res.message = _localize('module.create', req, COMPANY);
        return util.createdDocumentResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, COMPANY), res);
})

const updateCompany = catchAsync(async (req, res) => {
    const result = await companyService.updateCompany(req);
    if (result) {
        res.message = _localize('module.update', req, COMPANY);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.updateError', req, COMPANY), res);
})

const viewCompany = catchAsync(async (req, res) => {
    const result = await companyService.viewCompany(req);
    if (result) {
        res.message = _localize('module.get', req, COMPANY);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.getError', req, COMPANY), res);
})

const deleteCompany = catchAsync(async (req, res) => {
    const result = await companyService.deleteCompany(req);
    if (result) {
        res.message = _localize('module.delete', req, COMPANY);
        return util.successResponse(null, res);
    }
    return util.failureResponse(_localize('module.deleteError', req, COMPANY), res);
})

const getAll = catchAsync(async (req, res) => {
    const result = await companyService.getAll(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, COMPANY);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, COMPANY);
    return util.recordNotFound(null, res);
})

const partialUpdate = catchAsync(async (req, res) => {
    const result = await companyService.partialUpdate(req);
    const messageKey = result.isActive ? 'module.active' : 'module.deActive';
    res.message = _localize(messageKey, req, COMPANY);
    return util.successResponse(result, res);
})

const exportCompanies = catchAsync(async (req, res) => {
    const fileType = req.query.type === '1' ? EXPORT_TYPE.EXCEL : EXPORT_TYPE.CSV;

    const { workbook, fileName } = await companyService.exportCompanies(req, fileType);

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
})

const addTeamMembers = catchAsync(async (req, res) => {
    const result = await companyService.addTeamMembers(req);
    if (result) {
        res.message = _localize('module.create', req, USER);
        return util.createdDocumentResponse(result, res);
    }
    return util.failureResponse(_localize('module.createError', req, USER), res);
})

const migrateCompanyModels = catchAsync(async (req, res) => {
    const result = await companyService.migrateCompanyModels(req);
    if (result) {
        res.message = result.message;
        return util.successResponse(result, res);
    }
    return util.failureResponse('Migration process encountered an error.', res);
})

module.exports = {
    addCompany,
    updateCompany,
    viewCompany,
    deleteCompany,
    getAll,
    partialUpdate,
    exportCompanies,
    addTeamMembers,
    migrateCompanyModels
}