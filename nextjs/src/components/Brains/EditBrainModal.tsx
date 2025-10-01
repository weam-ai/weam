import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import SearchIcon from '@/icons/Search';
import AddUser from '@/icons/AddUser';
import Loader from '../ui/Loader';
import { ROLE_TYPE } from '@/utils/constant';
import WorkSpaceIcon from '@/icons/WorkSpaceIcon';
import AutoSelectChip from '../ui/AutoSelectChip';
import { Controller } from 'react-hook-form';
import BrainIcon from '@/icons/BrainIcon';
import useBrains from '@/hooks/brains/useBrains';
import useBrainUser from '@/hooks/brainuser/useBrainUser';
import { dateDisplay, displayName, showNameOrEmail } from '@/utils/common';
import useMembers from '@/hooks/members/useMembers';
import { getCurrentUser } from '@/utils/handleAuth';
import DeleteDialog from '../Shared/DeleteDialog';
import ProfileImage from '../Profile/ProfileImage';
import AddTeam from '@/icons/AddTeam';
import { useTeams } from '@/hooks/team/useTeams';
import GroupIcon from '@/icons/GroupIcon';
import RemoveIcon from '@/icons/RemoveIcon';
import useServerAction from '@/hooks/common/useServerActions';
import { addBrainMemberAction, deleteBrainAction, deleteShareTeamToBrainAction, removeBrainMemberAction, shareTeamToBrainAction, updateBrainAction } from '@/actions/brains';
import Toast from '@/utils/toast';
import ExitIcon from '@/icons/ExitIcon';
import TooltipIcon from '@/icons/TooltipIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const AddNewMemberModal = ({
    brain,
    onClose,
    open,
    refetchMemebrs,
    memberList,
}: any) => {
    const { handleSubmit, errors, control, setFormValue } = useBrains({
        isShare: false,
        addMember: true,
    });

    const { members, getMembersList, loading } = useMembers();
    const [addBrainMember, isPending] = useServerAction(addBrainMemberAction);

    const [searchMemberValue, setSearchMemberValue] = useState('');
    const [memberOptions, setMemberOptions] = useState([]);


    const existingMembers = memberList.map((record) => record?.user?.email);

    useEffect(() => {
        const memberlist = members.map((user) => ({
            email: user.email,
            id: user.id,
            fullname: showNameOrEmail(user),
            fname: user?.fname,
            lname: user?.lname,
        }));
        const filteredRecords = memberlist.filter(
            (record) => !existingMembers.includes(record.email)
        );
        setMemberOptions(filteredRecords);
    }, [members]);

    const onSubmit = async ({ members }) => {
        const response = await addBrainMember(brain?._id, members, brain?.workspaceId);
        Toast(response?.message);
        onClose();
        if(response) refetchMemebrs();
        setMemberOptions([]);
    };

    useEffect(() => {
        getMembersList({});
    }, []);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-5">
                <DialogHeader className="rounded-t-10 px-[30px] pb-3 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <AddUser
                            width={24}
                            height={(24 * 22) / 25}
                            className="w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top"
                        />
                        Add a Member ({`${brain.title}`})
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
                                                <span className="text-red">
                                                    *
                                                </span>
                                            </label>
                                            <p className="mb-2.5 text-font-14 text-b5">
                                                Add members from the Brain
                                            </p>
                                            <Controller
                                                name="members"
                                                control={control}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        showLabel={false}
                                                        name={'members'}
                                                        placeholder="Find Members"
                                                        options={memberOptions}
                                                        optionBindObj={{
                                                            label: 'fullname',
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
                                                    disabled={isPending}
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

const AddTeamMemberModal = ({
    brain,
    onClose,
    open,
    refetchTeams,
    brainAddedTeam,
}: any) => {
    const { handleSubmit, errors, control, setFormValue, reset } = useBrains({
        addTeam: true,
    });
    const { teams, getTeams } = useTeams();

    const [searchTeamValue, setSearchTeamValue] = useState('');
    const [teamOptions, setTeamOptions] = useState([]);
    const [shareTeamToBrain, isPending] = useServerAction(shareTeamToBrainAction);

    const onSubmitAddedTeam = async (teams) => {
        const response = await shareTeamToBrain(
            brain?.workspaceId,
            brain?.companyId,
            brain?._id,
            teams.teamsInput,
            brain?.title
        );
        Toast(response?.message);
        onClose();
        setTeamOptions([]);
        if(response) refetchTeams();
    };

    useEffect(() => {
        reset();
        if(open){
            getTeams({ search: '', pagination: false });
        }
    }, [open]);

    useEffect(() => {
        const filteredTeams =
            teams.reduce((acc, currTeam) => {
                if (
                    !brainAddedTeam?.some(
                        (addedTeam) => currTeam._id == addedTeam?.id?._id
                    )
                ) {
                    acc.push({
                        teamName: currTeam.teamName,
                        id: currTeam._id,
                        teamUsers: currTeam.teamUsers,
                    });
                }

                return acc;
            }, []) || [];

        setTeamOptions(filteredTeams);
    }, [teams, brainAddedTeam]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-5">
                <DialogHeader className="rounded-t-10 px-[30px] pb-3 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <AddTeam
                            width={24}
                            height={(24 * 22) / 25}
                            className="w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top"
                        />
                        Add a Team ({`${brain.title}`})
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body flex flex-col flex-1 relative h-full pl-5 pr-2.5">
                    <form onSubmit={handleSubmit(onSubmitAddedTeam)}>
                        <div className="h-full w-full max-h-[60dvh]">
                            <div className="h-full pr-2.5 pt-5">
                                <div className="workspace-group h-full flex flex-col">
                                    <div className="px-2.5 gap-2.5 flex">
                                        <div className="flex-1 relative">
                                            <label
                                                htmlFor="members"
                                                className="text-font-16 font-semibold inline-block text-b2"
                                            >
                                                Team
                                                <span className="text-red">
                                                    *
                                                </span>
                                            </label>
                                            <p className="mb-2.5 text-font-14 text-b5">
                                                Add a Team from the brain{' '}
                                            </p>
                                            <Controller
                                                name="teamsInput"
                                                control={control}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        showLabel={false}
                                                        name={'teamsInput'}
                                                        placeholder="Find Team"
                                                        options={teamOptions}
                                                        optionBindObj={{
                                                            label: 'teamName',
                                                            value: 'id',
                                                        }}
                                                        inputValue={
                                                            searchTeamValue
                                                        }
                                                        errors={errors}
                                                        handleSearch={
                                                            setSearchTeamValue
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
                                                    disabled={isPending}
                                                >
                                                    Add a Team
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

const AboutBrainDetails = ({ brain, isOwner, onLeaveBrain, onDeleteBrain }: any) => {
    return (
        <div className="h-full w-full">
            {/* Leave Chat Start*/}
            {!isOwner && (
                <div
                    onClick={onLeaveBrain}
                    className="text-font-14 text-red cursor-pointer flex items-center gap-x-1"
                >
                    <ExitIcon width={14} height={14} className="fill-red md:w-4 w-5 h-auto" />
                    <span className='hidden md:inline'>Leave Brain</span>
                </div>
            )}
            {isOwner && (
                <div className="text-red text-font-14 cursor-pointer flex items-center gap-x-1">
                    <DeleteDialog
                        title={`Are you sure you want to archive "${brain?.title}" brain?`}
                        onDelete={onDeleteBrain}
                        btnText={<span className="hidden md:inline">Archive</span>}
                        icon={<RemoveIcon width={14} height={14} className="fill-red w-4" />}
                        btnClass=""
                        buttonVisible={true}
                    />
                </div>
            )}
            {/* Leave Chat End*/}
        </div>
    );
};

const MemberItem = ({
    member,
    handleRemoveMember,
    isOwner,
    currentUser,
    brain,
}: any) => {
    const isRemoval =
        (currentUser.roleCode === ROLE_TYPE.USER &&
            brain?.user?.id === currentUser._id) ||
        currentUser.roleCode !== ROLE_TYPE.USER;
    return (
        <div
            key={member?._id}
            className="group/item user-item flex justify-between py-1.5 px-0 border-b border-b11"
        >
            <div className="user-img-name flex items-center">
                <ProfileImage
                    user={member?.user}
                    w={35}
                    h={35}
                    classname={
                        'user-img size-[35px] rounded-full mr-3 object-cover'
                    }
                    spanclass={
                        'user-char flex items-center justify-center size-[35px] rounded-full bg-[#B3261E] text-b15 text-font-16 font-normal mr-2.5'
                    }
                />
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2">
                    {displayName(member?.user)}
                </p>
            </div>

            <div className="flex items-center space-x-2.5">
            
                {member.role == ROLE_TYPE.OWNER && (
                    <span className="bg-b12 text-b2 text-xs font-medium me-2 px-2.5 py-0.5 rounded text-font-14">
                        {member.role}
                    </span>
                )}
                
                {(isRemoval && member.role != ROLE_TYPE.OWNER) && (
                    <span className='cursor-pointer' onClick={() =>
                        handleRemoveMember(member.user.id)
                    }>
                        <RemoveIcon width={14} height={14} className={"size-4 fill-b4 hover:fill-red"} />
                    </span>
                )}
                {/* } */}
            </div>
        </div>
    );
};

const TeamItem = ({ team, handleRemoveTeam, brain }: any) => {

    return (
        <div className="group/item user-item flex justify-between py-1.5 px-0 border-b border-b11">
            <div className="user-img-name flex items-center">
            <span className='w-[35px] h-[35px] rounded-full bg-b11 p-1.5 mr-2.5'>
            <GroupIcon width={35} height={35} className="fill-b5 w-full h-auto" />
                </span>
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2">
                    {team.teamName}
                </p>
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2 ml-2">
                    ({team?.id?.teamUsers.length} Members)
                </p>
                
                {/* Info button with tooltip showing team member details */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="ml-2 cursor-pointer hover:opacity-70 transition-opacity">
                                <TooltipIcon width={16} height={16} className="fill-b5 hover:fill-b2" />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-2">
                                <p className="font-semibold text-sm">Team Members:</p>
                                <div className="space-y-1">
                                    {team?.id?.teamUsers?.map((member, index) => (
                                        <div key={member._id || index} className="text-xs">
                                            <p className="font-medium">
                                                {member.fname} {member.lname}
                                            </p>
                                            <p className="text-b5">{member.email}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                
            </div>
            <div className="flex items-center space-x-2.5 text-font-14">
                {
                      <span className='cursor-pointer' onClick={() =>
                        handleRemoveTeam(team?.id?._id)
                    }>
                        <RemoveIcon width={14} height={14} className={"size-4 fill-b4 hover:fill-red"} />
                    </span>
                }
            </div>
        </div>
    );
};

const EditBrainModal = ({ open, closeModal, brain }: any) => {
    const currentUser = getCurrentUser();
    const isOwner = currentUser?._id == brain?.user?.id;

    const { getList, brainMembers } = useBrainUser();
    const [removeBrainMember] = useServerAction(removeBrainMemberAction);
    const [deleteShareTeamToBrain] = useServerAction(deleteShareTeamToBrainAction);
    const { brainAddedTeam, sharedTeamBrainList } =
        useTeams();
    const [deleteBrain, isDeletePending] = useServerAction(deleteBrainAction);
    const [updateBrain] = useServerAction(updateBrainAction);

    const [memberList, setMemberList] = useState([]);
    const [teamList, setTeamList] = useState([]);
    const [filter, setFilter] = useState({
        search: '',
    });
    const [addMemberModal, setAddMemberModal] = useState(false);
    const [addTeamModal, setAddTeamModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [customInstruction, setCustomInstruction] = useState(brain?.customInstruction || '');
    const [isEditingInstruction, setIsEditingInstruction] = useState(false);

    useEffect(() => {
        const adminUser = {
            user: {
                ...brain.user,
            },
            role: ROLE_TYPE.ADMIN,
        };

        console.log("🚀 ~ EditBrainModal ~ brainAddedTeam:", brainAddedTeam)
        setTeamList(brainAddedTeam);

        if (brainMembers?.length) {
            setMemberList([...brainMembers]);
        } else {
            setMemberList([adminUser]);
        }
    }, [brainMembers, brainAddedTeam]);

    useEffect(() => {
        const regex = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        setMemberList(
            [
                {
                    user: {
                        ...brain.user,
                    },
                    role: ROLE_TYPE.ADMIN,
                },
                ...brainMembers,
            ].filter((m) => {return regex.test(m.user.email) && m.role!=ROLE_TYPE.ADMIN})
        );

       
        setTeamList(brainAddedTeam?.filter((currTeam)=>regex.test(currTeam.id.teamName)))
    }, [filter]);

    const refetchMemebrs = () => {
        setTimeout(() => getList(brain?._id), 1000);
    };

    const refetchTeams = () => {
        setTimeout(
            () =>
                sharedTeamBrainList({
                    brainId: brain?._id,
                    workspaceId: false,
                }),
            100
        );
    };

    const handleRemoveMember = async (value) => {
        const response = await removeBrainMember(brain?._id, value);
        Toast(response?.message);
        refetchMemebrs();
    };

    const handleRemoveTeam = async(value) => {
        const response = await deleteShareTeamToBrain(
            brain?.workspaceId,
            brain?.companyId,
            brain?._id,
            value
        );
        Toast(response?.message);
        refetchTeams();
    };

    const onLeaveBrain = () => {};

    const onDeleteBrain = async () => {
        const data = {
            isShare: brain.isShare,
        };

        const response = await deleteBrain(data, brain?._id);
        Toast(response?.message);
        closeModal();
    };

    const handleUpdateCustomInstruction = async () => {
        const data = {
            title: brain.title,
            customInstruction,
            isShare: brain.isShare,
            workspaceId: brain.workspaceId,
        };

        const response = await updateBrain(data, brain?._id);
        Toast(response?.message);
        setIsEditingInstruction(false);
    };

    const handleCancelEdit = () => {
        setCustomInstruction(brain?.customInstruction || '');
        setIsEditingInstruction(false);
    };

    const totalMembers = (brainAddedTeam,  memberList ) => {
    
            if(brainAddedTeam?.length){

                return brainAddedTeam?.reduce((acc, currTeam) => {
                    acc += currTeam?.id?.teamUsers?.length || 0;
                    return acc;
                }, 0) + memberList?.length
            }
            else{
                return memberList.length
            }
        
        
    };

    useEffect(() => {
        if (brain?._id) {
            setIsLoading(true);
            getList(brain?._id);
            sharedTeamBrainList({ brainId: brain?._id, workspaceId: false });
            setIsLoading(false);
        }
    }, [brain]);

    return (
        <Dialog open={open} onOpenChange={closeModal}>
            <DialogContent className="md:max-w-[1000px] max-w-[calc(100%-30px)] py-7">
                {isLoading ? (
                    <Loader />
                ) : (
                    <>
                        <DialogHeader className="rounded-t-10 px-8 pb-3 border-b">
                            <DialogTitle className="font-semibold flex items-center">
                                <BrainIcon
                                    width={'24'}
                                    height={(24 * 25) / 25}
                                    className="w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top"
                                />
                                {brain.title}
                            </DialogTitle>
                            <div className='flex items-center'>
                            <DialogDescription className="small-description text-font-14 max-md:text-font-12 leading-[24px] text-b5 font-normal ml-9">
                                <span className='mr-0.5'>Created By: </span>
                                {`${displayName(brain?.user)} on ${dateDisplay(
                                    brain?.createdAt
                                )}`}
                            </DialogDescription>
                            <div className="ml-auto">
                                <AboutBrainDetails
                                    brain={brain}
                                    isOwner={isOwner}
                                    onLeaveBrain={onLeaveBrain}
                                    onDeleteBrain={onDeleteBrain}
                                />
                            </div>
                            </div>
                        </DialogHeader>

                        <div className="dialog-body h-full pb-6 px-8 max-h-[70vh] overflow-y-auto">
                            {/* Custom Instruction Section */}
                            <div className="space-y-2 my-3">
                                <label className="text-sm font-medium text-gray-700">
                                    Custom Instruction
                                </label>
                                {isEditingInstruction ? (
                                    <div className="space-y-2">
                                        <textarea
                                            value={customInstruction}
                                            onChange={(e) => setCustomInstruction(e.target.value)}
                                            placeholder="Enter custom instruction for this brain..."
                                            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-b10 focus:border-transparent"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleUpdateCustomInstruction}
                                                className="btn btn-black text-sm"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="btn btn-outline-gray text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                                        <div className="flex-1">
                                            {customInstruction ? (
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{customInstruction}</p>
                                            ) : (
                                                <p className="text-font-14 text-gray-500 italic">No custom instruction set</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsEditingInstruction(true)}
                                            className="ml-2 btn btn-outline-gray text-xs"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                                    
                            {brain.isShare && (
                                <>                                
                                <div className="flex w-full py-3 gap-3 md:flex-row flex-col">
                                    <div className="search-wrap search-member relative flex-1 w-full">
                                        <input
                                            type="text"
                                            className="default-form-input default-form-input-border-light default-form-input-md"
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
                                    
                                </div>
                                {/* Add Member start */}
                                {((currentUser.roleCode ===
                                        ROLE_TYPE.USER &&
                                        brain?.user?.id ===
                                            currentUser._id) ||
                                        currentUser.roleCode !==
                                            ROLE_TYPE.USER) && (
                                        <div className='flex items-center gap-x-1 mb-2'>
                                            <span
                                                className="btn btn-outline-gray flex items-center gap-x-1 justify-center group"
                                                onClick={() =>
                                                    setAddMemberModal(
                                                        true
                                                    )
                                                }
                                            >
                                                <AddUser
                                                    width={
                                                        16
                                                    }
                                                    height={
                                                        18
                                                    }
                                                    className="w-[26px] h-[18px] object-contain fill-b5 group-hover:fill-white group-active:fill-white mr-1"
                                                />
                                                <span>
                                                    Add Member
                                                </span>
                                            </span>
                        
                                            <span
                                                className="btn btn-outline-gray flex items-center gap-x-1 justify-center group"
                                                onClick={() =>
                                                    setAddTeamModal(
                                                        true
                                                    )
                                                }
                                            >
                                                <AddTeam
                                                    width={
                                                        18
                                                    }
                                                    height={
                                                        18
                                                    }
                                                    className="w-[26px] h-[18px] object-contain fill-b5 group-hover:fill-white group-active:fill-white mr-1"
                                                />
                                                <span>
                                                    Add a Team
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                {/* Add Member End */}

                                <div
                                    className="font-normal"
                                    // value="Members"
                                >
                                    Members{' '}
                                    <span className="ms-1.5 text-font-14 font-bold">
                                        {totalMembers(
                                            teamList,
                                            memberList
                                        )}
                                    </span>
                                </div>

                                <div className="overflow-y-auto w-full max-h-[65vh]">
                                
                                    {/* Member List Start */}
                                    <div className="user-lists h-full w-full mt-2.5">
                                        {memberList?.map((nm) => (
                                            <MemberItem
                                                key={nm._id}
                                                member={nm}
                                                handleRemoveMember={
                                                    handleRemoveMember
                                                }
                                                isOwner={isOwner}
                                                currentUser={
                                                    currentUser
                                                }
                                                brain={brain}
                                            />
                                        ))}
                                        {teamList?.map((team) => (
                                            <TeamItem
                                                key={team.id._id}
                                                team={team}
                                                handleRemoveTeam={
                                                    handleRemoveTeam
                                                }
                                                brain={brain}
                                            />
                                        ))}
                                    </div>
                                    {/* Member List End */}
                                </div>
                                </>
                            )}
                        </div>
                        <AddNewMemberModal
                            brain={brain}
                            onClose={() => setAddMemberModal(false)}
                            open={addMemberModal}
                            refetchMemebrs={refetchMemebrs}
                            memberList={memberList}
                        />
                        <AddTeamMemberModal
                            brain={brain}
                            onClose={() => setAddTeamModal(false)}
                            open={addTeamModal}
                            refetchTeams={refetchTeams}
                            memberList={teamList}
                            brainAddedTeam={brainAddedTeam}
                        />
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default React.memo(EditBrainModal);
