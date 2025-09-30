/**
 * MongoDB MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 * Using Mongoose ODM
 */

const mongoose = require('mongoose');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

/**
 * Custom JSON replacer to handle MongoDB ObjectId and other BSON types
 * @param {string} key - The key
 * @param {any} value - The value
 * @returns {any} Converted value
 */
function mongoJSONReplacer(key, value) {
    if (value instanceof mongoose.Types.ObjectId) {
        return value.toString();
    }
    return value;
}

/**
 * Get MongoDB connection string from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} MongoDB connection string or null if not found
 */
async function getMongoConnectionString(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.MONGODB || !user.mcpdata.MONGODB.connection_string) {
            return null;
        }
        // Decrypt the connection string before returning
        const decryptedConnectionString = user.mcpdata.MONGODB.connection_string;

        return decryptedConnectionString;
    } catch (error) {
        console.error('Error fetching MongoDB connection string:', error.message);
        return null;
    }
}

/**
 * Connect to a MongoDB instance
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name (optional)
 * @returns {string} JSON string with connection status or error message
 */
async function connectToMongoDB(userId = null, databaseName = null) {

    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);

    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        // Create a new connection for this operation
        const connection = await mongoose.createConnection(connectionString);
        console.log("Connection started ")
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Test the connection
        await connection.db.command({ ping: 1 });
        console.log("ping.... ")

        if (databaseName) {

            const db = connection.useDb(databaseName);
            const collections = await db.db.listCollections().toArray();
            const collectionNames = collections.map(col => col.name);
            

            await connection.close();
            
            return JSON.stringify({
                success: true,
                message: `Successfully connected to MongoDB database: ${databaseName}`,
                collections: collectionNames
            }, null, 2);
        } else {
            const databases = await connection.db.admin().listDatabases();
            const databaseNames = databases.databases.map(db => db.name);
            
            console.log('Connected to MongoDB instance');
            await connection.close();
            
            return JSON.stringify({
                success: true,
                message: 'Successfully connected to MongoDB instance',
                databases: databaseNames
            }, null, 2);
        }
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Connection error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Run a find query against a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Object} query - Query filter (optional)
 * @param {number} limit - Maximum number of documents to return
 * @param {Object} projection - Fields to include/exclude (optional)
 * @returns {string} JSON string with documents or error message
 */
async function findDocuments(userId = null, databaseName, collectionName, query = null, limit = 10, projection = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = await mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        if (query === null) {
            query = {};
        } else if (typeof query === 'string') {
            try {
                query = JSON.parse(query);
            } catch (error) {
                console.error(`Error parsing query string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Parameter "filter" to find() must be an object, got "${query}" (type string)`
                }, null, 2);
            }
        }
        
        let mongooseQuery = CollectionModel.find(query).limit(limit);
        
        if (projection) {
            mongooseQuery = mongooseQuery.select(projection);
        }
        
        const documents = await mongooseQuery.lean();
        
        
        await connection.close();
        
        return JSON.stringify({
            success: true,
            documents: documents,
            count: documents.length
        }, mongoJSONReplacer, 2);
        
    } catch (error) {
        console.error(`Error finding documents: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Find error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Run an aggregation against a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {string} JSON string with aggregation results or error message
 */
async function aggregateDocuments(userId = null, databaseName, collectionName, pipeline) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = await mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        // Handle string pipeline
        if (typeof pipeline === 'string') {
            try {
                pipeline = JSON.parse(pipeline);
            } catch (error) {
                console.error(`Error parsing pipeline string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Pipeline must be an array, got "${pipeline}" (type string)`
                }, null, 2);
            }
        }
        
        // Ensure pipeline is an array
        if (!Array.isArray(pipeline)) {
            return JSON.stringify({
                success: false,
                error: `Pipeline must be an array, got ${typeof pipeline}`
            }, null, 2);
        }
        
        const results = await CollectionModel.aggregate(pipeline);
        
        console.log(`Aggregation returned ${results.length} results from ${databaseName}.${collectionName}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            results: results,
            count: results.length
        }, mongoJSONReplacer, 2);
        
    } catch (error) {
        console.error(`Error in aggregation: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Aggregation error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Get the number of documents in a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Object} query - Query filter (optional)
 * @returns {string} JSON string with document count or error message
 */
async function countDocuments(userId = null, databaseName, collectionName, query = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Handle string query
        if (query && typeof query === 'string') {
            try {
                query = JSON.parse(query);
            } catch (error) {
                console.error(`Error parsing query string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Query must be an object, got "${query}" (type string)`
                }, null, 2);
            }
        }
        
        // Ensure query is an object if provided
        if (query !== null && (typeof query !== 'object' || Array.isArray(query))) {
            return JSON.stringify({
                success: false,
                error: `Query must be an object, got ${typeof query}`
            }, null, 2);
        }
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        // Set default empty query if null
        if (query === null) {
            query = {};
        }
        
        const count = await CollectionModel.countDocuments(query);
        
        console.log(`Counted ${count} documents in ${databaseName}.${collectionName}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            count: count
        }, null, 2);
        
    } catch (error) {
        console.error(`Error counting documents: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Count error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Insert a single document into a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Object} document - Document to insert
 * @returns {string} JSON string with insert result or error message
 */
async function insertOneDocument(userId = null, databaseName, collectionName, document) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Handle string documents
        if (typeof documents === 'string') {
            try {
                documents = JSON.parse(documents);
            } catch (error) {
                console.error(`Error parsing documents string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Documents must be an array, got "${documents}" (type string)`
                }, null, 2);
            }
        }
        
        // Ensure documents is an array
        if (!Array.isArray(documents)) {
            return JSON.stringify({
                success: false,
                error: `Documents must be an array, got ${typeof documents}`
            }, null, 2);
        }
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const newDocument = new CollectionModel(document);
        const result = await newDocument.save();
        
        console.log(`Inserted document with ID: ${result._id}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            inserted_id: result._id.toString(),
            acknowledged: true
        }, null, 2);
        
    } catch (error) {
        console.error(`Error inserting document: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Insert error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Insert multiple documents into a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Array} documents - List of documents to insert
 * @returns {string} JSON string with insert result or error message
 */
async function insertManyDocuments(userId = null, databaseName, collectionName, documents) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Handle string filterQuery
        if (typeof filterQuery === 'string') {
            try {
                filterQuery = JSON.parse(filterQuery);
            } catch (error) {
                console.error(`Error parsing filterQuery string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Filter query must be an object, got "${filterQuery}" (type string)`
                }, null, 2);
            }
        }
        

        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const result = await CollectionModel.insertMany(documents);
        
        console.log(`Inserted ${result.length} documents`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            inserted_ids: result.map(doc => doc._id.toString()),
            inserted_count: result.length,
            acknowledged: true
        }, null, 2);
        
    } catch (error) {
        console.error(`Error inserting documents: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Insert error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Update a single document in a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Object} filterQuery - Query to match documents
 * @param {Object} update - Update operations
 * @param {boolean} upsert - Create document if not found
 * @returns {string} JSON string with update result or error message
 */
async function updateOneDocument(userId = null, databaseName, collectionName, filterQuery, update, upsert = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Handle string filterQuery
        if (typeof filterQuery === 'string') {
            try {
                filterQuery = JSON.parse(filterQuery);
            } catch (error) {
                console.error(`Error parsing filterQuery string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Filter query must be an object, got "${filterQuery}" (type string)`
                }, null, 2);
            }
        }
        
        // Handle string update
        if (typeof update === 'string') {
            try {
                update = JSON.parse(update);
            } catch (error) {
                console.error(`Error parsing update string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Update must be an object, got "${update}" (type string)`
                }, null, 2);
            }
        }
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const result = await CollectionModel.updateOne(filterQuery, update, { upsert });
        
        console.log(`Updated ${result.modifiedCount} document(s)`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            matched_count: result.matchedCount,
            modified_count: result.modifiedCount,
            upserted_id: result.upsertedId ? result.upsertedId.toString() : null,
            acknowledged: result.acknowledged
        }, null, 2);
        
    } catch (error) {
        console.error(`Error updating document: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Update error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Update multiple documents in a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Object} filterQuery - Query to match documents
 * @param {Object} update - Update operations
 * @param {boolean} upsert - Create document if not found
 * @returns {string} JSON string with update result or error message
 */
async function updateManyDocuments(userId = null, databaseName, collectionName, filterQuery, update, upsert = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Handle string filterQuery
        if (typeof filterQuery === 'string') {
            try {
                filterQuery = JSON.parse(filterQuery);
            } catch (error) {
                console.error(`Error parsing filterQuery string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Filter query must be an object, got "${filterQuery}" (type string)`
                }, null, 2);
            }
        }
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const result = await CollectionModel.updateMany(filterQuery, update, { upsert });
        
        console.log(`Updated ${result.modifiedCount} document(s)`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            matched_count: result.matchedCount,
            modified_count: result.modifiedCount,
            upserted_id: result.upsertedId ? result.upsertedId.toString() : null,
            acknowledged: result.acknowledged
        }, null, 2);
        
    } catch (error) {
        console.error(`Error updating documents: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Update error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Delete a single document from a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Object} filterQuery - Query to match document to delete
 * @returns {string} JSON string with delete result or error message
 */
async function deleteOneDocument(userId = null, databaseName, collectionName, filterQuery) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Handle string filterQuery
        if (typeof filterQuery === 'string') {
            try {
                filterQuery = JSON.parse(filterQuery);
            } catch (error) {
                console.error(`Error parsing filterQuery string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Filter query must be an object, got "${filterQuery}" (type string)`
                }, null, 2);
            }
        }
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const result = await CollectionModel.deleteOne(filterQuery);
        
        console.log(`Deleted ${result.deletedCount} document`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            deleted_count: result.deletedCount,
            acknowledged: result.acknowledged
        }, null, 2);
        
    } catch (error) {
        console.error(`Error deleting document: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Delete error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Delete multiple documents from a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {Object} filterQuery - Query to match documents to delete
 * @returns {string} JSON string with delete result or error message
 */
async function deleteManyDocuments(userId = null, databaseName, collectionName, filterQuery) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        // Handle string filterQuery
        if (typeof filterQuery === 'string') {
            try {
                filterQuery = JSON.parse(filterQuery);
            } catch (error) {
                console.error(`Error parsing filterQuery string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Filter query must be an object, got "${filterQuery}" (type string)`
                }, null, 2);
            }
        }
        
        // Handle string update
        if (typeof update === 'string') {
            try {
                update = JSON.parse(update);
            } catch (error) {
                console.error(`Error parsing update string: ${error.message}`);
                return JSON.stringify({
                    success: false,
                    error: `Update must be an object, got "${update}" (type string)`
                }, null, 2);
            }
        }
        
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const result = await CollectionModel.deleteMany(filterQuery);
        
        console.log(`Deleted ${result.deletedCount} documents`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            deleted_count: result.deletedCount,
            acknowledged: result.acknowledged
        }, null, 2);
        
    } catch (error) {
        console.error(`Error deleting documents: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Delete error: ${error.message}`
        }, null, 2);
    }
}

/**
 * List all databases for a MongoDB connection
 * @param {string} userId - User ID to get connection string from
 * @returns {string} JSON string with databases list or error message
 */
async function listDatabases(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        
        // Wait for the connection to be ready before accessing db
        await new Promise(resolve => {
            if (connection.readyState === 1) { // already connected
                resolve();
            } else {
                connection.once('connected', () => resolve());
            }
        });
        
        const databases = await connection.db.admin().listDatabases();
        const databaseNames = databases.databases.map(db => db.name);
        
        console.log(`Found ${databaseNames.length} databases`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            databases: databaseNames,
            count: databaseNames.length
        }, null, 2);
        
    } catch (error) {
        console.error(`Error listing databases: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `List databases error: ${error.message}`
        }, null, 2);
    }
}

/**
 * List all collections for a given database
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @returns {string} JSON string with collections list or error message
 */
async function listCollections(userId = null, databaseName) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    console.log("connectionString_in_list_collections====:", connectionString)
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        const db = connection.useDb(databaseName);
        
        const collections = await db.db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);
        
        console.log(`Found ${collectionNames.length} collections in database: ${databaseName}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            collections: collectionNames,
            count: collectionNames.length,
            database: databaseName
        }, null, 2);
        
    } catch (error) {
        console.error(`Error listing collections: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `List collections error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Create an index for a MongoDB collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @param {string|Array} indexSpec - Index specification (field name or array of tuples)
 * @param {boolean} unique - Whether the index should be unique
 * @returns {string} JSON string with index creation result or error message
 */
async function createIndex(userId = null, databaseName, collectionName, indexSpec, unique = false) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const result = await CollectionModel.collection.createIndex(indexSpec, { unique });
        
        console.log(`Created index: ${result}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            index_name: result
        }, null, 2);
        
    } catch (error) {
        console.error(`Error creating index: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Create index error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Describe the indexes for a collection
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @returns {string} JSON string with indexes information or error message
 */
async function collectionIndexes(userId = null, databaseName, collectionName) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        const db = connection.useDb(databaseName);
        
        // Create a dynamic model for the collection
        const CollectionModel = db.model(collectionName, new mongoose.Schema({}, { strict: false, collection: collectionName }));
        
        const indexes = await CollectionModel.collection.indexes();
        
        console.log(`Found ${indexes.length} indexes for collection: ${collectionName}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            indexes: indexes,
            count: indexes.length
        }, mongoJSONReplacer, 2);
        
    } catch (error) {
        console.error(`Error getting collection indexes: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Collection indexes error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Remove a collection from a MongoDB database
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @param {string} collectionName - Collection name
 * @returns {string} JSON string with drop result or error message
 */
async function dropCollection(userId = null, databaseName, collectionName) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        const db = connection.useDb(databaseName);
        
        await db.dropCollection(collectionName);
        
        console.log(`Dropped collection: ${collectionName}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            message: `Collection '${collectionName}' dropped successfully`
        }, null, 2);
        
    } catch (error) {
        console.error(`Error dropping collection: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Drop collection error: ${error.message}`
        }, null, 2);
    }
}

/**
 * Return statistics about a MongoDB database
 * @param {string} userId - User ID to get connection string from
 * @param {string} databaseName - Database name
 * @returns {string} JSON string with database statistics or error message
 */
async function dbStats(userId = null, databaseName) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    const connectionString = await getMongoConnectionString(userId);
    if (!connectionString) {
        return 'Error: MongoDB connection string not found. Please configure your MongoDB integration in your profile settings.';
    }

    try {
        const connection = mongoose.createConnection(connectionString);
        const db = connection.useDb(databaseName);
        
        const stats = await db.db.stats();
        
        console.log(`Retrieved stats for database: ${databaseName}`);
        await connection.close();
        
        return JSON.stringify({
            success: true,
            stats: stats
        }, mongoJSONReplacer, 2);
        
    } catch (error) {
        console.error(`Error getting database stats: ${error.message}`);
        return JSON.stringify({
            success: false,
            error: `Database stats error: ${error.message}`
        }, null, 2);
    }
}

module.exports = {
    connectToMongoDB,
    findDocuments,
    aggregateDocuments,
    countDocuments,
    insertOneDocument,
    insertManyDocuments,
    updateOneDocument,
    updateManyDocuments,
    deleteOneDocument,
    deleteManyDocuments,
    listDatabases,
    listCollections,
    createIndex,
    collectionIndexes,
    dropCollection,
    dbStats
};