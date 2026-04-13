const { QdrantClient } = require('@qdrant/js-client-rest');
const { QDRANT } = require('../config/config');
const logger = require('../utils/logger');
const { embedText } = require('./embeddings');

const qdrant = new QdrantClient({
    url: QDRANT.LOCAL_QDRANT_URL,   
    timeout: 10000 // 10 second timeout
});

async function ensureCollection(vectorSize) {

    try{
    const list = await qdrant.getCollections();
    console.log('qdrant collections', list);
    const exists = list?.collections?.some(c => c.name === QDRANT.COLLECTION);
    if (!exists) {
      try {
        await qdrant.createCollection(QDRANT.COLLECTION, {
            vectors: { size: vectorSize, distance: 'Cosine' },
            on_disk_payload: true,
            optimizers_config: { default_segment_number: 2 },
            hnsw_config: { m: 16, ef_construct: 100 },
        });
        await Promise.all([
            qdrant.createPayloadIndex(QDRANT.COLLECTION, { field_name: 'fileId', field_schema: 'keyword' }),
            qdrant.createPayloadIndex(QDRANT.COLLECTION, { field_name: 'filename', field_schema: 'keyword' }),
            qdrant.createPayloadIndex(QDRANT.COLLECTION, { field_name: 's3_key', field_schema: 'keyword' }),
        ]);
      } catch (error) {
        console.log('error: ensureCollection', error);
      }
    }
}catch(error){
    console.log('error: ensureCollection', error);
  }
}

async function upsertDocuments(points) {
    const startedAt = Date.now();
    try {

        const timeoutMs = 15000;
        const result = await Promise.race([
            qdrant.upsert(QDRANT.COLLECTION, { points, wait: true }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Qdrant upsert timeout after ${timeoutMs}ms`)), timeoutMs)
            ),
        ]);
        return result;
    } catch (error) {
        console.error(`[qdrant] upsert failed elapsedMs=${Date.now() - startedAt}`, error?.message || error);
        throw error;
    }
}

async function getFilesListFromCollection () {
    try {
        const files = new Map();
        let next = null;

        do {
            const res = await qdrant.scroll(QDRANT.COLLECTION, {
                with_payload: true,
                with_vectors: false,
                limit: 256,
                offset: next || undefined,
            });

            const points = res.points || [];
            for (const p of points) {
                const filename = p?.payload?.filename;
                const fileId = p?.payload?.fileId; // Also get fileId from payload
                if (!filename) continue;
                const entry = files.get(filename) || { filename, fileId, count: 0 };
                entry.count += 1;
                files.set(filename, entry);
            }

            next = res.next_page_offset || null;
        } while (next);

        // Convert to array & sort by name (or by count desc if you prefer)
        return Array.from(files.values()).sort((a, b) => a.filename.localeCompare(b.filename));
    } catch (err) {
        console.error('Failed to list files:', err);
        return [];
    }
}

async function getFilesListByFileId(fileId) {
    try {
        const files = new Map();
        let next = null;

        do {
            const res = await qdrant.scroll(QDRANT.COLLECTION, {
                filter: {
                    must: [
                        {
                            key: 'fileId',
                            match: {
                                value: fileId
                            }
                        }
                    ]
                },
                with_payload: true,
                with_vectors: false,
                limit: 256,
                offset: next || undefined,
            });

            const points = res.points || [];
            for (const p of points) {
                const filename = p?.payload?.filename;
                const fileId = p?.payload?.fileId;
                if (!filename) continue;
                const entry = files.get(filename) || { filename, fileId, count: 0 };
                entry.count += 1;
                files.set(filename, entry);
            }

            next = res.next_page_offset || null;
        } while (next);

        return Array.from(files.values());
    } catch (err) {
        console.error('Failed to get files by fileId:', err);
        return [];
    }
}

// Note: This function requires OpenAI client to be available
// You may need to import and configure it based on your setup
async function getQueryVector(text) {
    try {
        return embedText(text);
    } catch (err) {
        console.error('getQueryVector not implemented:', err.message);
        throw err;
    }
}

async function searchWithinFilesByFileIds(fileIds, query, k = 18) {
    try {
        const normalizedFileIds = (fileIds || [])
            .map((id) => (id != null ? id.toString() : null))
            .filter(Boolean);

        if (!normalizedFileIds.length) return [];

        const vector = await getQueryVector(query);

        const hits = await qdrant.search(QDRANT.COLLECTION, {
            vector,
            limit: k,
            with_payload: true,
            with_vectors: false,
            filter: {
                should: normalizedFileIds.map((fileId) => ({
                    key: 'fileId',
                    match: { value: fileId }
                }))
            },
            score_threshold: 0.15
        });

        return hits;
    } catch (err) {
        console.error('Error details:', err.message);
        return [];
    }
}

module.exports = { 
    qdrant, 
    ensureCollection, 
    upsertDocuments, 
    getFilesListFromCollection,
    getFilesListByFileId,
    searchWithinFilesByFileIds
};