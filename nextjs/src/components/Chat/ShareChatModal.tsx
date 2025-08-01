import React, { useEffect, useState,useRef, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import SearchIcon from '@/icons/Search';
import Loader from '../ui/Loader';
import AutoSelectChip from '../ui/AutoSelectChip';
import { Controller } from 'react-hook-form';
import { createHandleOutsideClick, dateDisplay, displayName, showNameOrEmail } from '@/utils/common';
import useMembers from '@/hooks/members/useMembers';
import ChatThreadIcon from '@/icons/ChatThreadIcon';
import useChatMember from '@/hooks/chat/useChatMember';
import { formatBrain } from '@/utils/helper';
import useChat from '@/hooks/chat/useChat';
import { getCurrentUser } from '@/utils/handleAuth';
import { useRouter } from 'next/navigation';
import routes from '@/utils/routes';
import { useDispatch } from 'react-redux';
import { setAddMemberModalAction } from '@/lib/slices/chat/chatSlice';
import useModal from '@/hooks/common/useModal';
import ProfileImage from '../Profile/ProfileImage';
import { useTeams } from '@/hooks/team/useTeams';
import GroupIcon from '@/icons/GroupIcon';
import AddUser from '@/icons/AddUser';

const AddNewMemberModal = ({ chatInfo, onClose, open, refetchMemebrs, memberList }) => {
    const {
        addChatMember,
        handleSubmit,
        errors,
        control,
        setFormValue,
        reset,
    } = useChatMember();

    const { members, getMembersList } = useMembers();

    const [searchMemberValue, setSearchMemberValue] = useState('');
    const [memberOptions, setMemberOptions] = useState([]);

    const [isLoading, setIsLoading] = useState(false);

    const existingMembers = memberList.map(record => record?.user?.email);

    useEffect(() => {
        if (searchMemberValue == '') {
            setMemberOptions([]);
        }
        if (searchMemberValue) {
            const timer = setTimeout(() => {
                getMembersList({
                    search: searchMemberValue,
                    brainId: chatInfo?.brain?.id,
                    chatId: chatInfo?._id,
                });
            }, 1000);
            clearTimeout(timer);
        }
    }, [searchMemberValue]);

    useEffect(() => {
        const memberlist = members.map((user) => ({
            email: user.email,
            id: user.id,
            fullname:  showNameOrEmail(user),
            fname: user?.fname, 
            lname: user?.lname 
        }))

        const filteredRecords = memberlist.filter(record => !existingMembers.includes(record.email));
        setMemberOptions(filteredRecords);
    }, [members]);

    const onSubmit = async ({ role, members }) => {
        setIsLoading(true);
        if (members.length) {
            members = members.map((member) => ({
                chatId: chatInfo._id,
                brain: formatBrain(chatInfo.brain),
                user: {
                    email: member.email,
                    id: member.id,
                },
            }));
            await addChatMember(members);
        }
        onClose();
        setIsLoading(false);
        refetchMemebrs();
        setMemberOptions([]);
    };

    useEffect(() => {
        reset();
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)]">
                <DialogHeader className="rounded-t-10 bg-b12 px-[30px] py-6 border-b borer-b11">
                    <DialogTitle className="text-font-18 font-bold text-b2">
                        <AddUser
                            width={24}
                            height={24}
                            className="w-6 h-6 min-w-6 object-contain fill-b2 me-3.5 inline-block align-text-top"
                        />
                        Add a Member ({`${chatInfo?.title}`})
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body flex flex-col flex-1 relative h-full pl-5 pr-2.5">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="h-full w-full max-h-[60dvh]">
                            <div className="h-full pr-2.5 pt-5">
                                <div className="workspace-group h-full flex flex-col">
                                    <div className="px-2.5 gap-2.5 flex">
                                        <div className="flex-1 relative">
                                        <label
                                            htmlFor="members"
                                            className="text-font-16 font-semibold inline-block text-b2"
                                        >
                                            Members
                                            <span className="text-red">*</span>
                                        </label>
                                        <p className='mb-2.5 text-font-15'>Add the members from Workspace </p>
                                        
                                            <Controller
                                                name="members"
                                                control={control}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        showLabel={false}
                                                        name={'members'}
                                                        options={memberOptions}
                                                        optionBindObj={{
                                                            label: 'email',
                                                            value: 'id',
                                                        }}
                                                        inputValue={
                                                            searchMemberValue
                                                        }
                                                        errors={errors}
                                                        handleSearch={
                                                            setSearchMemberValue
                                                        }
                                                        setFormValue={
                                                            setFormValue
                                                        }
                                                        {...field}
                                                    />
                                                )}
                                            />
                                            <div className="flex justify-center mt-5 mb-5">
                                                <button
                                                    type="submit"
                                                    className="btn btn-black"
                                                    disabled={isLoading}
                                                >
                                                    Add a Member
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
const AboutBrainDetails = ({
    chatInfo,
    adminUser,
    managerUser,
    isOwner,
    onLeaveChat,
    currentUser,
    chatTitle
}) => {
    const [title, setTitle] = useState(chatTitle);
    const [ isEdit, setIsEdit] = useState(false);

    const { editChat } = useChat();

    const onChange = () => {
        if(chatTitle !== title){
            editChat(chatInfo._id, {
                title: title,
            });
        }
        setIsEdit(false);
    };

    const chatNameInputRef=useRef()
    const chatNameButtonRef=useRef()
    useEffect(
        () => {

            if(!isEdit) return 

            const handleClickOutside = createHandleOutsideClick(
                chatNameInputRef,
                chatNameButtonRef,
                setIsEdit,
                false,
                setTitle,
                chatTitle
            );

            document.addEventListener('mousedown', handleClickOutside);

            return () =>
                document.removeEventListener('mousedown', handleClickOutside);
        },
        [isEdit,setIsEdit]
    );
    
    return (
        <div className="h-full w-full">
            <div className="group/item user-item flex justify-between py-2.5 border-b border-b11">
                <div>
                    
                </div>
            </div>
           
        </div>
    );
};

const MemberItem = ({ member, handleRemoveMember, adminUser, isOwner }) => {
    const isRemoval = member?.user?.id != adminUser?.user?.id && isOwner;
    const role = member?.user?.id == adminUser?.user?.id ? 'ADMIN' : undefined;
    const { isOpen, openModal, closeModal } = useModal();
    return (
        <div className="group/item user-item flex justify-between py-2.5 border-b">
            <div className="user-img-name flex items-center">
                <ProfileImage user={member?.user} w={40} h={40}
                    classname={'user-img size-[35px] rounded-full mr-2.5 object-cover'}
                    spanclass={'user-char flex items-center justify-center size-[35px] rounded-full bg-[#B3261E] text-b15 text-font-16 font-normal mr-2.5'}
                />
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2">
                    {displayName(member?.user)}
                </p>
            </div>
            <div className="flex items-center space-x-2.5">
                {role && (
                    <span className="bg-blue5 text-gray-800 text-xs font-medium me-2 px-2.5 text-font-14 py-0.5 rounded">
                        {role}
                    </span>
                )}
            </div>
        </div>
    );
};
const TeamItem = ({ team, handleRemoveTeam }) => {

    const { isOpen, openModal, closeModal } = useModal();
    return (
        <div className="group/item user-item flex justify-between py-2.5 border-b">
            <div className="user-img-name flex items-center">
                <span className='w-[35px] h-[35px] rounded-full bg-b11 p-1.5'>
                    <GroupIcon width={35} height={35} className="fill-b5 w-full h-auto" />
                </span>
                <p className="m-0 text-font-14 leading-[22px]  text-b2 ml-2.5">
                    {team?.teamName}
                </p>
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2 ml-2">
                    ({team?.teamUsers?.length} Members)
                </p>
            </div>

        </div>
    );
}

const ShareChatModal = ({
    open,
    closeModal,
    chatmembers,
    chatInfo,
    chatTitle,
    refetchMemebrs,
    refetchTeams,
}) => {
    const { removeChatMember } = useChatMember();
    const router = useRouter();
    const dispatch = useDispatch();

    const currentUser = getCurrentUser();

    const isOwner = currentUser?._id == chatInfo?.user?.id;

    const [addMemberModal, setAddMemberModal] = useState(false);
    const [memberList, setMemberList] = useState(chatmembers);
    const [teamList, setTeamList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [adminUser, setAdminUser] = useState();
    const [filter, setFilter] = useState({
        search: '',
        role: null,
    });
    const [totalMemberCount, setTotalMemberCount] = useState(0);

    const {  deleteShareTeamToChat } =useTeams();

    const totalMembers = useCallback((teamList, memberList) => {
        let total = 0;
        
        const individualMembers = memberList?.filter(member => !member?.teamName)?.length || 0;
        total += individualMembers;

        const teamMembers = teamList?.reduce((acc, curr) => {
            if (curr?.teamName) {
                acc += curr?.teamUsers?.length || 0;
            }
            return acc;
        }, 0) || 0;
        total += teamMembers;

        return total;
    }, []);

    useEffect(() => {
        const regex = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        setMemberList(chatmembers.filter((m) => regex.test(m?.user?.email) && !m?.teamId));
        setTeamList(chatmembers?.filter((currTeam)=>regex.test(currTeam?.teamName)))
        totalMembers(chatmembers, memberList)
    }, [filter]);

    useEffect(() => {
        const newTotal = totalMembers(teamList, memberList);
        setTotalMemberCount(newTotal);
    }, [filter, teamList, memberList]);

    useEffect(() => {
        const findAdmin = chatmembers.find(
            (member) => member?.user?.id == chatInfo?.user?.id
        );
        setAdminUser(findAdmin);
        setTeamList(chatmembers);
    }, [chatmembers]);

    const handleRemoveMember = (value) => {
        removeChatMember(value);
        refetchMemebrs();
    };

    const handleRemoveTeam = async (value) => {
      
         deleteShareTeamToChat(
            chatInfo.brain.id.companyId,
            chatInfo.brain.id.workspaceId,
            chatInfo.brain.id._id,
            chatInfo._id,
            value,

        );
        refetchTeams();
    };

    const onLeaveChat = () => {
        const find_chat_id = memberList.find(
            (member) => member.user.id == currentUser._id
        );
        removeChatMember(find_chat_id._id);
        dispatch(setAddMemberModalAction(false));
        setTimeout(
            () => router.push(`${routes.chat}?${chatInfo?.brain?.slug}`),
            1000
        );
    };



    return (
        <Dialog open={open} onOpenChange={closeModal}>
            <DialogContent className="md:max-w-[700px] md:min-h-[150px] max-w-[calc(100%-30px)] py-7">
                {isLoading ? (
                    <Loader />
                ) : (
                    <>
                        <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                            <DialogTitle className="font-semibold flex items-center">
                                <ChatThreadIcon
                                    width={'24'}
                                    height={'24'}
                                    className={
                                        'me-3 inline-block align-middle fill-b2'
                                    }
                                />
                                {chatTitle}
                            </DialogTitle>
                            <DialogDescription>
                                <div className="small-description text-font-14 leading-[24px] text-b5 font-normal ml-9">
                                <span className='mr-0.5'>Created By: 
                                </span>
                                {adminUser && (
                                    <span>
                                        {`${displayName(adminUser?.user)} on ${dateDisplay(
                                            adminUser.createdAt
                                        )}`}
                                    </span>
                                )}
                                   
                                </div>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="dialog-body h-full pb-6 px-8">
                            <div className="search-wrap search-member relative mt-5">
                                <input
                                    type="text"
                                    className="default-form-input default-form-input-border-light default-form-input-md !text-font-16"
                                    id="searchMember"
                                    placeholder="Search Member"
                                    onChange={(e) => {
                                        setTimeout(() => {
                                            setFilter({
                                                ...filter,
                                                search: e.target
                                                    .value,
                                            });
                                        }, 1000);
                                    }}
                                />
                                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                                    <SearchIcon className="w-4 h-[17px] fill-b7" />
                                </span>
                            </div>
                            <div
                                className="px-0 font-normal mt-5"
                                // value="Members"
                                >
                                Members{' '}
                                <span className="ms-1.5">
                                    {totalMemberCount}
                                </span>
                            </div>
                            <div className="overflow-y-auto w-full max-h-[65vh]">
                                    <div className="user-lists h-full w-full mt-2.5">
                                        {memberList?.map((nm) => (
                                            !nm?.teamName && <MemberItem
                                                key={nm._id}
                                                member={nm}
                                                handleRemoveMember={
                                                    handleRemoveMember
                                                }
                                                adminUser={adminUser}
                                                isOwner={isOwner}
                                            />
                                        ))}
                                        
                                        {teamList?.map((el) => (
                                            el.teamName && <TeamItem
                                                key={el._id}
                                                team={el}
                                                handleRemoveTeam={
                                                    handleRemoveTeam
                                                }
                                            />
                                        ))}

                                    </div>
                                    {/* Member List End */}
                            </div>

                        </div>
                        <AddNewMemberModal
                            chatInfo={chatInfo}
                            onClose={() => setAddMemberModal(false)}
                            open={addMemberModal}
                            refetchMemebrs={refetchMemebrs}
                            memberList={memberList}
                        />
                      
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default React.memo(ShareChatModal);
