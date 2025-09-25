const { getCompanyId } = require("../utils/helper");
const { getUsedCredit } = require("../services/thread");
const Company = require("../models/company");
const moment = require("moment");

const checkPromptLimit = catchAsync(async (req, res, next) => {
  try {
    const companyId = getCompanyId(req.user);
    
    const filter = {
      companyId: companyId,
      userId: req.user.id,
    };
    const user = req.user;
    const modelMessageCount = await getUsedCredit(
      filter,
      user
    );

    // if (
    //   modelMessageCount.msgCreditUsed > modelMessageCount.msgCreditLimit
    // ) {
    //   return true
    //   return handleCreditExpired(req, res);
    // }

    next();
  } catch (error) {
    logger.error("Error - checkPromptLimit", error);
  }
});

function handleLimitExceeded(req, res) {
  res.message = _localize("module.prompt_expire", req);
  return util.badRequest(null, res);
}

const handleCreditExpired = (req, res) => {
  res.message = _localize("module.credit_expired", req);
  return util.badRequest(null, res);
};

const handleTrialExpired = (req, res) => {
  res.message = _localize("module.trial_expired", req);
  return util.badRequest(null, res);
};

module.exports = {
  checkPromptLimit,
};
