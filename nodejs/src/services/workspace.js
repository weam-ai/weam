const WorkSpace = require("../models/workspace");
const dbService = require("../utils/dbService");
const WorkSpaceUser = require("../models/workspaceuser");
const { formatUser, getCompanyId, formatBrain, slugify, getRandomCharacter } = require("../utils/helper");
const { ROLE_TYPE, NOTIFICATION_TYPE, DEFAULT_NAME } = require("../config/constants/common");
const { sendCommonNotification } = require("./notification");
const { addWorkSpaceTeam } = require("./teamMember");
const { accessOfWorkspaceToUser } = require("./common");
const Brain = require('../models/brains');
const ShareBrain = require("../models/shareBrain");

const addWorkSpace = async (req) => {
    const { createDefaultBrain } = require("./brain");
    try {
        const existing = await WorkSpace.findOne({
            slug: slugify(req.body.title),
            "company.id": req.user.company.id,
        });

        if (existing)
            throw new Error(
                _localize(
                    "module.alreadyExists",
                    req,
                    req.body.title + " Workspace"
                )
            );

        const workspaceData = {
            ...req.body,
            slug: slugify(req.body.title),
            company: { ...req.user.company },
            createdBy: req.userId,
        };

        const createdWorkspace = await dbService.createDocument(
            WorkSpace,
            workspaceData
        );
        // add company inside workspace user with role

        const users = [
            {
                fname: req?.user?.fname,
                lname: req?.user?.lname,
                email: req.user.email,
                id: req.userId.toString(),
                roleCode: ROLE_TYPE.ADMIN,
            },
        ];
        if (req.body?.users?.length) users.push(...req.body.users);
        await Promise.any([
            addWorkSpaceUsers(users, createdWorkspace, req.user),
            createDefaultBrain(req, createdWorkspace._id, req.user),
            addWorkSpaceTeam(req.body.teams, createdWorkspace, req.user)
        ]);
        

        return createdWorkspace;
    } catch (error) {
        handleError(error, "Error - addWorkSpace");
    }
};

const checkWorkSpace = async (req) => {
    const result = await WorkSpace.findOne({
        slug: slugify(req.params.slug),
        "company.id": req.user.company.id,
    });

    if (!result) return false;
    return result;
};

const updateWorkSpace = async (req) => {
    try {
        // await checkWorkSpace(req);

        const  accessOfWorkspace =  await accessOfWorkspaceToUser({workspaceId : req.body.id, userId : req.user.id})
        
        if(!accessOfWorkspace){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }
        
        const existing = await WorkSpace.countDocuments({
            slug: slugify(req.body.title),
            "company.id": req.user.company.id,
            _id: { $ne: req.body.id },
        });

        if (existing > 0)
            throw new Error(
                _localize(
                    "module.alreadyExists",
                    req,
                    req.body.title + " Workspace"
                )
            );

        return WorkSpace.findOneAndUpdate(
            { _id: req.body.id, "company.id": req.user.company.id },
            { slug: slugify(req.body.title), title: req.body.title },
            { new: true }
        );
    } catch (error) {
        handleError(error, "Error - updateWorkSpace");
    }
};

const getWorkSpace = async (req) => {
    try {
        return checkWorkSpace(req);
    } catch (error) {
        handleError(error, "Error - getWorkSpace");
    }
};

const deleteWorkSpace = async (req) => {
    try {
       const workspaceDetails= await checkWorkSpace(req);

        const  accessOfWorkspace = await accessOfWorkspaceToUser({workspaceId:workspaceDetails._id , userId : req.user.id})
        
        if(!accessOfWorkspace){  
            throw new Error(_localize('module.unAuthorized', req,'Workspace'))
        }

        if (req.body.isHardDelete)
            return WorkSpace.deleteOne({
                slug: req.params.slug,
                "company.id": req.user.company.id,
            });
        else
            return WorkSpace.updateOne(
                { slug: req.params.slug, "company.id": req.user.company.id },
                { $set: { deletedAt: new Date() } }
            );
    } catch (error) {
        handleError(error, "Error - deleteWorkSpace");
    }
};

const deleteAllWorkSpace = async (req) => {
    try {
        return WorkSpace.deleteMany({
            "company.slug": req.body.companyId,
            "company.id": req.user.company.id,
            deletedAt: { $exists: true },
        });
    } catch (error) {
        handleError(error, "Error - deleteWorkSpace");
    }
};

const getAllWorkSpace = async (req) => {
    try {
        const { options = {}, query = {} } = req.body || {};
        const assignWorkspace = await WorkSpaceUser.find({
            "user.id": req.userId,
        });
        query["_id"] = { $in: assignWorkspace.map((w) => w.workspaceId) };
        const data = await dbService.getAllDocuments(
            WorkSpace,
            query,
            options,
            false
        );
        const result = data.data.map((wspace) => ({
            ...wspace._doc,
            role: assignWorkspace.find(aw => wspace._id?.toString() === aw.workspaceId?.toString()).role
        }));
        return {
            data: result,
            paginator: data.paginator,
        };
    } catch (error) {
        handleError(error, "Error - getAllWorkSpace");
    }
};

const partialUpdate = async (req) => {
    try {
        return WorkSpace.findOneAndUpdate({ slug: req.params.slug }, req.body, {
            new: true,
        }).select("isActive");
    } catch (error) {
        handleError(error, "Error - partialUpdate");
    }
};

const addWorkSpaceUsers = async (users, workspace, requestUser) => {
    try {

        
        const findWorkspaceUsers = await WorkSpaceUser.find({
            workspaceId: workspace._id, teamId:{$exists:false}
        });
        const newUsers = [];
        const operations = users.map((user) => {
            const check = findWorkspaceUsers.find(
                (el) => el.user.email === user.email
            );
            const data = {
                user: formatUser(user),
                role: user.roleCode,
                workspaceId: workspace._id,
                companyId: requestUser.company.id,
            };
            const userData = { ...data };
            if (check) {
                return {
                    updateOne: {
                        filter: { _id: check._id , teamId:{$exists:false} },
                        update: { $set: userData },
                    },
                };
            } else {
                newUsers.push({ id: user.id });
                return {
                    insertOne: {
                        document: userData,
                    },
                };
            }
        });
        // ⚠️ WARNING: Do not use await with sendCommonNotification().
        // This function should be called in the background without blocking the main thread.
        sendCommonNotification(
            NOTIFICATION_TYPE.WORKSPACE_INVITATION,
            newUsers,
            requestUser,
            { workspace: workspace.title, workspaceId: workspace._id }
        );
        return await WorkSpaceUser.bulkWrite(operations);
    } catch (error) {
        handleError(error, "Error - addWorkSpaceUsers");
    }
};

const addDefaultWorkSpace = async (company, user) => {
    try {

        const workspaceData = {
            title: company.companyNm,
            slug: slugify(company.companyNm),
            company: {
                name: company.companyNm,
                slug: company.slug,
                id: company._id,
            },
            "isActive" : true,
            "createdBy" : user._id,
            "isDefault" : true
        }
        
        const createdWorkspace = await dbService.createDocument(WorkSpace, workspaceData);

         //create general brain
         const generalBrain = await Brain.create({
            title: DEFAULT_NAME.GENERAL_BRAIN_TITLE,
            slug: slugify(DEFAULT_NAME.GENERAL_BRAIN_TITLE),
            workspaceId: createdWorkspace._id,
            companyId:company._id,
            isShare:true,
            user:formatUser(user),
            charimg: getRandomCharacter().image
        });

        const generalBrainData = {
            title: generalBrain.title,
            slug: generalBrain.slug,
            id: generalBrain._id,
        }

        //create record in sharebrain
        await ShareBrain.create({
            brain:generalBrainData,
            role:ROLE_TYPE.OWNER,
            invitedBy:user._id,
            user:formatUser(user),
            charimg: getRandomCharacter().image
        })
        
        addWorkSpaceDefaultUser(user);
        
        return createdWorkspace;
    } catch (error) {
        handleError(error, "Error - addWorkSpace");
    }
};

const addWorkSpaceDefaultUser = async (currentuser) => {
    const companyId = getCompanyId(currentuser);
    const result = await getDefaultWorkSpace(companyId);
    
    if (!result) return false;

    const workspaceuser = {
        workspaceId: result._id,
        companyId: companyId,
        user: formatUser(currentuser),
        role: currentuser?.roleCode === ROLE_TYPE.COMPANY ? ROLE_TYPE.ADMIN : currentuser?.roleCode,
    };

    WorkSpaceUser.create(workspaceuser);
    return result;
}

const restoreWorkspace = async (req) => {
    try {
        const query = { slug: req.params.slug };
        const existing = await WorkSpace.findOne(query);
        if (!existing) false;
        return WorkSpace.updateOne(query, { $unset: { deletedAt: 1 } });
    } catch (error) {
        handleError(error, "Error - restoreWorkspace");
    }
};

const getDefaultWorkSpace = async (companyId) => {
    try {
        const query = { "company.id": companyId, isDefault: true };
        const existing = await WorkSpace.findOne(query).select(
            "_id title slug"
        );
        if (!existing) false;

        return existing;
    } catch (error) {
        handleError(error, "Error - defaultWorkspace");
    }
};

async function socketWorkSpaceList(filter) {
    try {
        const assignWorkspace = await WorkSpaceUser.find({ 'user.id': filter.userId }).lean();
        const query = { _id: { $in: assignWorkspace.map((w) => w.workspaceId) } };
        const workspaceList = await WorkSpace.find(query).lean();
        const result = workspaceList.map((wspace) => ({
            ...wspace,
            role: assignWorkspace.find(aw => wspace._id?.toString() === aw.workspaceId?.toString()).role
        }));
        return result;
    } catch (error) {
        handleError(error, 'Error - socketWorkSpaceList');
    }
};

module.exports = {
    addWorkSpace,
    updateWorkSpace,
    partialUpdate,
    getAllWorkSpace,
    getWorkSpace,
    deleteWorkSpace,
    addWorkSpaceUsers,
    restoreWorkspace,
    deleteAllWorkSpace,
    addWorkSpaceDefaultUser,
    getDefaultWorkSpace,
    addDefaultWorkSpace,
    socketWorkSpaceList
};
