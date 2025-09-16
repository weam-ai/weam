const pageService = require('../../services/page');
const { handleError } = require('../../utils/helper');

const createPageFromResponse = async (req, res) => {
    try {
        console.log('createPageFromResponse - Request body:', JSON.stringify(req.body, null, 2));
        const result = await pageService.createPageFromResponse(req);
        
        // Set appropriate status code and message based on whether it's an update or create
        const statusCode = result.isUpdate ? 200 : 201;
        const message = result.isUpdate ? 'Page updated successfully' : 'Page created successfully';
        
        return res.status(statusCode).json({
            status: statusCode,
            code: result.code,
            message: message,
            data: result.data,
            isUpdate: result.isUpdate
        });
    } catch (error) {
        console.log('createPageFromResponse - Error:', error);
        handleError(error, res);
    }
};

const getAllPages = async (req, res) => {
    try {
        const result = await pageService.getAllPages(req);
        return res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

const getPageById = async (req, res) => {
    try {
        const result = await pageService.getPageById(req);
        return res.status(200).json({
            status: 200,
            code: 'SUCCESS',
            message: 'Page retrieved successfully',
            data: result
        });
    } catch (error) {
        handleError(error, res);
    }
};

const updatePage = async (req, res) => {
    try {
        const result = await pageService.updatePage(req);
        return res.status(200).json({
            status: 200,
            code: 'SUCCESS',
            message: 'Page updated successfully',
            data: result
        });
    } catch (error) {
        handleError(error, res);
    }
};

const deletePage = async (req, res) => {
    try {
        const result = await pageService.deletePage(req);
        return res.status(200).json({
            status: 200,
            code: 'SUCCESS',
            message: 'Page deleted successfully',
            data: result
        });
    } catch (error) {
        handleError(error, res);
    }
};

module.exports = {
    createPageFromResponse,
    getAllPages,
    getPageById,
    updatePage,
    deletePage
};
