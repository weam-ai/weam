const axios = require('axios');
const { Ollama } = require('ollama');
const Company = require('../models/company');
const User = require('../models/user');
const ollamaAnalytics = require('./ollamaAnalytics');
const fs = require('fs');
const LINK = require('../config/config').LINK;

// Module-level state and configuration
let defaultBaseUrl = LINK.OLLAMA_API_URL;
const timeout = 180000;
let ollamaClient = null;
const composePath = process.env.OLLAMA_COMPOSE_PATH; // optional override

function getOllamaClient(baseUrl, apiKey) {
    const url = baseUrl || defaultBaseUrl;
    const clientKey = `${url}-${apiKey || 'no-key'}`;

    if (!ollamaClient || ollamaClient._key !== clientKey) {
        const config = { host: url };

        if (apiKey) {
            config.headers = {
                'Authorization': `Bearer ${apiKey}`
            };
        }

        ollamaClient = new Ollama(config);
        ollamaClient._key = clientKey;
    }
    return ollamaClient;
}

async function handleStreamingChat(client, options, model) {
    try {
        const stream = await client.chat({ ...options, stream: true });
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

async function chat({ messages, model, baseUrl, stream, userId, companyId, options = {}, apiKey }) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl, apiKey);

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
            return await handleStreamingChat(client, requestOptions, model);
        } else {
            const response = await client.chat(requestOptions);

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

async function generate({ prompt, model, baseUrl, stream, userId, companyId, options = {}, apiKey }) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl, apiKey);

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
            const streamRes = await client.generate({ ...requestOptions, stream: true });
            return {
                success: true,
                stream: streamRes,
                model,
                provider: 'ollama'
            };
        } else {
            const response = await client.generate(requestOptions);

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

async function listModels(baseUrl, companyId, apiKey) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl, apiKey);
        const response = await client.list();

        let modelList = response.models || [];

        if (companyId) {
            const allowedModels = await getCompanyAllowedModels(companyId);

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

async function pullModel(model, baseUrl, onProgress) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        // Try direct pull via API first (if Ollama is running)
        await testConnectivity(ollamaUrl);
        const client = getOllamaClient(ollamaUrl);

        if (onProgress && typeof onProgress === 'function') {
            const stream = await client.pull({ model, stream: true });
            let lastProgress = 0;

            for await (const part of stream) {
                if (part.total && part.completed) {
                    const progressPercent = Math.floor((part.completed / part.total) * 100);

                    if (progressPercent > lastProgress) {
                        lastProgress = progressPercent;
                        onProgress({
                            ...part,
                            progressPercent
                        });
                    }
                } else {
                    onProgress(part);
                }
            }
            return { success: true, message: `Model ${model} pulled successfully`, model };
        }
        await client.pull({ model });
        return { success: true, message: `Model ${model} pulled successfully`, model };

    } catch (apiError) {
        logger.warn(`Ollama API pull failed, attempting Docker compose pull: ${apiError.message}`);
        const started = await ensureOllamaContainer();
        if (!started) {
            throw new Error(`Failed to start Ollama container: ${apiError.message}`);
        }
        if (process.env.OLLAMA_PULL_USE_SETUP === 'true') {
            await pullViaComposeSetup(model);
        } else {
            await pullViaCompose(model);
        }
        return { success: true, message: `Model ${model} pulled successfully`, model };
    }
}

async function validateModel(model, baseUrl) {
    try {
        await testConnectivity(baseUrl);

        const models = await listModels(baseUrl, null);
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

function getComposeFilePath() {
    if (composePath) return composePath;
    const path = require('path');
    const candidates = [
        '/workspace/nextjs/docker-compose.ollama.yml',
        path.resolve(__dirname, '../../../nextjs/docker-compose.ollama.yml'),
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return p;
        } catch (_) {}
    }
    return candidates[1];
}

async function ensureOllamaContainer() {
    const { exec } = require('child_process');
    const composeFile = getComposeFilePath();
    const profile = process.env.OLLAMA_GPU === 'true' ? 'gpu' : 'cpu';

    const tryExec = (cmd) => new Promise((resolve) => {
        exec(cmd, { timeout: 180000 }, (error, stdout, stderr) => {
            if (error) {
                logger.error(`Failed to start Ollama with command: ${cmd}`);
                logger.error(stderr || error.message);
                return resolve(false);
            }
            logger.info(`Ollama start command succeeded: ${cmd}`);
            resolve(true);
        });
    });

    const composeCmd = `docker compose --file "${composeFile}" --profile ${profile} up -d`;
    const okCompose = await tryExec(composeCmd);
    if (okCompose) return true;

    const legacyComposeCmd = `docker-compose --file "${composeFile}" --profile ${profile} up -d`;
    const okLegacy = await tryExec(legacyComposeCmd);
    if (okLegacy) return true;

    logger.warn('Compose not available or failed; attempting direct docker run for Ollama');

    await tryExec('docker volume create ollama-models');
    await tryExec('docker rm -f ollama 2>/dev/null || true');

    const timestamp = new Date().getTime();
    const containerName = `ollama-${timestamp}`;

    const gpuEnv = process.env.OLLAMA_GPU === 'true' ? 'true' : 'false';
    const runCmd = [
        `docker run -d --name ${containerName} --restart unless-stopped`,
        '-p 11434:11434',
        `-e OLLAMA_GPU=${gpuEnv}`,
        '-e OLLAMA_KEEP_ALIVE=3600',
        '-v ollama-models:/root/.ollama',
        'ollama/ollama:latest'
    ].join(' ');

    const okRun = await tryExec(runCmd);
    return okRun;
}

async function pullViaCompose(model) {
    const { exec } = require('child_process');
    const composeFile = getComposeFilePath();
    const tryExec = (cmd) => new Promise((resolve, reject) => {
        exec(cmd, { timeout: 600000 }, (error, stdout, stderr) => {
            if (error) return reject(new Error(stderr || error.message));
            logger.info(`Command succeeded: ${cmd}`);
            resolve(true);
        });
    });

    const cmdV2 = `docker compose --file "${composeFile}" exec ollama ollama pull ${model}`;
    try {
        await tryExec(cmdV2);
        return true;
    } catch (e1) {
        logger.warn('docker compose exec failed for pull; trying legacy or direct docker exec');
    }

    const cmdV1 = `docker-compose --file "${composeFile}" exec ollama ollama pull ${model}`;
    try {
        await tryExec(cmdV1);
        return true;
    } catch (e2) {
        logger.warn('docker-compose exec failed for pull; trying direct docker exec');
    }

    try {
        const findContainer = "docker ps --filter name=ollama -q";
        exec(findContainer, (error, stdout) => {
            if (!error && stdout.trim()) {
                const containerId = stdout.trim();
                const cmdDirect = `docker exec ${containerId} ollama pull ${model}`;
                return tryExec(cmdDirect);
            }
            throw new Error('No running Ollama container found');
        });
    } catch (e3) {
        logger.warn('No running Ollama container found, attempting to start one');
        await ensureOllamaContainer();
        const cmdDirect = `docker exec $(docker ps --filter name=ollama -q | head -n1) ollama pull ${model}`;
        await tryExec(cmdDirect);
    }
    return true;
}

async function pullViaComposeSetup(model) {
    const { exec } = require('child_process');
    const composeFile = getComposeFilePath();
    const tryExec = (cmd) => new Promise((resolve, reject) => {
        exec(cmd, { timeout: 600000 }, (error, stdout, stderr) => {
            if (error) return reject(new Error(stderr || error.message));
            logger.info(`Command succeeded: ${cmd}`);
            resolve(true);
        });
    });

    const cmdV2 = `OLLAMA_DEFAULT_MODEL=${model} docker compose --file "${composeFile}" --profile setup up -d`;
    try {
        await tryExec(cmdV2);
        return true;
    } catch (e1) {
        logger.warn('docker compose setup failed; trying legacy compose');
    }

    const cmdV1 = `OLLAMA_DEFAULT_MODEL=${model} docker-compose --file "${composeFile}" --profile setup up -d`;
    try {
        await tryExec(cmdV1);
        return true;
    } catch (e2) {
        logger.warn('docker-compose setup failed; falling back to direct pull');
    }

    try {
        const findContainer = "docker ps --filter name=ollama -q";
        exec(findContainer, (error, stdout) => {
            if (!error && stdout.trim()) {
                const containerId = stdout.trim();
                const cmdDirect = `docker exec ${containerId} ollama pull ${model}`;
                return tryExec(cmdDirect);
            }
            throw new Error('No running Ollama container found');
        });
    } catch (e3) {
        logger.warn('No running Ollama container found, attempting to start one');
        await ensureOllamaContainer();
        const cmdDirect = `docker exec $(docker ps --filter name=ollama -q | head -n1) ollama pull ${model}`;
        await tryExec(cmdDirect);
    }
    return true;
}

async function testConnectivity(baseUrl, apiKey) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl, apiKey);
        await client.list();
        return true;
    } catch (error) {
        throw new Error(`Cannot connect to Ollama instance at ${ollamaUrl}`);
    }
}

async function getModelDetails(modelName, baseUrl) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl);
        const response = await client.show({ model: modelName });

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

async function checkUserPermission(userId, companyId, model) {
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

async function checkAdminPermission(userId, companyId) {
    try {
        const user = await User.findById(userId);
        return user && (user.role === 'admin' || user.permissions?.includes('manage_ollama'));
    } catch (error) {
        logger.error('Error checking admin permission:', error);
        return false;
    }
}

async function getCompanyAllowedModels(companyId) {
    try {
        const company = await Company.findById(companyId);
        return company?.ollamaSettings?.allowedModels || [];
    } catch (error) {
        logger.error('Error getting company allowed models:', error);
        return [];
    }
}

async function trackUsage(userId, companyId, model, action, tokens, additionalData = {}) {
    try {
        return await ollamaAnalytics.trackUsage(userId, companyId, model, action, {
            tokens: tokens || 0,
            ...additionalData
        });
    } catch (error) {
        logger.error('Error tracking Ollama usage:', error);
    }
}

async function deleteModel(modelName, baseUrl) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl);
        await client.delete({ model: modelName });

        const UserBot = require('../models/userBot');
        await UserBot.deleteOne({
            name: modelName,
            'bot.code': 'OLLAMA'
        });

        logger.info(`Model ${modelName} deleted successfully from Ollama and database`);

        return {
            success: true,
            message: `Model ${modelName} deleted successfully`
        };

    } catch (error) {
        logger.error(`Ollama delete model error for ${modelName}:`, error.message);
        throw new Error(`Failed to delete model: ${error.message}`);
    }
}

async function createEmbeddings(input, model, baseUrl) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl);
        const response = await client.embeddings({
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

async function copyModel(source, destination, baseUrl) {
    const ollamaUrl = baseUrl || defaultBaseUrl;

    try {
        const client = getOllamaClient(ollamaUrl);
        await client.copy({ source, destination });

        return {
            success: true,
            message: `Model copied from ${source} to ${destination}`
        };

    } catch (error) {
        logger.error(`Ollama copy model error:`, error.message);
        throw new Error(`Failed to copy model: ${error.message}`);
    }
}

async function checkModelExists(modelName, baseUrl) {
    try {
        const models = await listModels(baseUrl, null);
        return models.some(model => model.name === modelName);
    } catch (error) {
        logger.error(`Error checking if model exists:`, error.message);
        return false;
    }
}

async function getRecommendedModels() {
    return [
        {
            name: 'llama3.1:8b',
            description: 'Latest Llama 3.1 model with 8B parameters - good balance of performance and resource usage',
            size: '4.7GB',
            recommended: true,
            category: 'general'
        },
        {
            name: 'llama3.2:1b',
            description: 'Llama 3.2 model with 1B parameters - lightweight and fast',
            size: '1.3GB',
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

async function updateCompanyOllamaSettings(companyId, settings) {
    try {
        const company = await Company.findById(companyId);
        if (!company) {
            throw new Error('Company not found');
        }

        const currentSettings = company.ollamaSettings || {};
        const currentTeamSettings = currentSettings.teamSettings || {
            allowModelPulling: false,
            allowModelDeletion: false
        };

        company.ollamaSettings = {
            ...currentSettings,
            ...settings,
            teamSettings: settings.teamSettings || currentTeamSettings,
            updatedAt: new Date()
        };

        await company.save();
        return company.ollamaSettings;

    } catch (error) {
        logger.error('Error updating company Ollama settings:', error);
        throw error;
    }
}

async function getCompanyOllamaSettings(companyId) {
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

module.exports = {
    defaultBaseUrl,
    timeout,
    getOllamaClient,
    chat,
    handleStreamingChat,
    generate,
    listModels,
    pullModel,
    validateModel,
    getComposeFilePath,
    ensureOllamaContainer,
    pullViaCompose,
    pullViaComposeSetup,
    testConnectivity,
    getModelDetails,
    checkUserPermission,
    checkAdminPermission,
    getCompanyAllowedModels,
    trackUsage,
    deleteModel,
    createEmbeddings,
    copyModel,
    checkModelExists,
    getRecommendedModels,
    updateCompanyOllamaSettings,
    getCompanyOllamaSettings
};