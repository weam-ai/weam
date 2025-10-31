const User = require('../models/user');
const dbService = require('../utils/dbService');
const { randomPasswordGenerator, handleError, getCompanyId, formatUser, getRemainingDaysCredit } = require('../utils/helper');
const { getTemplate } = require('../utils/renderTemplate');
const { EMAIL_TEMPLATE, MOMENT_FORMAT, EXPORT_TYPE, ROLE_TYPE, STORAGE_REQUEST_STATUS, GPT_TYPES } = require('../config/constants/common');
const { sendSESMail } = require('../services/email');
const moment = require('moment-timezone');
const WorkSpaceUser = require('../models/workspaceuser');
const ShareBrain = require('../models/shareBrain');
const { SUPPORT_EMAIL } = require('../config/config');
const Brain = require('../models/brains');
const Chat = require('../models/chat');
const ChatMember = require('../models/chatmember');
const ChatDocs = require('../models/chatdocs');
const TeamUser = require('../models/teamUser');
const {ObjectId}=require('mongoose').Types
const WorkSpace = require('../models/workspace');
const Company = require('../models/company');
const logger = require('../utils/logger');
const StorageRequest = require('../models/storageRequest');
const { getUsedCredit } = require('./thread');
const subscription = require('../models/subscription');
const { sendUserSubscriptionUpdate } = require('../socket/chat');
const Prompt = require('../models/prompts');
const CustomGpt = require('../models/customgpt');
const Subscription = require('../models/subscription');

const addUser = async (req) => {
    try {
        const existingUser = await dbService.getDocumentByQuery(User, { email: req.body.email });
        if (existingUser) {
            throw new Error(_localize('module.alreadyExists', req, 'user'));
        }
        const randomPass = randomPasswordGenerator();
        req.body.password = randomPass;
        const result = await dbService.createDocument(User, req.body);
        const emailData = {
            name: result.username,
            password: randomPass
        }
        getTemplate(EMAIL_TEMPLATE.SIGNUP_OTP, emailData).then(async (template) => {
            await sendSESMail(result.email, template.subject, template.body)
        })
        return result;
    } catch (error) {
        handleError(error, 'Error in user service add user function');
    }
}

const checkExisting = async function (req) {
    const companyId = getCompanyId(req.user);
    const result = await dbService.getSingleDocumentById(User, req.params.id,[],companyId);
    if (!result) {
        throw new Error(_localize('module.notFound', req, 'user'));
    }
    return result;
}

const updateUser = async (req) => {
    try {
        await checkExisting(req);
        return dbService.findOneAndUpdateDocument(User, { _id: req.params.id }, req.body);
    } catch (error) {
        handleError(error, 'Error in user service update user function');
    }
}

const getUser = async (req) => {
    try {

        const subscription = await Subscription.findOne({ 'company.id': req.user.company.id }, { status: 1,startDate:1,endDate:1 })
        const [result, company, credit] = await Promise.all([
            checkExisting(req),
            Company.findOne({ _id: req.user.company.id }, { freeCredit: 1,freeTrialStartDate: 1 }).lean(),
            getUsedCredit({ companyId: req.user.company.id, userId: req.user.id }, req.user),
            
        ]);
        const removeFields = ['password', 'fcmTokens', 'mfaSecret', 'resetHash'];
        removeFields.forEach(field => {
            delete result[field];
        });

        return {
          ...result,
          isFreeTrial: {
            ...(company?.freeTrialStartDate
              ? { freeTrialStartDate: company?.freeTrialStartDate }
              : {}),
            msgCreditLimit: credit.msgCreditLimit,
            msgCreditUsed: credit.msgCreditUsed,
            subscriptionStatus: subscription?.status,
          },
        };
    } catch (error) {
        handleError(error, 'Error in user service get user function');
    }
}

const deleteUser = async (req) => {
    try {
        await checkExisting(req);
        const companyId = req.roleCode === ROLE_TYPE.COMPANY ? req.user.company.id : req.user.invitedBy;
        deleteUserRef(req.params.id, companyId);
        return dbService.deleteDocument(User, { _id: req.params.id });
    } catch (error) {
        handleError(error, 'Error in user service delete user function');
    }
}

const getAllUser = async (req) => {
    try {
        const allUsers = await dbService.getAllDocuments(User, req.body.query || {}, req.body.options || {});

        // Convert Mongoose documents to plain objects and add usedCredits
        const usersWithCredits = await Promise.all(
            allUsers.data.map(async (user) => {
                const {msgCreditUsed} = await getUsedCredit({ companyId: user.company.id, userId: user._id }, user);
                
                // Convert to plain object and add usedCredits
                const userObj = user.toObject ? user.toObject() : user;
                return {
                    ...userObj,
                    usedCredits: msgCreditUsed
                };
            })
        );
        
        return {
            ...allUsers,
            data: usersWithCredits
        };
    } catch (error) {
        handleError(error, 'Error in user service get all user function');
    }
}

const exportUser = async (req, fileType) => {
    try {
        req.body.options = {
            pagination: false,
        }

        req.body.query = {
            search: req.query?.search,
            searchColumns: req.query?.searchColumns?.split(','),
        };

        const { data }  = await getAllUser(req);

        const columns = [
            { header: 'Sr. No.', key: 'srNo' },
            { header: 'User Name', key: 'username' },
            { header: 'Email', key: 'email' },
            { header: 'Mob No', key: 'mobNo' },
            { header: 'Created', key: 'createdAt' },
            { header: 'lastLogin', key: 'lastLogin' },
            { header: 'Status', key: 'isActive' },
            { header: 'Company Name', key: 'company' },
        ];

        const result = data?.map((item, index) => {
            return {
                srNo: index + 1,
                username: item.username,
                email: item.email,
                mobNo: item.mobNo,
                createdAt: item.createdAt ? moment(item.createdAt).format(MOMENT_FORMAT) : '-',
                lastLogin: item.lastLogin ? moment(item.lastLogin).format(MOMENT_FORMAT) : '-',
                isActive: item.isActive ? 'Active' : 'Deactive',
                company: item?.company?.name
            }
        })

        const fileName = `User list ${moment().format(MOMENT_FORMAT)}`;

        const workbook = dbService.exportToExcel(EXPORT_TYPE.NAME, columns, result);

        return {
            workbook: workbook,
            fileName: `${fileName}${fileType}`
        }
    } catch (error) {
        handleError(error, 'Error - exportUser');
    }
}


const storageDetails = async (req) => {
    try {
        const userInfo = await User.findById({ _id: req.userId }, { fileSize: 1, usedSize: 1 });
        const totalWorkspace = await WorkSpaceUser.countDocuments({ 'user.id': req.userId });
        const totalBrain = await ShareBrain.countDocuments({ 'user.id': req.userId });
        return {
            total: userInfo.fileSize,
            used: userInfo.usedSize,
            totalBrain,
            totalWorkspace
        };
    } catch (error) {
        handleError(error, 'Error - storageDetails');
    }
}

const storageIncreaseRequest = async (req) => {
    try {
        const query = req.roleCode === ROLE_TYPE.COMPANY ? req.user.company.id : req.user.invitedBy;
        
        const existingRequestCount = await StorageRequest.countDocuments({
            'user.id': req.userId,
            status: STORAGE_REQUEST_STATUS.PENDING
        });
        
        if (existingRequestCount > 0) {
            throw new Error(_localize('module.storageRequestExist', req));
        }

        const [storageUpdate, company] = await Promise.all([
            User.updateOne({ _id: req.userId }, { $set: req.body }),
            User.findOne({ 'company.id': query }, { email: 1, fname: 1, lname: 1 })
        ]);

        const storageRequest = await StorageRequest.create({
            user: formatUser(req.user),
            company: {
                id: query,
                name: req.user.company.name,
                slug: req.user.company.slug
            },
            requestSize: req.body.requestSize
        });
        
        let username = `${req.user.fname} ${req.user.lname}`;

        if(req.roleCode === ROLE_TYPE.COMPANY){
            username = `${req.user.fname} ${req.user.lname} at ${req?.user?.company?.name}`;
        } 
        
        const emailData = {
            username: username,
            size: `${req.body.requestSize}MB`,
            company_admin_name: company?.fname,
            support_email: SUPPORT_EMAIL
        }
        const recieptEmail = req.roleCode === ROLE_TYPE.COMPANY ? SUPPORT_EMAIL : company.email; 
        getTemplate(EMAIL_TEMPLATE.STORAGE_SIZE_REQUEST, emailData).then(async (template) => {
            await sendSESMail(recieptEmail, template.subject, template.body)
        })

        return true;
    } catch (error) {
        handleError(error, 'Error - storageIncreaseRequest');
    }
}

const approveStorageRequest = async (req) => {
    try {
        return User.updateOne({ _id: req.params.id }, { $inc: { fileSize: req.body.requestSize * 1024 * 1024 }, $unset: { requestSize: 1 } });
    } catch (error) {
        handleError(error, 'Error - approveStorageRequest');
    }
}

const deleteUserRef = async (userId, companyId) => {

    try {
        await Company.updateOne(
            { _id : companyId },
            { $pull : { users  : { id : userId } }
        });

        const brains = await Brain.find(
            { "user.id": userId, isShare: false },
            { _id: 1 }
        );
        if (brains.length) {
            const brainIds = brains.map((br) => br._id);

            const primaryResults = await Promise.allSettled([
                Brain.deleteMany({ _id: { $in: brainIds } }),
                ShareBrain.deleteMany({ "user.id": userId }),
                Chat.deleteMany({ "brain.id": { $in: brainIds } }),
                ChatMember.deleteMany({ "brain.id": { $in: brainIds } }),
                ChatDocs.deleteMany({ brainId: { $in: brainIds } }),
                WorkSpaceUser.deleteMany({ "user.id": userId }),
                TeamUser.updateMany(
                    { "teamUsers.id": ObjectId.createFromHexString(userId) },
                    { $pull: { teamUsers: { id: userId } } }
                ),
            ]);

            primaryResults.forEach((result, index) => {
                if (result.status === "rejected") {
                    logger.error(
                        `Primary operation ${index + 1} failed:`,
                        result.reason
                    );
                }
            });

            const emptyTeams = await TeamUser.find(
                {
                    teamUsers: { $size: 0 },
                },
                { _id: 1 }
            );

            if (emptyTeams.length > 0) {
                const emptyTeamIds = emptyTeams.map((team) => team._id);
                const secondaryResults = await Promise.allSettled([
                    TeamUser.deleteMany({ _id: { $in: emptyTeamIds } }),
                    WorkSpace.updateMany(
                        {
                            "teams.id": { $in: emptyTeamIds },
                        },
                        {
                            $pull: { teams: { id: { $in: emptyTeamIds } } },
                        }
                    ),
                    Brain.updateMany(
                        {
                            "teams.id": { $in: emptyTeamIds },
                        },
                        {
                            $pull: { teams: { id: { $in: emptyTeamIds } } },
                        }
                    ),
                    Chat.updateMany(
                        {
                            "teams.id": { $in: emptyTeamIds },
                        },
                        {
                            $pull: { teams: { id: { $in: emptyTeamIds } } },
                        }
                    ),
                ]);

                secondaryResults.forEach((result, index) => {
                    if (result.status === "rejected") {
                        logger.error(
                            `Secondary operation ${index + 1} failed:`,
                            result.reason
                        );
                    }
                });
            }
        }
    } catch (error) {
        handleError(error , `Error - deleteUserRef`)
    }
    
      
}

const toggleUserBrain = async (req) => {
    try {
        const { userIds, toggleStatus } = req.body;
        const { roleCode } = req.user;

        const companyId = getCompanyId(req.user);

        const query = {
            $and: [
                {
                    $or: [
                        { "company.id": companyId },
                        { invitedBy: companyId },
                    ],
                },
                {
                    ...(roleCode === ROLE_TYPE.COMPANY
                        ? {
                              $or: [
                                  { roleCode: ROLE_TYPE.COMPANY_MANAGER },
                                  { roleCode: ROLE_TYPE.USER },
                                  { roleCode: ROLE_TYPE.COMPANY },
                              ],
                          }
                        : roleCode === ROLE_TYPE.COMPANY_MANAGER
                        ? { roleCode: ROLE_TYPE.USER }
                        : {}),
                },
            ],
        };
            
        if (!userIds) {
            return await User.updateMany(
               query,
                { $set: { isPrivateBrainVisible: toggleStatus } }
            );
        } else {
            return await User.updateMany(
                { _id: { $in: userIds } },
                { $set: { isPrivateBrainVisible: toggleStatus } }
            );
        }
       
    } catch (error) {
        handleError(error, 'Error - toggleUserBrain');
    }
};

const addUserMsgCredit = async (companyId, msgCredit) => {
    try {
        if(!companyId){
            logger.error('Company id is required');
            return;
        }
        const result = await User.updateMany({ 'company.id': companyId }, { $set: { msgCredit: msgCredit } });
        // This is a major subscription change (adding credits), so trigger reload
        sendUserSubscriptionUpdate(companyId, { forceReload: true, subscriptionChanged: true });
        return result;        
    } catch (error) {
        handleError(error, 'Error - updateUserMsgCredit');
    }
}

const deductUserMsgCredit = async (companyId, creditsToDeduct = 1) => {
    try {
        if (!companyId) {
            logger.error('Company id is required for credit deduction');
            return { success: false, message: 'Company ID required' };
        }

        // Ensure credits is stored as double type
        creditsToDeduct = Number((parseFloat(creditsToDeduct)).toFixed(1));
        
        if (!creditsToDeduct || creditsToDeduct <= 0) {
            logger.warn('Invalid credit amount for deduction:', creditsToDeduct);
            return { success: false, message: 'Invalid credit amount' };
        }

        // Deduct credits from all users in the company
        const result = await User.updateMany(
            { 'company.id': companyId, msgCredit: { $gte: creditsToDeduct } },
            { $inc: { msgCredit: -creditsToDeduct } }
        );

        if (result.matchedCount === 0) {
            logger.warn(`No users found with sufficient credits (${creditsToDeduct}) for company: ${companyId}`);
            return { success: false, message: 'Insufficient credits' };
        }

        logger.info(`Deducted ${creditsToDeduct} credits from ${result.modifiedCount} users in company: ${companyId}`);
        
        // Note: Removed sendUserSubscriptionUpdate to prevent page reload on every message
        // Credit updates will be reflected naturally when user checks their balance
        // sendUserSubscriptionUpdate(companyId, {});
        
        return { 
            success: true, 
            message: `Deducted ${creditsToDeduct} credits`, 
            modifiedCount: result.modifiedCount 
        };
        
    } catch (error) {
        logger.error('Error in deductUserMsgCredit:', error);
        handleError(error, 'Error - deductUserMsgCredit');
        return { success: false, message: error.message };
    }
};

const updateUserMsgCredit = async (companyId, newPlanMsgLimit) => {
    try {
        // Get all users in the company
        const companyUsers = await User.find({ 'company.id': companyId }).lean();
        
        const subscriptionRecord = await subscription.findOne({ 'company.id': companyId })
            .select('startDate endDate')
            .lean();

        //Caculate per day credit
        const remainingDaysCredit = await getRemainingDaysCredit(subscriptionRecord?.startDate, subscriptionRecord?.endDate, newPlanMsgLimit);
        
        // Prepare bulk operations
        const bulkOps = await Promise.all(companyUsers.map(async user => {
            const creditInfo = await getUsedCredit({ companyId, userId: user._id}, user, subscriptionRecord);
            const oldPlanRemainingLimit = Number(creditInfo.msgCreditLimit) - Number(creditInfo.msgCreditUsed);
            
            const newCredit = Number(oldPlanRemainingLimit) + Number(remainingDaysCredit);
             
            return {
                updateOne: {
                    filter: { _id: user._id },
                    update: { $set: { msgCredit: newCredit } }
                }
            };
        }));
        
        // This is a major subscription change (updating plan credits), so trigger reload
        sendUserSubscriptionUpdate(companyId, { forceReload: true, subscriptionChanged: true });
        // Execute all updates in a single database call
        return User.bulkWrite(bulkOps);
        
    } catch (error) {
        handleError(error, 'Error - updateCompanyUsersCredit');
        return false;
    }
}

const userFavoriteList = async (req) => {
    try {
        const { search } = req.body.query;
        const userId = req.user.id;

        // Split search terms and create regex patterns for each word
        const searchTerms = search ? search.split(' ').filter(term => term) : [];
        const searchConditions = search ? {
            $or: [
                { 'doc.name': { $regex: searchTerms.join('|'), $options: 'i' } },
                { title: { $regex: searchTerms.join('|'), $options: 'i' } }
            ]
        } : {};
        
        // Fetch prompts, customGpts, and chatDocs with unified search condition        
        const [prompts = [], customGpts = [], chatDocs = []] = await Promise.all([
            Prompt.find({
                favoriteByUsers: userId,  
                ...searchConditions
            }).lean() || [],
            
            CustomGpt.find({
                favoriteByUsers: userId,
                ...searchConditions
            }).lean() || [],
            
            ChatDocs.find({
                favoriteByUsers: userId,
                ...searchConditions
            }).select({ '_id': 1, 'title': '$doc.name' , 'embedding_api_key': 1, 'doc': 1, 'fileId': 1 }).lean() || []
        ]);

        // Transform the data into the required format with null checks
        const favorites = [
            ...(Array.isArray(prompts) ? prompts.map(prompt => ({
                type: GPT_TYPES.PROMPT,
                itemId: prompt?._id,
                details: prompt
            })) : []),
            ...(Array.isArray(customGpts) ? customGpts.map(gpt => ({
                type: GPT_TYPES.CUSTOM_GPT,
                itemId: gpt?._id,
                details: gpt
            })) : []),
            ...(Array.isArray(chatDocs) ? chatDocs.map(doc => ({
                type: GPT_TYPES.DOCS,
                itemId: doc?._id,
                details: doc
            })) : [])
        ];

        return { data: favorites };
    } catch (error) {
        handleError(error, 'Error - userFavoriteList');
    }
}

module.exports = {
    addUser,
    updateUser,
    getUser,
    deleteUser,
    getAllUser,
    exportUser,
    storageDetails,
    storageIncreaseRequest,
    approveStorageRequest,
    toggleUserBrain,
    addUserMsgCredit,
    updateUserMsgCredit,
    deductUserMsgCredit,
    userFavoriteList
}