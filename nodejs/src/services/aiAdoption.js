const mongoose = require('mongoose');
const User = require('../models/user');
const Brains = require('../models/brains');
const Prompts = require('../models/prompts');
const CustomGpt = require('../models/customgpt');
const Chat = require('../models/chat');
const Thread = require('../models/thread');
const ShareBrain = require('../models/shareBrain');
const { INVITATION_TYPE, ROLE_TYPE } = require('../config/constants/common');
const { dateForMongoQuery } = require('../utils/helper');

// Common function to build match conditions with date filters
const buildMatchConditions = (baseConditions, startDate, endDate, filters = {}) => {
    const matchConditions = { ...baseConditions };

    // Add date filters if provided
    if (startDate && endDate) {
        // Convert YYYY-MM-DD to MM/DD/YYYY format for dateForMongoQuery
        const convertDateFormat = (dateStr) => {
            const [year, month, day] = dateStr.split('-');
            return `${month}/${day}/${year}`;
        };
        
        matchConditions.createdAt = {
            $gte: new Date(dateForMongoQuery(convertDateFormat(startDate), true)),
            $lte: new Date(dateForMongoQuery(convertDateFormat(endDate), false))
        };                  
    }

    // Add additional filters if provided
    // if (filters && Object.keys(filters).length > 0) {
    //     Object.assign(matchConditions, filters);
    // }

    return matchConditions;
};

const getAiAdoption = async (req) => {
    try {
        // Get company ID from session
        const companyId = req.user?.company?.id || req.user?.invitedBy;
        
        if (!companyId) {
            throw new Error('Company ID not found in session');
        }

        // Get filters from request body
        const filters = req.body?.filters || {};
        const startDate = req.body?.startDate;
        const endDate = req.body?.endDate;

        // Check if user has USER role - show only user-specific data
        const isUserRole = req.roleCode === ROLE_TYPE.USER;
        const userId = req.userId;

        // Get workspaceId from request body or filters
        const workspaceId = req.body?.workspaceId || req.body?.filters?.workspaceId;

        // Get company brain IDs once for reuse
        const companyBrains = await Brains.find({
            companyId: new mongoose.Types.ObjectId(companyId),
            isActive: true,
            deletedAt: { $exists: false },
            ...(workspaceId && { workspaceId: new mongoose.Types.ObjectId(workspaceId) })
        }).select('_id');
        
        const brainIds = companyBrains.map(brain => brain._id);

        // Call the functions to get data based on user role
        const activeUsersResult = await getActiveUsersCountForCompany(companyId, startDate, endDate, filters, isUserRole, userId);
        const brainsCountResult = await getBrainsCountForCompany(companyId, startDate, endDate, filters, isUserRole, userId, workspaceId);
        const activePromptsCountResult = await getActivePromptsCountForCompany(brainIds, startDate, endDate, filters, isUserRole, userId, workspaceId, companyId);
        const activeAgentsCountResult = await getActiveAgentsCountForCompany(brainIds, startDate, endDate, filters, isUserRole, userId, workspaceId, companyId);
        const totalChatsCountResult = await getTotalChatsCountForCompany(brainIds, startDate, endDate, filters, isUserRole, userId, workspaceId, companyId);
        const totalMessagesCountResult = await getTotalMessagesCountForCompany(companyId, startDate, endDate, filters, isUserRole, userId, workspaceId);
        const mostUsedModelResult = await getMostUsedModelForCompany(companyId, startDate, endDate, filters, isUserRole, userId, workspaceId);

        const count = {
            users: activeUsersResult.activeUsersCount,
            storageUsed: activeUsersResult.totalUsedSize,
            brains: brainsCountResult.totalBrains,
            privateBrains: brainsCountResult.privateBrains,
            publicBrains: brainsCountResult.publicBrains,
            prompts: activePromptsCountResult,
            agents: activeAgentsCountResult,
            chats: totalChatsCountResult,
            messages: totalMessagesCountResult,
            mostUsedModelName: mostUsedModelResult.model,
            mostUsedModelCount: mostUsedModelResult.count
        };
        return {
            data: count
        };
    } catch (error) {
        console.error('Error in getAiAdoption:', error);
        throw new Error('Failed to get AI adoption data');
    }
};

const getActiveUsersCountForCompany = async (companyId, startDate, endDate, filters = {}, isUserRole = false, userId = null) => {
    try {
        // Build match conditions using common function
        let baseConditions;
        
        if (isUserRole && userId) {
            // For user role, only count the specific user
            baseConditions = {
                _id: userId,
                inviteSts: INVITATION_TYPE.ACCEPT,
                deletedAt: { $exists: false }
            };
        } else {
            // For company role, count all users in the company
            baseConditions = {
                'company.id': companyId,
                inviteSts: INVITATION_TYPE.ACCEPT,
                deletedAt: { $exists: false }
            };
        }
        
        const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, filters);

        // Aggregation to count active users and sum usedSize for the specific company
        const result = await User.aggregate([
            {
                $match: matchConditions
            },
            {
                $group: {
                    _id: null,
                    activeUsersCount: { $sum: 1 },
                    totalUsedSize: { $sum: '$usedSize' }
                }
            }
        ]);
        
        const userStats = result[0] || {
            activeUsersCount: 0,
            totalUsedSize: 0
        };
        
        return {
            activeUsersCount: userStats.activeUsersCount,
            totalUsedSize: userStats.totalUsedSize
        };
        
    } catch (error) {
        console.error('Error in getActiveUsersCountForCompany:', error);
        throw new Error('Failed to get active users count for company');
    }
};

const getBrainsCountForCompany = async (companyId, startDate, endDate, filters = {}, isUserRole = false, userId = null, workspaceId = null) => {
    try {
        let result;
        
        if (isUserRole && userId) {
            // For user role, count brains that the user has access to through ShareBrain
            
            // Get brain IDs that the user has access to
            const userBrainAccess = await ShareBrain.find({
                'user.id': userId
            }).select('brain.id');
            
            const userBrainIds = userBrainAccess.map(access => access.brain.id);
            
            if (userBrainIds.length === 0) {
                return {
                    totalBrains: 0,
                    privateBrains: 0,
                    publicBrains: 0
                };
            }
            
            // Build match conditions for user's accessible brains
            const baseConditions = {
                _id: { $in: userBrainIds },
                isActive: true,
                deletedAt: { $exists: false }
            };
            
            const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, filters);
            
            // Aggregation to count total, private, and public brains for the user
            result = await Brains.aggregate([
                {
                    $match: matchConditions
                },
                {
                    $group: {
                        _id: null,
                        totalBrains: { $sum: 1 },
                        privateBrains: {
                            $sum: {
                                $cond: [{ $eq: ['$isShare', false] }, 1, 0]
                            }
                        },
                        publicBrains: {
                            $sum: {
                                $cond: [{ $eq: ['$isShare', true] }, 1, 0]
                            }
                        }
                    }
                }
            ]);
                } else {
            // For company role, count all brains in the company
            const baseConditions = {
                companyId: new mongoose.Types.ObjectId(companyId),
                isActive: true,
                deletedAt: { $exists: false },
                ...(workspaceId && { workspaceId: new mongoose.Types.ObjectId(workspaceId) })
            };
            
            // Remove workspaceId from filters to avoid string/ObjectId conflict
            const { workspaceId: _, ...otherFilters } = filters;
            
            const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, otherFilters);
            
            // Aggregation to count total, private, and public brains for the specific company
            result = await Brains.aggregate([
                {
                    $match: matchConditions
                },
                {
                    $group: {
                        _id: null,
                        totalBrains: { $sum: 1 },
                        privateBrains: {
                            $sum: {
                                $cond: [{ $eq: ['$isShare', false] }, 1, 0]
                            }
                        },
                        publicBrains: {
                            $sum: {
                                $cond: [{ $eq: ['$isShare', true] }, 1, 0]
                            }
                        }
                    }
                }
            ]);
        }
        
        const brainsCount = result[0] || {
            totalBrains: 0,
            privateBrains: 0,
            publicBrains: 0
        };
        
        return {
            totalBrains: brainsCount.totalBrains,
            privateBrains: brainsCount.privateBrains,
            publicBrains: brainsCount.publicBrains
        };
        
    } catch (error) {
        console.error('Error in getBrainsCountForCompany:', error);
        throw new Error('Failed to get brains count for company');
    }
};

const getActivePromptsCountForCompany = async (brainIds = null, startDate, endDate, filters = {}, isUserRole = false, userId = null, workspaceId = null, companyId = null) => {
    try {
        let baseConditions;
        
        if (isUserRole && userId) {
            // For user role, count prompts created by the user
            baseConditions = {
                'user.id': userId,
                deletedAt: { $exists: false }
            };
        } else {
            // For company role, count prompts that belong to company brains
            let companyBrainIds = brainIds;
            

            
            // If workspaceId is provided, get brains from that workspace
            if (workspaceId) {
                const workspaceBrains = await Brains.find({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    isActive: true,
                    deletedAt: { $exists: false }
                }).select('_id');
                
                companyBrainIds = workspaceBrains.map(brain => brain._id);
            }
            
            if (companyBrainIds.length === 0) {
                return 0;
            }
            
            baseConditions = {
                'brain.id': { $in: companyBrainIds },
                deletedAt: { $exists: false }
            };
        }
        
        // Remove workspaceId from filters to avoid string/ObjectId conflict
        const { workspaceId: _, ...otherFilters } = filters;
        const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, otherFilters);
        
        // Then count prompts that belong to those brains
        const result = await Prompts.aggregate([
            {
                $match: matchConditions
            },
            {
                $count: 'activePromptsCount'
            }
        ]);
        
        const activePromptsCount = result[0]?.activePromptsCount || 0;
        
        return activePromptsCount;
        
    } catch (error) {
        console.error('Error in getActivePromptsCountForCompany:', error);
        throw new Error('Failed to get active prompts count for company');
    }
};

const getActiveAgentsCountForCompany = async (brainIds = null, startDate, endDate, filters = {}, isUserRole = false, userId = null, workspaceId = null, companyId = null) => {
    try {
        let baseConditions;
        
        if (isUserRole && userId) {
            // For user role, count agents created by the user
            baseConditions = {
                'owner.id': userId,
                isActive: true,
                deletedAt: { $exists: false }
            };
        } else {
            // For company role, count agents that belong to company brains
            let companyBrainIds = brainIds;
            

            
            // If workspaceId is provided, get brains from that workspace
            if (workspaceId) {
                const workspaceBrains = await Brains.find({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    isActive: true,
                    deletedAt: { $exists: false }
                }).select('_id');
                
                companyBrainIds = workspaceBrains.map(brain => brain._id);
            }
            
            if (companyBrainIds.length === 0) {
                return 0;
            }
            
            baseConditions = {
                'brain.id': { $in: companyBrainIds },
                isActive: true,
                deletedAt: { $exists: false }
            };
        }
        
        // Remove workspaceId from filters to avoid string/ObjectId conflict
        const { workspaceId: _, ...otherFilters } = filters;
        const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, otherFilters);
        
        // Then count agents that belong to those brains
        const result = await CustomGpt.aggregate([
            {
                $match: matchConditions
            },
            {
                $count: 'activeAgentsCount'
            }
        ]);
        
        const activeAgentsCount = result[0]?.activeAgentsCount || 0;
        
        return activeAgentsCount;
        
    } catch (error) {
        console.error('Error in getActiveAgentsCountForCompany:', error);
        throw new Error('Failed to get active agents count for company');
    }
};

const getTotalChatsCountForCompany = async (brainIds = null, startDate, endDate, filters = {}, isUserRole = false, userId = null, workspaceId = null, companyId = null) => {
    try {
        let baseConditions;
        
        if (isUserRole && userId) {
            // For user role, count chats created by the user
            baseConditions = {
                'user.id': userId,
                deletedAt: { $exists: false }
            };
        } else {
            // For company role, count chats that belong to company brains
            let companyBrainIds = brainIds;
            
            // If workspaceId is provided, get brains from that workspace
            if (workspaceId) {
                const workspaceBrains = await Brains.find({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    isActive: true,
                    deletedAt: { $exists: false }
                }).select('_id');
                
                companyBrainIds = workspaceBrains.map(brain => brain._id);
            }
            
            if (companyBrainIds.length === 0) {
                return 0;
            }
            
            baseConditions = {
                'brain.id': { $in: companyBrainIds },
                deletedAt: { $exists: false }
            };
        }
        
        // Remove workspaceId from filters to avoid string/ObjectId conflict
        const { workspaceId: _, ...otherFilters } = filters;
        const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, otherFilters);
        
        // Count chats that belong to those brains
        const result = await Chat.aggregate([
            {
                $match: matchConditions
            },
            {
                $count: 'totalChatsCount'
            }
        ]);
        
        const totalChatsCount = result[0]?.totalChatsCount || 0;
        
        return totalChatsCount;
        
    } catch (error) {
        console.error('Error in getTotalChatsCountForCompany:', error);
        throw new Error('Failed to get total chats count for company');
    }
};

const getTotalMessagesCountForCompany = async (companyId, startDate, endDate, filters = {}, isUserRole = false, userId = null, workspaceId = null) => {
    try {
        // Build match conditions using common function
        let baseConditions;
        
        if (isUserRole && userId) {
            // For user role, only count messages created by the user
            baseConditions = {
                'user.id': userId,
                isActive: true,
                deletedAt: { $exists: false }
            };
        } else {
            // For company role, count all messages in the company
            baseConditions = {
                companyId: companyId,
                isActive: true,
                deletedAt: { $exists: false }
            };
            
            if (workspaceId) {
                const workspaceBrains = await Brains.find({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    isActive: true,
                    deletedAt: { $exists: false }
                }).select('_id');
                
                companyBrainIds = workspaceBrains.map(brain => brain._id);
                baseConditions['brain.id'] = { $in: companyBrainIds };
                
            }
        }
        
        const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, filters);
        
        // Count messages that belong to the company
        const result = await Thread.aggregate([
            {
                $match: matchConditions
            },
            {
                $count: 'totalMessagesCount'
            }
        ]);
        
        const totalMessagesCount = result[0]?.totalMessagesCount || 0;
        
        return totalMessagesCount;
        
    } catch (error) {
        console.error('Error in getTotalMessagesCountForCompany:', error);
        throw new Error('Failed to get total messages count for company');
    }
};

const getMostUsedModelForCompany = async (companyId, startDate, endDate, filters = {}, isUserRole = false, userId = null, workspaceId = null) => {
    try {
        // Build match conditions using common function
        let baseConditions;
        
        if (isUserRole && userId) {
            // For user role, only count messages created by the user
            baseConditions = {
                'user.id': userId,
                isActive: true,
                deletedAt: { $exists: false },
                responseModel: { $exists: true, $ne: null }
            };
        } else {
            // For company role, count all messages in the company
            baseConditions = {
                companyId: companyId,
                isActive: true,
                deletedAt: { $exists: false },
                responseModel: { $exists: true, $ne: null }
            };
            
            // If workspaceId is provided, filter by workspaceId
            if (workspaceId) {
                const workspaceBrains = await Brains.find({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    isActive: true,
                    deletedAt: { $exists: false }
                }).select('_id');
                
                companyBrainIds = workspaceBrains.map(brain => brain._id);
                baseConditions['brain.id'] = { $in: companyBrainIds };
                
            }
        }
        
        const matchConditions = buildMatchConditions(baseConditions, startDate, endDate, filters);

        // Get the most used model for the company
        const result = await Thread.aggregate([
            {
                $match: matchConditions
            },
            {
                $group: {
                    _id: '$responseModel',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 1
            },
            {
                $project: {
                    _id: 0,
                    model: '$_id',
                    count: 1
                }
            }
        ]);
        
        const mostUsedModel = result[0] || {
            model: 'No data',
            count: 0
        };
        
        return mostUsedModel;
        
    } catch (error) {
        console.error('Error in getMostUsedModelForCompany:', error);
        throw new Error('Failed to get most used model for company');
    }
};



module.exports = {
    getAiAdoption
};