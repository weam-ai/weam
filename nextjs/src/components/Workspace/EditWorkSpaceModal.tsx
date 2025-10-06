import React, { useEffect, useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SearchIcon from '@/icons/Search';
import Select from 'react-select';
import AddUser from '@/icons/AddUser';
import Loader from '../ui/Loader';
import useWorkSpaceUser from '@/hooks/workspaceuser/useWorkSpaceUser';
import useWorkspace from '@/hooks/workspace/useWorkspace';
import { RESPONSE_STATUS_CODE, ROLE_TYPE } from '@/utils/constant';
import WorkSpaceIcon from '@/icons/WorkSpaceIcon';
import AutoSelectChip from '../ui/AutoSelectChip';
import { Controller } from 'react-hook-form';
import {
    createHandleOutsideClick,
    dateDisplay,
    displayName,
    showNameOrEmail,
} from '@/utils/common';
import useMembers from '@/hooks/members/useMembers';
import { getCurrentUser } from '@/utils/handleAuth';
import ProfileImage from '../Profile/ProfileImage';
import AddTeam from '@/icons/AddTeam';
import { useTeams } from '@/hooks/team/useTeams';
import GroupIcon from '@/icons/GroupIcon';
import { useSelector } from 'react-redux';
import RemoveIcon from '@/icons/RemoveIcon';
import { addWorkspaceMemberAction, archiveWorkspaceAction, deleteShareTeamToWorkspaceAction, editWorkSpaceAction, removeWorkspaceMemberAction, shareTeamWorkspaceAction } from '@/actions/workspace';
import useServerAction from '@/hooks/common/useServerActions';
import { encryptedPersist } from '@/utils/helper';
import { WORKSPACE } from '@/utils/localstorage';
import { setSelectedWorkSpaceAction } from '@/lib/slices/workspace/workspacelist';
import { useDispatch } from 'react-redux';
import Toast from '@/utils/toast';
import { RootState } from '@/lib/store';
import TooltipIcon from '@/icons/TooltipIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const membersRoleOptions = [
    { value: 'Every', label: 'Everyone' },
    { value: ROLE_TYPE.ADMIN, label: 'Admin' },
    { value: ROLE_TYPE.COMPANY_MANAGER, label: 'Manager' },
    { value: ROLE_TYPE.USER, label: 'User' },
];

const AddNewMemberModal = ({ workspace, onClose, open, refetchMemebrs }) => {
    const { register, handleSubmit, errors, control, setFormValue, reset } =
        useWorkspace({ addMember: true });
    const { members, getMembersList, loading } = useMembers();

    const [memberOptions, setMemberOptions] = useState([]);
    const [searchMemberValue, setSearchMemberValue] = useState('');
    const [runAction, isPending] = useServerAction(addWorkspaceMemberAction);
    
    useEffect(() => {
        setMemberOptions(
            members.map((user) => ({
                email: user?.email,
                id: user?.id,
                fullname: showNameOrEmail(user),
                fname: user?.fname,
                lname: user?.lname,
                role: user?.roleCode
            }))
        );
    }, [members]);

    const onSubmit = async ({ role, members }:any) => {
        if (members.length) {
            members = members.map((member) => ({
                email: member.email,
                id: member.id,
                fname: member?.fname,
                lname: member?.lname,
                roleCode: member?.role
            }));
            const response = await runAction(workspace?._id, workspace?.company?.id, members);
            Toast(response.message);
            if(response) refetchMemebrs();
        }
        onClose();
        setMemberOptions([]);
    };

    useEffect(() => {
        if(open){
            getMembersList({ 
                search: '',
                workspaceId: workspace._id
            })
        }
        reset();
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7">
                <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <AddUser
                            width={24}
                            height={24}
                            className="w-6 h-6 min-w-6 object-contain fill-b2 me-3.5 inline-block align-text-top"
                        />
                        Add a Member ({`${workspace.title}`})
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body flex flex-col flex-1 relative h-full pl-5 pr-2.5">
                    <form onSubmit={handleSubmit(({ role = null, members }) => onSubmit({ role, members }))}>
                        <div className="h-full w-full max-h-[60dvh]">
                            <div className="h-full pr-2.5 pt-5">
                                <div className="workspace-group h-full flex flex-col">
                                    <div className="px-2.5 gap-2.5 flex">
                                        <div className="flex-1 relative">
                                            <Controller
                                                name="members"
                                                control={control}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        label={'Add Members'}
                                                        name={'members'}
                                                        options={memberOptions}
                                                        placeholder="Find Members"
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
    workspace,
    onClose,
    open,
    refetchTeams,
    brainAddedTeam,
}) => {
    const {
        register,
        handleSubmit,
        errors,
        control,
        setFormValue,
        reset,
        clearErrors,
    } = useWorkspace({ addTeam: true });

    const { teams, getTeams } = useTeams();

    const [teamOptions, setTeamOptions] = useState([]);
    const [searchTeamValue,setSearchTeamValue]=useState('')
    const [runAction, isPending] = useServerAction(shareTeamWorkspaceAction);

    useEffect(() => {
        setTeamOptions(
            teams.map((team) => ({
                teamName: team.teamName,
                id: team._id,
                teamUsers: team.teamUsers,
            }))
        );
    }, [teams]);

    const onSubmitAddedTeam = async (teams) => {
        const response = await runAction(workspace?._id, workspace.company?.id, teams.teamsInput, workspace?.title);
        Toast(response.message);
        onClose();
        setTeamOptions([]);
        if(response) refetchTeams();
    };

    useEffect(() => {
        if(open){
            getTeams({
                search: searchTeamValue,
                workspaceUsers: true,
            });
        }
        reset();
    }, [open]);
    
    useEffect(() => {
        const filteredTeams = teams.reduce((acc, currTeam) => {
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
        }, []);

        setTeamOptions(filteredTeams);
    }, [teams, brainAddedTeam]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7">
                <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <AddTeam
                            width={24}
                            height={24}
                            className="w-6 h-6 min-w-6 object-contain fill-b2 me-3.5 inline-block align-text-top"
                        />
                        Add a Team ({`${workspace.title}`})
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body flex flex-col flex-1 relative h-full pl-5 pr-2.5">
                    <form onSubmit={handleSubmit(onSubmitAddedTeam)}>
                        <div className="h-full w-full max-h-[60dvh]">
                            <div className="h-full pr-2.5 pt-5">
                                <div className="workspace-group h-full flex flex-col">
                                    <div className="px-2.5 gap-2.5 flex">
                                        <div className="flex-1 relative">
                                            <Controller
                                                name="teamsInput"
                                                control={control}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        label={'Add a Team'}
                                                        name={'teamsInput'}
                                                        options={teamOptions}
                                                        placeholder="Find Teams"
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
                                                        clearErrors={
                                                            clearErrors
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
const AboutBrainDetails = ({
    workspace,
    adminUser,
    managerUser,
    closeModal,
}) => {
    const [title, setTitle] = useState(workspace.title);

    const { isEdit, setIsEdit } = useWorkspace({
        addMember: true,
    });
    const userDetail = getCurrentUser();
    const [runAction] = useServerAction(editWorkSpaceAction);
    const [deleteWorkspace, isDeletePending] = useServerAction(archiveWorkspaceAction);
    const selectedWorkSpace = useSelector((store: RootState) => store.workspacelist.selected);
    const dispatch = useDispatch();

    const onChange = async () => {
        if (workspace?.title != title) {
            const response = await runAction(workspace.slug, { title: title, id: workspace?._id })
            if (response?.code == RESPONSE_STATUS_CODE.ERROR){
                setTitle(workspace?.title)
            }
            if (response.code === RESPONSE_STATUS_CODE.SUCCESS) {
                encryptedPersist(response.data, WORKSPACE);
                dispatch(setSelectedWorkSpaceAction(response.data));
                Toast(response.message);
            }
            closeModal();
        }
        setIsEdit(false);
    };

    const handleDelete = async () => {
        const response = await deleteWorkspace(workspace?.slug);
        Toast(response?.message);
        if (selectedWorkSpace.slug === workspace.slug) {
            dispatch(setSelectedWorkSpaceAction(null));
            encryptedPersist(null, WORKSPACE);
        }
        closeModal();
    };

    const workSpaceInputRef = useRef();
    const workSpaceNameButtonRef = useRef();
    useEffect(() => {
        if (!isEdit) return;

        const handleClickOutside = createHandleOutsideClick(
            workSpaceInputRef,
            workSpaceNameButtonRef,
            setIsEdit,
            false,
            setTitle,
            workspace?.title
        );

        document.addEventListener('mousedown', handleClickOutside);

        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isEdit, setIsEdit]);

    return (
        <div className="h-full w-full">
            <div className="group/item user-item flex justify-between py-2.5 border-b border-b11 text-font-14 items-start">
                <div>
                    <p className="mb-[5px] font-semibold text-b2">
                        Workspace Name
                    </p>
                    {isEdit ? (
                        <input
                            ref={workSpaceInputRef}
                            type="text"
                            onChange={(e) => setTitle(e.target.value)}
                            value={title}
                            className="w-full rounded-md border-0 py-1 pl-1 ring-1 ring-inset ring-gray-300"
                            maxLength={50}
                        />
                    ) : (
                        <p className="m-0 font-normal text-b6">
                            {title}
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-2.5">
                    {isEdit ? (
                        <span
                            ref={workSpaceNameButtonRef}
                            className="text-b7 hover:text-b2 underline cursor-pointer"
                            onClick={onChange}
                        >
                            Change
                        </span>
                    ) : (
                        <span
                            ref={workSpaceNameButtonRef}
                            className="text-b7 hover:text-b2 underline cursor-pointer"
                            onClick={() => setIsEdit(true)}
                        >
                            Edit
                        </span>
                    )}
                </div>
            </div>
            <div className="group/item user-item flex justify-between py-2.5 border-b border-b11 text-font-14">
                <div>
                    <p className="mb-[5px] font-semibold text-b2">
                        Managed By
                    </p>
                    {managerUser && managerUser.length > 0 ? (
                        <p className="m-0 font-normal text-b6">
                            {managerUser
                                .map((m) => displayName(m?.user))
                                .join(', ')}
                        </p>
                    ) : (
                        <p className="m-0 text-font-16 leading-snug font-normal text-b6 break-all">
                            NA
                        </p>
                    )}
                </div>
            </div>
            <div className="group/item user-item flex justify-between py-2.5 border-b border-b11 text-font-14">
                <div>
                    <p className="mb-[5px] font-semibold text-b2">
                        Created By
                    </p>
                    {adminUser && (
                        <p className="m-0 font-normal text-b6">
                            {`${adminUser?.user?.fname} ${
                                adminUser?.user?.lname
                            } on ${dateDisplay(
                                adminUser.createdAt,
                                'MMM DD, YYYY'
                            )}`}
                        </p>
                    )}
                </div>
            </div>
            {adminUser?.user?.email === userDetail?.email && (
                <div className="group/item user-item flex justify-between py-2.5">
                   
                    <button className="btn btn-black" onClick={handleDelete} disabled={isDeletePending}>
                        Archive
                    </button>
                </div>
            )}
            {/* Leave Chat Start*/}
            {/* <Link
                href="#"
                className="text-reddark text-font-14 font-bold hover:underline inline-block mt-3"
            >
                Leave Workspace
            </Link> */}
            {/* Leave Chat End*/}
        </div>
    );
};

const MemberItem = ({ member, handleRemoveMember }) => {
    const isRemoval = member.role == ROLE_TYPE.ADMIN;
    return (
        <div className="group/item user-item flex  md:flex-nowrap flex-wrap justify-between py-1.5 px-0 border-b border-b11">
            <div className="user-img-name flex items-center">
                <ProfileImage
                    user={member?.user}
                    w={40}
                    h={40}
                    classname={'user-img size-[30px] rounded-full mr-2.5 object-cover'}
                    spanclass={
                        'user-char flex items-center justify-center size-[30px] max-md:size-[30px] rounded-full bg-[#B3261E] text-b15 text-font-16 font-normal mr-2.5'
                    }
                />
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2">
                    {displayName(member.user)}
                </p>
            </div>
            <div className="flex items-center space-x-2.5">
                <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded text-font-14 max-md:text-font-12">
                    {member.role}
                </span>
                {/* {[ROLE_TYPE.ADMIN, ROLE_TYPE.COMPANY_MANAGER].includes(member.role) &&  */}
                {!isRemoval && (
                    <span className='cursor-pointer' onClick={() =>
                        handleRemoveMember(member?.user?.id)
                    }>
                        <RemoveIcon width={14} height={14} className={"size-4 fill-b5 hover:fill-red"} />
                    </span>
                )}
                {/* } */}
            </div>
        </div>
    );
};

const TeamItem = ({ team, handleRemoveTeam, brain }:any) => {
   
    return (
        <div className="group/item user-item flex justify-between py-1.5 px-0 border-b border-b11">
            <div className="user-img-name flex items-center">
            <span className='w-[35px] h-[35px] rounded-full bg-b11 p-1.5'>
                <GroupIcon width={35} height={35} className="fill-b5 w-full h-auto" />
                </span>
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2 ml-3">
                    {team?.teamName}
                </p>
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2 ml-2">
                    ({team?.id?.teamUsers.length} Members)
                </p>
                
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
                                    {team?.id?.teamUsers?.map((member: any, index: number) => (
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
                        handleRemoveTeam(team.id._id)
                    }>
                        <RemoveIcon width={14} height={14} className={"size-4 fill-b5 hover:fill-red"} />
                    </span>
                   
                }
            </div>
        </div>
    );
};

const EditWorkSpaceModal = ({ open, closeModal, workspace }) => {
    const { getList, workspaceMembers } =
        useWorkSpaceUser();
    const { brainAddedTeam, sharedTeamBrainList } =
    useTeams();
    const [deleteShareTeamToWorkspace] = useServerAction(deleteShareTeamToWorkspaceAction);
    const [removeWorkspaceMember, removePending] = useServerAction(removeWorkspaceMemberAction);
    const sharedBrains=useSelector((state:any)=>state.brain.shareList)

        
    const [addMemberModal, setAddMemberModal] = useState(false);
    const [addTeamModal, setAddTeamModal] = useState(false);
    const [memberList, setMemberList] = useState([]);
    const [teamList, setTeamList] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [adminUser, setAdminUser] = useState();
    const [managerUser, setManagerUser] = useState();
    const [filter, setFilter] = useState({
        search: '',
        role: null,
    });

    const refetchMemebrs = () => {
        setTimeout(() => getList(workspace?._id), 1000);
    };

    const refetchTeams = () => {
        setTimeout(
            () =>
                sharedTeamBrainList({
                    brainId: false,
                    workspaceId: workspace?._id,
                }),
            100
        );
    };

    const handleRemoveMember = async (value) => {
        const response = await removeWorkspaceMember(workspace?._id, value, sharedBrains);
        Toast(response?.message);
        refetchMemebrs();
    };

    const handleRemoveTeam = async(value) => {
        const response = await deleteShareTeamToWorkspace(
            workspace?._id,
            workspace?.company?.id,
            value,
            sharedBrains
        );
        Toast(response?.message);
        refetchTeams();
    };

    const totalMembers = (brainAddedTeam, memberList) => {

        return (
            brainAddedTeam?.reduce((acc, currTeam) => {
                acc += currTeam?.id?.teamUsers?.length || 0;
                return acc;
            }, 0) + memberList.length
        );
        
    };



    useEffect(() => {
        if (workspaceMembers?.length) {
            const fidnAdmin = workspaceMembers.find(
                (user) => user.role == ROLE_TYPE.ADMIN
            );
            const fidnManager = workspaceMembers.filter(
                (user) => user.role == ROLE_TYPE.COMPANY_MANAGER
            );
            setAdminUser(fidnAdmin);
            setManagerUser(fidnManager);
            setMemberList(workspaceMembers);
            setTeamList(brainAddedTeam)
        }
       
    }, [workspaceMembers, brainAddedTeam]);

    useEffect(() => {
        const filterMemberByRole = () => {
            const regex = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            if (filter.role && filter.role != 'Every') {
                setMemberList(
                    workspaceMembers.filter(
                        (m) =>
                            m?.role == filter.role && regex.test(m?.user?.email)
                    )
                );
            } else {
                setMemberList(
                    workspaceMembers.filter((m) => regex.test(m?.user?.email))
                );
            }

            setTeamList(brainAddedTeam.filter((currTeam)=>regex.test(currTeam.id.teamName)))
           
        };

        const timer = setTimeout(() => {
            if(filter.search){
                filterMemberByRole();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [filter]);

    useEffect(() => {
        if (workspace?._id) {
            setIsLoading(true);
            getList(workspace?._id);
            sharedTeamBrainList({
                brainId: false,
                workspaceId: workspace?._id,
            });
            setIsLoading(false);
        }
    }, [workspace]);
    return (
        <Dialog open={open} onOpenChange={closeModal}>
            <DialogContent className="md:max-w-[700px] md:min-h-[150px] max-w-[calc(100%-30px)] py-7 max-h-screen max-md:max-h-[calc(100vh-70px)] overflow-y-auto">
                {isLoading ? (
                    <Loader />
                ) : (
                    <>
                        <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                            <DialogTitle className="font-semibold flex items-center">
                                <WorkSpaceIcon
                                    width={'24'}
                                    height={(24 * 25) / 25}
                                    className={
                                        'w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top'
                                    }
                                />
                                {workspace.title}
                            </DialogTitle>
                            <DialogDescription></DialogDescription>
                        </DialogHeader>
                        <div className="dialog-body h-full pb-6">
                            <Tabs defaultValue="Members" className="w-full">
                                <TabsList className="px-[30px] space-x-10 text-font-14">
                                    <TabsTrigger
                                        className="px-0"
                                        value="Members"
                                    >
                                        Members{' '}
                                        <span className="ms-1.5">
                                             {totalMembers(
                                                    teamList,
                                                    memberList
                                                )}
                                        </span>
                                    </TabsTrigger>
                                    <TabsTrigger className="px-0" value="About">
                                        About
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="Members">
                                    {/* Members Tab content Start */}
                                    <div className="flex flex-col md:flex-row w-full space-x-2.5 px-[30px] pb-3">
                                        <div className="search-wrap search-member relative flex-1 mb-2 md:mb-0">
                                            <input
                                                type="text"
                                                className="default-form-input default-form-input-border-light default-form-input-md"
                                                id="searchMember"
                                                placeholder="Search Member"
                                                onChange={(e) => {
                                                    setFilter({
                                                        ...filter,
                                                        search: e.target.value,
                                                    });
                                                }}
                                            />
                                            <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                                                <SearchIcon className="w-4 h-[17px] fill-b7" />
                                            </span>
                                        </div>
                                        <Select
                                            options={membersRoleOptions}
                                            defaultValue={membersRoleOptions[0]}
                                            onChange={(item) =>
                                                setFilter({
                                                    ...filter,
                                                    role: item.value,
                                                })
                                            }
                                            menuPlacement="auto"
                                            className="react-select-container react-select-border-light react-select-sm md:w-[228px] max-md:!ml-0"
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                    {/* Add Member start */}
                                    <div className="px-[30px]">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <div className="w-full gap-1 flex">
                                                    <span
                                                        className="btn btn-outline-gray flex items-center gap-x-1 justify-center group"
                                                        onClick={() =>
                                                            setAddMemberModal(
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <AddUser
                                                            width={16}
                                                            height={18}
                                                            className="w-[26px] h-[18px] object-contain fill-b5 group-hover:fill-white group-active:fill-white mr-1"
                                                        />
                                                            <span>
                                                            Add a Member
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
                                                            width={18}
                                                            height={18}
                                                            className="w-[26px] h-[18px] object-contain fill-b5 group-hover:fill-white group-active:fill-white mr-1"
                                                        />
                                                        <span>
                                                            Add a Team
                                                        </span>
                                                    </span>
                                                </div>
                                            </DialogTrigger>
                                        </Dialog>
                                    </div>
                                    {/* Add Member End */}

                                    {/* Member List Start */}
                                    <div className="user-lists h-full w-full mt-2.5 px-[30px] md:max-h-[calc(100vh-400px)] overflow-y-auto">
                                        {memberList?.map((nm) => (
                                            <MemberItem
                                                key={nm._id}
                                                member={nm}
                                                handleRemoveMember={
                                                    handleRemoveMember
                                                }
                                            />
                                        ))}
                                        {teamList?.map((team) => (
                                            <TeamItem
                                                key={team.id?._id}
                                                team={team}
                                                handleRemoveTeam={
                                                    handleRemoveTeam
                                                }
                                            />
                                        ))}
                                    </div>
                                    {/* Member List End */}
                                    
                                </TabsContent>
                                <TabsContent
                                    value="About"
                                    className="px-[30px]"
                                >
                                    <AboutBrainDetails
                                        workspace={workspace}
                                        adminUser={adminUser}
                                        managerUser={managerUser}
                                        closeModal={closeModal}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                        <AddNewMemberModal
                            workspace={workspace}
                            onClose={() => setAddMemberModal(false)}
                            open={addMemberModal}
                            refetchMemebrs={refetchMemebrs}
                        />
                        <AddTeamMemberModal
                            workspace={workspace}
                            onClose={() => setAddTeamModal(false)}
                            open={addTeamModal}
                            refetchTeams={refetchTeams}
                            brainAddedTeam={brainAddedTeam}
                        />
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default React.memo(EditWorkSpaceModal);