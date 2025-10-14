const { RANDOM_PASSWORD_CHAR, PASSWORD_REGEX, ATRATE, GLOBAL_ERROR_CODE, ROLE_TYPE, INVITATION_TYPE } = require('../config/constants/common');
const bcrypt = require('bcrypt');
const { createTopic } = require('../kafka/admin');
const CryptoJS = require('crypto-js');
const { SELECTED_IGNORE_KEYS } = require('../config/constants/schemaref');
const { MESSAGE_TYPE } = require('../config/constants/aimodal');
const { ENCRYPTION_KEY } = require('../config/config');
const Subscription = require('../models/subscription');
/**
 * Wraps an asynchronous function with error handling to catch and respond to any errors.
 * @param {Function} fn - The asynchronous function to be wrapped.
 * @returns {Function} - A middleware function with error handling for asynchronous operations.
 */
const catchAsync = (fn) => (req, res, next) => {
    // Resolve the asynchronous function and catch any potential errors.
    Promise.resolve(fn(req, res, next)).catch((err) => {
        // Respond with a failure response, localizing the error message if available.
        return util.failureResponse(
            { message: _localize(err.message, req) },
            res,
        );
    });
};


/**
 * Localizes a given key by retrieving its translation and optionally replacing placeholders.
 * @param {string} key - The translation key to localize.
 * @param {Object} req - The request object, typically containing internationalization (i18n) settings.
 * @param {Object|string} module - An optional object or string used to replace placeholders in the translation.
 * @returns {string} - The localized string with optional placeholder replacements.
 */

const localize = (key, req, module = null) => {
    // Check if a module is provided for placeholder replacement.

    if (module) {
        // If the module is an object, replace placeholders using keys and values from the module.

        if (module instanceof Object) {
            // Create a regex pattern using keys from the module for replacement.

            let replace = new RegExp(Object.keys(module).join('|'), 'gi');
            // Replace placeholders in the translation with corresponding values from the module.

            return req.i18n.t(key).replace(replace, function (matched) {
                return module[matched];
            });
        }
        // If the module is a string, replace '{module}' placeholder with the formatted module string.

        return req.i18n.t(key).replaceAll('{module}', _toTitleCase(module));
    }
    // If no module is provided, simply retrieve and return the localized string.

    return req.i18n.t(key);
};

const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

function handleError(error, msg) {
    logger.error(msg, { error });
    throw new Error(error.message || error);
}

/**
 * Constructs a MongoDB filter query based on the provided query parameters.
 * @param {Object} query - The query object containing search parameters.
 * @param {string} query.search - The search term to filter results.
 * @param {Array} query.searchColumns - The columns to search for the given term.
 * @returns {Object} - The constructed MongoDB filter query.
 */

const getFilterQuery = async (query) => {
    // Check if a search term is provided and not empty.
    if (query.search && query.search !== '') {
        // Create an '$or' condition to search across specified columns using a regex pattern.

        query['$or'] = query.searchColumns.map((column) => {
            return {
                [column]: {
                    $regex: query.search
                        .replace(/[-[\]{}()*+?.,\\/^$|#]/g, '\\$&')
                        .trim(),
                    $options: 'i', // Case-insensitive search.
                },
            };
        });
    }
    // Remove the 'search' and 'searchColumns' properties from the query.
    delete query.search;
    delete query.searchColumns;
    // Return the constructed MongoDB filter query.
    return query;
};

function randomPasswordGenerator() {
    let pass = '';
    let checkPass = false;

    while (!checkPass) {
        pass = '';
        for (let i = 1; i <= 8; i++) {
            let char = Math.floor(
                Math.random() * RANDOM_PASSWORD_CHAR.length,
            );
            if (i === 5) {
                pass += ATRATE;
            }
            pass += RANDOM_PASSWORD_CHAR.charAt(char);
        }
        checkPass = PASSWORD_REGEX.test(pass);
    }

    return pass;
};

/**
 * Groups an array of objects based on a specified key.
 * @param {Array} items - The array of objects to be grouped.
 * @param {string} key - The key by which the objects will be grouped.
 * @returns {Object} - An object representing the grouped items based on the specified key.
 */
const groupBy = (items, key) =>
    items.reduce(
        (result, item) => ({
            ...result,
            [item[key]]: [...(result[item[key]] || []), item],
        }),
        {},
    );

/**
 * Creates a new object by picking specified keys from the given object.
 * @param {Object} object - The object from which keys will be picked.
 * @param {Array} keys - The array of keys to be picked from the object.
 * @returns {Object} - A new object containing only the specified keys and their corresponding values.
 */

const pick = (object, keys) => {
    // Use the reduce function to create a new object by picking specified keys.
    return keys.reduce((obj, key) => {
        // Check if the original object exists before attempting to pick the key.
        if (object) {
            obj[key] = object[key];
        }
        return obj;
    }, {});
};

const genHash = (maxRange = 99999999, saltSync = 5) => {
    const salt = bcrypt.genSaltSync(saltSync);
    const random = Math.floor(Math.random() * maxRange * 54) + 2;
    return bcrypt.hashSync(random.toString(), salt);
}

async function createKafkaTopic(req) {
    try {
        return createTopic(req.body.topic, req.body.partition);
    } catch (error) {
        handleError(error, 'Error - createKafkaTopic');
    }
}

function generateRandomToken(size = 50) {
    let str = RANDOM_PASSWORD_CHAR.split('');
    const token = [];
    let j;
    for (let index = 0; index < size; index++) {
        j = (Math.random() * (str.length - 1)).toFixed(0);
        token[index] = str[j];
    }
    return token.join('');
}

const cipherEncryption = (data, key) => {
    const encrypted = CryptoJS.AES.encrypt(data, key);

    return {
        key: CryptoJS.enc.Base64.stringify(encrypted.key),
        iv: CryptoJS.enc.Base64.stringify(encrypted.iv),
        ciphertext: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
        apikey: encrypted.toString()
    };
};

const cipherDecryption = (encryptdata, key) => {
    return CryptoJS.AES.decrypt(encryptdata, key).toString(CryptoJS.enc.Utf8);
}

const slugify = (text) => {
    return text
        ?.toString()
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
}

const updateDBRef = async (data) => {
    try {
        const promises = [];
        for (const [collection, details] of Object.entries(data.collectionDetails)) {
            const model = require(`../models/${collection}`)
            details?.arrayType?.forEach(async (item) => {
                const updateObj = {}
                Object.entries(data.updatedData).forEach(([key, value]) => {
                    if (!SELECTED_IGNORE_KEYS.includes(key)) {
                        Object.assign(updateObj, { [`${item}.$.${key}`]: value });
                    }
                });
                promises.push(model.updateMany({ [`${item}.id`]: data.updatedData._id }, { $set: updateObj }));
            });
            details?.objectType?.forEach(async (item) => {
                const updateObj = {}
                Object.entries(data.updatedData).forEach(([key, value]) => {
                    if (!SELECTED_IGNORE_KEYS.includes(key)) {
                        Object.assign(updateObj, { [`${item}.${key}`]: value });
                    }
                });
                promises.push(model.updateMany({ [`${item}.id`]: data.updatedData._id }, { $set: updateObj }));
            });
        }
        await Promise.all(promises);
    } catch (error) {
        handleError(error, 'Error - updateDBRef');
    }
}

const deleteDBRef = async (data) => {
    try {
        const promises = [];
        for (const [collection, details] of Object.entries(data.collectionDetails)) {
            const model = require(`../models/${collection}`)
            details?.arrayType?.forEach(async (item) => {
                const updateObj = { $pull: { [item]: { id: data.removeData._id }}}
                promises.push(model.updateMany({ [`${item}.id`]: data.removeData._id }, updateObj ));
            });
            details?.objectType?.forEach(async (item) => {
                const updateObj = { $unset: { [item]: { id: data.removeData._id } } }
                promises.push(model.updateMany({ [`${item}.id`]: data.removeData._id }, updateObj ));
            });
        }
        await Promise.all(promises);
    } catch (error) {
        handleError(error, 'Error - deleteDBRef');
    }
}

const convertCodeFormat = (str) => {
    return str.replace(/\s+/g, '_').toUpperCase()
}

const formatUser = (user) => {
    return {
        email: user.email,
        id: user.id,
        profile: user?.profile,
        fname: user?.fname,
        lname: user?.lname,
    }
}

const formatBrain = (brain) => {
    return {
        title: brain.title,
        slug: brain.slug,
        id: brain.id,
    }
}

const capitalFirstLetter = (str) => `${str.charAt(0).toUpperCase()}${str.toLowerCase().slice(1)}`

const formatAIMessage = (payload) => {
    return {
        type: MESSAGE_TYPE.HUMAN,
        data: {
            content: payload,
            additional_kwargs: {},
            response_metadata: {},
            type: MESSAGE_TYPE.HUMAN,
            name: null,
            id: null,
            example: false,
            tool_calls: [],
            invalid_tool_calls: [],
        },
    }
}

const formatAIMessageResponse = (payload, response_metadata = {}) => {
    return {
        type: MESSAGE_TYPE.AI,
        data: {
            content: payload,
            additional_kwargs: {},
            response_metadata: {
                citations: response_metadata.search_citations,
                search_results: response_metadata.search_results,
            },
            type: MESSAGE_TYPE.AI,
            name: null,
            id: null,
            example: false,
            tool_calls: [],
            invalid_tool_calls: [],
        },
    }
}

const formatDBFileData = (file) => {
    return {
        name: file.name,
        uri: file.uri,
        mime_type: file.mime_type,
        file_size: file.file_size,
        createdAt: file.createdAt,
        id: file.id,
    }
}

/**
 * Note:
 * - These functions use AES encryption in ECB mode with PKCS7 padding.
 * - Ensure the same encryption key is used across both Node.js and Python servers for compatibility.
 * - For Python, you can use the `pycryptodome` library to achieve the same encryption and decryption.
 */

/**
 * Encrypts a string using AES encryption with the provided encryption key.
 * @param {string} data - The string to be encrypted.
 * @returns {string} The encrypted string in Base64 format.
 */
const encryptedData = (data) => {
    const parsedKeys = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const encrypted = CryptoJS.AES.encrypt(data, parsedKeys, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

/**
 * Decrypts a Base64 encoded AES encrypted string using the provided encryption key.
 * 
 * @param {string} data - The Base64 encoded encrypted string to be decrypted.
 * @returns {string} The decrypted string in UTF-8 format.
 */
const decryptedData = (data) => {
    const parsedKeys = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const decryptedText = CryptoJS.AES.decrypt(data, parsedKeys, { mode:CryptoJS.mode.ECB });
    return decryptedText.toString(CryptoJS.enc.Utf8);
}

const globalErrorHandler = (err, req, res, next) => {
    if (err) {
        if (err.code === GLOBAL_ERROR_CODE.LIMIT_FIELD_VALUE) {
            return util.failureResponse(localize('file.large_image', req), res);
        }
        return util.failureResponse({ message: err.message }, res);
    } else {
        next();
    }
};

const arraysEqual = (arr1, arr2) => {
    if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
    return arr1.sort().every((value, index) => value === arr2.sort()[index]);

}

const getCompanyId = (user) => {
    return user.roleCode === ROLE_TYPE.COMPANY ? user.company.id : user.invitedBy;
}

const convertPaginationResult = (data, pagination, filterCount) => {
    try {
        const result = data;
        const limit = pagination.limit;
        const totalPages = Math.max(Math.ceil(result.length / limit), 1);
        const page = Math.max(Math.ceil(pagination.offset / limit) + 1, 1);

        const hasPrevPage = page > 1;
        const prevPage = hasPrevPage ? page - 1 : null;
        const hasNextPage = page < totalPages;
        const nextPage = hasNextPage ? page + 1 : null;

        const responseData = {
            data: result,
            paginator: {
                itemCount: result.length,
                offset: pagination.offset,
                perPage: limit,
                pageCount: totalPages,
                currentPage: page,
                hasPrevPage: hasPrevPage,
                hasNextPage: hasNextPage,
                prev: prevPage,
                next: nextPage,
                filterCount: filterCount || 0,
            },
        };
        return responseData;
    } catch (error) {
        throw new Error(error);
    }
};

const timestampToDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
};

const getRemainingDaysCredit = async (startDate, endDate, msgLimit) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate total subscription days
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const perDayCredit = Math.floor(msgLimit / totalDays);
    
    // Calculate remaining days from current date
    const remainingDays = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
    const remainingDaysCredit = Number((perDayCredit * remainingDays).toFixed(2));
    
    return remainingDaysCredit;
}

function getDefaultBrainSlug(user) {
    return `default-brain-${user._id}`;
}

const cleanText = (text) => text.replace(/[^\w\s]/gi, "").toLowerCase();

const bytesToMegabytes = (bytes) => {
    const megabytes = bytes / (1024 * 1024);
    return megabytes < 0 ? 0 : Math.round(megabytes);
};

const megabytesToBytes = (megabytes) => {
    return megabytes * (1024 * 1024);
};


const catchSocketAsync = (fn) => {
    return async (...args) => {
        try {
            await fn(...args);
        } catch (err) {
            logger.error('Socket Error:', err);
            return Promise.resolve();
        }
    };
};


const dateForMongoQuery = (dateStr, isStart) => {
    const [month, day, year] = dateStr.split('/').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (isStart) {
        date.setUTCHours(0, 0, 0, 0); // Set to start of the day in UTC
    } else {
        date.setUTCHours(23, 59, 59, 999); // Set to end of the day in UTC
    }

    return date.toISOString();
};

const convertDateFormat = (dateStr) => {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

const isInviteAccepted = (inviteStatus) => {
    return !([INVITATION_TYPE.PENDING, INVITATION_TYPE.EXPIRED].includes(inviteStatus))
}

function getFileNameWithoutExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
}

const getDateRangeByCode = async (requestCode) => {
    const now = new Date();
  
    let endMonth = now.getUTCMonth();
    let year = now.getUTCFullYear();
    let startMonth;

    // Special handling for current month
    // if (requestCode === 'currentmonth') {
    //     startMonth = endMonth; // Current month        
    //     // For current month, endMonth should remain the current month
    // } else {

        if (endMonth === 0) { // If current month is January
            endMonth = 11; // December
            year -= 1; // Previous year
        } else {
            endMonth -= 1; // Previous month
        }
        
        switch (requestCode) {
            case 'lastonemonth':
                startMonth = endMonth - 0;
                break;
            case 'lasttwomonth':
                startMonth = endMonth - 1;
                break;
            case 'lastthreemonth':
                startMonth = endMonth - 2;
                break;
            case 'lastfourmonth':
                startMonth = endMonth - 3;
                break;
            case 'lastfivemonth':
                startMonth = endMonth - 4;
                break;
            case 'lastsixmonth':
                startMonth = endMonth - 5;
                break;
            case 'lastsevenmonth':
                startMonth = endMonth - 6;
                break;
            case 'lasteightmonth':
                startMonth = endMonth - 7;
                break;
            case 'lastninemonth':
                startMonth = endMonth - 8;
                break;
            case 'lasttenmonth':
                startMonth = endMonth - 9;
                break;
            case 'lastelevenmonth':
                startMonth = endMonth - 10;
                break;
            case 'lasttwelvemonth':
                startMonth = endMonth - 11;
                break;
            case 'thismonth':
                endMonth    = now.getUTCMonth();
                startMonth  = endMonth;
                break;
            default:
                startMonth = endMonth;
                break;
        }
    // }
    
    const startDate = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59)); // Last day of previous month
    
    return {
        startDate,
        endDate
    }
}

const createPaginator = (itemCount, offset, perPage) => {
    const currentPage = Math.floor(offset / perPage) + 1;
    const pageCount = Math.ceil(itemCount / perPage);

    return {
        itemCount,
        offset,
        perPage,
        pageCount,
        currentPage,
        slNo: offset + 1 || 1,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < pageCount,
        prev: currentPage > 1 ? currentPage - 1 : null,
        next: currentPage < pageCount ? currentPage + 1 : null
    };
}

/**
 * List of restricted file extensions for security purposes
 */
const NOT_RESTRICTED_FILE_EXTENSIONS = ['php', 'js', 'css', 'html', 'sql','xls', 'xlsx'];

/**
 * Checks if a file has a restricted extension
 * @param {string} filename - The filename to check
 * @returns {boolean} - Returns true if the file has a restricted extension
 * 
 * @example
 * hasRestrictedExtension('malicious.php') // returns true
 * hasRestrictedExtension('document.pdf') // returns false
 */
const hasNotRestrictedExtension = (filename) => {
    if (!filename) return false;
    
    const extension = filename.split('.').pop()?.toLowerCase();
    return NOT_RESTRICTED_FILE_EXTENSIONS.includes(extension);
};

/**
 * Validates if a file is safe to upload
 * @param {string} filename - The filename to validate
 * @param {Array} allowedExtensions - Optional array of specifically allowed extensions
 * @returns {Object} - Returns {isValid: boolean, reason: string}
 * 
 * @example
 * validateFileUpload('document.pdf') // returns {isValid: true, reason: 'File is valid'}
 * validateFileUpload('script.php') // returns {isValid: false, reason: 'File extension .php is not allowed for security reasons'}
 * validateFileUpload('image.jpg', ['pdf', 'doc']) // returns {isValid: false, reason: 'File extension .jpg is not in the allowed list: pdf, doc'}
 */
const validateFileUpload = (filename, allowedExtensions = null) => {
    if (!filename) {
        return { isValid: false, reason: 'No filename provided' };
    }

    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension) {
        return { isValid: false, reason: 'No file extension found' };
    }

    // Check if extension is restricted
    if (hasRestrictedExtension(filename)) {
        return { isValid: false, reason: `File extension .${extension} is not allowed for security reasons` };
    }

    // If specific allowed extensions are provided, check against them
    if (allowedExtensions && Array.isArray(allowedExtensions)) {
        if (!allowedExtensions.includes(extension)) {
            return { isValid: false, reason: `File extension .${extension} is not in the allowed list: ${allowedExtensions.join(', ')}` };
        }
    }

    return { isValid: true, reason: 'File is valid' };
};

/**
 * Gets the file extension from a filename
 * @param {string} filename - The filename
 * @returns {string} - The file extension (lowercase)
 * 
 * @example
 * getFileExtension('document.PDF') // returns 'pdf'
 * getFileExtension('image.JPEG') // returns 'jpeg'
 */
const getFileExtension = (filename) => {
    if (!filename) return '';
    return filename.split('.').pop()?.toLowerCase() || '';
};

const parseFormData = (req, res, next) => {
    try {
        // Parse mcpTools if it exists and is a string
        // if (req.body.mcpTools && typeof req.body.mcpTools === 'string') {
        //     try {
        //         req.body.mcpTools = JSON.parse(req.body.mcpTools);
        //     } catch (parseError) {
        //         // If parsing fails, keep it as string and let validation handle it
        //         console.warn('Failed to parse mcpTools JSON:', parseError.message);
        //     }
        // }

        // Parse Agents if it exists and is a string
        if (req.body.Agents && typeof req.body.Agents === 'string') {
            try {
                req.body.Agents = JSON.parse(req.body.Agents);
            } catch (parseError) {
                // If parsing fails, keep it as string and let validation handle it
                console.warn('Failed to parse Agents JSON:', parseError.message);
            }
        }

        // Parse removeDoc if it exists and is a string
        if (req.body.removeDoc && typeof req.body.removeDoc === 'string') {
            try {
                req.body.removeDoc = JSON.parse(req.body.removeDoc);
            } catch (parseError) {
                // If parsing fails, keep it as string and let validation handle it
                console.warn('Failed to parse removeDoc JSON:', parseError.message);
            }
        }

        next();
    } catch (error) {
        console.error('Error in parseFormData middleware:', error);
        next(error);
    }
};

const formatBot = (bot) => {
    return {
        title: bot.title,
        code: bot.code,
        id: bot.id,
    }
}

async function encodeImageToBase64(imagePathOrUrl) {
    console.log("==========ImagePathOrUrl=========",imagePathOrUrl)
  // Handle URLs (http/https)
  if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
    const response = await fetch(imagePathOrUrl);
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL does not point to a valid image.');
    }
    // Get the buffer from the response
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Convert buffer to base64 and create a data URL
    const base64 = buffer.toString('base64');
    const mimeType = contentType || 'image/png';
    return `data:${mimeType};base64,${base64}`;
  } 
  // Handle local files (Node.js)
  else {
    const fs = await import('fs');
    const { lookup } = await import('mime-types');
    const mimeType = lookup(imagePathOrUrl);
    if (!mimeType) {
      throw new Error('Unsupported image format or unknown MIME type.');
    }
    const data = fs.readFileSync(imagePathOrUrl);
    const encodedString = Buffer.from(data).toString('base64');
    return `data:${mimeType};base64,${encodedString}`;
  }
}


module.exports = {
    catchAsync,
    localize,
    toTitleCase,
    handleError,
    getFilterQuery,
    randomPasswordGenerator,
    groupBy,
    pick,
    genHash,
    createKafkaTopic,
    generateRandomToken,
    cipherEncryption,
    cipherDecryption,
    slugify,
    updateDBRef,
    deleteDBRef,
    convertCodeFormat,
    formatUser,
    formatBrain, 
    capitalFirstLetter,
    formatAIMessage,
    formatAIMessageResponse,
    formatDBFileData,
    encryptedData,
    decryptedData,
    globalErrorHandler,
    arraysEqual,
    getCompanyId,
    convertPaginationResult,
    timestampToDate,
    getRemainingDaysCredit,
    getDefaultBrainSlug,
    cleanText,
    dateForMongoQuery,
    convertDateFormat,
    bytesToMegabytes,
    megabytesToBytes,
    catchSocketAsync,
    isInviteAccepted,
    getFileNameWithoutExtension,
    getDateRangeByCode,
    createPaginator,
    hasNotRestrictedExtension,
    validateFileUpload,
    getFileExtension,
    parseFormData,
    NOT_RESTRICTED_FILE_EXTENSIONS,
    formatBot,
    encodeImageToBase64
};