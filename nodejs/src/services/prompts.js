const Prompt = require('../models/prompts');
const { formatUser, handleError, formatBrain, arraysEqual } = require('../utils/helper');
const dbService = require('../utils/dbService');
const { LINK, API } = require('../config/config');
const { JWT_STRING, ROLE_TYPE } = require('../config/constants/common');
const { scrapeWebsitesForPrompts } = require('./promptWebScraper');
const Brain = require('../models/brains');
const ShareBrain = require('../models/shareBrain');
const { accessOfBrainToUser } = require('./common');
const { extractAuthToken } = require('./company');
const { getShareBrains, getBrainStatus } = require('./brain');

// check website not contain empty string
const isFalsyWebsite = (website) => !website || (Array.isArray(website) && website.length && website[0] === '');

const addPrompt = async (req) => {
    try {
        const { title, brains, selected, website } = req.body;
        const {isPrivateBrainVisible}=req.user
        
        if(selected){
            const existing = await Prompt.findOne({ title: title, 'brain.id': selected });
            if (existing) throw new Error(_localize('module.alreadyExists', req, 'prompt'));
        }

        const scrapeCondition =
            !isFalsyWebsite(website);

        const bulk = [];
        
        for (const br of brains) {
            const hasAccess = await accessOfBrainToUser({ brainId: br.id, userId: req.user.id });
            if (hasAccess &&  (br.isShare || (isPrivateBrainVisible && !br.isShare))) {
                req.body.isCompleted = !scrapeCondition;
                bulk.push({
                    ...req.body,
                    favoriteByUsers: req.body.isFavorite ? [req.user.id] : [],
                    brain: formatBrain(br),
                    user: formatUser(req.user),
                });
            }
        }    
       
        const result = await Prompt.insertMany(bulk);
        const companyId = req.roleCode === ROLE_TYPE.COMPANY ? req.user.company.id : req.user.invitedBy;
        if (scrapeCondition) {
            const prompt_ids = [];
            const child_prompt_ids = [];
            result.forEach((prompt) => {
                if (prompt?.brain?.id && prompt.brain.id.toString() === req.body.selected) {
                    prompt_ids.push(prompt._id.toString());
                } else {
                    child_prompt_ids.push(prompt._id.toString());
                }
            });
            scrappingPromptData(req, { 
                parent_prompt_ids: prompt_ids,
                company_id: companyId.toString(),
                child_prompt_ids: child_prompt_ids,
            });
        }
        return result;
    } catch (error) {
        handleError(error, 'Error - addPrompt')
    }
}

const getPromptList = async (req) => {
    try {

        const {isPrivateBrainVisible}=req.user

        if(req.body.query["brain.id"]){
            const accessShareBrain=await ShareBrain.findOne({"brain.id":req.body.query["brain.id"],"user.id":req.user.id})

            if(!accessShareBrain){
                return {
                    status: 302,
                    message: "You are unauthorized to access this prompt",
                };
            }

            const currBrain=await Brain.findById({ _id:req.body.query["brain.id"]})

            if(!isPrivateBrainVisible && !currBrain.isShare){
               return {
                   status: 302,
                   message: "You are unauthorized to access this prompt",
               };
            }
        }

        return dbService.getAllDocuments(
            Prompt,
            req.body.query || {},
            req.body.options || {},
        )
    } catch (error) {
        handleError(error, 'Error - getPromptList')
    }
}

const deletePrompt = async (req) => {
    try {
        return Prompt.deleteOne({ _id: req.params.id });
    } catch (error) {
        handleError(error, 'Error - deletePrompt');
    }
}

const updatePrompt = async (req) => {
    try {
        const { brains, selected, website } = req.body;
        const bulkPrompts = [];
        const scrapeCondition =
            !isFalsyWebsite(website);
        
        brains.forEach((br) => {
            if (br.id !== selected) {
                bulkPrompts.push({
                    ...req.body,
                    favoriteByUsers: req.body.isFavorite ? [req.user.id] : [],
                    brain: formatBrain(br),
                    user: formatUser(req.user),
                })
            }
        })
        let newEditedPrompts
        if (bulkPrompts.length) newEditedPrompts = await Prompt.insertMany(bulkPrompts);
        
      const result = await Prompt.findOne({ _id: req.params.id }, { 'website': 1 });
        const reqWebsites = website || [];
        const resultWebsites = result?.website?.length ? result.website : [];
        const websitesMatch = arraysEqual(reqWebsites, resultWebsites);

        // Store scraping info for after the update
        let shouldTriggerScraping = false;
        let scrapingPayload = null;

        if (!websitesMatch) {
            shouldTriggerScraping = true;
            const companyId = req.roleCode === ROLE_TYPE.COMPANY ? req.user.company.id : req.user.invitedBy;
            const child_prompt_ids = newEditedPrompts?.map(prompt => prompt._id.toString()) || [];
            scrapingPayload = {
                parent_prompt_ids: [req.params.id],
                company_id: companyId.toString(),
                child_prompt_ids: child_prompt_ids,
            };
            req.body.isCompleted = false;
        }
        const updateOperation = {
            $set: {
                title: req.body.title,
                content: req.body.content,
                tags: req.body.tags || [],
                website: req.body.website || [],
                addinfo: req.body.addinfo,
                brandInfo: req.body.brandInfo,
                companyInfo: req.body.companyInfo,
                productInfo: req.body.productInfo,
                isCompleted: req.body.isCompleted,
            }
        };

        if (req.body.isFavorite) {
            updateOperation.$addToSet = {
                favoriteByUsers: req.user.id
            };
        } else {
            updateOperation.$pull = {
                favoriteByUsers: req.user.id
            };
        }

      const updatedPrompt = await Prompt.findByIdAndUpdate(
            { _id: req.params.id },
            updateOperation,
            { new: true }
        );

        // Trigger scraping AFTER the prompt has been updated
        // This ensures the scraping service gets the updated website list and can properly remove summaries
        if (shouldTriggerScraping && scrapingPayload) {
            scrappingPromptData(req, scrapingPayload);
        }

        return updatedPrompt;
    } catch (error) {
        handleError(error, 'Error - updatePrompt');
    }
}
  
const scrappingPromptData = async (req, payload) => {
    try {
        logger.info(`Starting website scraping for prompts:`);

        // Use the Node.js scraping service instead of Python API
        const result = await scrapeWebsitesForPrompts(req, payload);


        if (result) return true;
        return false;
    } catch (error) {
        handleError(error, 'Error in scrappingPromptData');
        return false;
    }
}

async function usersWiseGetAll(req) {
    try {
        const brains = await getShareBrains(req);
        if (!brains.length) return { data: [], paginator: {} };
        const brainStatus = await getBrainStatus(brains);
        const query ={
            'brain.id': { $in: brains.filter(ele => ele?.brain?.id).map(ele => ele.brain.id) },
            ...req.body.query
        }
        delete query.workspaceId;
        const result = await dbService.getAllDocuments(Prompt, query, req.body.options || {});
        const finalResult = result.data.map((record) => ({
            ...record._doc,
            isShare: brainStatus.find((ele) => ele?._id?.toString() === record?.brain?.id?.toString())?.isShare,
        }))
        return {
            data: finalResult,
            paginator: result.paginator
        }
    } catch (error) {
        handleError(error, 'Error - usersWiseGetAll');
    }
}

const favoritePrompt = async (req) => {
    try {
        const updateOperation = req.body.isFavorite
            ? { $addToSet: { favoriteByUsers: req.userId } }
            : { $pull: { favoriteByUsers: req.userId } };

        return await Prompt.findOneAndUpdate(
            { _id: req.params.id },
            updateOperation,
            { new: true }
        ).select("favoriteByUsers _id");
    } catch (error) {
        handleError(error, "Error - favoritePrompt");
    }
};

module.exports = {
    addPrompt,
    getPromptList,
    deletePrompt,
    updatePrompt,
    usersWiseGetAll,
    favoritePrompt,
}