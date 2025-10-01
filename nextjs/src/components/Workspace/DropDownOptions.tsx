'use client';
import {
    setSelectedWorkSpaceAction,
    setWorkspaceModalStatus,
} from '@/lib/slices/workspace/workspacelist';
import { truncateText, getSelectedBrain } from '@/utils/common';
import { encodedObjectId, encryptedPersist, generateObjectId } from '@/utils/helper';
import { WORKSPACE } from '@/utils/localstorage';
import routes from '@/utils/routes';
import { useRouter } from 'next/navigation';
import { memo, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DropdownMenuItem } from '../ui/dropdown-menu';
import { hasPermission, PERMISSIONS } from '@/utils/permission';
import { setEditWorkpaceModalAction } from '@/lib/slices/modalSlice';
import EditIcon from '@/icons/Edit';
import Plus from '@/icons/Plus';
import { RootState } from '@/lib/store';
import { setLastConversationDataAction, setUploadDataAction } from '@/lib/slices/aimodel/conversation';
import { AI_MODEL_CODE, GENERAL_BRAIN_TITLE } from '@/utils/constant';
import { BrainListType } from '@/types/brain';
import { chatMemberListAction } from '@/lib/slices/chat/chatSlice';
import { useSidebar } from '@/context/SidebarContext';
import { getCurrentUser } from '@/utils/handleAuth';
import { setSelectedAIModal } from '@/lib/slices/aimodel/assignmodelslice';
import GlobalSearch from '../Search/GlobalSearch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';


export const WorkspaceSelection = memo(({ w, brainList }) => {
    const dispatch = useDispatch();
    const router = useRouter();
    const user= useMemo( () => getCurrentUser(),[])

    const selectedWorkSpace = useSelector((state:RootState) => state.workspacelist.selected)

    const handleSelectedWorkspace = (w) => {
        if (selectedWorkSpace && selectedWorkSpace?._id != w?._id) {
            dispatch(setSelectedWorkSpaceAction(w));
            encryptedPersist(w, WORKSPACE);
            if (!brainList?.length) return;
            const selectedWorkSpaceBrainList = brainList.find(brain => brain._id.toString() === w._id.toString());
            const selectedBrain = getSelectedBrain(selectedWorkSpaceBrainList?.brains,user);
            dispatch(setLastConversationDataAction({}));
            router.push(`/?b=${encodedObjectId(selectedBrain?._id)}&model=${AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED}`);
        }
    }

    useEffect(() => {
        if (selectedWorkSpace && selectedWorkSpace.title != w.title && selectedWorkSpace._id == w._id) {
            dispatch(setSelectedWorkSpaceAction((prev) => ({ ...prev, title: w.title })))
        }
    }, [selectedWorkSpace])
    
    return (
        <DropdownMenuItem
            className="flex-1 py-2 px-5 inline-block border-0 whitespace-nowrap text-b2 text-font-15 leading-[22px] font-normal bg-transparent"
            onClick={() => handleSelectedWorkspace(w)}
        >
            {truncateText(w?.title, 18)}
        </DropdownMenuItem>
    );
});

export const EditWorkspaceIcon = memo(({ w, user }) => {
    const dispatch = useDispatch();
    const handleEditWorkspace = (w) => {
        dispatch(setEditWorkpaceModalAction({ open: true, workspace: w }));
    };

    return (
        <>
            {hasPermission(user.roleCode, PERMISSIONS.WORKSPACE_EDIT) && (
                <span
                    className="edit-icon py-3 md:px-5 px-2 block md:opacity-0 group-hover:opacity-100"
                    onClick={() => handleEditWorkspace(w)}
                >
                    <EditIcon
                        width={18}
                        height={18}
                        className="md:w-[18px] w-4 h-auto object-contain fill-b4"
                    />
                </span>
            )}
        </>
    );
});

export const WorkspaceAddButton = memo(({ user }) => {
    const dispatch = useDispatch();
    const openWorkspaceModal = () => {
        dispatch(setWorkspaceModalStatus(true));
    };
    return (
        <>
            {hasPermission(user.roleCode, PERMISSIONS.WORKSPACE_ADD) && (
                <DropdownMenuItem
                    className="group flex items-center py-3"
                    onClick={openWorkspaceModal}
                >
                    <Plus
                        width={12}
                        height={12}
                        className="h-3 w-3 object-contain fill-b4 mr-2"
                    />

                    <span className="text-font-14 leading-[19px] text-b4 font-semibold">
                        Add a Workspace
                    </span>
                </DropdownMenuItem>
            )}
        </>
    );
});

export const WorkspaceNewChatButton = memo(() => {
    const router = useRouter();
    const dispatch = useDispatch();
    const brainData = useSelector((store: RootState) => store.brain.combined);
    const availableModels = useSelector((store: RootState) => store.assignmodel.list);
    const { closeSidebar, isCollapsed } = useSidebar();
    const currentUser= useMemo( () => getCurrentUser(),[])

    const handleNewChatClick = () => {
        const brain = getSelectedBrain(brainData,currentUser,true);
        
        if (!brain) return;
        const encodedId = encodedObjectId(brain?._id);
        const objectId = generateObjectId();
        dispatch(setUploadDataAction([]));  
        dispatch(setLastConversationDataAction({}));
        dispatch(chatMemberListAction([]));
        // Close the sidebar
        closeSidebar();
        router.prefetch(`${routes.chat}/${objectId}`);
        router.push(`${routes.main}?b=${encodedId}&model=${AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED}`);
    };
    return (
        <div className='mb-4 mt-2 flex gap-x-2 collapsed-new-chat' >
            
            <div onClick={handleNewChatClick} className='flex items-center gap-x-2 cursor-pointer text-font-14 border rounded-lg py-3 px-3 w-full collapsed-plus'>
                {isCollapsed ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className='text-font-14 font-medium block text-b7'>+</span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="border-none">
                                <p className="text-font-14">New Chat</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <span className='text-font-14 font-medium block text-b5'>+</span>
                )}
                <span className='collapsed-text'>New Chat</span>
            </div>
            <GlobalSearch />
        </div>
    );
});