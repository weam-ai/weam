/**
 * MCP Session Manager
 * Manages MCP connections based on user sessions to prevent premature disconnections
 */
class MCPSessionManager {
    constructor() {
        // Map of userId -> session info
        this.userSessions = new Map();
        
        // Map of transportId -> userId for quick lookup
        this.transportToUser = new Map();
        
        // Map of userId -> cleanup timeout
        this.cleanupTimeouts = new Map();
        
        // Grace period before cleanup (5 minutes)
        this.gracePeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Start periodic cleanup
        this.startPeriodicCleanup();
        
        console.log('🔧 [MCP Session Manager] Initialized');
    }

    /**
     * Register a transport connection with user session
     */
    registerTransport(transportId, userId, sessionData = {}) {
        console.log(`📝 [MCP Session Manager] Registering transport ${transportId} for user ${userId}`);
        
        // Store user session info
        this.userSessions.set(userId, {
            lastActivity: Date.now(),
            transports: this.userSessions.get(userId)?.transports || new Set(),
            sessionData: { ...sessionData },
            isActive: true
        });
        
        // Add transport to user's transport set
        this.userSessions.get(userId).transports.add(transportId);
        
        // Map transport to user for quick lookup
        this.transportToUser.set(transportId, userId);
        
        // Clear any existing cleanup timeout for this user
        if (this.cleanupTimeouts.has(userId)) {
            clearTimeout(this.cleanupTimeouts.get(userId));
            this.cleanupTimeouts.delete(userId);
            console.log(`⏰ [MCP Session Manager] Cleared cleanup timeout for user ${userId}`);
        }
    }

    /**
     * Handle transport disconnection
     */
    handleTransportDisconnect(transportId) {
        const userId = this.transportToUser.get(transportId);
        
        if (!userId) {
            console.log(`⚠️ [MCP Session Manager] No user found for transport ${transportId}`);
            return { shouldCleanup: true, gracePeriod: 0 };
        }
        
        console.log(`🔌 [MCP Session Manager] Transport ${transportId} disconnected for user ${userId}`);
        
        // Remove transport from user's transport set
        const userSession = this.userSessions.get(userId);
        if (userSession) {
            userSession.transports.delete(transportId);
        }
        
        // Remove transport mapping
        this.transportToUser.delete(transportId);
        
        // Check if user has other active transports
        const hasOtherTransports = userSession && userSession.transports.size > 0;
        
        if (hasOtherTransports) {
            console.log(`🔄 [MCP Session Manager] User ${userId} has other active transports, no cleanup needed`);
            return { shouldCleanup: false, gracePeriod: 0 };
        }
        
        // Schedule cleanup with grace period
        const timeoutId = setTimeout(() => {
            this.cleanupUserSession(userId);
        }, this.gracePeriod);
        
        this.cleanupTimeouts.set(userId, timeoutId);
        
        console.log(`⏰ [MCP Session Manager] Scheduled cleanup for user ${userId} in ${this.gracePeriod / 1000}s`);
        
        return { 
            shouldCleanup: false, 
            gracePeriod: this.gracePeriod 
        };
    }

    /**
     * Update user activity timestamp
     */
    updateUserActivity(userId) {
        if (this.userSessions.has(userId)) {
            this.userSessions.get(userId).lastActivity = Date.now();
            console.log(`🔄 [MCP Session Manager] Updated activity for user ${userId}`);
            
            // Clear cleanup timeout if exists (user is active)
            if (this.cleanupTimeouts.has(userId)) {
                clearTimeout(this.cleanupTimeouts.get(userId));
                this.cleanupTimeouts.delete(userId);
                console.log(`⏰ [MCP Session Manager] Cleared cleanup timeout for active user ${userId}`);
            }
        }
    }

    /**
     * Check if user session is active
     */
    isUserSessionActive(userId) {
        const userSession = this.userSessions.get(userId);
        if (!userSession) return false;
        
        const now = Date.now();
        const timeSinceLastActivity = now - userSession.lastActivity;
        
        // Consider session active if last activity was within 10 minutes
        const sessionTimeout = 10 * 60 * 1000; // 10 minutes
        
        return timeSinceLastActivity < sessionTimeout && userSession.isActive;
    }

    /**
     * Get user ID from transport ID
     */
    getUserFromTransport(transportId) {
        return this.transportToUser.get(transportId);
    }
    
    /**
     * Get user session info
     */
    getUserSession(userId) {
        return this.userSessions.get(userId);
    }

    /**
     * Clean up user session and all associated data
     */
    cleanupUserSession(userId) {
        console.log(`🧹 [MCP Session Manager] Cleaning up session for user ${userId}`);
        
        const userSession = this.userSessions.get(userId);
        if (!userSession) {
            console.log(`ℹ️ [MCP Session Manager] No session found for user ${userId}`);
            return false;
        }
        
        // Remove all transport mappings for this user
        for (const transportId of userSession.transports) {
            this.transportToUser.delete(transportId);
            console.log(`🗑️ [MCP Session Manager] Removed transport mapping ${transportId}`);
        }
        
        // Clear cleanup timeout if exists
        if (this.cleanupTimeouts.has(userId)) {
            clearTimeout(this.cleanupTimeouts.get(userId));
            this.cleanupTimeouts.delete(userId);
        }
        
        // Remove user session
        this.userSessions.delete(userId);
        
        console.log(`✅ [MCP Session Manager] Successfully cleaned up session for user ${userId}`);
        return true;
    }

    /**
     * Get session statistics
     */
    getStats() {
        return {
            activeSessions: this.userSessions.size,
            activeTransports: this.transportToUser.size,
            pendingCleanups: this.cleanupTimeouts.size
        };
    }

    /**
     * Start periodic cleanup of inactive sessions
     */
    startPeriodicCleanup() {
        setInterval(() => {
            const now = Date.now();
            const inactiveThreshold = 15 * 60 * 1000; // 15 minutes
            
            for (const [userId, session] of this.userSessions.entries()) {
                const timeSinceLastActivity = now - session.lastActivity;
                
                if (timeSinceLastActivity > inactiveThreshold) {
                    console.log(`🧹 [MCP Session Manager] Periodic cleanup: removing inactive user ${userId}`);
                    this.cleanupUserSession(userId);
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
}

module.exports = new MCPSessionManager();