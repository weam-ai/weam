const Brain = require('../models/brains');
const dbService = require('../utils/dbService');
const { formatUser, formatBrain, getCompanyId, getDefaultBrainSlug } = require('../utils/helper');
const ShareBrain = require('../models/shareBrain');
const { ROLE_TYPE, NOTIFICATION_TYPE, DEFAULT_NAME } = require('../config/constants/common');
const { sendCommonNotification } = require('./notification');
const { addBrainChatMember, removeBrainChatMember } = require('../services/chatmember');
const { addShareBrainTeam, addWorkSpaceTeam } = require('./teamMember');
const { addWorkSpaceUsers } = require('./workspace');
const Workspace =require("../models/workspace");
const { accessOfBrainToUser, accessOfWorkspaceToUser } = require('./common');

const shareBrainFormat = async (req, brains, createBrain = false) => {
    const shareData = {
        brain: formatBrain(brains),
        role: ROLE_TYPE.OWNER,
        invitedBy: req.userId,
        user: formatUser(req.user),
    }
    if (req.body.isShare) {
        if(createBrain)
            await ShareBrain.findOneAndUpdate({ 'brain.id': brains._id, 'user.id': req.userId }, shareData, { new: true, upsert: true });
        if (req.body?.shareWith?.length)
            await shareBrainWithUser(req.body.shareWith, brains, req)
    } else {
        await ShareBrain.findOneAndUpdate({ 'brain.id': brains._id, 'user.id': req.userId }, shareData, { new: true, upsert: true });
    }
}

const createBrain = async (req) => {
    try {
        const data = {
            ...req.body,
            slug: slugify(req.body.title),
            user: formatUser(req.user),
        }

        const {isPrivateBrainVisible}=req.user
        const workspace=await Workspace.findOne({_id:data.workspaceId})
        
        if(!data?.isShare && !isPrivateBrainVisible){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }else{
            const accessOfWorkspace = await accessOfWorkspaceToUser({workspaceId : data.workspaceId, userId : req.user.id})
            if(!accessOfWorkspace){
                throw new Error(_localize('module.unAuthorized', req,'Brain'))
            }
        }
        data.companyId = req.roleCode === ROLE_TYPE.COMPANY ? req.user.company.id : req.user.invitedBy

        // Check if this is meant to be a general brain
    
        let brains;
        if(data.title === DEFAULT_NAME.GENERAL_BRAIN_TITLE){
            const existingBrain = await Brain.findOne({
                workspaceId: data.workspaceId,
                title: DEFAULT_NAME.GENERAL_BRAIN_TITLE,
                slug: DEFAULT_NAME.GENERAL_BRAIN_SLUG
            });
            if (existingBrain) {
               brains=existingBrain
            }else{
                brains = await Brain.create(data);
            }
        }else{
            brains = await Brain.create(data);
        }
        

       

        await shareBrainFormat(req, brains, true);

        if(data?.shareWith){

            await addWorkSpaceUsers(data.shareWith, workspace, req.user);
        }
        if(req.body.isShare && req.body?.teams?.length>0){
            if(req.body.teams.length>0){
                await Promise.all([
                    addWorkSpaceTeam(req.body.teams,workspace, req.user),
                    addShareBrainTeam(req.body.teams, brains, req.user),
                    data.slug === DEFAULT_NAME.GENERAL_BRAIN_SLUG ? addBrainChatMember(brains,req.body.teams, req.user) : null
                ].filter(Boolean));
            }

            if(data.shareWith.length>0){
                await Promise.all([
                    data.slug === DEFAULT_NAME.GENERAL_BRAIN_SLUG ? addBrainChatMember(brains, data.shareWith, req.userId) : null
                ].filter(Boolean));
            }
        }


        return brains;
    } catch (error) {
        handleError(error, 'Error - createBrain');
    }
}

const createDefaultBrain = async (req, workspaceId, currentuser) => {
    
    try {
        const defaultBrainSlug = `default-brain-${req.userId}`
        let defaultBrain = await Brain.findOne({ slug: defaultBrainSlug, workspaceId,isShare:false,isDefault:true })

        let brains;
        if(!defaultBrain){
        const data = {
            isShare:false,
            title:DEFAULT_NAME.BRAIN,
            workspaceId: workspaceId,
            slug: `${slugify(DEFAULT_NAME.BRAIN)}-${currentuser?._id}`,
            isDefault: true,
            user: {
                email: currentuser.email,
                id: currentuser._id,
                fname: currentuser?.fname,
                lname: currentuser?.lname,
                profile: currentuser?.profile
            }
        }
        
        data.companyId = getCompanyId(currentuser);
        
        brains = await Brain.findOneAndUpdate({slug:data.slug,workspaceId:data.workspaceId},data, {new:true, upsert:true});
    }

        const shareData = {
            brain: formatBrain(brains),
            role: currentuser.roleCode,
            invitedBy: currentuser._id,
            user: {
                email: currentuser.email,
                id: currentuser._id                
            }
        }
        await ShareBrain.findOneAndUpdate({ 'brain.id': brains._id, 'user.id': currentuser._id }, shareData, { new: true, upsert: true });

        return brains;
    } catch (error) {
        handleError(error, 'Error - createBrain');
    }
}

const checkBrain = async (req) => {
    return Brain.findOne({ slug: req.params.slug, 'workspaceId': req.body.workspaceId });
}

const updateBrain = async (req) => {
    try {

        const {isPrivateBrainVisible}=req.user
        const filter = req.body.isShare ? { _id: req.params.id } : { _id: req.params.id, 'user.id': req.userId }

        const  accessOfWorkspace = await accessOfWorkspaceToUser({workspaceId : req.body.workspaceId, userId : req.user.id, isPopulateWorkspace:true})
        
        if(!accessOfWorkspace || ( !req.body.isShare && !isPrivateBrainVisible)){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }

        const accessShareBrain=await accessOfBrainToUser({brainId:req.params.id,userId:req.user.id})
       
        if(!accessShareBrain){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }
        
        const existing = await Brain.findOne(filter);
        if (!existing) return false;

        const rescount = await Brain.countDocuments({ slug: slugify(req.body.title), 'workspaceId': req.body.workspaceId, _id: { $ne: req.params.id } });
        if (rescount > 0) throw new Error(_localize('module.alreadyExists', req, req.body.title + ' Brain'));

        const updateObj = { ...req.body };
        if (req.body.title) {
            Object.assign(updateObj, { slug: slugify(req.body.title) })
        }

        await shareBrainFormat(req, existing);

        const sharewith = req?.body?.shareWith;

        //Assign all chats with the user which are associated to the brain
        (sharewith != undefined) ? addBrainChatMember(existing, sharewith, req.userId) : '';
        
       if(sharewith){
        await addWorkSpaceUsers(sharewith, accessOfWorkspace.workspaceId, req.user);
       }
        return Brain.findOneAndUpdate(filter, updateObj, { new: true });
    } catch (error) {
        handleError(error, 'Error - updateBrain');
    }
}

const getBrain = async (req) => {
    try {
        const existing = await checkBrain(req);
        if (!existing) false;
        return existing;
    } catch (error) {
        handleError(error, 'Error - getBrain');
    }
}

const deleteBrain = async (req) => {
    try {

        const {isPrivateBrainVisible}=req.user
        
        if(!req.body.isShare && !isPrivateBrainVisible){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }else{
            const accessShareBrain=await accessOfBrainToUser({brainId:req.params.id,userId:req.user.id})
           
            if(!accessShareBrain){
                throw new Error(_localize('module.unAuthorized', req,'Brain'))
            }
        }

        const filter = req.body.isShare ? { _id: req.params.id } : { _id: req.params.id, 'user.id': req.userId }
        const existing = await Brain.findOne(filter);
        if (!existing) false;
        
        const fullname = `${req.user.fname} ${req.user.lname}`;
        if(req.body.isHardDelete)
            return Brain.deleteOne({ _id: req.params.id });
        else
            return Brain.updateOne({ _id: req.params.id }, { $set: {deletedAt: new Date(), archiveBy: {name: fullname, id: req.userId} }})
            
    } catch (error) {
        handleError(error, 'Error - deleteBrain');
    }
}

const deleteAllBrain = async (req) => {
    try {
        return Brain.deleteMany({ 
            deletedAt: { $exists: true },
            'user.id': req.userId 
        });        
    } catch (error) {
        handleError(error, 'Error - deleteBrain');
    }
}

const getAll = async (req) => {
    try {
        return dbService.getAllDocuments(Brain, req.body.query || {}, req.body.options || {}, false);
    } catch (error) {
        handleError(error, 'Error - getAll');
    }
}

const partialUpdate = async (req) => {
    try {
        return Brain.findOneAndUpdate({ slug: req.params.slug, 'user.id': req.userId }, req.body, { new: true }).select('isActive');
    } catch (error) {
        handleError(error, 'Error - partialUpdate');
    }
}

const shareBrainWithUser = async (users, brain, req) => {
    try {
        const brains = await ShareBrain.find({ 'brain.id': brain._id, 'user.id': { $in: users.map(user => user.id) },teamId:{$exists:false} });
        const newUsers = [];
        const operations = users.map((user) => {
            const check = brains.find((br) => br.user.email === user.email);
            const userData = { ...user };
            userData.brain = formatBrain(brain);
            userData.invitedBy = req.userId;
            userData.user = formatUser(user);
            userData.role = ROLE_TYPE.MEMBER
            if (check) {
                return {
                    updateOne: {
                        filter: { 'user.email': user.email, 'brain.id': brain._id },
                        update: { $set: userData }
                    }
                }
            } else {
                newUsers.push({ id: user.id });
                return {
                    insertOne: {
                        document: userData
                    }
                }
            }
        })
        // ⚠️ WARNING: Do not use await with sendCommonNotification().
        // This function should be called in the background without blocking the main thread.
        sendCommonNotification(NOTIFICATION_TYPE.BRAIN_INVITATION, newUsers, req.user, { brain: brain.title, brainId: brain._id })
        return await ShareBrain.bulkWrite(operations);
    } catch (error) {
        handleError(error, 'Error - shareBrainWithUser');
    }
}

const unShareBrainUser = async (req) => {
    try {

        const accessShareBrain=await accessOfBrainToUser({brainId:req.params.id,userId:req.user.id})
       
        if(!accessShareBrain){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }
        
        const remove = await ShareBrain.deleteOne({ 'brain.id': req.params.id, 'user.id': req.body.user_id,teamId:{$exists:false} });
        removeBrainChatMember(req.params.id, req.body.user_id);
        return remove;
    } catch (error) {
        handleError(error, 'Error - unShareBrainUser');
    }
}

const shareBrainDocs = async (req) => {
    try {
        const query = { slug: req.body.slug, 'user.id': req.userId };
        const existing = await Brain.findOne(query);

        if (!existing) {
            return false;
        }

        const bulkUpdateOps = req.body.shareDoc.map((doc) => ({
            updateOne: {
                filter: query,
                update: { $addToSet: { docShare: { ...doc } } },
            },
        }));

        await Brain.bulkWrite(bulkUpdateOps);

        return true;
    } catch (error) {
        handleError(error, 'Error - shareBrainDocs');
    }
};

const shareBrainList = async (req) => {
    try {
        return dbService.getAllDocuments(
            ShareBrain,
            req.body.query || {},
            req.body.options || {},
        )
    } catch (error) {
        handleError(error, 'Error - shareBrainList');
    }
}

const getAllBrainUser = async (req) => {
    try {
        const { options = {}, query = {} } = req.body || {};
        
        const assignBrain = await ShareBrain.find({ 'user.id': req.userId });
        query['_id'] = { $in: assignBrain.filter(w => w?.brain?.id).map(w => w.brain.id) };
        
        const data = await dbService.getAllDocuments(Brain, query, options);
            const result = data.data.map((brain) => ({
                ...brain._doc,
                role: ROLE_TYPE.OWNER
            }));
            return {
                data: result,
                paginator: data.paginator
            };
    } catch (error) {
        handleError(error, 'Error - getAllBrainUser');
    }
}

const restoreBrain = async (req) => {
    try {
        const query = { _id: req.params.id };
        const existing = await Brain.findOne(query);
        if (!existing) false;
        return Brain.updateOne(query, { $unset: {deletedAt: 1, archiveBy: 1 }})
    } catch (error) {
        handleError(error, 'Error - restoreBrain');
    }
}

async function  defaultCompanyBrain(workspaceId, currentuser) {
    try {
        const data = {
            isShare: false,
            title: DEFAULT_NAME.BRAIN,
            workspaceId: workspaceId,
            slug: `${slugify(DEFAULT_NAME.BRAIN)}-${currentuser._id}`,
            isDefault: true,
            user: formatUser(currentuser),
            companyId: currentuser.company.id
        }

        const brains = await Brain.create(data);

        const shareData = {
            brain: formatBrain(brains),
            role: currentuser.roleCode,
            invitedBy: currentuser._id,
            user: formatUser(currentuser),
        }

        await ShareBrain.findOneAndUpdate({ 'brain.id': brains._id, 'user.id': currentuser._id }, shareData, { new: true, upsert: true });
        return brains;
    } catch (error) {
        handleError(error, 'Error - createBrain');
    }
}

async function defaultGeneralBrainMember(req,workspaceId, currentuser) {
    try {

        const data = {
            isShare:true,
            title:DEFAULT_NAME.GENERAL_BRAIN_TITLE,
            workspaceId: workspaceId,
            slug: DEFAULT_NAME.GENERAL_BRAIN_SLUG,
            shareWith:[formatUser(currentuser)],
        }
    

        const brains = await Brain.findOneAndUpdate(
            { slug: data.slug, workspaceId: data.workspaceId },
            {  
                isShare:true,
                title:DEFAULT_NAME.GENERAL_BRAIN_TITLE,
                workspaceId: workspaceId,
                slug: DEFAULT_NAME.GENERAL_BRAIN_SLUG
            },
            { new: true, upsert: true }
        );

        await ShareBrain.create({
            workspaceId,
            brain: {
                id: brains._id,
                name: brains.title,
                slug: brains.slug
            },
            user: {
                id: currentuser._id,
                fname: currentuser?.fname,
                lname: currentuser?.lname,
                email: currentuser.email,
                profile: currentuser?.profile
            },
            role: ROLE_TYPE.MEMBER,
            invitedBy: getCompanyId(currentuser),
            updatedBy: getCompanyId(currentuser)
        });
        

        // await shareBrainFormat(req, brains, true);

        // if(data?.shareWith){
        //     await addWorkSpaceUsers(data.shareWith, workspace, currentuser);
        // }
        if(data?.isShare){
            await Promise.all([
                data.slug === DEFAULT_NAME.GENERAL_BRAIN_SLUG ? addBrainChatMember(brains, data.shareWith, currentuser._id) : null,
            ].filter(Boolean));
        }

        return brains;

    } catch (error) {
        handleError(error, 'Error - defaultGeneralBrain');
    }
}
const workspaceWiseList = async (req) => {
    try {
        const shareBrain = await ShareBrain.find({ 'user.id': req.userId, archiveBy: { $exists: false }, deletedAt: { $exists: false } });
        if (!shareBrain.length) return false;

        const companyId = getCompanyId(req.user);
        const brains = await Brain.aggregate([
            {
                $match: {
                    companyId: companyId,
                    deletedAt: { $exists: false },
                    _id: { $in: shareBrain.filter(w => w?.brain?.id).map(w => w.brain.id) }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $group: {
                    _id: '$workspaceId',
                    brains: { $push: '$$ROOT' }
                }
            }
        ])
        return brains;
    } catch (error) {
        handleError(error, 'Error - workspaceWiseList');
    }
}

async function getDefaultBrain(user) {
    try {
        const title = user.isPrivateBrainVisible ? getDefaultBrainSlug(user) : slugify(DEFAULT_NAME.GENERAL_BRAIN_TITLE);
          
        const companyId = getCompanyId(user);
        const workspaceId = await Workspace.find({ 'company.id': companyId }, { _id: 1 }).sort({ createdAt: 1 }).limit(1);
        const defaultBrain = await Brain.findOne({ slug: title, workspaceId: workspaceId[0]._id,'user.id': user._id  }, { __v: 0, isActive: 0, isDefault: 0, updatedAt: 0 });
        return defaultBrain;
    } catch (error) {
        handleError(error, 'Error - getDefaultBrain');
    }
}

async function getGeneralBrain(user) {
    try {
        const companyId = getCompanyId(user);
        const workspaceId = await Workspace.find({ 'company.id': companyId }, { _id: 1 }).sort({ createdAt: 1 }).limit(1);
        const generalBrain = await Brain.findOne({ title: DEFAULT_NAME.GENERAL_BRAIN_TITLE, workspaceId: workspaceId[0]._id, 'user.id': user._id }, { __v: 0, isActive: 0, isDefault: 0, updatedAt: 0 });
        return generalBrain;
    } catch (error) {
        handleError(error, 'Error - getGeneralBrain');
    }
}

async function getShareBrains(req) {
    try {
        const shareBrains = await ShareBrain.find({ 'user.id': req.userId }, { brain: 1 });
        const brains = await Brain.find({ _id: { $in: shareBrains.filter(ele => ele?.brain?.id).map(ele => ele.brain.id) }, deletedAt: { $exists: false }, workspaceId: req.body.query.workspaceId }, { _id: 1, user: 1, title: 1, slug: 1 });
        // ⚠️ WARNING: This loop is temporary. It will be removed once the frontend is updated.
        const result = [];
        shareBrains.forEach((ele) => {
            const brain = brains.find((brain) => brain._id.toString() === ele?.brain?.id?.toString());
            if (brain) {
                result.push({
                    brain: { title: brain.title, slug: brain.slug, id: brain._id },
                    user: brain.user,
                    ...ele._doc
                });
            }
        });
        return result;
    } catch (error) {
        handleError(error, 'Error - getShareBrains');
    }
}

async function getBrainStatus(brains) {
    try {
        return Brain.find({ _id: { $in: brains.filter(ele => ele?.brain?.id).map(ele => ele.brain.id) } }, { _id: 1, isShare: 1 });
    } catch (error) {
        handleError(error, 'Error - getBrainStatus');
    }
}

const convertToShared = async (req) => {
    try {
        const { isPrivateBrainVisible } = req.user;
        const brainId = req.params.id;
        const { shareWith = [], teams = [], customInstruction } = req.body;

        if (!isPrivateBrainVisible) {
            throw new Error(_localize('module.unAuthorized', req, 'Brain'));
        }

        // Find the private brain and ensure ownership
        const existingBrain = await Brain.findOne({ 
            _id: brainId, 
            'user.id': req.userId,
            isShare: false 
        });

        if (!existingBrain) {
            throw new Error(_localize('module.notFound', req, 'Brain'));
        }

        // Check workspace access
        const accessOfWorkspace = await accessOfWorkspaceToUser({
            workspaceId: existingBrain.workspaceId, 
            userId: req.user.id
        });
        
        if (!accessOfWorkspace) {
            throw new Error(_localize('module.unAuthorized', req, 'Brain'));
        }

        // Convert to shared brain
        const updateData = {
            isShare: true,
            ...(customInstruction !== undefined && { customInstruction })
        };

        const updatedBrain = await Brain.findOneAndUpdate(
            { _id: brainId },
            updateData,
            { new: true }
        );

        // Handle owner's share record - ensure owner has access
        await shareBrainFormat(req, updatedBrain);

        // Add members if provided
        if (shareWith.length > 0) {
            await Promise.all([
                shareBrainWithUser(shareWith, updatedBrain, req),
                addWorkSpaceUsers(shareWith, { _id: updatedBrain.workspaceId }, req.user)
            ]);
        }

        // Add teams if provided
        if (teams.length > 0) {
            const workspace = await Workspace.findById(updatedBrain.workspaceId);
            await Promise.all([
                addWorkSpaceTeam(teams, workspace, req.user),
                addShareBrainTeam(teams, updatedBrain, req.user),
                addBrainChatMember(updatedBrain, teams, req.user.id, true)
            ]);
        }

        return updatedBrain;
    } catch (error) {
        handleError(error, 'Error - convertToShared');
    }
};

module.exports = {
    createBrain,
    updateBrain,
    deleteBrain,
    getAll,
    getBrain,
    partialUpdate,
    shareBrainWithUser,
    unShareBrainUser,
    shareBrainDocs,
    shareBrainList,
    getAllBrainUser,
    restoreBrain,
    deleteAllBrain,
    createDefaultBrain,
    defaultCompanyBrain,
    workspaceWiseList,
    getDefaultBrain,
    getShareBrains,
    getBrainStatus,
    getGeneralBrain,
    defaultGeneralBrainMember,
    convertToShared,

}