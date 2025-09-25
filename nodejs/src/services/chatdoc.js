const ChatDocs = require('../models/chatdocs');
const dbService = require('../utils/dbService');
const { deleteFromS3 } = require('./uploadFile');
const File = require('../models/file');
const Brain = require('../models/brains');
const ShareBrain = require('../models/shareBrain');
const { getShareBrains, getBrainStatus } = require('./brain');

const getAllChatDocs = async (req) => {
    try {
        const {isPrivateBrainVisible}=req.user

        if(req.body.query.brainId){

            const accessShareBrain=await ShareBrain.findOne({"brain.id":req.body.query.brainId,"user.id":req.user.id})

            if(!accessShareBrain){
                return {
                    status: 302,
                    message: "You are unauthorized to access this doc",
                };
            }

            const currBrain=await Brain.findById({ _id:req.body.query.brainId})

            if(!isPrivateBrainVisible && !currBrain.isShare){
               return {
                   status: 302,
                   message: "You are unauthorized to access this doc",
               };
            }
        }

        return dbService.getAllDocuments(
            ChatDocs,
            req.body.query || {},
            req.body.options || {},
        )
    } catch (error) {
        handleError(error, 'Error - getAllChatDocs')
    }
}

const deleteChatDoc = async (req) => {
    try {
        const checkFile = await ChatDocs.findById({ _id: req.params.id });
        await ChatDocs.deleteOne({ _id: req.params.id });
        const result = await dbService.deleteDocument(File, { _id: checkFile.fileId });
        if (result.deletedCount) {
            await deleteFromS3(checkFile.doc.uri);
            return true;
        }
        return false;
    } catch (error) {
        handleError(error, 'Error - deleteChatDoc');
    }
}

async function usersWiseGetAll(req) {
    try {
        const brains = await getShareBrains(req);
        if (!brains.length) return { data: [], paginator: {} };
        const brainStatus = await getBrainStatus(brains);
        const query ={
            brainId: { $in: brains.filter(ele => ele?.brain?.id).map(ele => ele.brain.id) },
            ...req.body.query
        }
        delete query.workspaceId;
        const options = {
            select: 'doc brain brainId embedding_api_key fileId',
            ...req.body.options
        }
        const result = await dbService.getAllDocuments(ChatDocs, query, options);
        const finalResult = result.data.map((record) => ({
            ...record._doc,
            brain: brains.find((ele) => ele?.brain?.id?.toString() === record?.brainId?.toString())?.brain,
            userId: brains.find((ele) => ele?.brain?.id?.toString() === record?.brainId?.toString())?.user,
            isShare: brainStatus.find((ele) => ele?._id?.toString() === record?.brainId?.toString())?.isShare,
        }))
        return {
            data: finalResult,
            paginator: result.paginator
        }
    } catch (error) {
        handleError(error, 'Error - usersWiseGetAll');
    }
}

const favoriteChatDoc = async (req) => {
    try {
        const updateOperation = req.body.isFavorite
            ? { $addToSet: { favoriteByUsers: req.userId } }
            : { $pull: { favoriteByUsers: req.userId } };

        return await ChatDocs.findOneAndUpdate(
            { _id: req.params.id },
            updateOperation,
            { new: true }
        ).select("favoriteByUsers _id");
    } catch (error) {
        handleError(error, "Error - favoriteChatDoc");
    }
};

module.exports = {
    getAllChatDocs,
    deleteChatDoc,
    usersWiseGetAll,
    favoriteChatDoc
}