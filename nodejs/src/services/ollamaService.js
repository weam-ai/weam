const axios = require('axios');
const { Ollama } = require('ollama');
const Company = require('../models/company');
const User = require('../models/user');
const ollamaAnalytics = require('./ollamaAnalytics');

class OllamaService {
    constructor() {
        this.defaultBaseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.timeout = 180000;  
        this.ollamaClient = null;
    }

    getOllamaClient(baseUrl, apiKey) {
        const url = baseUrl || this.defaultBaseUrl;
        const clientKey = `${url}-${apiKey || 'no-key'}`;
        
        if (!this.ollamaClient || this.ollamaClient._key !== clientKey) {
            const config = { host: url };
            
            if (apiKey) {
                config.headers = {
                    'Authorization': `Bearer ${apiKey}`
                };
            }
            
            this.ollamaClient = new Ollama(config);
            this.ollamaClient._key = clientKey;
        }
        return this.ollamaClient;
    }

    async chat({ messages, model, baseUrl, stream, userId, companyId, options = {}, apiKey }) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl, apiKey);
            
            const ollamaMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const requestOptions = {
                model,
                messages: ollamaMessages,
                stream,
                options: {
                    temperature: options.temperature || 0.7,
                    top_p: options.top_p || 0.9,
                    top_k: options.top_k || 40,
                    repeat_penalty: options.repeat_penalty || 1.1,
                    ...options
                }
            };

            if (stream) {
                return await this.handleStreamingChat(ollamaClient, requestOptions, model);
            } else {
                const response = await ollamaClient.chat(requestOptions);
                
                return {
                    success: true,
                    text: response.message.content,
                    model,
                    provider: 'ollama',
                    tokens: response.total_duration ? Math.ceil(response.total_duration / 1000000) : 0,
                    raw: response
                };
            }

        } catch (error) {
            logger.error(`Ollama chat error for model ${model}:`, error.message);
            
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                return {
                    success: false,
                    error: 'Cannot connect to Ollama instance',
                    model,
                    provider: 'ollama'
                };
            }

            return {
                success: false,
                error: error.message || 'Unknown error',
                model,
                provider: 'ollama'
            };
        }
    }

    async handleStreamingChat(ollamaClient, options, model) {
        try {
            const stream = await ollamaClient.chat({...options, stream: true});
            return {
                success: true,
                stream,
                model,
                provider: 'ollama'
            };
        } catch (error) {
            throw error;
        }
    }

    async generate({ prompt, model, baseUrl, stream, userId, companyId, options = {}, apiKey }) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl, apiKey);

            const requestOptions = {
                model,
                prompt,
                stream,
                options: {
                    temperature: options.temperature || 0.7,
                    top_p: options.top_p || 0.9,
                    top_k: options.top_k || 40,
                    repeat_penalty: options.repeat_penalty || 1.1,
                    ...options
                }
            };

            if (stream) {
                const stream = await ollamaClient.generate({...requestOptions, stream: true});
                return {
                    success: true,
                    stream,
                    model,
                    provider: 'ollama'
                };
            } else {
                const response = await ollamaClient.generate(requestOptions);
                
                return {
                    success: true,
                    text: response.response || '',
                    model,
                    provider: 'ollama',
                    tokens: response.total_duration ? Math.ceil(response.total_duration / 1000000) : 0,
                    raw: response
                };
            }

        } catch (error) {
            logger.error(`Ollama generate error for model ${model}:`, error.message);
            
            return {
                success: false,
                error: error.message || 'Unknown error',
                model,
                provider: 'ollama'
            };
        }
    }

    async listModels(baseUrl, companyId, apiKey) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl, apiKey);
            const response = await ollamaClient.list();

            let modelList = response.models || [];
            
            if (companyId) {
                const allowedModels = await this.getCompanyAllowedModels(companyId);
                
                if (allowedModels.length > 0) {
                    modelList = modelList.filter(model => 
                        allowedModels.includes(model.name)
                    );
                }
            }

            return modelList.map(model => ({
                name: model.name,
                size: model.size,
                digest: model.digest,
                modified_at: model.modified_at,
                details: {
                    format: model.details?.format || 'unknown',
                    family: model.details?.family || 'unknown',
                    families: model.details?.families || [],
                    parameter_size: model.details?.parameter_size || 'unknown',
                    quantization_level: model.details?.quantization_level || 'unknown',
                    architecture: model.details?.family || 'unknown'
                },
                provider: 'ollama'
            }));

        } catch (error) {
            logger.error('Ollama list models error:', error.message);
            
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new Error(`Cannot connect to Ollama at ${ollamaUrl}. Please ensure Ollama is running with 'ollama serve'.`);
            }
            
            throw new Error(`Failed to fetch models: ${error.message}`);
        }
    }

    async pullModel(model, baseUrl, onProgress) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl);
            
            if (onProgress && typeof onProgress === 'function') {
                const stream = await ollamaClient.pull({ model, stream: true });
                
                for await (const part of stream) {
                    onProgress(part);
                }
                
                return {
                    success: true,
                    message: `Model ${model} pulled successfully`,
                    model
                };
            } else {
                await ollamaClient.pull({ model });
                
                return {
                    success: true,
                    message: `Model ${model} pulled successfully`,
                    model
                };
            }

        } catch (error) {
            logger.error(`Ollama pull model error for ${model}:`, error.message);
            throw new Error(`Failed to pull model: ${error.message}`);
        }
    }

    async validateModel(model, baseUrl) {
        try {
            await this.testConnectivity(baseUrl);
            
            const models = await this.listModels(baseUrl, null);
            const found = models.find(m => m.name === model);
            
            return {
                ok: true,
                exists: !!found,
                availableModels: found ? undefined : models.map(m => m.name)
            };

        } catch (error) {
            return {
                ok: false,
                error: error.message,
                status: 502
            };
        }
    }

    async testConnectivity(baseUrl, apiKey) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl, apiKey);
            await ollamaClient.list();
            return true;
        } catch (error) {
            throw new Error(`Cannot connect to Ollama instance at ${ollamaUrl}`);
        }
    }

    async getModelDetails(modelName, baseUrl) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl);
            const response = await ollamaClient.show({ model: modelName });

            return {
                success: true,
                details: {
                    ...response,
                    architecture: response.details?.family || 'unknown',
                    parameter_size: response.details?.parameter_size || 'unknown',
                    quantization: response.details?.quantization_level || 'unknown',
                    format: response.details?.format || 'unknown'
                }
            };

        } catch (error) {
            throw new Error(`Failed to get model details: ${error.message}`);
        }
    }

    async checkUserPermission(userId, companyId, model) {
        try {
            const company = await Company.findById(companyId);
            if (!company) return false;

            if (company.ollamaSettings?.restrictedModels?.includes(model)) {
                return false;
            }

            const user = await User.findById(userId);
            if (!user) return false;

            return user.permissions?.includes('use_ollama') || user.role === 'admin';

        } catch (error) {
            logger.error('Error checking user permission:', error);
            return false;
        }
    }

    async checkAdminPermission(userId, companyId) {
        try {
            const user = await User.findById(userId);
            return user && (user.role === 'admin' || user.permissions?.includes('manage_ollama'));
        } catch (error) {
            logger.error('Error checking admin permission:', error);
            return false;
        }
    }

    async getCompanyAllowedModels(companyId) {
        try {
            const company = await Company.findById(companyId);
            return company?.ollamaSettings?.allowedModels || [];
        } catch (error) {
            logger.error('Error getting company allowed models:', error);
            return [];
        }
    }

    async trackUsage(userId, companyId, model, action, tokens, additionalData = {}) {
        try {
            return await ollamaAnalytics.trackUsage(userId, companyId, model, action, {
                tokens: tokens || 0,
                ...additionalData
            });
        } catch (error) {
            logger.error('Error tracking Ollama usage:', error);
        }
    }

    async deleteModel(modelName, baseUrl) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl);
            await ollamaClient.delete({ model: modelName });

            return {
                success: true,
                message: `Model ${modelName} deleted successfully`
            };

        } catch (error) {
            logger.error(`Ollama delete model error for ${modelName}:`, error.message);
            throw new Error(`Failed to delete model: ${error.message}`);
        }
    }

    async createEmbeddings(input, model, baseUrl) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl);
            const response = await ollamaClient.embeddings({
                model,
                prompt: input
            });

            return {
                success: true,
                embeddings: response.embedding,
                model,
                provider: 'ollama'
            };

        } catch (error) {
            logger.error(`Ollama embeddings error for model ${model}:`, error.message);
            throw new Error(`Failed to create embeddings: ${error.message}`);
        }
    }

    async copyModel(source, destination, baseUrl) {
        const ollamaUrl = baseUrl || this.defaultBaseUrl;
        
        try {
            const ollamaClient = this.getOllamaClient(ollamaUrl);
            await ollamaClient.copy({ source, destination });

            return {
                success: true,
                message: `Model copied from ${source} to ${destination}`
            };

        } catch (error) {
            logger.error(`Ollama copy model error:`, error.message);
            throw new Error(`Failed to copy model: ${error.message}`);
        }
    }

    async checkModelExists(modelName, baseUrl) {
        try {
            const models = await this.listModels(baseUrl, null);
            return models.some(model => model.name === modelName);
        } catch (error) {
            logger.error(`Error checking if model exists:`, error.message);
            return false;
        }
    }

    async getRecommendedModels() {
        return [
            {
                name: 'llama3.1:8b',
                description: 'Latest Llama 3.1 model with 8B parameters - good balance of performance and resource usage',
                size: '4.7GB',
                recommended: true,
                category: 'general'
            },
            {
                name: 'llama3:8b',
                description: 'Llama 3 model with 8B parameters - stable and reliable',
                size: '4.7GB',
                recommended: true,
                category: 'general'
            },
            {
                name: 'mistral:7b-instruct',
                description: 'Mistral 7B Instruct - optimized for instruction following',
                size: '4.1GB',
                recommended: true,
                category: 'instruction'
            },
            {
                name: 'codellama:7b',
                description: 'Code Llama 7B - specialized for code generation',
                size: '3.8GB',
                recommended: false,
                category: 'code'
            },
            {
                name: 'phi3:mini',
                description: 'Microsoft Phi-3 Mini - lightweight but capable',
                size: '2.3GB',
                recommended: false,
                category: 'lightweight'
            }
        ];
    }

    async updateCompanyOllamaSettings(companyId, settings) {
        try {
            const company = await Company.findById(companyId);
            if (!company) {
                throw new Error('Company not found');
            }

            company.ollamaSettings = {
                ...company.ollamaSettings,
                ...settings,
                updatedAt: new Date()
            };

            await company.save();
            return company.ollamaSettings;

        } catch (error) {
            logger.error('Error updating company Ollama settings:', error);
            throw error;
        }
    }

    async getCompanyOllamaSettings(companyId) {
        try {
            const company = await Company.findById(companyId);
            return company?.ollamaSettings || {
                allowedModels: [],
                restrictedModels: [],
                defaultModel: null,
                maxConcurrentRequests: 5,
                enabled: true
            };
        } catch (error) {
            logger.error('Error getting company Ollama settings:', error);
            return null;
        }
    }
}

module.exports = new OllamaService();