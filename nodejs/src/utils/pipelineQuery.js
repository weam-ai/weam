const Messages = require('../models/thread');

/**
 * Get the latest sumhistory_checkpoint for a given chat session
 * Equivalent to get_latest_checkpoint in Python
 * @param {string} chatSessionId - The chat session ID
 * @returns {Promise<string|null>} The latest checkpoint or null if not found
 */
async function getLatestCheckpoint(chatSessionId) {
    try {
        const latestMessage = await Messages.findOne(
            {
                chat_session_id: chatSessionId,
                sumhistory_checkpoint: { $exists: true, $ne: null, $ne: '' }
            },
            { sumhistory_checkpoint: 1 }
        ).sort({ createdAt: -1 });

        return latestMessage ? latestMessage.sumhistory_checkpoint : null;
    } catch (error) {
        console.error('Error getting latest checkpoint:', error);
        return null;
    }
}

/**
 * Generate MongoDB aggregation pipeline for retrieving messages
 * Equivalent to get_pipeline_v2 in Python
 * @param {string} chatSessionId - The chat session ID
 * @param {string|null} checkpoint - The sumhistory_checkpoint to filter by
 * @param {Date|null} createdAt - Optional createdAt filter
 * @returns {Array} MongoDB aggregation pipeline
 */
function getPipelineV2(chatSessionId, checkpoint = null, createdAt = null) {
    const matchStage = {
        chat_session_id: chatSessionId,
        $or: [
            { system: { $exists: true } },
            { message: { $exists: true } },
            { ai: { $exists: true } }
        ]
    };

    // Add checkpoint filter if provided
    if (checkpoint) {
        matchStage.sumhistory_checkpoint = checkpoint;
    }

    // Add createdAt filter if provided
    if (createdAt) {
        matchStage.createdAt = { $gte: createdAt };
    }

    return [
        { $match: matchStage },
        { $sort: { createdAt: 1 } }
    ];
}

/**
 * Retrieve thread checkpoint information
 * Equivalent to retrieve_thread_checkpoint in Python
 * @param {string} chatSessionId - The chat session ID
 * @returns {Promise<Object|null>} Thread checkpoint info or null
 */
async function retrieveThreadCheckpoint(chatSessionId) {
    try {
        const checkpoint = await getLatestCheckpoint(chatSessionId);
        if (!checkpoint) {
            return null;
        }

        const checkpointMessage = await Messages.findOne(
            {
                chat_session_id: chatSessionId,
                sumhistory_checkpoint: checkpoint
            },
            { createdAt: 1, sumhistory_checkpoint: 1 }
        ).sort({ createdAt: -1 });

        return checkpointMessage ? {
            checkpoint: checkpointMessage.sumhistory_checkpoint,
            createdAt: checkpointMessage.createdAt
        } : null;
    } catch (error) {
        console.error('Error retrieving thread checkpoint:', error);
        return null;
    }
}

/**
 * Generate pipeline for history regeneration
 * Equivalent to regenerate_history_pipeline in Python
 * @param {string} chatSessionId - The chat session ID
 * @param {string|null} checkpoint - The sumhistory_checkpoint
 * @param {Date|null} createdAt - The createdAt timestamp
 * @returns {Array} MongoDB aggregation pipeline
 */
function regenerateHistoryPipeline(chatSessionId, checkpoint = null, createdAt = null) {
    // Convert chatSessionId to string if it's an ObjectId
    const sessionId = chatSessionId.toString ? chatSessionId.toString() : chatSessionId;
    
    const matchStage = {
        chat_session_id: sessionId,
        $or: [
            { system: { $exists: true } },
            { message: { $exists: true } },
            { ai: { $exists: true } }
        ]
    };

    // If checkpoint is provided, filter by it
    if (checkpoint) {
        matchStage.sumhistory_checkpoint = checkpoint;
    }

    // If createdAt is provided, get messages from that point onwards
    if (createdAt) {
        matchStage.createdAt = { $gte: createdAt };
    }

    return [
        { $match: matchStage },
        {
            $project: {
                _id: 1,
                chat_session_id: 1,
                system: 1,
                message: 1,
                ai: 1,
                createdAt: 1,
                sumhistory_checkpoint: 1,
                token_usage: 1
            }
        },
        { $sort: { createdAt: 1 } }
    ];
}

/**
 * Retrieve messages using checkpoint-based filtering
 * Similar to _retrieve_messages_for_regeneration in Python
 * @param {string} chatSessionId - The chat session ID
 * @param {string|null} checkpoint - Optional checkpoint filter
 * @returns {Promise<Array>} Array of messages
 */
async function retrieveMessagesForRegeneration(chatSessionId, checkpoint = null) {
    try {
        // Convert chatSessionId to string if it's an ObjectId
        const sessionId = chatSessionId.toString ? chatSessionId.toString() : chatSessionId;
        
        let allMessages = [];
        const threadCheckpoint = await retrieveThreadCheckpoint(sessionId);
        
        // If a specific checkpoint is provided, use that instead of the thread checkpoint
        const checkpointToUse = checkpoint || (threadCheckpoint ? threadCheckpoint.checkpoint : null);
        
        if (checkpointToUse) {
            // First, find all system messages with this checkpoint
            const systemMessageQuery = {
                chat_session_id: sessionId,
                sumhistory_checkpoint: checkpointToUse,
                system: { $exists: true }
            };
            const systemMessages = await Messages.find(systemMessageQuery).lean();
            
            // Now find all human and AI messages with the same checkpoint
            const allMessagesQuery = {
                chat_session_id: sessionId,
                sumhistory_checkpoint: checkpointToUse
            };
            const checkpointMessages = await Messages.find(allMessagesQuery).lean();
            
            // If no messages found with the checkpoint, try to get all messages for the session
            if (checkpointMessages.length === 0) {
                // Find all messages for this chat session
                const allMessagesForSession = await Messages.find({ chat_session_id: sessionId }).lean();
                allMessages = allMessagesForSession;
            } else {
                allMessages = checkpointMessages;
            }
            
            // Also get messages that don't have a checkpoint but belong to the same session
            // These are typically human and AI messages
            const nonCheckpointQuery = {
                chat_session_id: sessionId,
                $or: [
                    { sumhistory_checkpoint: { $exists: false } },
                    { sumhistory_checkpoint: null }
                ]
            };
            const nonCheckpointMessages = await Messages.find(nonCheckpointQuery).lean();
            
            // Combine all messages
            allMessages = [...allMessages, ...nonCheckpointMessages];
        } else {
            // No checkpoint found, get all messages for this session
            allMessages = await Messages.find({ chat_session_id: sessionId }).lean();
        }

        // Ensure uniqueness and sort by createdAt
        const uniqueMessages = Array.from(new Map(allMessages.map(msg => [msg._id.toString(), msg])).values());
        uniqueMessages.sort((a, b) => a.createdAt - b.createdAt);
        return uniqueMessages || [];
        
    } catch (error) {
        console.error('Error retrieving messages for regeneration:', error);
        return [];
    }
}

module.exports = {
    getLatestCheckpoint,
    getPipelineV2,
    retrieveThreadCheckpoint,
    regenerateHistoryPipeline,
    retrieveMessagesForRegeneration
};