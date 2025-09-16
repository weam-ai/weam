const Page = require('../models/page');
const { formatUser, encryptedData, getCompanyId, decryptedData } = require('../utils/helper');
const { handleError } = require('../utils/helper');
const dbService = require('../utils/dbService');

const createPageFromResponse = async (req) => {
    try {
        console.log('createPageFromResponse service - Request body:', JSON.stringify(req.body, null, 2));
        const { originalMessageId, title, content, chatId, user, brain, model, tokens, responseModel, responseAPI, companyId } = req.body;
        
        console.log('createPageFromResponse service - Brain data:', brain);
        console.log('createPageFromResponse service - Brain type:', typeof brain);
        
        // Check if a page with the same title already exists for this company
        const existingPage = await Page.findOne({ 
            title: title, 
            companyId: companyId 
        });
        
        // Encrypt the content in the same format as AI responses
        const contentData = {
            data: {
                content: content
            }
        };
        
        // Prepare page data
        const pageData = {
            title: title,
            content: encryptedData(JSON.stringify(contentData)),
            originalMessageId: originalMessageId,
            chatId: chatId,
            chat_session_id: chatId,
            user: formatUser(user),
            brain: brain,
            model: model,
            tokens: tokens,
            responseModel: responseModel,
            responseAPI: responseAPI,
            companyId: companyId,
            ai: encryptedData(JSON.stringify(contentData)), // Store in ai field for consistency
            system: {},
            sumhistory_checkpoint: {},
            usedCredit: 0,
            isPaid: false,
            seq: Date.now()
        };
        
        if (existingPage) {
            // Update existing page
            console.log(`Updating existing page with title: ${title} (ID: ${existingPage._id})`);
            const updatedPage = await Page.findByIdAndUpdate(
                existingPage._id,
                { 
                    ...pageData, 
                    updatedAt: new Date(),
                    // Keep the original createdAt timestamp
                    createdAt: existingPage.createdAt
                },
                { new: true }
            );
            return { 
                status: 200, 
                code: 'UPDATED', 
                message: 'Page updated successfully', 
                data: updatedPage,
                isUpdate: true
            };
        } else {
            // Create new page
            console.log(`Creating new page with title: ${title}`);
            const page = await Page.create(pageData);
            return { 
                status: 201, 
                code: 'CREATED', 
                message: 'Page created successfully', 
                data: page,
                isUpdate: false
            };
        }
    } catch (error) {
        console.log('createPageFromResponse service - Error:', error);
        handleError(error, 'Error - createPageFromResponse');
    }
};

const getAllPages = async (req) => {
    try {
        const { query = {}, options = {} } = req.body;
        
        // Handle both nested and flat query structures
        const actualQuery = query.query || query;
        
        // Ensure proper sorting for descending order
        const finalOptions = {
            ...options,
            sort: { createdAt: -1 } // Always sort by newest first
        };
        
        const result = await dbService.getAllDocuments(Page, actualQuery, finalOptions);
        
        // Decrypt content for each page
        const finalResult = await Promise.all(result.data.map(async (page) => {
            try {
                const decryptedContent = page.content ? JSON.parse(await decryptedData(page.content)) : null;
                const decryptedAi = page.ai ? JSON.parse(await decryptedData(page.ai)) : null;
                
                return {
                    ...page._doc,
                    content: decryptedContent?.data?.content || '',
                    ai: decryptedAi?.data?.content || ''
                };
            } catch (error) {
                console.error('Error decrypting page:', error);
                return page._doc;
            }
        }));
        
        return {
            status: 200,
            code: 'SUCCESS',
            message: 'Pages retrieved successfully',
            data: finalResult,
            paginator: result.paginator,
        };
    } catch (error) {
        handleError(error, 'Error - getAllPages');
    }
};

const getPageById = async (req) => {
    try {
        const page = await Page.findById(req.params.id);
        if (!page) {
            throw new Error('Page not found');
        }
        return page;
    } catch (error) {
        handleError(error, 'Error - getPageById');
    }
};

const updatePage = async (req) => {
    try {
        const { title, content, brain, model, tokens, responseModel, responseAPI } = req.body;
        
        let updateData = {};
        if (title) updateData.title = title;
        if (content) {
            // First, get the existing page to preserve its structure
            const existingPage = await Page.findById(req.params.id);
            if (existingPage && existingPage.ai) {
                try {
                    // Decrypt existing AI response to get its structure
                    const decryptedExistingAI = decryptedData(existingPage.ai);
                    const existingAIStructure = JSON.parse(decryptedExistingAI);
                    
                    // Update only the content while preserving all other fields
                    const updatedAIStructure = {
                        ...existingAIStructure,
                        data: {
                            ...existingAIStructure.data,
                            content: content
                        }
                    };
                    
                    updateData.content = encryptedData(JSON.stringify(updatedAIStructure));
                    updateData.ai = encryptedData(JSON.stringify(updatedAIStructure));
                } catch (parseError) {
                    console.error('Error parsing existing AI structure:', parseError);
                    // Fallback to minimal structure if parsing fails
                    const contentData = { data: { content: content } };
                    updateData.content = encryptedData(JSON.stringify(contentData));
                    updateData.ai = encryptedData(JSON.stringify(contentData));
                }
            } else {
                // If no existing AI structure, create a minimal one
                const contentData = { data: { content: content } };
                updateData.content = encryptedData(JSON.stringify(contentData));
                updateData.ai = encryptedData(JSON.stringify(contentData));
            }
        }
        if (brain) updateData.brain = brain;
        if (model) updateData.model = model;
        if (tokens) updateData.tokens = tokens;
        if (responseModel) updateData.responseModel = responseModel;
        if (responseAPI) updateData.responseAPI = responseAPI;
        
        updateData.updatedAt = new Date();
        
        const page = await Page.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!page) {
            throw new Error('Page not found');
        }
        
        return page;
    } catch (error) {
        handleError(error, 'Error - updatePage');
    }
};

const deletePage = async (req) => {
    try {
        const page = await Page.findByIdAndDelete(req.params.id);
        if (!page) {
            throw new Error('Page not found');
        }
        return { message: 'Page deleted successfully' };
    } catch (error) {
        handleError(error, 'Error - deletePage');
    }
};

module.exports = {
    createPageFromResponse,
    getAllPages,
    getPageById,
    updatePage,
    deletePage
};
