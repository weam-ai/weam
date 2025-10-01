const express = require('express');
const router = express.Router();
const { authentication } = require('../middleware/authentication');
const { streamingMiddleware } = require('../middleware/ollamaStream');
const { 
    ollamaValidation, 
    validateOllamaRequest, 
    validateOllamaQuery, 
    validateOllamaParams 
} = require('../middleware/ollamaValidation');
const ollamaController = require('../controller/ollamaController');

router.get('/health', ollamaController.healthCheck);

router.use(authentication);

router.post('/chat', 
    streamingMiddleware,
    validateOllamaRequest(ollamaValidation.chatRequest), 
    ollamaController.chat
);

router.post('/generate', 
    streamingMiddleware,
    validateOllamaRequest(ollamaValidation.generateRequest), 
    ollamaController.generate
);

router.get('/tags', ollamaController.listModels);
router.post('/pull', 
    validateOllamaRequest(ollamaValidation.pullRequest), 
    ollamaController.pullModel
);
router.post('/validate', ollamaController.validateModel);
router.get('/model/:modelName', 
    validateOllamaParams({ modelName: ollamaValidation.modelName }), 
    ollamaController.getModelDetails
);

router.delete('/model', 
    validateOllamaRequest(ollamaValidation.deleteRequest), 
    ollamaController.deleteModel
);
router.post('/embeddings', 
    validateOllamaRequest(ollamaValidation.embeddingsRequest), 
    ollamaController.createEmbeddings
);
router.post('/copy', 
    validateOllamaRequest(ollamaValidation.copyRequest), 
    ollamaController.copyModel
);
router.get('/recommended', ollamaController.getRecommendedModels);
router.get('/test-connection', ollamaController.testConnection);

router.put('/settings', 
    validateOllamaRequest(ollamaValidation.settingsUpdate), 
    ollamaController.updateCompanySettings
);
router.get('/settings', ollamaController.getCompanySettings);

router.get('/analytics/usage', 
    validateOllamaQuery({ timeRange: ollamaValidation.timeRange }), 
    ollamaController.getUsageStats
);
router.get('/analytics/model/:modelName', 
    validateOllamaParams({ modelName: ollamaValidation.modelName }), 
    ollamaController.getModelPerformance
);
router.get('/analytics/overview', ollamaController.getCompanyOverview);

// New endpoints for API key and settings management
router.post('/test-connection-with-key', ollamaController.testConnectionWithApiKey);
router.post('/save-settings', ollamaController.saveOllamaSettings);

module.exports = router;