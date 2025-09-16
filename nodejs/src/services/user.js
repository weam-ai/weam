const User = require('../models/user');
const dbService = require('../utils/dbService');
const { randomPasswordGenerator, handleError, getCompanyId, formatUser } = require('../utils/helper');
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
const Message = require('../models/thread');
const Role = require('../models/role');
const { blockUser } = require('./userBlocking');

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
            //subscriptionStatus: null,
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
        const query = req.body.query || {};
        const options = req.body.options || {};
        
        if(req.body.needUsedCredits){
            const finalQuery = { 'company.id': req.user.company.id, ...query };
            
            const result = await User.paginate(finalQuery, {
                ...options,
                select: '_id msgCredit fname lname email roleCode',
                lean: true
            });
            
            const userIds = result.data.map(user => user._id);
            
            const messageCredit = await Message.aggregate([
                { $match: { 'user.id': { $in: userIds } } },
                { $group: { _id: '$user.id', totalCredit: { $sum: '$usedCredit' } } }
            ]);
            
            const userWithCredit = result.data.map(user => ({ 
                ...user, 
                usedCredits: messageCredit.find(credit => credit._id.toString() === user._id.toString())?.totalCredit || 0 
            }));
            
            return {
                data: userWithCredit,
                paginator: result.paginator
            };
        }
        
        return dbService.getAllDocuments(User, query, options);
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
        sendUserSubscriptionUpdate(companyId, {});
        return result;        
    } catch (error) {
        handleError(error, 'Error - updateUserMsgCredit');
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

const changeUserRole = async (req) => {
    try {
        const { userId, roleCode } = req.body;
        
        // Check if the requesting user is an admin (only admin users can change roles)
        if (req.user.roleCode !== ROLE_TYPE.COMPANY) {
            throw new Error('Only admin users can change user roles');
        }
        
        // Get the user's current role before updating
        const currentUser = await User.findById(userId).populate('roleId', 'name code');
        if (!currentUser) {
            throw new Error('User not found');
        }
        
        // Find the role by roleCode using standard pattern
        const newRole = await Role.findOne({ code: roleCode, isActive: true }, { _id: 1, code: 1, name: 1 });
        if (!newRole) {
            throw new Error('Invalid or inactive role code');
        }
        
        // Store the previous role information for email
        const previousRole = currentUser.roleId ? currentUser.roleId.name : 'No Role';
        const previousRoleCode = currentUser.roleCode || 'No Role';
        
        // Update the user's role
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { 
                roleId: newRole._id,
                roleCode: roleCode,
                updatedBy: req.user._id
            },
            { new: true }
        );
        
        if (!updatedUser) {
            throw new Error('Failed to update user role');
        }
        
        // Send email notification to the user about role change
        try {
            const emailData = {
                name: `${currentUser.fname || ''} ${currentUser.lname || ''}`.trim() || currentUser.email,
                newRole: newRole.name,
                previousRole: previousRole,
                updatedBy: `${req.user.fname || ''} ${req.user.lname || ''}`.trim() || req.user.email,
            };
            
            const template = await getTemplate(EMAIL_TEMPLATE.ROLE_CHANGE, emailData);
            await sendSESMail(currentUser.email, template.subject, template.body);
        } catch (emailError) {
            // Don't fail the role change if email fails
            logger.error('Error sending role change email:', emailError);
        }
        

        
        // Block the user account to force logout across all systems
        try {
            await blockUser(userId, req.user._id);
        } catch (blockError) {
            // Don't fail the role change if blocking fails
        }
        
        return updatedUser;
    } catch (error) {
        logger.error('Error in user service changeUserRole function:', error);
        throw error; // Re-throw the error so the controller can handle it
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
    userFavoriteList,
    changeUserRole
}