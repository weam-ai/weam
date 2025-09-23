const { qdrant, ensureCollection } = require('./qdrant');
const { embedText } = require('./embeddings');
const { EMBEDDINGS, QDRANT } = require('../config/config');

// async function searchVectors(query, options = {}) {
//     const { limit = 10, scoreThreshold = 0.5 } = options;
    
//     try {
//         // Ensure collection exists
//         await ensureCollection(EMBEDDINGS.VECTOR_SIZE || 1536);
        
//         // Generate query vector
//         const queryVector = await embedText(query);
        
//         // Search in Qdrant
//         const searchResult = await qdrant.search(process.env.QDRANT_COLLECTION || 'documents', {
//             vector: queryVector,
//             limit: limit,
//             score_threshold: scoreThreshold,
//             with_payload: true,
//             with_vectors: false // We don't need vectors for search results
//         });
        
//         // Format results
//         return searchResult.map(point => ({
//             id: point.id,
//             score: point.score,
//             payload: point.payload
//         }));
        
//     } catch (error) {
//         console.error('Vector search failed:', error);
//         throw new Error(`Vector search failed: ${error.message}`);
//     }
// }

async function getCollectionInfo() {
    try {
        const collectionName = process.env.QDRANT_COLLECTION || 'documents';
        const info = await qdrant.getCollection(collectionName);
        
        return {
            name: info.name,
            vector_size: info.config.params.vectors.size,
            distance: info.config.params.vectors.distance,
            points_count: info.points_count,
            status: info.status
        };
        
    } catch (error) {
        console.error('Failed to get collection info:', error);
        throw new Error(`Failed to get collection info: ${error.message}`);
    }
}

// async function getVectorsByFilename(filename) {
//     try {
//         const collectionName = process.env.QDRANT_COLLECTION || 'documents';
        
//         // Search for vectors with matching filename
//         const searchResult = await qdrant.scroll(collectionName, {
//             filter: {
//                 must: [
//                     {
//                         key: 'filename',
//                         match: {
//                             value: filename
//                         }
//                     }
//                 ]
//             },
//             limit: 100,
//             with_payload: true,
//             with_vectors: false
//         });
        
//         // Format results
//         return searchResult.points.map(point => ({
//             id: point.id,
//             payload: point.payload
//         }));
        
//     } catch (error) {
//         console.error('Failed to get vectors by filename:', error);
//         throw new Error(`Failed to get vectors by filename: ${error.message}`);
//     }
// }

// async function getVectorsByFileId(fileId) {
//     try {
//         const collectionName = process.env.QDRANT_COLLECTION || 'documents';
        
//         // Search for vectors with matching fileId
//         const searchResult = await qdrant.scroll(collectionName, {
//             filter: {
//                 must: [
//                     {
//                         key: 'fileId',
//                         match: {
//                             value: fileId
//                         }
//                     }
//                 ]
//             },
//             limit: 100,
//             with_payload: true,
//             with_vectors: false
//         });
        
//         // Format results
//         return searchResult.points.map(point => ({
//             id: point.id,
//             payload: point.payload
//         }));
        
//     } catch (error) {
//         console.error('Failed to get vectors by fileId:', error);
//         throw new Error(`Failed to get vectors by fileId: ${error.message}`);
//     }
// }

async function searchVectors(query, options = {}) {
    const { limit = 10, scoreThreshold = 0.5 } = options;
    await ensureCollection(EMBEDDINGS.VECTOR_SIZE || 1536);
    const queryVector = await embedText(query);
    const searchResult = await qdrant.search(QDRANT.COLLECTION, {
      vector: queryVector,
      limit, score_threshold: scoreThreshold,
      with_payload: true, with_vectors: false
    });
    return searchResult.map(p => ({ id: p.id, score: p.score, payload: p.payload }));
  }
  
  async function getVectorsByFilename(filename) {
    const res = await qdrant.scroll(QDRANT.COLLECTION, {
      filter: { must: [{ key: 'filename', match: { value: filename } }] },
      limit: 100, with_payload: true, with_vectors: false
    });
    return res.points.map(p => ({ id: p.id, payload: p.payload }));
  }
  
  async function getVectorsByFileId(fileId) {
    const res = await qdrant.scroll(QDRANT.COLLECTION, {
      filter: { must: [{ key: 'fileId', match: { value: fileId } }] },
      limit: 100, with_payload: true, with_vectors: false
    });
    return res.points.map(p => ({ id: p.id, payload: p.payload }));
  }

module.exports = {
    searchVectors,
    getCollectionInfo,
    getVectorsByFilename,
    getVectorsByFileId
};

