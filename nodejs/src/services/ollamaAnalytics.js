const Company = require('../models/company');
const User = require('../models/user');

// Module-level cache to replace class instance state
const usageCache = new Map();

async function trackUsage(userId, companyId, model, action, data = {}) {
    try {
        const usageRecord = {
            userId,
            companyId,
            provider: 'ollama',
            model,
            action,
            tokens: data.tokens || 0,
            responseTime: data.responseTime || 0,
            timestamp: new Date(),
            success: data.success !== false,
            error: data.error || null
        };

        const cacheKey = `${companyId}-${new Date().toISOString().split('T')[0]}`;

        if (!usageCache.has(cacheKey)) {
            usageCache.set(cacheKey, []);
        }

        usageCache.get(cacheKey).push(usageRecord);

        flushUsageCache();

        logger.info(`Ollama usage tracked: ${model} - ${action} - ${data.tokens || 0} tokens`);

        return usageRecord;
    } catch (error) {
        logger.error('Error tracking Ollama usage:', error);
        throw error;
    }
}

function flushUsageCache() {
    if (usageCache.size > 100) {
        usageCache.clear();
    }
}

function getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
        case '1d':
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '90d':
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        default:
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
}

async function getUsageStats(companyId, timeRange = '7d') {
    try {
        const startDate = getStartDate(timeRange);

        const stats = {
            totalRequests: 0,
            totalTokens: 0,
            modelUsage: {},
            actionBreakdown: {},
            userUsage: {},
            successRate: 0,
            averageResponseTime: 0,
            period: timeRange
        };

        for (const [key, records] of usageCache.entries()) {
            if (key.startsWith(companyId)) {
                const filteredRecords = records.filter(record =>
                    new Date(record.timestamp) >= startDate
                );

                filteredRecords.forEach(record => {
                    stats.totalRequests++;
                    stats.totalTokens += record.tokens;

                    if (!stats.modelUsage[record.model]) {
                        stats.modelUsage[record.model] = 0;
                    }
                    stats.modelUsage[record.model]++;

                    if (!stats.actionBreakdown[record.action]) {
                        stats.actionBreakdown[record.action] = 0;
                    }
                    stats.actionBreakdown[record.action]++;

                    if (!stats.userUsage[record.userId]) {
                        stats.userUsage[record.userId] = 0;
                    }
                    stats.userUsage[record.userId]++;
                });
            }
        }

        if (stats.totalRequests > 0) {
            stats.successRate = (stats.totalRequests / stats.totalRequests) * 100;
        }

        return stats;
    } catch (error) {
        logger.error('Error getting usage stats:', error);
        throw error;
    }
}

async function getModelPerformanceStats(companyId, modelName) {
    try {
        const stats = {
            model: modelName,
            totalUsage: 0,
            averageTokens: 0,
            averageResponseTime: 0,
            successRate: 0,
            mostCommonActions: {},
            recentUsage: []
        };

        for (const [key, records] of usageCache.entries()) {
            if (key.startsWith(companyId)) {
                const modelRecords = records.filter(record => record.model === modelName);

                stats.totalUsage = modelRecords.length;

                if (modelRecords.length > 0) {
                    stats.averageTokens = modelRecords.reduce((sum, r) => sum + r.tokens, 0) / modelRecords.length;
                    stats.averageResponseTime = modelRecords.reduce((sum, r) => sum + r.responseTime, 0) / modelRecords.length;

                    const successfulRequests = modelRecords.filter(r => r.success).length;
                    stats.successRate = (successfulRequests / modelRecords.length) * 100;

                    modelRecords.forEach(record => {
                        if (!stats.mostCommonActions[record.action]) {
                            stats.mostCommonActions[record.action] = 0;
                        }
                        stats.mostCommonActions[record.action]++;
                    });

                    stats.recentUsage = modelRecords
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 10);
                }
            }
        }

        return stats;
    } catch (error) {
        logger.error('Error getting model performance stats:', error);
        throw error;
    }
}

async function getCompanyOllamaOverview(companyId) {
    try {
        const company = await Company.findById(companyId);
        const users = await User.find({ company_id: companyId });

        const overview = {
            companyName: company?.companyNm || 'Unknown',
            totalUsers: users.length,
            ollamaEnabled: company?.ollamaSettings?.enabled || false,
            allowedModels: company?.ollamaSettings?.allowedModels || [],
            restrictedModels: company?.ollamaSettings?.restrictedModels || [],
            defaultModel: company?.ollamaSettings?.defaultModel || null,
            maxConcurrentRequests: company?.ollamaSettings?.maxConcurrentRequests || 5,
            usageStats: await getUsageStats(companyId, '30d')
        };

        return overview;
    } catch (error) {
        logger.error('Error getting company Ollama overview:', error);
        throw error;
    }
}

module.exports = {
    trackUsage,
    getUsageStats,
    getModelPerformanceStats,
    getCompanyOllamaOverview
};
