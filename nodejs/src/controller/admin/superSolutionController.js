const superSolutionService = require('../../services/superSolution');
const { catchAsync } = require('../../utils/helper');
const util = require('../../utils/messages');

const SOLUTION_APP = 'solution app';
const MEMBER = 'member';
const SOLUTION_TEAM = 'solution team';

const getAllSolutionApps = catchAsync(async (req, res) => {
    const result = await superSolutionService.getAllSolutionApps(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, SOLUTION_APP);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, SOLUTION_APP);
    return util.recordNotFound(null, res);
});

const addSolutionMember = catchAsync(async (req, res) => {
    const result = await superSolutionService.addSolutionMember(req);
    if (result) {
        res.message = _localize('module.add', req, { '{module}': MEMBER, '{module2}': SOLUTION_APP });
        return util.successResponse(result, res);
    }
});

const getSolutionMember = catchAsync(async (req, res) => {
    const result = await superSolutionService.getSolutionMember(req) || [];
    if (result.data.length) {
        res.message = _localize('module.list', req, MEMBER);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, MEMBER);
    return util.recordNotFound(null, res);
});

const removeSolutionMember = catchAsync(async (req, res) => {
    const result = await superSolutionService.removeSolutionMember(req);
    if (result) {
        res.message = _localize('module.remove', req, { '{module}': MEMBER, '{module2}': SOLUTION_APP });
        return util.successResponse(result, res);
    }
    res.message = _localize('module.notFound', req, MEMBER);
    return util.recordNotFound(null, res);
});

// Solution Teams Controllers

const getSolutionTeam = catchAsync(async (req, res) => {
    const result = await superSolutionService.getSolutionTeam(req) || [];
    if (result.data.length) {
        res.message = _localize('module.list', req, SOLUTION_TEAM);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, SOLUTION_TEAM);
    return util.recordNotFound(null, res);
});

const addSolutionTeam = catchAsync(async (req, res) => {
    const result = await superSolutionService.addSolutionTeam(req);
    if (result) {
        res.message = _localize('module.add', req, { '{module}': SOLUTION_TEAM, '{module2}': SOLUTION_APP });
        return util.successResponse(result, res);
    }
});

const removeSolutionTeam = catchAsync(async (req, res) => {
    const result = await superSolutionService.removeSolutionTeam(req);
    if (result) {
        res.message = _localize('module.remove', req, { '{module}': SOLUTION_TEAM, '{module2}': SOLUTION_APP });
        return util.successResponse(result, res);
    }
    res.message = _localize('module.notFound', req, SOLUTION_TEAM);
    return util.recordNotFound(null, res);
});

//get-by-user-id/${id}
const getSolutionAccessByUserId = catchAsync(async (req, res) => {
    const result = await superSolutionService.getSolutionAccessByUserId(req);
    if (result.data.length) {
        res.message = _localize('module.list', req, SOLUTION_APP);
        return util.successListResponse(result, res);
    }
    res.message = _localize('module.notFound', req, SOLUTION_APP);
    return util.recordNotFound(null, res);
});

const userHasAccessOfSolution = catchAsync(async (req, res) => {
    const result = await superSolutionService.userHasAccessOfSolution(req);
    if (result.hasAccess) {
        res.message = result.message || _localize('module.authorized', req, SOLUTION_APP);
        return util.successResponse(result, res);
    } else {
        res.message = result.message || _localize('module.unAuthorized', req, SOLUTION_APP);
        return util.badRequest(result, res);
    }
});

module.exports = {
    // Solution Apps
    getAllSolutionApps,
    addSolutionMember,
    getSolutionMember,
    removeSolutionMember,
    // Solution Teams
    getSolutionTeam,
    addSolutionTeam,
    removeSolutionTeam,
    //get-by-user-id/${id}
    getSolutionAccessByUserId,
    userHasAccessOfSolution
};
