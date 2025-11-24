const logger = require("../utils/logger");
const dbService = require("../utils/dbService");
const teamUser = require("../models/teamUser");
const { getCompanyId, formatBrain, formatUser, getRandomCharacter } = require("../utils/helper");
const { ROLE_TYPE, NOTIFICATION_TYPE, DEFAULT_NAME } = require("../config/constants/common");
const WorkSpaceUser = require("../models/workspaceuser");
const { sendCommonNotification } = require("./notification");
const { addBrainChatMember } = require("./chatmember");
const shareBrain = require("../models/shareBrain");
const workspace = require("../models/workspace");
const brain = require("../models/brains");
const Chat = require("../models/chat");
const Chatmember = require("../models/chatmember");
const { accessOfBrainToUser, accessOfWorkspaceToUser } = require("./common");
const { ObjectId } = require("mongoose").Types;
const Brain = require("../models/brains");

const getAll = async (req) => {
    try {
        return dbService.getAllDocuments(
            teamUser,
            req.body.query || {},
            req.body.options || {}
        );
    } catch (error) {
        handleError(error, 'Error in the getAll');
    }
};

const addTeam = async (req) => {
    try {
        const { teamName, members } = req.body;
        const companyId = getCompanyId(req.user);

        const existing = await teamUser.findOne({
            teamName,
            companyId,
        });

        if (existing)
            throw new Error(
                _localize("module.alreadyExists", req, "team name")
            );

        return teamUser.create({
            teamName,
            teamUsers: members,
            companyId,
        });
    } catch (error) {
        handleError(error, 'Error in the addTeam');
    }
};

const updateTeam = async (req) => {
    try {
        const companyId = getCompanyId(req.user);
        const { teamName, members, teamId } = req.body;

        const existingTeam = await teamUser.findById(teamId);
        if (!existingTeam)
            throw new Error(_localize("module.notFound", req, "team"));

        const currentMemberIds = existingTeam.teamUsers.map((m) =>
            m?.id?.toString()
        );
        const updatedMemberIds = members.map((m) => m.id?.toString());

        const membersToRemove = currentMemberIds.filter(
            (id) => !updatedMemberIds.includes(id)
        );
        const membersToAdd = updatedMemberIds.filter(
            (id) => !currentMemberIds.includes(id)
        );

        const operations = [];

        
        if (teamName && existingTeam.name!=teamName ) {
            
            const sameNameTeam=await teamUser.find({teamName,_id:{$ne:existingTeam._id}})
            
            if(sameNameTeam.length>0){
                throw new Error(
                    _localize("module.alreadyExists", req, "team name")
                );
            }else{

                await teamUser.updateOne({ _id: existingTeam._id}, { $set: {teamName, updatedBy: companyId}})
            }
        }

        membersToAdd.forEach((id) => {
            const newMember = members.find((m) => m.id?.toString() === id);
            if (newMember) {
                operations.push({
                    updateOne: {
                        filter: { _id: existingTeam._id, "teamUsers.id":{$ne:newMember.id} },
                        update: { $addToSet: { teamUsers: newMember } },
                    },
                });
            }
        });

        membersToRemove.forEach((id) => {
            operations.push({
                updateOne: {
                    filter: { _id: existingTeam._id },
                    update: { $pull: { teamUsers: { id } } },
                },
            });
        });

        if (operations.length) await teamUser.bulkWrite(operations);

        const [teamExistsWorkspaces, teamExistsBrains, teamExistsChats] =
            await Promise.all([
                workspace.find({ "teams.id": teamId }),
                brain.find({ "teams.id": teamId }),
                Chat.find({ teams: teamId }),
            ]);

        // Add new user to the team
        const newAddedUsers = members.filter((m) =>
            membersToAdd.includes(m.id?.toString())
        );
        if (newAddedUsers.length > 0) {
            const addTeamData = {
                id: existingTeam._id,
                teamUsers: newAddedUsers,
                teamName: existingTeam.teamName,
            };

            await Promise.all([
                ...teamExistsWorkspaces.map((w) =>
                    addWorkSpaceTeam([addTeamData], w, req.user)
                ),
                ...teamExistsBrains.map((b) =>
                    addShareBrainTeam([addTeamData], b, req.user)
                ),
                ...teamExistsChats.map((c) =>
                    addShareChatTeam([addTeamData], c, req.user)
                ),
            ]);
        }

        // Remove user from the team
        const newRemovedUsers = existingTeam.teamUsers.filter((m) =>
            membersToRemove.includes(m.id?.toString())
        );
        if (newRemovedUsers.length > 0) {
            const removedUserIds = newRemovedUsers.map((user) =>
                user.id?.toString()
            );

            await Promise.all([
                teamExistsWorkspaces.length > 0 &&
                    WorkSpaceUser.deleteMany({
                        workspaceId: {
                            $in: teamExistsWorkspaces.map((w) => w._id),
                        },
                        companyId,
                        teamId,
                        "user.id": { $in: removedUserIds },
                    }),

                teamExistsBrains.length > 0 &&
                    shareBrain.deleteMany({
                        "brain.id": { $in: teamExistsBrains.map((b) => b._id) },
                        teamId,
                        "user.id": { $in: removedUserIds },
                    }),

                teamExistsChats.length > 0 &&
                    Chatmember.deleteMany({
                        chatId: { $in: teamExistsChats.map((c) => c._id) },
                        teamId,
                        "user.id": { $in: removedUserIds },
                        deletedAt: { $exists: false },
                    }),
            ]);
        }

        return true;
    } catch (error) {
        handleError(error, 'Error in the updateTeam');
       
    }
};


const deleteTeam = async (req) => {
    try {
        const { id: teamId } = req.params;
        const { allWorkspaceList } = req.body;
        const companyId = getCompanyId(req.user);

        await Promise.all([
            workspace
                .updateMany(
                    { "teams.id": teamId, _id: { $in: allWorkspaceList } },
                    { $pull: { teams: { id: teamId } } }
                )
                .catch((e) => console.error("Error updating workspace:", e)),

            WorkSpaceUser.deleteMany({
                ...(companyId && { companyId }),
                ...(allWorkspaceList && {
                    workspaceId: { $in: allWorkspaceList },
                }),
                teamId,
            }).catch((e) =>
                console.error("Error deleting workspace users:", e)
            ),

            brain
                .updateMany(
                    {
                        "teams.id": teamId,
                        companyId,
                        workspaceId: { $in: allWorkspaceList },
                    },
                    { $pull: { teams: { id: teamId } } }
                )
                .catch((e) => console.error("Error updating brain:", e)),

            shareBrain
                .deleteMany({ teamId })
                .catch((e) =>
                    console.error("Error deleting shared brain records:", e)
                ),

            Chat.updateMany(
                { teams: teamId },
                { $pull: { teams: teamId } }
            ).catch((e) => console.error("Error updating chat:", e)),

            Chatmember.deleteMany({
                teamId,
                deletedAt: { $exists: false },
            }).catch((e) =>
                console.error("Error deleting chat member records:", e)
            ),

            teamUser
                .deleteOne({ _id: teamId })
                .catch((e) => console.error("Error deleting team user:", e)),
        ]);
        

       
        return true;
    } catch (error) {
        handleError(error, 'Error in the deleteTeam');
    }
};

const addWorkSpaceTeam = async (teams, existingWorkspace, requestUser) => {
    try {
        const teamWorkspaceDetails = teams?.reduce((acc, currTeam) => {
            const teamExist = existingWorkspace?.teams?.some(
                (currWorkspaceTeam) =>
                    currTeam?.id?.toString() === currWorkspaceTeam?.id?._id?.toString()
            );
            if (!teamExist)
                acc.push({ teamName: currTeam.teamName, id: currTeam.id });

            return acc;
        }, []);

        await workspace.updateOne(
            { _id: existingWorkspace._id },
            { $addToSet: { teams: { $each: teamWorkspaceDetails } } }
        );

        const findWorkspaceUsers = await WorkSpaceUser.find({
            companyId: getCompanyId(requestUser),
            workspaceId: existingWorkspace._id,
            teamId: { $exists: true },
            teamId: { $in: teams.map((currTeam) => currTeam.id) },
        });

        const newUsers = [];

        const operations = teams.flatMap((team) =>
            team?.teamUsers?.map((teamUser) => {
                const check = findWorkspaceUsers.find(
                    (el) =>
                        el.user.id?.toString() === teamUser?.id?.toString() &&
                        el?.teamId?.toString() === team?.id?.toString()
                );

                const userData = {
                    teamId: team.id,
                    user: formatUser(teamUser),
                    workspaceId: existingWorkspace._id,
                    companyId: getCompanyId(requestUser),
                };

                if (check) {
                    return {
                        updateOne: {
                            filter: {
                                _id: check._id,
                                companyId: getCompanyId(requestUser),
                                workspaceId: existingWorkspace._id,
                                teamId: team.id,
                            },
                            update: { $set: userData },
                        },
                    };
                } else {
                    if(!existingWorkspace?.deletedAt){
                        newUsers.push({ id: teamUser.id });
                    }
                    return {
                        insertOne: {
                            document: userData,
                        },
                    };
                }
            })
        );

      
         // Find or create general brain for the workspace
         let brains = await Brain.findOne({
            workspaceId: existingWorkspace._id,
            title: DEFAULT_NAME.GENERAL_BRAIN_TITLE,
        });
        
        if (!brains) {
            const brainData = {
                workspaceId: existingWorkspace._id,
                title: DEFAULT_NAME.GENERAL_BRAIN_TITLE,
                isShare: true,
                slug: DEFAULT_NAME.GENERAL_BRAIN_SLUG,
                companyId: getCompanyId(requestUser),
                createdBy: requestUser.id,
                charimg : getRandomCharacter().image
            };

            // Only add teams if there are any teamWorkspaceDetails
            if (teamWorkspaceDetails?.length > 0) {
                brainData.teams = teamWorkspaceDetails;
            }

            brains = await Brain.create(brainData);
        }
      

        addShareBrainTeam(teams, brains, requestUser);
        addBrainChatMember(brains, teams, requestUser?.id, true);
      
        // Send a notification for new users added to the workspace (asynchronous operation)
        sendCommonNotification(
            NOTIFICATION_TYPE.WORKSPACE_INVITATION,
            newUsers,
            requestUser,
            {
                workspace: existingWorkspace.title,
                workspaceId: existingWorkspace._id,
            }
        );

        return await WorkSpaceUser.bulkWrite(operations);
    } catch (error) {
        handleError(error, 'Error in the addWorkSpaceTeam');
    }
};

//to add shared team users to sharebrain table
const addShareBrainTeam = async (teams, existingBrain, requestUser) => {
    try {
        const teamBrainDetails = teams?.reduce((acc, currTeam) => {
            const teamExist = existingBrain?.teams?.some(
                (currBrainTeam) =>
                    currTeam.id?.toString() === currBrainTeam.id?._id?.toString()
            );
            if (!teamExist)
                acc.push({ teamName: currTeam.teamName, id: currTeam.id });

            return acc;
        }, []);

        //added the teams to brain
        await brain.updateOne(
            { _id: existingBrain._id, companyId: getCompanyId(requestUser) },
            { $addToSet: { teams: { $each: teamBrainDetails } } }
        );

        const brains = await shareBrain.find({
            "brain.id": existingBrain._id,
            teamId: { $in: teams.map((currTeam) => currTeam.id) },
        });
        const newUsers = [];

        const operations = teams.flatMap((team) => {
            const teamUsers = team.teamUsers || [];
            return teamUsers.map((user) => {
                const check = brains.find(
                    (br) =>
                        br.user.email === user.email &&
                        br.teamId?.toString() === team.id?.toString()
                );
                const userData = {
                    brain: formatBrain(existingBrain),
                    invitedBy: getCompanyId(requestUser),
                    user: formatUser(user),
                    role: ROLE_TYPE.MEMBER,
                    teamId: team.id,
                };

                if (check) {
                    return {
                        updateOne: {
                            filter: {
                                "user.email": user.email,
                                "brain.id": existingBrain._id,
                                teamId: team.id,
                            },
                            update: { $set: userData },
                        },
                    };
                } else {
                    if(existingBrain?.deletedAt){
                        newUsers.push({ id: user.id, teamId: team.id });
                    }
                    return {
                        insertOne: {
                            document: userData,
                        },
                    };
                }
            });
        });

        // ⚠️ WARNING: Do not use await with sendCommonNotification().
        // This function should be called in the background without blocking the main thread.
        sendCommonNotification(
            NOTIFICATION_TYPE.BRAIN_INVITATION,
            newUsers,
            requestUser,
            { brain: existingBrain.title, brainId: existingBrain._id }
        );

        return await shareBrain.bulkWrite(operations);
    } catch (error) {
        handleError(error, 'Error in the addShareBrainTeam');
    }
};

const addShareChatTeam = async (teams, existingChat, requestUser) => {
    try {
        const teamChatDetails = teams?.reduce((acc, currTeam) => {
            const teamExist = existingChat?.teams?.some(
                (currChatTeam) =>
                    currTeam.id?.toString() === currChatTeam?._id?.toString()
            );
            if (!teamExist)
                acc.push({ teamName: currTeam.teamName, id: currTeam.id });

            return acc;
        }, []);

        //added the teams to brain
        await Chat.updateOne(
            { _id: existingChat._id, companyId: getCompanyId(requestUser) },
            { $addToSet: { teams: { $each: teamChatDetails } } }
        );

        const findChat = await Chatmember.find({
            chatId: existingChat._id,
            teamId: { $in: teams.map((curr) => curr.id) },
        });

        const newUser = [];
        const operations = teams.flatMap((currTeam) => {
            const teamUsers = currTeam.teamUsers || [];

            return teamUsers.map((currUser) => {
                const check = findChat.find(
                    (currChat) =>
                        currChat.user.id?.toString() == currUser.id?.toString() &&
                        currChat.teamId?.toString() == currTeam.id?.toString()
                );

                const chatObj = {
                    user: formatUser(currUser),
                    brain: formatBrain(existingChat.brain),
                    chatId: existingChat._id,
                    invitedBy: requestUser.id,
                    isShare: existingChat.isShare,
                    isNewChat: existingChat.isNewChat,
                    teamId: currTeam.id,
                    title: existingChat.name,
                };

                if (check) {
                    return {
                        updateOne: {
                            filter: {
                                "user.id": currUser.id,
                                "brain.id": existingChat?.brain?.id,
                                teamId: currTeam.id,
                            },
                            update: { $set: chatObj },
                        },
                    };
                } else {
                    newUser.push({ id: currUser.id });
                    return {
                        insertOne: {
                            document: chatObj,
                        },
                    };
                }
            });
        });

        sendCommonNotification(
            NOTIFICATION_TYPE.CHAT_INVITATION,
            newUser,
            requestUser,
            { chat: existingChat?.title, chatId: existingChat._id }
        );

        return await Chatmember.bulkWrite(operations);
    } catch (error) {
        handleError(error, 'Error in the addShareChatTeam');
    }
};

//added list of brain team
const shareBrainList = async (req) => {
    try {
        //if workspaceUser true give teams list of that workspace

        if (req.body.query?.workspaceId) {
            return (
                (await workspace.findOne({
                    teams: { $exists: true },
                    _id: ObjectId.createFromHexString(
                        req.body.query.workspaceId
                    ),
                })) || {}
            );
        }
        //else if brainUser true give teams list of that brin
        else if (req.body.query?.["brain.id"]) {
            return (
                (await brain.findOne({
                    teams: { $exists: true },
                    _id: ObjectId.createFromHexString(
                        req.body.query["brain.id"]
                    ),
                })) || {}
            );
        }
        //else if chat true give teams list of that chat
        else if (req.body.query?.chatId) {
            return (
                (await Chat.findOne({
                    _id: ObjectId.createFromHexString(req.body.query.chatId),
                    teams: { $exists: true },
                })) || {}
            );
        }

        return true;
    } catch (error) {
        handleError(error, 'Error in the shareBrainList');
    }
};

//update the brain workspace
const updateShareTeamToWorkspace = async (req) => {
    try {
        const { id: workspaceId } = req.params;

        const { title, teams, companyId } = req.body;

        const  accessOfWorkspace = await accessOfWorkspaceToUser({workspaceId , userId : req.user.id})
        
        if(!accessOfWorkspace){  
            throw new Error(_localize('module.unAuthorized', req,'Workspace'))
        }

        const existingWorkspace = await workspace.findOne({ _id: workspaceId });
        if (!existingWorkspace) return false;

        //add in workspaceUser table for workspace
        return addWorkSpaceTeam(teams, existingWorkspace, req.user);
    } catch (error) {
        handleError(error, 'Error in the updateShareTeamToWorkspace');
    }
};

//update the brain teams
const updateShareTeamToBrain = async (req) => {
    try {
        const { id: brainId } = req.params;
        const { title, workspaceId, teams } = req.body;
        const companyId = getCompanyId(req.user);

        const accessShareBrain=await accessOfBrainToUser({brainId,userId:req.user.id})
       
        if(!accessShareBrain){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }
        

        if(!accessShareBrain){
            throw new Error(_localize('module.unAuthorized', req,'Brain'))
        }

        const [existingBrain, existingWorkspace] = await Promise.all([
            brain.findOne({ _id: brainId, companyId }),
            workspace.findOne({ _id: workspaceId }),
        ]);

        if (!existingBrain || !existingWorkspace) return false;

        await Promise.all([
            // Add workspaceUser table for workspace
            addWorkSpaceTeam(teams, existingWorkspace, req.user),

            // Add in the shareBrain table
            addShareBrainTeam(teams, existingBrain, req.user),

            // Add in chatMember table for brain
            addBrainChatMember(existingBrain, teams, req.user?.id, true),
        ]);

        return true;
    } catch (error) {
        handleError(error, 'Error in the updateShareTeamToBrain');
    }
};

// HARD_DELETE: workspace team delete
const deleteShareTeamToWorkspace = async (req) => {
    try {
        const { id: teamId } = req.params;

        const { companyId, workspaceId, sharedBrains } = req.body;

        const brainIds = sharedBrains.map((curr) => curr._id);

        const existingWorkspace = await workspace.findOne({ _id: workspaceId });
        if (!existingWorkspace) {
            logger.warn("No Workspace found");
            return false;
        }

        await Promise.all([
            // Update the workspace by pulling the team
            workspace.updateOne(
                {
                    "teams.id": teamId,
                    ...(workspaceId && { _id: workspaceId }),
                },
                { $pull: { teams: { id: teamId } } }
            ),

            // Delete workspace users associated with the team
            WorkSpaceUser.deleteMany({
                ...(companyId && { companyId }),
                ...(workspaceId && { workspaceId }),
                teamId,
            }),

            // Update the brain documents by pulling the team
            brain.updateMany(
                {
                    "teams.id": teamId,
                    companyId,
                    workspaceId,
                    _id: { $in: brainIds },
                },
                { $pull: { teams: { id: teamId } } }
            ),

            // Delete shared brain records associated with the team
            shareBrain.deleteMany({ teamId, "brain.id": { $in: brainIds } }),

            // Update the chat documents by pulling the team
            Chat.updateMany(
                {
                    teams: teamId,
                    "brain.id": { $in: brainIds },
                },
                {
                    $pull: { teams: teamId },
                }
            ),

            // Delete chat member records associated with the team
            Chatmember.deleteMany({
                teamId,
                "brain.id": { $in: brainIds },
                deletedAt: { $exists: false },
            }),
        ]);

        return true
    } catch (error) {
        handleError(error, 'Error in the deleteShareTeamToWorkspace');
    }
};

// HARD_DELETE: brain-team,shareBrain user delete
const deleteShareTeamToBrain = async (req) => {
    try {
        const { id: teamId } = req.params;
        const { companyId, workspaceId, brainId } = req.body;

        // Step 1: Check if the brain exists
        const existingBrain = await brain.findOne({ _id: brainId });
        if (!existingBrain) {
            logger.warn("No brain found");
            return false;
        }

        // Step 2: Run all operations concurrently using Promise.all
        await Promise.all([
            // Update brain by pulling the team
            brain.updateOne(
                { "teams.id": teamId, _id: brainId },
                { $pull: { teams: { id: teamId } } }
            ),

            // Delete shared brain records associated with the team
            shareBrain.deleteMany({ teamId, "brain.id": brainId }),

            // Update the chat documents by pulling the team
            Chat.updateMany(
                {
                    "brain.id": brainId,
                    teams: teamId,
                },
                {
                    $pull: { teams: teamId },
                }
            ),

            // Delete chat member records associated with the team
            Chatmember.deleteMany({
                teamId,
                "brain.id": brainId,
                deletedAt: { $exists: false },
            }),
        ]);

        return true;
    } catch (error) {
        handleError(error, 'Error in the deleteShareTeamToBrain');
    }
};

// delete team from chat
const deleteShareTeamToChat = async (req) => {
    try {
        const { id: teamId } = req.params;
        const { companyId, workspaceId, brainId, chatId } = req.body;


        const existingBrain = await Chat.findOne({
            _id: ObjectId.createFromHexString(chatId),
            "brain.id": brainId,
        });
        if (!existingBrain) {
            logger.warn("No chat found");
            return false;
        }

        //chat member table delete
        await Chatmember.deleteMany({
            teamId,
            chatId,
            "brain.id": brainId,
            deletedAt: { $exists: false },
        });

        //chat table team delete
        await Chat.updateOne(
            {
                _id: chatId,
                "brain.id": brainId,
                teams: teamId,
            },
            {
                $pull: { teams: teamId },
            }
        );

        return true;
    } catch (error) {
        handleError(error, 'Error in the deleteShareTeamToChat');
    }
};
module.exports = {
    getAll,
    addTeam,
    updateTeam,
    deleteTeam,
    shareBrainList,
    updateShareTeamToWorkspace,
    updateShareTeamToBrain,
    deleteShareTeamToWorkspace,
    deleteShareTeamToBrain,
    deleteShareTeamToChat,
    addWorkSpaceTeam,
    addShareBrainTeam,
};
