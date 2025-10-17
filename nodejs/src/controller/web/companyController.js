const companyService = require('../../services/company');

const INCORRECT_API_KEY = 'Incorrect API key provided';

const registerCompany = catchAsync(async (req, res) => {
    const result = await companyService.addCompany(req, false);
    if (result) {
        res.message = _localize('module.create', req, 'company');
        return util.createdDocumentResponse(result, res);
    }
    return util.failureResponse(
        _localize('module.createError', req, 'company'),
        res,
    );
});

const checkApiKey = catchAsync(async (req, res) => {
    const result = await companyService.checkApiKey(req);
    if (result.error || !result) {
        res.message = INCORRECT_API_KEY;
        return util.failureResponse(null, res)
    }
    res.message = _localize('ai.api_config_success', req);
    return util.successResponse(result, res);
})

const resendVerification = catchAsync(async (req, res) => {
    const result = await companyService.resendVerification(req);
    if (result) {
        res.message = _localize(result.message || 'auth.email_sent', req);
        return util.successResponse(result, res);
    }
    return util.failureResponse(_localize('auth.something_went_wrong', req));
})

const huggingFaceApiChecker = catchAsync(async (req, res) => {
    const result = await companyService.huggingFaceApiChecker(req);
    if (!result) {
        return util.failureResponse(null, res)
    }
    res.message = _localize('ai.api_config_success', req);
    return util.successResponse(result, res);
})

const anthropicApiChecker = catchAsync(async (req, res) => {
    const result = await companyService.anthropicApiChecker(req);
    if (!result) {
        res.message = INCORRECT_API_KEY;
        return util.failureResponse(null, res)
    }
    res.message = _localize('ai.api_config_success', req);
    return util.successResponse(result, res);
})

const geminiApiKeyChecker = catchAsync(async (req, res) => {
    const result = await companyService.geminiApiKeyChecker(req);
    if (!result) {
        res.message = INCORRECT_API_KEY;
        return util.failureResponse(null, res)
    }
    res.message = _localize('ai.api_config_success', req);
    return util.successResponse(result, res);
})

const addBlockedDomain = catchAsync(async (req, res) => {
    const result = await companyService.addBlockedDomain(req);
    return util.successResponse(result, res);
})


module.exports = {
    registerCompany,
    checkApiKey,
    resendVerification,
    huggingFaceApiChecker,
    anthropicApiChecker,
    geminiApiKeyChecker,
    addBlockedDomain,
};
