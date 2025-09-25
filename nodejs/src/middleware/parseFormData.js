/**
 * Middleware to parse JSON strings in form data fields
 * Specifically handles mcpTools field which is sent as JSON string in form data
 */
const parseFormData = (req, res, next) => {
    try {
        // Parse mcpTools if it exists and is a string
        if (req.body.mcpTools && typeof req.body.mcpTools === 'string') {
            try {
                req.body.mcpTools = JSON.parse(req.body.mcpTools);
            } catch (parseError) {
                // If parsing fails, keep it as string and let validation handle it
                console.warn('Failed to parse mcpTools JSON:', parseError.message);
            }
        }

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

module.exports = { parseFormData };