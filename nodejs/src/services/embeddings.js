const { OpenAIEmbeddings } = require('@langchain/openai');
const { EMBEDDINGS } = require('../config/config');
const crypto = require('crypto');

let singletonEmbeddings = null;
let lastErrorTime = 0;
const ERROR_COOLDOWN = 30000; // 30 seconds

function getEmbeddingsClient() {
    // If we had a recent error, don't retry immediately
    if (Date.now() - lastErrorTime < ERROR_COOLDOWN) {
        console.warn('[embeddings] Skipping retry due to recent error');
        return null;
    }
    
    if (!singletonEmbeddings) {
        try {            
            if (!EMBEDDINGS.API_KEY) {
                throw new Error('No API key provided for embeddings');
            }
            
            singletonEmbeddings = new OpenAIEmbeddings({
                model: EMBEDDINGS.MODEL,
                openAIApiKey: EMBEDDINGS.API_KEY,
                configuration: { 
                    timeout: 30000, // Increased timeout to 30 seconds
                },
                maxRetries: 2, // Allow 2 retries
            });
            
            // OpenAI embeddings client initialized successfully
        } catch (error) {
            console.error('[embeddings] Failed to initialize OpenAI embeddings client:', error.message);
            singletonEmbeddings = null;
            lastErrorTime = Date.now();
        }
    }
    return singletonEmbeddings;
}

async function embedText(text, apiKey = null) {
    try {
        let client;
        
        // If a specific API key is provided, create a temporary client
        if (apiKey && apiKey !== EMBEDDINGS.API_KEY) {
            // Using custom API key for embedding
            client = new OpenAIEmbeddings({
                model: EMBEDDINGS.MODEL,
                openAIApiKey: apiKey,
                configuration: { 
                    timeout: 30000,
                },
                maxRetries: 2,
            });
        } else {
            // Use singleton client for default API key
            client = getEmbeddingsClient();
        }
        
        if (!client) {
            throw new Error('Embeddings client not available');
        }
        
        const vector = await client.embedQuery(text);
        
        // Validate vector format
        if (!Array.isArray(vector) || vector.length !== (EMBEDDINGS.VECTOR_SIZE || 1536)) {
            throw new Error(`Invalid vector format: expected ${EMBEDDINGS.VECTOR_SIZE || 1536} dimensions, got ${vector?.length || 0}`);
        }
        return vector;
        
    } catch (error) {
        console.error('[embeddings] ❌ Embedding failed:', error.message);
        lastErrorTime = Date.now();
        
        // Fallback: generate deterministic hash-based vector
        console.warn('[embeddings] Falling back to hash vector');
        return generateHashVector(text, EMBEDDINGS.VECTOR_SIZE || 1536);
    }
}

function generateHashVector(text, size) {
    try {
        // Generate a deterministic vector based on text hash
        const hash = crypto.createHash('sha256').update(text).digest('hex');
        const vector = new Array(size).fill(0);
        
        // Use hash to populate vector (not semantically meaningful but deterministic)
        for (let i = 0; i < size; i++) {
            const hashIndex = (i * 7) % hash.length; // Spread hash across vector
            const charCode = parseInt(hash[hashIndex], 16);
            vector[i] = (charCode / 15) - 0.5; // Normalize to [-0.5, 0.5] range
        }
        return vector;
        
    } catch (error) {
        // Ultimate fallback: return zero vector
        return new Array(size).fill(0);
    }
}

// Health check function
async function checkEmbeddingsHealth() {
    try {
        const client = getEmbeddingsClient();
        if (!client) return { healthy: false, reason: 'Client not available' };
        
        // Try a simple embedding
        const testVector = await client.embedQuery('test');
        return { 
            healthy: true, 
            dimensions: testVector.length,
            provider: EMBEDDINGS.API_BASE 
        };
    } catch (error) {
        return { 
            healthy: false, 
            reason: error.message,
            lastError: new Date(lastErrorTime).toISOString()
        };
    }
}

module.exports = {
    embedText,
    getEmbeddingsClient,
    generateHashVector,
    checkEmbeddingsHealth,
};


