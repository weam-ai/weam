const ollamaService = require('../services/ollamaService');
const ollamaAnalytics = require('../services/ollamaAnalytics');

class OllamaController {
    async chat(req, res) {
        try {
            const { messages, model, baseUrl, stream = false, options = {}, apiKey } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            if (!messages || !model) {
                return res.status(400).json({
                    code: 'VALIDATION_ERROR',
                    message: 'Messages and model are required'
                });
            }

            const hasPermission = await ollamaService.checkUserPermission(userId, companyId, model);
            if (!hasPermission) {
                return res.status(403).json({
                    code: 'PERMISSION_DENIED',
                    message: 'You do not have permission to use this Ollama model'
                });
            }

            try {
                await ollamaService.testConnectivity(baseUrl, apiKey);
            } catch (error) {
                return res.status(503).json({
                    code: 'OLLAMA_UNAVAILABLE',
                    message: 'Ollama service is not available. Please check if Ollama is running.',
                    details: error.message
                });
            }

            const result = await ollamaService.chat({
                messages,
                model,
                baseUrl,
                stream,
                userId,
                companyId,
                options,
                apiKey
            });

            if (stream && result.success) {
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Transfer-Encoding', 'chunked');
                
                for await (const part of result.stream) {
                    if (part.message) {
                        res.write(JSON.stringify(part) + '\n');
                    }
                }
                res.end();
                
                await ollamaService.trackUsage(userId, companyId, model, 'chat_stream', 0);
            } else {
                await ollamaService.trackUsage(userId, companyId, model, 'chat', result.tokens || 0);
                res.json(result);
            }

        } catch (error) {
            logger.error('Ollama chat error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to process chat request'
            });
        }
    }

    async generate(req, res) {
        try {
            const { prompt, model, baseUrl, stream = false, options = {}, apiKey } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            if (!prompt || !model) {
                return res.status(400).json({
                    code: 'VALIDATION_ERROR',
                    message: 'Prompt and model are required'
                });
            }

            const hasPermission = await ollamaService.checkUserPermission(userId, companyId, model);
            if (!hasPermission) {
                return res.status(403).json({
                    code: 'PERMISSION_DENIED',
                    message: 'You do not have permission to use this Ollama model'
                });
            }

            const result = await ollamaService.generate({
                prompt,
                model,
                baseUrl,
                stream,
                userId,
                companyId,
                options,
                apiKey
            });

            if (stream && result.success) {
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Transfer-Encoding', 'chunked');
                
                for await (const part of result.stream) {
                    res.write(JSON.stringify(part) + '\n');
                }
                res.end();
                
                await ollamaService.trackUsage(userId, companyId, model, 'generate_stream', 0);
            } else {
                await ollamaService.trackUsage(userId, companyId, model, 'generate', result.tokens || 0);
                res.json(result);
            }

        } catch (error) {
            logger.error('Ollama generate error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to generate text'
            });
        }
    }

    async listModels(req, res) {
        try {
            const { baseUrl, apiKey } = req.query;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            try {
                await ollamaService.testConnectivity(baseUrl, apiKey);
            } catch (error) {
                return res.status(503).json({
                    code: 'OLLAMA_UNAVAILABLE',
                    message: 'Ollama service is not available. Please check if Ollama is running.',
                    details: error.message
                });
            }

            const models = await ollamaService.listModels(baseUrl, companyId, apiKey);
            
            res.json({
                success: true,
                models,
                count: models.length,
                ollamaUrl: baseUrl || ollamaService.defaultBaseUrl
            });
        } catch (error) {
            logger.error('Ollama list models error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to list models'
            });
        }
    }

    async pullModel(req, res) {
        try {
            const { model, baseUrl } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            const isAdmin = await ollamaService.checkAdminPermission(userId, companyId);
            if (!isAdmin) {
                return res.status(403).json({
                    code: 'ADMIN_REQUIRED',
                    message: 'Admin permission required to pull models'
                });
            }

            const result = await ollamaService.pullModel(model, baseUrl);
            
            res.json(result);
        } catch (error) {
            logger.error('Ollama pull model error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to pull model'
            });
        }
    }

    async validateModel(req, res) {
        try {
            const { model, baseUrl } = req.body;
            
            if (!model) {
                return res.status(400).json({
                    ok: false,
                    error: 'Model name is required'
                });
            }

            const result = await ollamaService.validateModel(model, baseUrl);
            
            res.json(result);
        } catch (error) {
            logger.error('Ollama validate model error:', error);
            res.status(500).json({
                ok: false,
                error: error.message || 'Failed to validate model'
            });
        }
    }

    async getModelDetails(req, res) {
        try {
            const { modelName } = req.params;
            const { baseUrl } = req.query;
            
            const details = await ollamaService.getModelDetails(modelName, baseUrl);
            
            res.json(details);
        } catch (error) {
            logger.error('Ollama get model details error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to get model details'
            });
        }
    }

    async deleteModel(req, res) {
        try {
            const { model, baseUrl } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            const isAdmin = await ollamaService.checkAdminPermission(userId, companyId);
            if (!isAdmin) {
                return res.status(403).json({
                    code: 'ADMIN_REQUIRED',
                    message: 'Admin permission required to delete models'
                });
            }

            const result = await ollamaService.deleteModel(model, baseUrl);
            
            res.json(result);
        } catch (error) {
            logger.error('Ollama delete model error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to delete model'
            });
        }
    }

    async createEmbeddings(req, res) {
        try {
            const { input, model, baseUrl } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            if (!input || !model) {
                return res.status(400).json({
                    code: 'VALIDATION_ERROR',
                    message: 'Input and model are required'
                });
            }

            const hasPermission = await ollamaService.checkUserPermission(userId, companyId, model);
            if (!hasPermission) {
                return res.status(403).json({
                    code: 'PERMISSION_DENIED',
                    message: 'You do not have permission to use this Ollama model'
                });
            }

            const result = await ollamaService.createEmbeddings(input, model, baseUrl);
            
            await ollamaService.trackUsage(userId, companyId, model, 'embeddings', 0);
            
            res.json(result);
        } catch (error) {
            logger.error('Ollama embeddings error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to create embeddings'
            });
        }
    }

    async copyModel(req, res) {
        try {
            const { source, destination, baseUrl } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            const isAdmin = await ollamaService.checkAdminPermission(userId, companyId);
            if (!isAdmin) {
                return res.status(403).json({
                    code: 'ADMIN_REQUIRED',
                    message: 'Admin permission required to copy models'
                });
            }

            const result = await ollamaService.copyModel(source, destination, baseUrl);
            
            res.json(result);
        } catch (error) {
            logger.error('Ollama copy model error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to copy model'
            });
        }
    }

    async getRecommendedModels(req, res) {
        try {
            const models = await ollamaService.getRecommendedModels();
            
            res.json({
                success: true,
                models
            });
        } catch (error) {
            logger.error('Get recommended models error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to get recommended models'
            });
        }
    }

    async testConnection(req, res) {
        try {
            const { baseUrl, apiKey } = req.query;
            const testUrl = baseUrl || 'http://localhost:11434';
            
            await ollamaService.testConnectivity(testUrl, apiKey);
            
            const models = await ollamaService.listModels(testUrl, null, apiKey);
            
            res.json({
                success: true,
                message: 'Connection successful',
                url: testUrl,
                modelCount: models.length,
                availableModels: models.map(m => m.name)
            });
        } catch (error) {
            logger.error('Ollama connection test error:', error);
            res.status(500).json({
                success: false,
                message: 'Connection failed',
                error: error.message,
                url: req.query.baseUrl || 'http://localhost:11434'
            });
        }
    }

    async updateCompanySettings(req, res) {
        try {
            const { settings } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            const isAdmin = await ollamaService.checkAdminPermission(userId, companyId);
            if (!isAdmin) {
                return res.status(403).json({
                    code: 'ADMIN_REQUIRED',
                    message: 'Admin permission required to update Ollama settings'
                });
            }

            const updatedSettings = await ollamaService.updateCompanyOllamaSettings(companyId, settings);
            
            res.json({
                success: true,
                settings: updatedSettings
            });
        } catch (error) {
            logger.error('Update company Ollama settings error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to update settings'
            });
        }
    }

    async getCompanySettings(req, res) {
        try {
            const userId = req.user.id;
            const companyId = req.user.company_id;

            const settings = await ollamaService.getCompanyOllamaSettings(companyId);
            
            res.json({
                success: true,
                settings
            });
        } catch (error) {
            logger.error('Get company Ollama settings error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to get settings'
            });
        }
    }

    async getUsageStats(req, res) {
        try {
            const { timeRange = '7d' } = req.query;
            const companyId = req.user.company_id;

            const stats = await ollamaAnalytics.getUsageStats(companyId, timeRange);
            
            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error('Get Ollama usage stats error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to get usage stats'
            });
        }
    }

    async getModelPerformance(req, res) {
        try {
            const { modelName } = req.params;
            const companyId = req.user.company_id;

            const stats = await ollamaAnalytics.getModelPerformanceStats(companyId, modelName);
            
            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error('Get model performance stats error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to get model performance stats'
            });
        }
    }

    async getCompanyOverview(req, res) {
        try {
            const companyId = req.user.company_id;

            const overview = await ollamaAnalytics.getCompanyOllamaOverview(companyId);
            
            res.json({
                success: true,
                overview
            });
        } catch (error) {
            logger.error('Get company Ollama overview error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to get company overview'
            });
        }
    }

    async healthCheck(req, res) {
        try {
            const { baseUrl, apiKey } = req.query;
            const testUrl = baseUrl || 'http://localhost:11434';
            
            const startTime = Date.now();
            await ollamaService.testConnectivity(testUrl, apiKey);
            const responseTime = Date.now() - startTime;
            
            const models = await ollamaService.listModels(testUrl, null, apiKey);
            
            res.json({
                success: true,
                status: 'healthy',
                url: testUrl,
                responseTime: `${responseTime}ms`,
                modelCount: models.length,
                models: models.slice(0, 5).map(m => ({ name: m.name, size: m.size })),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Ollama health check error:', error);
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                url: req.query.baseUrl || 'http://localhost:11434',
                error: error.message,
                timestamp: new Date().toISOString(),
                suggestions: [
                    'Ensure Ollama is installed and running',
                    'Check if the service is running: ollama serve',
                    'Verify the URL is correct',
                    'Install at least one model: ollama pull llama3.1:8b'
                ]
            });
        }
    }

    async testConnectionWithApiKey(req, res) {
        try {
            const { baseUrl, apiKey } = req.body;
            const testUrl = baseUrl || 'http://localhost:11434';
            
            await ollamaService.testConnectivity(testUrl, apiKey);
            const models = await ollamaService.listModels(testUrl, null, apiKey);
            
            res.json({
                success: true,
                message: 'Connection successful',
                url: testUrl,
                modelCount: models.length,
                availableModels: models.map(m => m.name)
            });
        } catch (error) {
            logger.error('Ollama connection test with API key error:', error);
            res.status(500).json({
                success: false,
                message: 'Connection failed',
                error: error.message,
                url: req.body.baseUrl || 'http://localhost:11434'
            });
        }
    }

    async saveOllamaSettings(req, res) {
        try {
            const { baseUrl, apiKey, provider } = req.body;
            const userId = req.user.id;
            const companyId = req.user.company_id;

            try {
                await ollamaService.testConnectivity(baseUrl, apiKey);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to connect to Ollama instance',
                    error: error.message
                });
            }

            const settings = {
                defaultBaseUrl: baseUrl,
                apiKey: apiKey,
                enabled: true,
                updatedAt: new Date()
            };

            const updatedSettings = await ollamaService.updateCompanyOllamaSettings(companyId, settings);
            
            res.json({
                success: true,
                message: 'Ollama settings saved successfully',
                settings: updatedSettings
            });
        } catch (error) {
            logger.error('Save Ollama settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save Ollama settings',
                error: error.message
            });
        }
    }
}

module.exports = new OllamaController();