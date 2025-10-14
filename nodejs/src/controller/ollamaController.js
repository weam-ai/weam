const ollamaService = require('../services/ollamaService');
const ollamaAnalytics = require('../services/ollamaAnalytics');
const fs = require('fs');
const LINK = require('../config/config').LINK;
const logger = require('../utils/logger');

// Resolve a usable Ollama base URL across host and Docker environments
function resolveOllamaCandidates(inputUrl) {
    const provided = inputUrl || LINK.OLLAMA_API_URL;
    const candidates = [provided];

    // Detect Docker container environment
    let inDocker = false;
    try { inDocker = fs.existsSync('/.dockerenv'); } catch (_) { /* noop */ }

    // If inside Docker and pointing at localhost, try host.docker.internal
    const localhostRe = /^(https?:)\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;
    if (inDocker && localhostRe.test(provided)) {
        candidates.push(provided.replace(localhostRe, '$1//host.docker.internal$3'));
    }
    // Always include host.docker.internal when running inside Docker
    if (inDocker) {
        const hostInternal = provided.replace(localhostRe, '$1//host.docker.internal$3');
        if (!candidates.includes(hostInternal)) {
            candidates.push(hostInternal);
        }
        // Also include explicit default port on host.docker.internal
        const defaultPort = LINK.OLLAMA_API_URL;
        if (!candidates.includes(defaultPort)) {
            candidates.push(defaultPort);
        }
    }

    // Add common Docker Compose service fallback
    // candidates.push('http://localhost:11434');
    candidates.push(LINK.OLLAMA_API_URL);

    // De-duplicate while preserving order
    return [...new Set(candidates)];
}

const chat = async (req, res) => {
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
    };

const generate = async (req, res) => {
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
    };

const listModels = async (req, res) => {
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
    };

const pullModel = async (req, res) => {
        try {
            const { model, baseUrl } = req.body;
            const streaming = req.body?.stream === true || req.query?.stream === '1';
            // Attempt across multiple base URLs for seamless local/Docker setups
            const candidates = resolveOllamaCandidates(baseUrl);
            let lastError;

            if (streaming) {
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Transfer-Encoding', 'chunked');
                const writeEvt = (evt) => {
                    try { res.write(JSON.stringify(evt) + '\n'); } catch (_) {}
                };
                writeEvt({ status: 'starting', model, timestamp: Date.now() });
                for (const url of candidates) {
                    try {
                        writeEvt({ status: 'connecting', baseUrl: url });
                        const result = await ollamaService.pullModel(model, url, (part) => {
                            // Forward ollama pull events with progress percentage
                            writeEvt(part);
                        });
                        writeEvt({ status: 'completed', success: true, model, baseUrl: url });
                        res.end();
                        return;
                    } catch (err) {
                        lastError = err;
                        writeEvt({ status: 'retrying', baseUrl: url, error: err?.message });
                        continue;
                    }
                }
                logger.error('Ollama pull model failed across candidates:', lastError);
                writeEvt({
                    status: 'error',
                    code: 'OLLAMA_UNAVAILABLE',
                    message: 'Failed to reach Ollama to pull model',
                    details: lastError?.message,
                    suggestions: [
                        'Ensure Ollama is installed and running',
                        'Start service: ollama serve or use Docker Compose',
                        'Verify baseUrl and port (default http://localhost:11434)',
                        'If backend runs in Docker, try baseUrl http://host.docker.internal:11434',
                        `Try pulling via CLI: ollama pull ${model || 'llama3.1:8b'}`
                    ]
                });
                res.end();
                return;
            } else {
                for (const url of candidates) {
                    try {
                        const result = await ollamaService.pullModel(model, url);
                        return res.json(result);
                    } catch (err) {
                        lastError = err;
                    }
                }
                logger.error('Ollama pull model failed across candidates:', lastError);
                return res.status(503).json({
                    code: 'OLLAMA_UNAVAILABLE',
                    message: 'Failed to reach Ollama to pull model',
                    details: lastError?.message,
                    suggestions: [
                        'Ensure Ollama is installed and running',
                        'Start service: ollama serve or use Docker Compose',
                        'Verify baseUrl and port (default http://localhost:11434)',
                        'If backend runs in Docker, try baseUrl http://host.docker.internal:11434',
                        `Try pulling via CLI: ollama pull ${model || 'llama3.1:8b'}`
                    ]
                });
            }
        } catch (error) {
            logger.error('Ollama pull model error:', error);
            res.status(500).json({
                code: 'OLLAMA_ERROR',
                message: error.message || 'Failed to pull model',
                suggestions: [
                    'Check network connectivity and retry',
                    'Verify sufficient disk space and permissions',
                    `Try CLI: ollama pull ${req.body?.model || 'llama3.1:8b'}`
                ]
            });
        }
    };

const validateModel = async (req, res) => {
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
    };

const getModelDetails = async (req, res) => {
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
    };

const deleteModel = async (req, res) => {
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
    };

const createEmbeddings = async (req, res) => {
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
    };

const copyModel = async (req, res) => {
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
    };

const getRecommendedModels = async (req, res) => {
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
    };

const testConnection = async (req, res) => {
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
    };

const updateCompanySettings = async (req, res) => {
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
    };

const getCompanySettings = async (req, res) => {
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
    };

const getUsageStats = async (req, res) => {
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
    };

const getModelPerformance = async (req, res) => {
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
    };

const getCompanyOverview = async (req, res) => {
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
    };

const healthCheck = async (req, res) => {
        try {
            const { baseUrl, apiKey } = req.query;
            const candidates = resolveOllamaCandidates(baseUrl);

            let selectedUrl = candidates[0];
            let models = [];
            let responseTime = 0;
            let lastError;

            // First pass: try existing candidates directly
            for (const url of candidates) {
                try {
                    const start = Date.now();
                    await ollamaService.testConnectivity(url, apiKey);
                    responseTime = Date.now() - start;
                    models = await ollamaService.listModels(url, null, apiKey);
                    selectedUrl = url;
                    return res.json({
                        success: true,
                        status: 'healthy',
                        url: selectedUrl,
                        responseTime: `${responseTime}ms`,
                        modelCount: models.length,
                        models: models.slice(0, 5).map(m => ({ name: m.name, size: m.size })),
                        timestamp: new Date().toISOString()
                    });
                } catch (err) {
                    lastError = err;
                }
            }

            // If direct connectivity failed, attempt to auto-start Ollama via Docker Compose
            try {
                const started = await ollamaService.ensureOllamaContainer();
                if (started) {
                    // Poll for readiness across candidates, including the compose service name
                    const pollCandidates = [...candidates, 'http://localhost:11434', 'http://host.docker.internal:11434'];
                    const deadline = Date.now() + 20000; // up to ~20s
                    while (Date.now() < deadline) {
                        for (const url of pollCandidates) {
                            try {
                                const start = Date.now();
                                await ollamaService.testConnectivity(url, apiKey);
                                responseTime = Date.now() - start;
                                models = await ollamaService.listModels(url, null, apiKey);
                                selectedUrl = url;
                                return res.json({
                                    success: true,
                                    status: 'healthy',
                                    url: selectedUrl,
                                    responseTime: `${responseTime}ms`,
                                    modelCount: models.length,
                                    models: models.slice(0, 5).map(m => ({ name: m.name, size: m.size })),
                                    timestamp: new Date().toISOString()
                                });
                            } catch (err) {
                                lastError = err;
                            }
                        }
                        // brief backoff before retrying
                        await new Promise(r => setTimeout(r, 800));
                    }
                }
            } catch (composeErr) {
                lastError = composeErr;
            }

            logger.error('Ollama health check error:', lastError);
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                url: selectedUrl,
                error: lastError?.message,
                timestamp: new Date().toISOString(),
                suggestions: [
                    'Ensure Ollama is installed and running',
                    'Check if the service is running: ollama serve',
                    'Verify the URL is correct',
                    'If running backend in Docker, try baseUrl http://host.docker.internal:11434',
                    'Install at least one model: ollama pull llama3.1:8b'
                ]
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
                    'If running backend in Docker, try baseUrl http://host.docker.internal:11434',
                    'Install at least one model: ollama pull llama3.1:8b'
                ]
            });
        }
    };

const testConnectionWithApiKey = async (req, res) => {
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
    };

    /**
     * Save an Ollama model to the database
     * @param {string} modelName - The name of the Ollama model
     * @param {string|null} companyId - The company ID, can be null for unauthenticated requests
     * @param {string} baseUrl - The Ollama base URL
     * @returns {Promise<Object>} - The saved model
     */
const saveOllamaModelToDatabase = async (modelName, companyId, baseUrl = 'http://localhost:11434') => {
        try {
            // Skip saving if no valid company ID is available
            if (!companyId) {
                logger.info('Skipping model save - no valid company ID available');
                return null;
            }
            
            // const { Model } = require('../models');
            const UserBot = require('../models/userBot');
            const Bot = require('../models/bot');
            
            // Check if model already exists for this company
            // const existingModel = await Model.findOne({
            //     name: modelName,
            //     company_id: companyId,
            //     provider: 'OLLAMA'
            // });
            
            // Save to Model collection
            // let savedModel = existingModel;
            // if (!existingModel) {
            //     // Create a new model entry
            //     const newModel = new Model({
            //         name: modelName,
            //         display_name: `${modelName} (Local)`,
            //         provider: 'OLLAMA',
            //         company_id: companyId,
            //         is_active: true,
            //         created_at: new Date(),
            //         updated_at: new Date()
            //     });
                
            //     savedModel = await newModel.save();
            // }
            
            // Now save to userBot collection
            try {
                // Get the Ollama bot information
                const ollamaBot = await Bot.findOne({ code: 'OLLAMA' });
                console.log("ollamaBot",ollamaBot)
                // if (!ollamaBot) {
                //     logger.warn('Ollama bot not found in database');
                //     return savedModel;
                // }
                
                // Check if model already exists in userBot collection
                const existingUserBot = await UserBot.findOne({
                    name: modelName,
                    'company.id': companyId,
                    'bot.code': 'OLLAMA'
                });
                
                if (existingUserBot) {
                    logger.info(`Ollama model ${modelName} already exists in userBot collection`);
                    // return savedModel;
                }
                
                // Create a new userBot entry
                const company = await require('../models/company').findById(companyId);
                console.log("company",company)
                if (!company) {
                    logger.warn(`Company with ID ${companyId} not found`);
                    return savedModel;
                }
                
                const newUserBot = new UserBot({
                    name: modelName,
                    bot: {
                        id: ollamaBot._id,
                        code: ollamaBot.code,
                        title: ollamaBot.title
                    },
                    company: {
                        id: company._id,
                        name: company.name
                    },
                    config: {
                        apikey: baseUrl // Store the baseUrl in the apikey field
                    },  
                    modelType: 2, // 2 for chat model
                    isActive: true,
                    stream: true, // Ollama supports streaming
                    tool: false, // Ollama doesn't support tools by default
                    provider: 'OLLAMA',
                    extraConfig: {
                        temperature: 0.7
                    }
                });

                console.log("newUserBot",newUserBot)
                
                await newUserBot.save();
                logger.info(`Saved Ollama model ${modelName} to userBot collection`);
            } catch (userBotError) {
                logger.error('Error saving Ollama model to userBot collection:', userBotError);
                // Continue even if userBot save fails
            }
            
            return savedModel;
        } catch (error) {
            logger.error('Error saving Ollama model to database:', error);
            throw error;
        }
    };

const saveOllamaSettings = async (req, res) => {
        try {
            const { baseUrl, apiKey, provider, model } = req.body;
            // Use a valid ObjectId for company if no authentication
            const userId = req.user?.id || null;
            console.log(req.user,"usersresrers")
            const companyId = req.user?.company?.id || null;

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

            // Skip company settings update if no valid company ID is available
            let updatedSettings = null;
            // if (companyId) {
            //     try {
            //         updatedSettings = await ollamaService.updateCompanyOllamaSettings(companyId, settings);
            //     } catch (settingsError) {
            //         logger.warn('Could not update company settings, continuing with model save:', settingsError.message);
            //     }
            // }
            
            // If model is provided and we have a valid companyId, save it to the models collection
            console.log('companyId:', companyId);
            console.log('model:', model);

            if (model && companyId) {
                try {
                    // Call the method directly
                    await saveOllamaModelToDatabase(model, companyId, baseUrl);
                } catch (modelError) {
                    logger.error('Failed to save Ollama model to database:', modelError);
                    // Continue with settings save even if model save fails
                }
            } else if (model) {
                logger.info('Skipping model save - no valid company ID available');
            }
            
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
    };

module.exports = {
  chat,
  generate,
  listModels,
  pullModel,
  validateModel,
  getModelDetails,
  deleteModel,
  createEmbeddings,
  copyModel,
  getRecommendedModels,
  testConnection,
  updateCompanySettings,
  getCompanySettings,
  getUsageStats,
  getModelPerformance,
  getCompanyOverview,
  healthCheck,
  testConnectionWithApiKey,
  saveOllamaModelToDatabase,
  saveOllamaSettings
};