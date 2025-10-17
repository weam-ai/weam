const CustomGpt = require('../models/customgpt');
const { formatUser, formatDBFileData, formatBrain, getCompanyId } = require('../utils/helper');
const dbService = require('../utils/dbService');
const CompanyModal = require('../models/userBot');
const File = require('../models/file');
const ChatDocs = require('../models/chatdocs');
const Brain = require('../models/brains');
const ShareBrain = require('../models/shareBrain');
const { accessOfBrainToUser } = require('./common');
const { MODAL_NAME } = require('../config/constants/aimodal');
const { getShareBrains, getBrainStatus } = require('./brain');
const { ensureIndex, upsertDocuments } = require('./pinecone');
const { embedText } = require('./embeddings');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { EMBEDDINGS } = require('../config/config');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const AWS = require('aws-sdk');
const { AWS_CONFIG } = require('../config/config');
const pdf = require('pdf-parse');
const crypto = require('crypto');

// Configure AWS S3
AWS.config.update({
    apiVersion: AWS_CONFIG.AWS_S3_API_VERSION,
    accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    region: AWS_CONFIG.REGION
});

const S3 = new AWS.S3({ accessKeyId: AWS_CONFIG.AWS_ACCESS_ID,
    secretAccessKey: AWS_CONFIG.AWS_SECRET_KEY,
    endpoint: AWS_CONFIG.ENDPOINT, // accessible from container
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    sslEnabled: false,
    useAccelerateEndpoint: false,
    
 });
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: EMBEDDINGS.CHUNK_SIZE_CHARS,
    chunkOverlap: EMBEDDINGS.CHUNK_OVERLAP_CHARS,
    separators: ['\n\n', '\n', '.', ' ', ''],
});

/**
 * Fetch file content from S3 bucket
 * @param {string} fileUri - File URI from database
 * @returns {Promise<Buffer>} - File content as buffer
 */
async function fetchFileFromS3(fileUri) {
    try {
        // Remove leading slash from URI to get S3 key
        const s3Key = fileUri.replace(/^\//, '');
        
        const params = {
            Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
            Key: s3Key
        };
        
        const s3Object = await S3.getObject(params).promise();
        
        return s3Object.Body;
    } catch (error) {
        logger.error(`Error fetching file from S3: ${error.message}`);
        throw new Error(`Failed to fetch file from S3: ${error.message}`);
    }
}

/**
 * Extract text content from file buffer based on file type
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} filename - Original filename
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromFile(buffer, mimetype, filename) {
    try {
        const fileExtension = getFileExtension(filename)?.toLowerCase();
        
        // Handle PDF files
        if (mimetype === 'application/pdf' || fileExtension === 'pdf') {
            const data = await pdf(buffer);
            return data.text || '';
        }
        
        // Handle text files
        if (mimetype?.startsWith('text/') || ['txt', 'text'].includes(fileExtension)) {
            return buffer.toString('utf8');
        }
        
        // Handle code files
        if (['php', 'js', 'css', 'html', 'htm', 'sql', 'py', 'json'].includes(fileExtension)) {
            return buffer.toString('utf8');
        }
        
        // Handle CSV files
        if (fileExtension === 'csv' || mimetype === 'text/csv') {
            return buffer.toString('utf8');
        }
        
        // For other file types, try to extract as text
        return buffer.toString('utf8');
        
    } catch (error) {
        logger.error(`Error extracting text from file ${filename}: ${error.message}`);
        return '';
    }
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} - File extension
 */
function getFileExtension(filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Generate hash-based vector for fallback when embeddings fail
 * @param {string} text - Text to hash
 * @param {number} size - Vector size
 * @returns {Array} Hash-based vector
 */
function generateHashVector(text, size) {
    try {
        const hash = crypto.createHash('sha256').update(text).digest('hex');
        const vector = new Array(size).fill(0);
        
        for (let i = 0; i < size; i++) {
            const hashIndex = (i * 7) % hash.length;
            const charCode = parseInt(hash[hashIndex], 16);
            vector[i] = (charCode / 15) - 0.5;
        }
        return vector;
    } catch (error) {
        return new Array(size).fill(0);
    }
}

function chatDocsFileFormat(file) {
    return {
        name: file.name,
        uri: file.uri,
        mime_type: file.mime_type,
        file_size: file.file_size,
        createdAt: file.createdAt
    }
}

async function createChatDocs(payload) {
    ChatDocs.create(payload);
}

const addCustomGpt = async (req) => {
    try {
        const { fileData } = require('./uploadFile');
        const { title, brain, responseModel } = req.body;
        const { id: brainId } = brain;
        const { company } = responseModel;

        const slug = slugify(title);
        const createData = { 
            ...req.body, 
            slug, 
            coverImg: {}, 
            doc: [],
        }; 

        const existing = await CustomGpt.findOne({ slug, 'brain.id': brainId });
        if (existing) throw new Error(_localize('module.alreadyExists', req, 'custom gpt'));

        if (req.files['coverImg']) {
            const coverFile = await File.create(fileData(req.files['coverImg'][0]));
            createData['coverImg'] = formatDBFileData(coverFile);
        }

        if (req.files?.doc?.length > 0) {
            const defaultEmbedding = await CompanyModal.findOne({ 'company.id': company.id, name: 'text-embedding-3-small' });

          const docFile = await File.insertMany(
            req.files["doc"].map((file) => fileData(file))
          );

          // Create chat docs in bulk instead of individual operations
            if (existingBot?.brain?.id) {
                ChatDocs.insertMany(docFile.map(dfile => ({
                    userId: req.userId,
                    fileId: dfile._id,
                    brainId: existingBot.brain.id,
                    doc: chatDocsFileFormat(dfile),
                })));
            }

            const vectorData = docFile.map(file => ({
            type: file.type,
            companyId: company.id,
            fileId: file.id,
            api_key_id: defaultEmbedding._id.toString(),
                tag: file.uri.split('/')[2], // Extract filename from URI: /documents/fileId.extension
            uri: file.uri,
            brainId,
                file_name: file.name
          }));

          storeVectorData(req, vectorData);

            createData['doc'] = docFile.map(file => formatDBFileData(file));
            createData['embedding_model'] = {
            name: defaultEmbedding.name,
            company: defaultEmbedding.company,
            id: defaultEmbedding._id,
          };
        }

        return CustomGpt.create({
            ...createData,
            owner: formatUser(req.user),
        });

    } catch (error) {
        handleError(error, 'Error - addCustomGpt');
    }
};

const updateCustomGpt = async (req) => {
    try {
        const { removeExistingDocument, removeExistingImage, fileData } = require('./uploadFile');
        const existingBot = await CustomGpt.findById({ _id: req.params.id }, { doc: 1, coverImg: 1, brain: 1, type: 1 });
        
        if (!existingBot) throw new Error(_localize('module.notFound', req, 'custom bot'));

        const { title, responseModel } = req.body;
        const { company } = responseModel;

        let updateBody = {
            ...req.body,
            slug: slugify(title),
        }

        if (req.files['coverImg']) {
            // if user upload new image then old image remove from db and s3
            const previousImg = !!existingBot?.coverImg?.id;
            if (previousImg) removeExistingImage(existingBot.coverImg.id, existingBot.coverImg.uri);
            //TODO : If new Image request delete older image
            const [coverFile] = await Promise.all([
                File.create(fileData(req.files['coverImg'][0])),
            ]);
            Object.assign(updateBody, { coverImg: formatDBFileData(coverFile) })
        }
        //if coverImg is null then remove coverImg get from existingBot and call removeExistingImage
        if (!req.files['coverImg']) {
            if (existingBot?.coverImg?.id) removeExistingImage(existingBot.coverImg.id, existingBot.coverImg.uri);
        }

        const previousDocs = existingBot?.doc || [];
        let filteredPreviousDocs  = previousDocs;
        
        if (req.body.removeDoc) {
            const removeDoc = JSON.parse(req.body.removeDoc);
            
            removeDoc.forEach(doc => {
                if (doc?.id && doc?.uri) {
                    removeExistingDocument(doc.id, doc.uri);
                }
            });
            // Create a Set of IDs from the removeArray for quick lookup
            const removeSet = new Set(removeDoc.map(item => item.id));
            // Filter the existingArray to exclude items present in the removeSet
            filteredPreviousDocs = previousDocs.filter(existingItem => {
                return !removeSet.has(existingItem.id.toString());
            });
        }
        
        if (req?.files?.doc?.length > 0) {
            // if user uploads new documents, remove all old documents from db and s3
            
            // if (previousDocs.length > 0) {
            //     previousDocs.forEach(doc => {
            //         if (doc?.id && doc?.uri) {
            //             removeExistingDocument(doc.id, doc.uri);
            //         }
            //     });
            // }
            
            const docFile = await File.insertMany(
                req.files['doc'].map(file => fileData(file))
            );

            // Create chat docs in bulk instead of individual operations
            ChatDocs.insertMany(docFile.map(dfile => ({
                userId: req.userId,
                fileId: dfile._id,
                brainId: existingBot.brain.id,
                doc: chatDocsFileFormat(dfile),
            })));

            // default text embadding modal for text
            const defaultEmbedding = await CompanyModal.findOne({ 'company.id': company.id, name: 'text-embedding-3-small' });

            updateBody['doc'] = docFile.map(file => formatDBFileData(file));
            updateBody['embedding_model'] = {
                name: defaultEmbedding.name,
                company: defaultEmbedding.company,
                id: defaultEmbedding._id,
            };
            
            if (existingBot?.brain?.id) {
                const vectorData = docFile.map(file => ({
                    type: file.type,
                    companyId: company.id,
                    fileId: file.id,
                    api_key_id: defaultEmbedding._id.toString(),
                    tag: file.uri.split('/')[2],
                    uri: file.uri,
                    brainId: existingBot.brain.id.toString(),
                    file_name: file.name
                }));
 
            // Store vector data
            storeVectorData(req, vectorData);
            }
            const newDocs = docFile.map(file => formatDBFileData(file));
            Object.assign(updateBody, { doc: [...filteredPreviousDocs, ...newDocs] });            
        } else {
            Object.assign(updateBody, { doc: filteredPreviousDocs })
        }

        

        return CustomGpt.findByIdAndUpdate({ _id: req.params.id }, updateBody, { new: true });
    } catch (error) {
        handleError(error, 'Error - updateCustomGpt');
    }
}

const viewCustomGpt = async (req) => {
    try {
        return CustomGpt.findById({ _id: req.params.id } );
    } catch (error) {
        handleError(error, 'Error - viewCustomGpt');
    }
}

const deleteCustomGpt = async (req) => {
    try {
        // Check if this agent is used by any supervisor agents
        const supervisorAgents = await CustomGpt.findOne({
            type: 'supervisor',
            Agents: req.params.id,
            'brain.id': { $exists: true }
        });

        if (supervisorAgents) {
            const supervisorNames = supervisorAgents.title;
            throw new Error(`Cannot delete agent. It is currently being used by supervisor agent(s): ${supervisorNames}`);
        }

        return CustomGpt.deleteOne({ _id: req.params.id });
    } catch (error) {
        handleError(error, 'Error - deleteCustomGpt');
    }
}

const getAll = async (req) => {
    try {

        const {isPrivateBrainVisible}=req.user

        if(req.body.query["brain.id"]){

            const accessShareBrain=await ShareBrain.findOne({"brain.id":req.body.query["brain.id"],"user.id":req.user.id})

            if(!accessShareBrain){
                return {
                    status: 302,
                    message: "You are unauthorized to access this custom bots",
                };
            }

            const currBrain=await Brain.findById({ _id:req.body.query["brain.id"]})

            if(!isPrivateBrainVisible && !currBrain.isShare){
               return {
                   status: 302,
                   message: "You are unauthorized to access this custom bots",
               };
            }
        }
    
        return dbService.getAllDocuments(
            CustomGpt,
            req.body.query || {},
            req.body.options || {},
        )
    } catch (error) {
        handleError(error, 'Error - getAll');
    }
}

const partialUpdate = async (req) => {
    try {
        return CustomGpt.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true }).select('isActive');
    } catch (error) {
        handleError(error, 'Error - partialUpdate');
    }
}

/**
 * Process and store vector data using Pinecone instead of Python API
 * @param {Object} req - Request object
 * @param {Array} payloads - Array of file payloads to process
 * @returns {Promise<boolean>} - Success status
 */
const storeVectorData = async (req, payloads) => {
    try {
        // Process each file payload
        for (const payload of payloads) {
            try {
                
                // 1. Fetch file from S3
                const fileBuffer = await fetchFileFromS3(payload.uri);
                
                // 2. Extract text content
                const textContent = await extractTextFromFile(fileBuffer, payload.type, payload.file_name);
                
                if (!textContent || !textContent.trim()) {
                    logger.warn(`No text content extracted from ${payload.file_name}, skipping`);
                    continue;
                }
                
                // 3. Split text into chunks
                const chunks = await textSplitter.splitText(textContent);
                
                if (chunks.length === 0) {
                    logger.warn(`No chunks created for ${payload.file_name}, skipping`);
                    continue;
                }
                
                // 4. Ensure Pinecone index exists
                await ensureIndex(payload.companyId, EMBEDDINGS.VECTOR_SIZE || 1536);
                
                // 5. Generate embeddings and prepare vectors
                const vectors = [];
                const expectDim = EMBEDDINGS.VECTOR_SIZE || 1536;
                
                for (let i = 0; i < chunks.length; i++) {
                    try {
                        // Generate embedding for this chunk
                        const embedding = await embedText(chunks[i]);
                        
                        // Validate embedding
                        const vector = Array.isArray(embedding) && embedding.length === expectDim 
                            ? embedding 
                            : generateHashVector(chunks[i], expectDim);
                        
                        // Create Pinecone point
                        const point = {
                            id: uuidv4(),
                            values: vector,
                            metadata: {
                                filename: payload.file_name,
                                fileId: payload.fileId,
                                companyId: payload.companyId,
                                brainId: payload.brainId,
                                tag: payload.tag,
                                chunkIndex: i,
                                text: chunks[i],
                                mimetype: payload.type,
                                s3Key: payload.uri.replace(/^\//, '')
                            }
                        };
                        
                        vectors.push(point);
                        
                    } catch (embedError) {
                        logger.warn(`Embedding failed for chunk ${i} of ${payload.file_name}: ${embedError.message}`);
                        
                        // Use hash vector as fallback
                        const point = {
                            id: uuidv4(),
                            values: generateHashVector(chunks[i], expectDim),
                            metadata: {
                                filename: payload.file_name,
                                fileId: payload.fileId,
                                companyId: payload.companyId,
                                brainId: payload.brainId,
                                tag: payload.tag,
                                chunkIndex: i,
                                text: chunks[i],
                                mimetype: payload.type,
                                s3Key: payload.uri.replace(/^\//, '')
                            }
                        };
                        
                        vectors.push(point);
                    }
                }
                
                // 6. Store vectors in Pinecone
                if (vectors.length > 0) {
                    const namespace = payload.brainId || '__default__';
                    await upsertDocuments(payload.companyId, vectors, namespace);
                }
                
            } catch (fileError) {
                logger.error(`Error processing file ${payload.file_name}: ${fileError.message}`);
                // Continue with other files even if one fails
            }
        }
        return true;
        
    } catch (error) {
        logger.error(`Error in storeVectorData: ${error.message}`);
        return false;
    }
};

const assignDefaultGpt = async (req) => {
    try {
        const { title, brain, responseModel : reqResponseModel, selectedBrain } = req.body;
        const {isPrivateBrainVisible}=req.user

        const bulk = [];
        
        
        const timestamp = Date.now();
        const slug = `${slugify(title)}-${timestamp}`;
        const createData = { ...req.body, slug, coverImg: {}, doc: [] };

        const defaultModal = await CompanyModal.findOne({ 'company.id': getCompanyId(req.user), name: MODAL_NAME.GPT_5_CHAT_LATEST });
        
        if (!defaultModal) return false;
        
        responseModel = {
            name: defaultModal?.name,
            id: defaultModal?._id,
            company: reqResponseModel?.company,
            bot: defaultModal.bot
        }

        for (const br of selectedBrain) {
            const hasAccess = await accessOfBrainToUser({ brainId: br.id, userId: req.user.id });
            if (hasAccess &&  (br.isShare || (isPrivateBrainVisible && !br.isShare))) {
                
                bulk.push({
                    ...createData,
                    brain: formatBrain(br),
                    owner: formatUser(req.user),
                    responseModel
                });
            }
        } 

        return CustomGpt.insertMany(bulk);
        
    } catch (error) {
        handleError(error, 'Error - addCustomGpt');
    }
}

async function usersWiseGetAll(req) {
    try {
        const brains = await getShareBrains(req);
        if (!brains.length) return { data: [], paginator: {} };
        const brainStatus = await getBrainStatus(brains);
        const query ={
            'brain.id': { $in: brains.filter(ele => ele?.brain?.id).map(ele => ele.brain.id) },
            ...req.body.query
        }
        delete query.workspaceId;
        const result = await dbService.getAllDocuments(CustomGpt, query, req.body.options || {});
        const finalResult = result.data.map((record) => ({
            ...record._doc,
            isShare: brainStatus.find((ele) => ele?._id?.toString() === record?.brain?.id?.toString())?.isShare,
        }))
        return {
            data: finalResult,
            paginator: result.paginator
        }
    } catch (error) {
        handleError(error, 'Error - usersWiseGetAll');
    }
}

const favoriteCustomGpt = async (req) => {
    try {
        const updateOperation = req.body.isFavorite
            ? { $addToSet: { favoriteByUsers: req.userId } }
            : { $pull: { favoriteByUsers: req.userId } };

        return await CustomGpt.findOneAndUpdate(
            { _id: req.params.id },
            updateOperation,
            { new: true }
        ).select("favoriteByUsers _id");
    } catch (error) {
        handleError(error, "Error - favoriteCustomGpt");
    }
};

const getAgents = async (req) => {
    try {
        const { brainId } = req.params;
        const agents = await CustomGpt.find({
            'brain.id': brainId,
            type: 'agent'
        });
        return agents;
    } catch (error) {
        handleError(error, "Error - getAgents");
    }
};

module.exports = {
    addCustomGpt,
    updateCustomGpt,
    viewCustomGpt,
    deleteCustomGpt,
    getAll,
    partialUpdate,
    storeVectorData,
    assignDefaultGpt,
    usersWiseGetAll,
    favoriteCustomGpt,
    getAgents
}