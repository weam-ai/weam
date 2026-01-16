const ChatMember = require("../models/chatmember");
const Chat = require("../models/chat");
const dbService = require("../utils/dbService");
const { formatUser, formatBrain, convertPaginationResult } = require("../utils/helper");
const { sendCommonNotification } = require("./notification");
const { NOTIFICATION_TYPE } = require("../config/constants/common");
const { ObjectId } = require("mongoose").Types;
const Brain = require('../models/brains');
const ShareBrain = require('../models/shareBrain');

const addChatMember = async (req) => {
    try {
        const { members, isBulk } = req.body;
        const chat = await Chat.findOne({ _id: members[0].chatId });

        // handle bulk and single add chat member
        if (!isBulk) return ChatMember.create(members[0]);
        const newUser = [];
        const insertObj = members.map((member) => {
            newUser.push({ id: member.user.id });
            return {
                user: formatUser(member.user),
                chatId: member.chatId,
                invitedBy: req.userId,
                isNewChat: chat.isNewChat,
                brain: formatBrain(member.brain),
            };
        });
        // ⚠️ WARNING: Do not use await with sendCommonNotification().
        // This function should be called in the background without blocking the main thread.
        sendCommonNotification(
            NOTIFICATION_TYPE.CHAT_INVITATION,
            newUser,
            req.user,
            { chat: chat?.title, chatId: chat._id }
        );
        return await ChatMember.insertMany(insertObj);
    } catch (error) {
        handleError(error, "Error - addChatMember");
    }
};

const removeChatMember = async (req) => {
    try {
        // return ChatMember.updateOne({ _id: req.params.id }, { $set: { deletedAt: new Date() }})
        return ChatMember.deleteOne({ _id: req.params.id });
    } catch (error) {
        handleError(error, "Error - removeChatMember");
    }
};

const memberList = async (req) => {
    try {
        
        const {isPrivateBrainVisible}=req.user

        if(req.body.query["brain.id"]){

            const accessShareBrain=await ShareBrain.findOne({"brain.id":req.body.query["brain.id"],"user.id":req.user.id})

            if(!accessShareBrain){
                return {
                    status: 302,
                    message: "You are unauthorized to access this chat",
                };
            }

            const currBrain=await Brain.findById(req.body.query["brain.id"])

           
            if(!isPrivateBrainVisible && !currBrain.isShare){
               return {
                   status: 302,
                   message: "You are unauthorized to access this chat",
               };
            }
        }else if(req.body.query.chatId){
          const currChat=  await Chat.findById(req.body.query.chatId)


          const currBrain=await Brain.findById(currChat?.brain?.id)

            if(!isPrivateBrainVisible && !currBrain.isShare){
               return {
                   status: 302,
                   message: "You are unauthorized to access this chat",
               };
            }
        }
       
        const chatMemberList = await dbService.getAllDocuments(
            ChatMember,
            req.body.query || {},
            { ...req.body.options, distinctField: "user.email" } || {}
        );

        const groupedMembers = {};
        chatMemberList.data.forEach((member) => {
            const chatId = member.chatId;
            const userId = member.user.id;

            if (!groupedMembers[`${chatId}-${userId}`]) {
                groupedMembers[`${chatId}-${userId}`] = member;
            }
        });

        const uniqueMembers = Object.values(groupedMembers);

        if(req.body.query.chatId){

            const teamList= await Chat.findOne({
                _id: req.body.query.chatId,
                teams: { $exists: true },
                
            },{_id:1,teams:1,title:1})

            teamList?.teams?.forEach((currTeam)=>{
                uniqueMembers.push(currTeam)
            })
        }
        return {
            data: uniqueMembers,
            paginator: chatMemberList.paginator
        }
    } catch (error) {
        handleError(error, "Error - memberList");
    }
};

const favouriteChat = async (req) => {
    try {
        return ChatMember.findOneAndUpdate(
            { chatId: req.params.id, "user.id": req.userId },
            { isFavourite: req.body.isFavourite },
            { new: true }
        ).select("isFavourite");
    } catch (error) {
        handleError(error, "Error - favouriteChat");
    }
};

const addBrainChatMember = async (
    brain,
    sharewith,
    userId,
    teamExists = false
) => {
    const brainChats = await Chat.find(
        {
            "brain.id": brain._id,
            deletedAt: { $exists: false },
        },
        { isNewChat: 1, isShare: 1, title: 1, teams: 1, _id: 1 },
        {sort:{createdAt:-1}}
    );

    let insertObj = [];

    if (teamExists) {
        const updateChatIds = brainChats.map((currChat) => currChat._id);
        const teamIds = sharewith.map((currTeam) => currTeam.id);

        await Chat.updateMany(
            { _id: { $in: updateChatIds } },
            { $push: { teams: { $each: teamIds } } }
        );

        sharewith.map((share) => {
            share.teamUsers.map((user) => {
                brainChats.map((chat) => {
                    insertObj.push({
                        user: {
                            email: user.email,
                            id: user.id,
                            fname: user.fname,
                            lname: user.lname,
                        },
                        chatId: chat._id,
                        invitedBy: userId,
                        isShare: chat.isShare,
                        isNewChat: chat.isNewChat,
                        teamId: share.id,
                        brain: formatBrain(brain),
                        title: chat.title,
                    });
                });
            });
        });

        await ChatMember.insertMany(insertObj);
    } else {
        sharewith.map((share) => {
            brainChats.map((chat) => {
                insertObj.push({
                    user: {
                        email: share.email,
                        id: share.id,
                        fname: share?.fname,
                        lname: share?.lname,
                    },
                    chatId: chat._id,
                    invitedBy: userId,
                    isShare: chat.isShare,
                    isNewChat: chat.isNewChat,
                    brain: formatBrain(brain),
                    title: chat.title,
                });
            });
        });

        await ChatMember.insertMany(insertObj);
    }
};

const removeBrainChatMember = async(brain, userId) =>{
    try {
        return ChatMember.deleteMany({ 
            'brain.id': brain, 
            'user.id': userId,
            teamId:{$exists:false}
        });
    } catch (error) {
        handleError(error, "Error - favouriteChat");
    }
};

async function socketChatMemberList(filter) {
    try {
        const {isPrivateBrainVisible,brainId,chatId,userId}=filter

        if(brainId){

            const accessShareBrain=await ShareBrain.findOne({"brain.id":brainId,"user.id":userId})

            if(!accessShareBrain){
                return {
                    status: 302,
                    message: "You are unauthorized to access this chat",
                };
            }

            const currBrain=await Brain.findById(brainId)

            
            if(!isPrivateBrainVisible && !currBrain?.isShare){
               return {
                   status: 302,
                   message: "You are unauthorized to access this chat",
               };
            }
        }else if(chatId){
          const currChat=  await Chat.findById(chatId)

          if(currChat?.brain?.id){

              const currBrain=await Brain.findById(currChat?.brain?.id)
    
                if(!isPrivateBrainVisible && !currBrain?.isShare){
                   return {
                       status: 302,
                       message: "You are unauthorized to access this chat",
                   };
                }
          }
        }
       
        const query={
            // "brain._id":brainId,
            "chatId":chatId,
            // teamId:{$exists:false}
        }
        const chatMemberList = await dbService.getAllDocuments(
            ChatMember,
            query || {},
            {pagination:false, distinctField: "user.email" } || {}
        );

        const groupedMembers = {};
        chatMemberList.data.forEach((member) => {
            const chatId = member.chatId;
            const userId = member.user.id;

            if (!groupedMembers[`${chatId}-${userId}`]) {
                groupedMembers[`${chatId}-${userId}`] = member;
            }
        });

        const uniqueMembers = Object.values(groupedMembers);

        if(chatId){

            const teamList= await Chat.findOne({
                _id: chatId,
                teams: { $exists: true },
                
            },{_id:1,teams:1,title:1})

            teamList?.teams?.forEach((currTeam) => {
                const plainObject = currTeam?.toObject();
                const updatedTeam = { ...plainObject, title: teamList?.title };
                return uniqueMembers?.push(updatedTeam)
            })
        }
    

        const pagination={offset:0,limit:10}

        return convertPaginationResult(uniqueMembers,pagination)
    } catch (error) {
        handleError(error, "Error - socketChatMemberList");
    }
}



module.exports = {
    addChatMember,
    removeChatMember,
    memberList,
    favouriteChat,
    addBrainChatMember,
    removeBrainChatMember,
    socketChatMemberList
};
