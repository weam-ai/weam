const UserBot = require('../models/userBot');
const dbService = require('../utils/dbService');
const { cipherDecryption, cipherEncryption, getCompanyId } = require('../utils/helper');
const { sendAiModelKeyRemove } = require('../socket/chat');

async function addUserBot(req) {
    try {
        const data = {
            ...req.body,
            company: req.user.company,
        };
        const encryption = cipherEncryption(req.body.config.apikey, req.user.email)
        data.config = {
            key: encryption.key,
            iv: encryption.iv,
            ciphertext: encryption.ciphertext,
            apikey: encryption.apikey,
        }
        const query = { 'bot.title': req.body.bot.title, 'company.id': req.user.company.id }
        const existing = await UserBot.findOne(query);
        if (existing) return UserBot.findOneAndUpdate(query, data, { new: true });
        return dbService.createDocument(UserBot, data);
    } catch (error) {
        handleError(error, 'Error - addUserBot')
    }
}

async function checkUserBot(req) {
    const result = await UserBot.findById({ _id: req.params.id });
    if (!result) {
        throw new Error(_localize('module.notFound', req, 'user bot'), res);
    }
    return result;
}

async function updateUserBot(req) {
    try {
        await checkUserBot(req);
        return UserBot.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true });
    } catch (error) {
        handleError(error, 'Error - updateUserBot')
    }
}

async function viewUserBot(req) {
    try {
        return checkUserBot(req);
    } catch (error) {
        handleError(error, 'Error - viewUserBot')
    }
}

async function deleteUserBot(req) {
    try {
        const userbot = await UserBot.updateMany({ 'bot.code': req.body.code, 'company.id': getCompanyId(req.user)  }, { $set: { deletedAt: Date.now() }});
        sendAiModelKeyRemove(req.user.company.id, { botCode: req.body.code });
        return userbot
        // return true;
    } catch (error) {
        handleError(error, 'Error - deleteUserBot')
    }
}

async function getAll(req) {
    try {
        return await dbService.getAllDocuments(UserBot, req.body.query || {}, req.body.options || {});
    } catch (error) {
        handleError(error, 'Error - getAll')
    }
}

async function partialUpdate(req) {
    try {
        return UserBot.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true }).select('isActive');
    } catch (error) {
        handleError(error, 'Error - partialUpdate')
    }
}

const viewApiKey = async (req) => {
    try {
        const result = await UserBot.findOne({ 'company.id': req.user.company.id });
        if (!result) return false;

        return cipherDecryption(req.body.apikey, req.user.email);
    } catch (error) {
        handleError(error, 'Error - viewApiKey');
    }
}

async function fetchModalList (companyId) {
    const result = await UserBot.find(
        {
            'company.id': companyId,
            modelType: { $ne: 1 },
            deletedAt: { $exists: false },
        },
        {
            bot: 1,
            company: 1,
            name: 1,
            modelType: 1,
            createdAt: 1,
            config: 1,
            provider:1,
        }
    ).lean();
    
    return result;
}

module.exports = {
    addUserBot,
    updateUserBot,
    viewUserBot,
    getAll,
    partialUpdate,
    deleteUserBot,
    viewApiKey,
    fetchModalList
}