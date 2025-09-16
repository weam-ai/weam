/**
 * Middleware to check if user is blocked
 */
const checkUserBlocking = async (req, res, next) => {
    try {
        // Skip check for all authentication routes since users will be auto-unblocked on login
        if (req.path.includes('/auth/') || req.path.includes('/login')) {
            return next();
        }

        // Get token from request
        const token = req.headers['authorization']?.split('jwt ')[1] || req.query.authorization?.split('jwt ')[1];
        
        if (!token) {
            return next(); // No token, let authentication middleware handle it
        }

        // Decode token to get user email
        let decodedToken;
        try {
            const jwt = require('jsonwebtoken');
            const { AUTH } = require('../config/config');
            decodedToken = jwt.verify(token, AUTH.JWT_SECRET);
        } catch (jwtError) {
            // Invalid JWT, let authentication middleware handle it
            return next();
        }

        // Check if user is blocked
        if (decodedToken && decodedToken.email) {
            const User = require('../models/user');
            const user = await User.findOne({ email: decodedToken.email }).select('tempblocked');
            
            if (user && user.tempblocked) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Your account has been temporarily blocked due to recent changes. Please contact support or log in again.',
                    data: null
                });
            }
        }

        next(); // User is not blocked, continue
    } catch (error) {
        next(); // Continue on error to avoid blocking requests
    }
};

module.exports = {
    checkUserBlocking
}; 