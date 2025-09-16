const User = require('../models/user');

/**
 * Block a user account by setting tempblocked flag
 */
const blockUser = async (userId, blockedBy) => {
    try {
        const result = await User.findByIdAndUpdate(
            userId,
            { 
                tempblocked: true,
                updatedBy: blockedBy
            },
            { new: true }
        );
        
        return !!result;
    } catch (error) {
        throw error;
    }
};

/**
 * Check if a user is blocked
 */
const isUserBlocked = async (userId) => {
    try {
        const user = await User.findById(userId).select('tempblocked');
        return user ? user.tempblocked : false;
    } catch (error) {
        return false;
    }
};

module.exports = {
    blockUser,
    isUserBlocked
}; 