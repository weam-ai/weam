const { QdrantClient } = require('@qdrant/js-client-rest');
const { QDRANT } = require('../config/config');
const logger = require('../utils/logger');
const { embedText } = require('./embeddings');

const qdrant = new QdrantClient({
    url: QDRANT.LOCAL_QDRANT_URL,   
    timeout: 10000 // 10 second timeout
});

// async function ensureCollection(vectorSize) {
//     const collections = await qdrant.getCollections();
//     const exists = collections?.collections?.some(c => c.name === QDRANT.COLLECTION);
//     if (!exists) {
//         await qdrant.createCollection(QDRANT.COLLECTION, {
//             vectors: { size: vectorSize, distance: 'Cosine' },
//         });
//     }
// }

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
        await qdrant.createPayloadIndex(QDRANT.COLLECTION, { field_name: 'fileId', field_schema: 'keyword' });
        await qdrant.createPayloadIndex(QDRANT.COLLECTION, { field_name: 'filename', field_schema: 'keyword' });
      } catch (error) {
        console.log('error: ensureCollection', error);
      }
    }
}catch(error){
    console.log('error: ensureCollection', error);
  }
}

async function upsertDocuments(points) {
    try {        
        const result = await qdrant.upsert(QDRANT.COLLECTION, { points });
        return result;
    } catch (error) {
        console.error('Qdrant upsert failed:', error);
        console.error('Error details:', error.message);
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

async function searchWithinFileByName(filename, query, k) {
    try {
        const vector = await getQueryVector(query); // or use your own embedText(query)
        const hits = await qdrant.search(QDRANT.COLLECTION, {
            vector,
            limit: k,
            with_payload: true,
            with_vectors: false,
            filter: {
                must: [{ key: 'filename', match: { value: filename } }],
            },
        });
        return hits;
    } catch (err) {
        console.error('Scoped search failed:', err);
        return [];
    }
}

async function searchWithinFileByFileId(fileId, query, k) {
    try {
        const vector = await getQueryVector(query);
        
        const hits = await qdrant.search(QDRANT.COLLECTION, {
            vector,
            limit: k,
            with_payload: true,
            with_vectors: false,
            filter: {
                must: [{ key: 'fileId', match: { value: fileId } }],
            },
            score_threshold: 0.15
        });
        
        return hits;
    } catch (err) {
        console.error('Scoped search by fileId failed:', err);
        console.error('Error details:', err.message);
        return [];
    }
}

async function extractDataFromQdrant(filename, query, k = 18) {
    try {
        const files = await getFilesListFromCollection();
        const hits = await searchWithinFileByName(filename, query, k);
        return hits;
    } catch (error) {
        logger.error('extractDataFromQdrant', error);
        return [];
    }
}

async function extractDataFromQdrantByFileId(fileId, query, k = 18) {
    try {
        const files = await getFilesListByFileId(fileId);
        const hits = await searchWithinFileByFileId(fileId, query, k);
        return hits;
    } catch (error) {
        logger.error('extractDataFromQdrantByFileId', error);
        return [];
    }
}

module.exports = { 
    qdrant, 
    ensureCollection, 
    upsertDocuments, 
    extractDataFromQdrant,
    extractDataFromQdrantByFileId,
    getFilesListFromCollection,
    getFilesListByFileId,
    searchWithinFileByName,
    searchWithinFileByFileId
};