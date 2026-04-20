const emailService = require('../services/email');
const { createKafkaTopic, catchAsync } = require('../utils/helper');
const commonService = require('../services/common');
const countryService = require('../services/country');
const stateService = require('../services/state');
const cityService = require('../services/city');
const companyService = require('../services/company');

const CREDIT = 'credit';

const updateEmailTemplate = catchAsync(async (req, res) => {
    const result = await emailService.updateEmailTemplate(req);
    if (result) {
        res.message = _localize('module.update', req, 'email template');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.updateError', req, 'email template'), res);
})

const viewEmailTemplate = catchAsync(async (req, res) => {
    const result = await emailService.viewEmailTemplate(req);
    if (result) {
        res.message = _localize('module.get', req, 'email template');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.getError', req, 'email template'), res);
})

const deleteEmailTemplate = catchAsync(async (req, res) => {
    const result = await emailService.deleteEmailTemplate(req);
    if (result) {
        res.message = _localize('module.delete', req, 'email template');
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('module.deleteError', req, 'email template'), res);
})

const listEmailTemplate = catchAsync(async (req, res) => {
    const result = await emailService.listEmailTemplate(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'email template');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'email template');
    return util.recordNotFound(null, res);
})


const addKafkaTopic = catchAsync(async (req, res) => {
    const result = await createKafkaTopic(req);
    res.message = _localize('module.create', req, 'kafka topic');
    return util.createdDocumentResponse(result, res);
})

const getAllCountry = catchAsync(async (req, res) => {
    const result = await countryService.getAll(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'country');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'country');
    return util.recordNotFound(null, res);
});

const getAllState = catchAsync(async (req, res) => {
    const result = await stateService.getAll(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'state');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'state');
    return util.recordNotFound(null, res);
});

const getAllCity = catchAsync(async (req, res) => {
    const result = await cityService.getAll(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, 'city');
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, 'city');
    return util.recordNotFound(null, res);
});

const addChatMemberTitle = catchAsync(async (req, res) => {
    const result = await commonService.addChatMemberTitle(req);
    res.message = _localize('module.update', req, 'chat title');
    return util.successListResponse(result, res);
});

const sendInviteEmail = catchAsync(async (req, res) => {
    const result = await companyService.sendManualInviteEmail(req);
    res.message = _localize('module.update', req, 'invite email');
    return util.successResponse(result, res);
});

const updateCredit = catchAsync(async (req, res) => {
    const result = await commonService.updateCredit(req);
    res.message = _localize('module.update', req, CREDIT);
    return util.successResponse(result, res);
});

const freeMessageCountMigration = catchAsync(async (req, res) => {
    const result = await commonService.freeMessageCountMigration(req);
    res.message = _localize('module.update', req, 'free message count');
    return util.successResponse(result, res);
});
const addCompanyModel = catchAsync(async (req, res) => {
    const result = await companyService.addCompanyModel(req);
    res.message = _localize('module.update', req, 'company model');
    return util.successResponse(result, res);
});
module.exports = {
    updateEmailTemplate,
    viewEmailTemplate,
    deleteEmailTemplate,
    listEmailTemplate,
    addKafkaTopic,
    getAllCity,
    getAllState,
    getAllCountry,
    addChatMemberTitle,
    sendInviteEmail,
    updateCredit,
    freeMessageCountMigration,
    addCompanyModel,
}