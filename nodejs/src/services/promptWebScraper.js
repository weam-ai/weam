const { webScraping } = require('../utils/webScraper');
const { llmFactory } = require('./langgraph');
const Prompt = require('../models/prompts');
const User = require('../models/user');
const UserBot = require('../models/userBot');
const Notification = require('../models/notification');
const { NOTIFICATION_TYPE } = require('../config/constants/common');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { AI_MODAL_PROVIDER, MODAL_NAME } = require('../config/constants/aimodal');
const { decryptedData, getCompanyId } = require('../utils/helper');
const { sendCommonNotification } = require('./notification');

/**
 * Ensure notification template exists in database
 */
const ensureNotificationTemplate = async () => {
    try {
        const existingNotification = await Notification.findOne({ code: NOTIFICATION_TYPE.PROMPT_SCRAPING });

        if (!existingNotification) {
            await Notification.create({
                title: "Prompt Scraping Complete",
                body: "Your prompt \"{prompt}\" has been successfully updated with website information.",
                code: NOTIFICATION_TYPE.PROMPT_SCRAPING,
                isActive: true
            });
            logger.info('✅ Created PROMPT_SCRAPING notification template');
        }
    } catch (error) {
        logger.error('Error creating notification template:', error.message);
    }
};

/**
 * Generate hash for website URL (matches Python implementation pattern)
 */
const generateWebsiteHash = (website) => {
    return crypto.createHash('sha256').update(website).digest('hex');
};

/**
 * Get LLM configuration for prompt scraping
 */
const getLLMConfig = () => ({
    modelName: MODAL_NAME.GPT_4O_MINI,
    llmProvider: AI_MODAL_PROVIDER.OPEN_AI,
    temperature: 0.7
});

/**
 * Get API key from user's bot configuration
 */
const getAPIKeyFromDb = async (user, modelName) => {
    try {
        const companyId = getCompanyId(user);
        const userBot = await UserBot.findOne({
            name: modelName,
            'company.id': companyId,
            modelType: 2,
            isActive: true
        });

        if (userBot?.config?.apikey) {
            return decryptedData(userBot.config.apikey);
        }

        logger.warn(`No API key found for user's model: ${modelName}`);
        return null;
    } catch (error) {
        logger.error(`Failed to get API key for model ${modelName}:`, error.message);
        return null;
    }
};

/**
 * Generate summary of scraped content using LLM
 */
const generateWebsiteSummary = async (scrapedData, website, model) => {
    try {
        const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

        const systemPrompt = `You are an expert content analyzer specializing in website analysis for prompt creation.

Your task is to analyze the provided website content and create a comprehensive summary that includes:

1. Brand Information: Company name, tagline, mission, values, and brand positioning
2. Company Information: Overview, industry, location, key business details
3. Products/Services: Main offerings, features, benefits, target market
4. Key Information: Important details that would be useful for content creation or business intelligence

IMPORTANT: Do NOT provide the summary in markdown format. Do NOT use markdown formatting such as **bold**, *italic*, # headers, - bullet points, or any other markdown syntax. Provide the summary in plain text format only.

Format your response as a comprehensive, well-structured summary that captures the essence of the website and would be valuable for someone creating prompts or content related to this company/website.

Keep the summary informative yet concise, focusing on actionable insights and key details.`;
        const userPrompt = `Please analyze the following website content and provide a comprehensive summary:

Website: ${website}

Content: ${scrapedData}

Provide a detailed summary covering the brand, company, products/services, and other key information from this website.`;

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt)
        ];

        const response = await model.invoke(messages);
        return response.content;

    } catch (error) {
        logger.error(`Error generating summary for ${website}: ${error.message}`);
        throw error;
    }
};

/**
 * Scrape a single website and generate summary
 */
const scrapeWebsiteForPrompt = async (website, model) => {
    try {
        logger.info(`🔍 Starting website scraping for prompt: ${website}`);

        // Add protocol if missing
        const fullUrl = website.startsWith('http') ? website : `https://${website}`;

        // Scrape the website (validation happens inside webScraping now)
        const scrapingResult = await webScraping(fullUrl);

        if (!scrapingResult.success) {
            return {
                website,
                summary: `Failed to retrieve content from "${website}": ${scrapingResult.message}`,
                error: true
            };
        }

        // Generate summary using LLM
        let summary;
        if (model) {
            try {
                summary = await generateWebsiteSummary(scrapingResult.data, website, model);
            } catch (summaryError) {
                logger.warn(`Summary generation failed for ${website}: ${summaryError.message}`);
                summary = `Website content was successfully retrieved from "${website}" but automatic summary generation failed.`;
            }
        } else {
            summary = `Website content retrieved from "${website}". Summary generation was skipped due to missing LLM configuration.`;
        }

        logger.info(`✅ Successfully processed website: ${website}`);

        return {
            website,
            summary,
            error: false,
            scrapedAt: new Date().toISOString(),
            rawData: scrapingResult.data
        };

    } catch (error) {
        logger.error(`❌ Error processing website ${website}: ${error.message}`);
        return {
            website,
            summary: `Error processing "${website}": ${error.message}`,
            error: true
        };
    }
};

/**
 * Send notification after successful scraping using sendCommonNotification
 */
const sendScrapingNotification = async (user, brainId, promptTitle, isSuccess = true) => {
    try {
        const users = [{ id: user._id }];
        const replacedata = {
            prompt: promptTitle,
            brainId: brainId
        };
        // Use sendCommonNotification with PROMPT_SCRAPING type
        sendCommonNotification(NOTIFICATION_TYPE.PROMPT_SCRAPING, users, user, replacedata);

        logger.info(`✅ Notification sent to user ${user._id} for prompt scraping ${isSuccess ? 'success' : 'failure'}`);

    } catch (error) {
        logger.error(`Error sending scraping notification: ${error.message}`);
        // Don't throw error as notification failure shouldn't fail the main process
    }
};

/**
 * Process websites for a specific prompt
 */
const processPromptWebsites = async (promptId, model) => {
    try {
        // Get the prompt with its websites
        const prompt = await Prompt.findById(promptId);
        if (!prompt || !prompt.website || prompt.website.length === 0) {
            return;
        }

        const existingSummaries = prompt.summaries || {};
        const newSummaries = {};
        let hasChanges = false;
        let totalTokens = 0;

        // Create a set of current website hashes for efficient lookup
        const currentWebsiteHashes = new Set();
        for (const website of prompt.website) {
            if (website && website.trim() !== '') {
                currentWebsiteHashes.add(generateWebsiteHash(website));
            }
        }

        // First, preserve existing summaries for websites that are still in the current list
        for (const [hash, summary] of Object.entries(existingSummaries)) {
            if (currentWebsiteHashes.has(hash)) {
                newSummaries[hash] = summary;
            } else {
                hasChanges = true;
            }
        }

        // Process each current website
        for (const website of prompt.website) {
            if (!website || website.trim() === '') continue;

            const websiteHash = generateWebsiteHash(website);

            // Check if summary already exists
            if (newSummaries[websiteHash]) {
                continue;
            }

            // Scrape and summarize the website
            logger.info(`Scraping new website: ${website}`);
            const result = await scrapeWebsiteForPrompt(website, model);

            // Store the summary
            newSummaries[websiteHash] = {
                website: website,
                summary: result.summary,
                scrapedAt: result.scrapedAt || new Date().toISOString(),
                error: result.error || false
            };

            hasChanges = true;

            // Estimate tokens (rough calculation)
            if (!result.error && model) {
                totalTokens += Math.ceil((result.summary.length + result.rawData?.length || 0) / 4);
            }
        }

        // Update the prompt with summaries (if there are any changes)
        if (hasChanges || Object.keys(newSummaries).length !== Object.keys(existingSummaries).length) {
            const updateData = {
                summaries: newSummaries,
                isCompleted: true
            };

            // Add token information if available (matches your schema structure)
            if (totalTokens > 0) {
                updateData.tokens = {
                    completion: Math.ceil(totalTokens * 0.3), // Rough estimate
                    promptT: Math.ceil(totalTokens * 0.7),   // Rough estimate
                    totalUsed: totalTokens,
                    totalCost: `$${(totalTokens * 0.000001).toFixed(8)}` // Very rough cost estimate
                };
            }

            await Prompt.findByIdAndUpdate(promptId, updateData);

        } else {
            // Mark as completed even if no changes (all websites already processed)
            await Prompt.findByIdAndUpdate(promptId, { isCompleted: true });
            logger.info(`✅ Marked prompt ${promptId} as completed (no changes needed)`);
        }

    } catch (error) {
        logger.error(`Error processing websites for prompt ${promptId}: ${error.message}`);
        // Mark prompt as completed with error
        await Prompt.findByIdAndUpdate(promptId, {
            isCompleted: true,
            // You might want to add an error field to track scraping failures
        });
    }
};

/**
 * Main function to scrape websites for prompts (replaces Python API call)
 */
const scrapeWebsitesForPrompts = async (_req, payload) => {
    try {
        const { parent_prompt_ids, child_prompt_ids } = payload;

        logger.info(`🚀 Starting website scraping for prompts: ${parent_prompt_ids.length} parent, ${child_prompt_ids.length} child`);

        // Ensure notification template exists
        await ensureNotificationTemplate();

        // Get all prompt IDs to process
        const allPromptIds = [...parent_prompt_ids, ...child_prompt_ids];

        // Get user info from the first prompt for API key lookup
        let user = null;
        if (allPromptIds.length > 0) {
            const firstPrompt = await Prompt.findById(allPromptIds[0]).select('user');
            if (firstPrompt?.user?.id) {
                user = await User.findById(firstPrompt.user.id).select('company roleCode invitedBy');
            }
        }

        // Get LLM configuration and API key from database
        const llmConfig = getLLMConfig();
        const apiKey = user ? await getAPIKeyFromDb(user, llmConfig.modelName) : null;

        let model = null;
        if (apiKey) {
            try {
                model = await llmFactory(llmConfig.modelName, {
                    streaming: false,
                    apiKey: apiKey,
                    llmProvider: llmConfig.llmProvider,
                    temperature: llmConfig.temperature
                });
            } catch (error) {
                logger.warn(`LLM initialization failed: ${error.message}. Proceeding without summary generation.`);
            }
        } else {
            logger.warn('No user API key configured. Proceeding without summary generation.');
        }

        let overallSuccess = true;

        // Process each prompt
        for (const promptId of allPromptIds) {
            try {
                await processPromptWebsites(promptId, model);
            } catch (error) {
                logger.error(`Error processing prompt ${promptId}: ${error.message}`);
                overallSuccess = false;
                // Continue with other prompts even if one fails
            }
        }

        // Send notifications for parent prompts (main prompts that user created)
        for (const parentPromptId of parent_prompt_ids) {
            try {
                const prompt = await Prompt.findById(parentPromptId).select('user title brain');
                if (prompt && prompt.user && prompt.user.id) {
                    const fullUser = await User.findById(prompt.user.id).select('_id fname lname email');
                    if (fullUser) {
                        await sendScrapingNotification(
                            fullUser,
                            prompt.brain.id,
                            prompt.title,
                            overallSuccess
                        );
                    }
                }
            } catch (error) {
                logger.error(`Error sending notification for prompt ${parentPromptId}: ${error.message}`);
            }
        }

        logger.info(`✅ Completed website scraping for ${allPromptIds.length} prompts`);
        return overallSuccess;

    } catch (error) {
        logger.error(`❌ Error in scrapeWebsitesForPrompts: ${error.message}`);
        return false;
    }
};

/**
 * Check if a website needs to be scraped (helper function)
 */
const needsScraping = (website, existingSummaries = {}) => {
    if (!website || website.trim() === '') return false;
    const websiteHash = generateWebsiteHash(website);
    return !existingSummaries[websiteHash];
};

/**
 * Get summary for a specific website from prompt
 */
const getWebsiteSummary = async (promptId, website) => {
    try {
        const prompt = await Prompt.findById(promptId).select('summaries');
        if (!prompt || !prompt.summaries) return null;

        const websiteHash = generateWebsiteHash(website);
        return prompt.summaries[websiteHash] || null;
    } catch (error) {
        logger.error(`Error getting website summary: ${error.message}`);
        return null;
    }
};

module.exports = {
    scrapeWebsitesForPrompts,
    processPromptWebsites,
    scrapeWebsiteForPrompt,
    generateWebsiteSummary,
    sendScrapingNotification,
    needsScraping,
    getWebsiteSummary,
    generateWebsiteHash,
    getLLMConfig,
    getAPIKeyFromDb
};