'use client';
import Bookmark from './BookMark';
import Share from './Share';
import { memo } from 'react';
import useChatMember from '@/hooks/chat/useChatMember';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { setAddMemberModalAction } from '@/lib/slices/chat/chatSlice';
import ShareChatModal from '../Chat/ShareChatModal';
import useChat from '@/hooks/chat/useChat';
import ProfileImage from '../Profile/ProfileImage';
import GroupIcon from '@/icons/GroupIcon';

const ChatMembersModal = memo(({ openChatModal, chatmembers }) => {
    const filteredMembers = chatmembers?.filter(currUser => !currUser.teamName && !currUser.teamId) || [];
    let teamCount=0
    let chatUserCount=0
    const teamMembers = chatmembers?.reduce((acc, curr) => {
        if (curr.teamName) {
            teamCount++;
            acc+=(curr.teamUsers.length || 0);
        } else {
            chatUserCount++;
        }
        return acc;
    }, 0);
    const userCount = chatUserCount + teamMembers;
 
    return (
        <div
            onClick={openChatModal}
            className="avatar-group md:p-[5px] p-0.5 bg-b15 rounded-[100px] border border-b11 cursor-pointer max-md:hidden"
        >
            <div className="flex -space-x-1 overflow-hidden header-user">
                {filteredMembers.slice(0, 3).map((profile, index) => (
                    <ProfileImage 
                        key={profile._id} 
                        user={profile?.user} 
                        w={28} 
                        h={28}
                        classname={`rounded-full object-cover h-[28px] ${index > 0 ? 'opacity-30' : 'z-10'}`}
                        spanclass={`user-char flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[#B3261E] text-b15 text-font-16 font-normal mr-0 ${index > 0 ? 'opacity-30' : 'z-10'}`} 
                    />
                ))}
                {filteredMembers.length < 3 && teamCount > 0 && (
                    <>
                        {Array.from({ length: Math.min(3 - filteredMembers.length, teamCount) }).map((_, index) => (
                            <span key={index} className="user-char flex items-center justify-center size-8 rounded-full bg-gray-200 text-b15 text-font-16 font-normal mr-0">
                                <GroupIcon
                                    width={16}
                                    height={16}
                                    className="object-cover fill-b5"                                    
                                />
                            </span>
                        ))}
                    </>
                )}
                <span className="avatar flex items-center justify-center h-[30px] w-[30px] rounded-full text-font-12 font-medium text-b2 bg-b15 z-[1] !mx-0">
                    {userCount}
                </span>
            </div>

        </div>
    );
});

const MemberList = memo(() => {
    const { chatmembers, getChatMembers} = useChatMember();   
    const { addChatLoading } = useChat();
    const params = useParams();
    const isOpen = useSelector((store:any) => store.chat.addMemberModal);
    const chatTitle = useSelector((store:any) => store.conversation.chatTitle);
    const chatInfo = useSelector((store:any) => store.chat.chatInfo);
    
    const dispatch = useDispatch();
    const openChatModal = () => {
        dispatch(setAddMemberModalAction(true));
    };

    const closeModal = () => {
        dispatch(setAddMemberModalAction(false));
    };

    const refetchMemebrs = () => {
        setTimeout(() => getChatMembers(params.id), 1000);
    };

    const refetchTeams = () => {
        setTimeout(() => getChatMembers(params.id), 1000);
    };
 
    return (
        <>
            {!chatInfo?.brain?.id?.deletedAt && 
                <>
                    {chatmembers.length > 0 && !addChatLoading && <ChatMembersModal openChatModal={openChatModal} chatmembers={chatmembers} />}
                    <Bookmark />
                    <Share />
                </>
            }
            {isOpen && !chatInfo?.isNewChat && (
                <ShareChatModal
                    chatTitle={chatTitle}
                    chatmembers={chatmembers}
                    open={isOpen}
                    closeModal={closeModal}
                    chatInfo={chatInfo}
                    refetchMemebrs={refetchMemebrs}
                    refetchTeams={refetchTeams}
                />
            )}
        </>
    );
});

export default MemberList;
