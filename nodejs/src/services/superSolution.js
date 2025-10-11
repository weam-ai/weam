const SolutionApp = require('../models/solutionApp');
const SolutionMember = require('../models/solutionMember');
const { handleError } = require('../utils/helper');
const dbService = require('../utils/dbService');
const mongoose = require('mongoose');

const getAllSolutionApps = async (req) => {
    try {
        const solutionApps = await SolutionApp.find().sort({ sequence: 1 });
        return { data: solutionApps };
    } catch (error) {
        handleError(error, 'Error in getAllSolutionApps');
    }
};

const addSolutionMember = async (req) => {
    try {
        const { members, appId } = req.body;

        const payload = members.map((member) => ({
            appId,
            user: member,
            invitedBy: req.user._id,
            invitedAt: new Date(),
        }));

        const bulkUpdate = payload.map((member) => {
            return {
                updateOne: {
                    filter: {
                        appId: member.appId,
                        user: { id: member.user.id },
                    },
                    update: member,
                    upsert: true,
                },
            };
        });

        const solutionMember = await SolutionMember.bulkWrite(bulkUpdate);
        return solutionMember;
    } catch (error) {
        handleError(error, 'Error in addSolutionMember');
    }
};

const getSolutionMember = async (req) => {
    try {
        const { appId } = req.body;
        const solutionMember = await SolutionMember.find({
            appId,
            team: { $exists: false },
        });
        return { data: solutionMember };
    } catch (error) {
        handleError(error, 'Error in getSolutionMember');
    }
};

const removeSolutionMember = async (req) => {
    try {
        const { appId, memberIds } = req.body;

        const solutionMember = await SolutionMember.deleteMany({
            appId,
            'user.id': { $in: memberIds },
        });
        return solutionMember;
    } catch (error) {
        handleError(error, 'Error in removeSolutionMember');
    }
};

// Solution Teams Services

const getSolutionTeam = async (req) => {
    try {
        const { appId } = req.body;

        
        const teamsWithMemberCount = await SolutionMember.aggregate([
            {
                $match: {
                    appId: new mongoose.Types.ObjectId(appId),
                    team: { $exists: true },
                },
            },
            {
                $group: {
                    _id: {
                        teamId: '$team.id',
                        teamName: '$team.teamName',
                    },
                    memberCount: { $sum: 1 },
                    // members: { $push: "$$ROOT" }
                },
            },
            {
                $project: {
                    _id: 0,
                    team: {
                        id: '$_id.teamId',
                        teamName: '$_id.teamName',
                    },
                    memberCount: 1,
                    // members: 1
                },
            },
            {
                $sort: { 'team.teamName': 1 },
            },
        ]);

        return { data: teamsWithMemberCount };
    } catch (error) {
        handleError(error, 'Error in getSolutionTeam');
    }
};

const addSolutionTeam = async (req) => {
    try {
        const { teams, appId } = req.body;

        // Create individual SolutionMember records for each user in each team
        const memberPayload = [];

        for (const currentTeam of teams) {
            // Since teams already contain teamUsers array, we can use it directly
            if (currentTeam.teamUsers && currentTeam.teamUsers.length > 0) {
                // Create a SolutionMember record for each user in the team
                currentTeam.teamUsers.forEach((currentTeamUser) => {
                    memberPayload.push({
                        appId,
                        user: currentTeamUser,
                        team: {
                            teamName: currentTeam.teamName,
                            id: currentTeam.id,
                        },
                        invitedBy: req.user._id,
                        invitedAt: new Date(),
                    });
                });
            }
        }

        // Bulk insert SolutionMember records
        if (memberPayload.length > 0) {
            const memberBulkUpdate = memberPayload.map((member) => {
                return {
                    updateOne: {
                        filter: {
                            appId: member.appId,
                            'user.id': member.user.id,
                            'team.id': member.team.id,
                        },
                        update: member,
                        upsert: true,
                    },
                };
            });

            const result = await SolutionMember.bulkWrite(memberBulkUpdate);
            return result;
        }

        return { message: 'No team members found' };
    } catch (error) {
        handleError(error, 'Error in addSolutionTeam');
    }
};

const removeSolutionTeam = async (req) => {
    try {
        const { appId, teamId } = req.body;

        const solutionTeam = await SolutionMember.deleteMany({
            appId,
            'team.id': teamId,
        });
        return solutionTeam;
    } catch (error) {
        handleError(error, 'Error in removeSolutionTeam');
    }
};

//get-by-user-id/${id} this is my new end point which will be used to get the solution access by user id from solution member table

const getSolutionAccessByUserId = async (req) => {
    try {
        const { id } = req.params;

        //for role code admin and manager we will give all the solution access but for user we will give the solution access based on solutionmember table both with team and without team
        let solutionAccess = [];
        if (
            req.user.roleCode === 'COMPANY' ||
            req.user.roleCode === 'MANAGER'
        ) {
            solutionAccess = await SolutionApp.find({sequence:{$exists:true}}).sort({ sequence: 1 });
        } else {
            //here populate the appId and only sellect the appid , appname and appicon
            solutionAccess = await SolutionMember.find({ 'user.id': id })
                .populate({
                    path: 'appId',
                    select: 'appId name icon pathToOpen sequence',
                })
                .select('appId name icon pathToOpen sequence')
                .sort({ sequence: 1 });
        }

        return { data: solutionAccess };
    } catch (error) {
        handleError(error, 'Error in getSolutionAccessByUserId');
    }
};

const userHasAccessOfSolution = async (req) => {
    try {
        const { userId, urlPath } = req.body;

        if (!userId || !urlPath) {
            throw new Error('userId and urlPath are required');
        }

        // First, find the solution app by the URL path
        const solutionApp = await SolutionApp.findOne({ 
            pathToOpen: urlPath,
            isActive: true 
        });

        if (!solutionApp) {
            return { hasAccess: false, message: 'Solution not found for the given path' };
        }

        // Check if user has access in solution members (both individual and team-based)
        const solutionMember = await SolutionMember.findOne({
            appId: solutionApp._id,
            'user.id': userId
        });

        if (solutionMember) {
            return { hasAccess: true, message: 'Access granted - User is a member' };
        }

        return { hasAccess: false, message: 'User does not have access to this solution' };
    } catch (error) {
        handleError(error, 'Error in userHasAccessOfSolution');

    }
}

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
