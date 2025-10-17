'use client';
import routes from '@/utils/routes';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useSidebar } from '@/context/SidebarContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import RenameIcon from '@/icons/RenameIcon';
import RemoveIcon from '@/icons/RemoveIcon';
import OptionsIcon from '@/icons/Options';
import CheckIcon from '@/icons/CheckIcon';
import Plus from '@/icons/Plus';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { decodedObjectId, encodedObjectId, persistBrainData } from '@/utils/helper';
import { setEditBrainModalAction } from '@/lib/slices/modalSlice';
import { AI_MODEL_CODE, GENERAL_BRAIN_SLUG, ROLE_TYPE } from '@/utils/constant';
import { SettingsIcon } from '@/icons/SettingsIcon';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createHandleOutsideClick, getRandomCharacter, truncateText } from '@/utils/common';
import useServerAction from '@/hooks/common/useServerActions';
import { deleteBrainAction, updateBrainAction } from '@/actions/brains';
import { setSelectedBrain } from '@/lib/slices/brain/brainlist';
import Toast from '@/utils/toast';
import { BrainListType } from '@/types/brain';
import { setLastConversationDataAction, setUploadDataAction } from '@/lib/slices/aimodel/conversation';
import { SetUserData } from '@/types/user';
import { chatMemberListAction } from '@/lib/slices/chat/chatSlice';
import { generateObjectId } from '@/utils/helper';
import Link from 'next/link';
import Image from 'next/image';
import ConvertToSharedModal from './ConvertToSharedModal';
import { ShareBrainIcon } from '@/icons/Share';

type DefaultEditOptionProps = {
    onEdit: () => void;
    handleEditBrain: () => void;
    handleDeleteBrain: () => void;
    handleConvertToShared?: () => void;
    isDeletePending: boolean;
    isPrivate?: boolean;
}

type CommonListProps = {
    b: BrainListType;
    currentUser: SetUserData;
    closeSidebar: () => void;
}

type LinkItemsProps = {
    icon: React.ReactNode;
    text: string;
    href: string;
    data: BrainListType;
}

export const matchedBrain = (brains: BrainListType[], brainId: string) => {
    return brains?.find((brain) => brain._id === brainId);
}

export const LinkItems = React.memo(({ icon, text, href, data }: LinkItemsProps) => {
    const originalPath = href;
    if (data?.slug !== undefined) href = `${href}?b=${encodedObjectId(data?._id)}`;
    let pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const dispatch = useDispatch();
    const { closeSidebar } = useSidebar();
    const brainId = searchParams.get('b') ? decodedObjectId(searchParams.get('b')) : null;
    if (pathname.includes("/chat/") && brainId === data?._id) {
        pathname = "/chat";
    }

    const isActive = useMemo(
        () => (data?._id === brainId && originalPath === pathname),
        [data?._id, brainId, originalPath, pathname]
    );

    const handleNewChatClick = useCallback(() => {
        const b = encodedObjectId(data?._id);
        dispatch(setUploadDataAction([]));
        dispatch(setLastConversationDataAction({}));
        dispatch(chatMemberListAction([]));
        closeSidebar();
        router.push(`${routes.main}?b=${b}&model=${AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED}`);
    }, [brainId, closeSidebar]);

    const handleLinkClick = () => {
        closeSidebar();
    };
    
    return (
        <li className="relative group">
            {text === 'Chats' && (
                <TooltipProvider delayDuration={0} skipDelayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger
                            asChild
                            className="peer absolute right-2.5 top-2 ms-auto size-5 flex items-center justify-center outline-none bg-b15 rounded-full transition ease-in-out opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                        >
                            <button
                                onClick={handleNewChatClick}
                            >
                                <Plus
                                    width={'10'}
                                    height={'10'}
                                    className="fill-b5"
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>New Chat</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            <Link
                href={href}
                className={`${
                    isActive ? 'active' : ''
                } peer-hover:bg-gray-100 flex items-center px-[15px] py-[8.6px] text-b5 rounded-custom hover:text-b2 [&.active]:text-b2`}
                onClick={handleLinkClick}
            >
                <span
                    className={`${
                        isActive ? 'active' : ''
                    } mr-2.5 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:fill-b6 group-hover:[&>svg]:fill-b2 [&>svg]:[&.active]:fill-b2`}
                >
                    {icon}
                </span>
                <span className="inline-block me-2">{text}</span>
            </Link>
        </li>
    );
});

const DefaultEditOption = React.memo(
    ({ onEdit, handleEditBrain, handleDeleteBrain, handleConvertToShared, isDeletePending, isPrivate }: DefaultEditOptionProps) => {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="ml-auto md:opacity-0 group-hover:opacity-100 dropdown-action transparent-ghost-btn btn-round btn-round-icon [&>svg]:h-[3px] [&>svg]:w-[13px] [&>svg]:object-contain [&>svg>circle]:fill-b6 data-[state=open]:opacity-100 collapsed-text">
                        <OptionsIcon />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[210px] !rounded-[15px]">
                    <DropdownMenuItem
                        className="edit-collapse-title border-0"
                        onClick={onEdit}
                    >
                        <RenameIcon
                            width={14}
                            height={16}
                            className="w-[14] h-4 object-contain fill-b4 me-2.5"
                        />
                        Rename
                    </DropdownMenuItem>
                    {isPrivate && handleConvertToShared && (
                        <DropdownMenuItem
                            className="edit-collapse-title border-0"
                            onClick={handleConvertToShared}
                        >
                            <ShareBrainIcon
                                width={14}
                                height={16}
                                className="w-[14] h-4 object-contain fill-b4 me-2.5"
                            />
                            Convert to Shared
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleDeleteBrain} disabled={isDeletePending} className="border-0">
                        <RemoveIcon
                            width={14}
                            height={16}
                            className="w-[14] h-4 object-contain fill-b4 me-2.5"
                        />
                        Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="edit-collapse-title"
                        onClick={handleEditBrain}
                    >
                        
                        <SettingsIcon width={14}
                            height={16} className="w-[14] h-4 object-contain fill-b4 me-2.5" />
                        Manage
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }
);

export const CommonList = ({ b, currentUser, closeSidebar }: CommonListProps) => {
    
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();

    // Editable Menu start
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(b.title);
    const inputRef = useRef(null);
    const buttonRef=useRef(null)
    const [deleteBrain, isDeletePending] = useServerAction(deleteBrainAction);
    const [updateBrain, isUpdatePending] = useServerAction(updateBrainAction);
    const [showConvertModal, setShowConvertModal] = useState(false);

    const searchParams = useSearchParams();
    const brainId = searchParams.get('b') ? decodedObjectId(searchParams.get('b')) : null;

    const isActive = useMemo(
        () => (b?._id === brainId),
        [b?._id, brainId]
    );

    // Memoize the default character based on brain ID to prevent re-fetching on every render
    const defaultCharacter = useMemo(() => {
        return getRandomCharacter();
    }, [b?._id]); // Only changes if brain ID changes

    const handleEditClick = () => {
        setIsEditing(true);
        setEditedTitle(b.title); // Reset editedTitle to the current title
    };

    useEffect(() => {
        if (!isEditing) return;
        const handleClickOutside = createHandleOutsideClick(
            inputRef,
            buttonRef,
            setIsEditing,
            false,
            setEditedTitle,
            b.title
        );

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditing, setIsEditing, setEditedTitle]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);


    const handleSaveClick = async () => {
        if(b.title !==inputRef.current.value){
            const payload = {
                title: editedTitle,
                isShare: b?.isShare,
                workspaceId: b?.workspaceId
            };

            const response:any=await updateBrain(payload, b?._id);

            if(response?.code=='ERROR'){
                setEditedTitle(b?.title)
            }
            setIsEditing(false)
            Toast(response?.message);
        }
    };

    const handleInputChange = (e) => {
        setEditedTitle(e.target.value);
    };
    // Editable Menu end

    const handleEditBrain = (w) => {
        dispatch(
            setEditBrainModalAction({
                open: true,
                brain: w,
            })
        );
    };

    const handleDeleteBrain = async (brain) => {
        const data = {
            isShare: brain.isShare,
        };
        const response = await deleteBrain(data, brain?._id);
        Toast(response?.message);
    };

    const handleConvertToShared = () => {
        setShowConvertModal(true);
    };

    const handleNewChatClick = () => {
        const brainId = encodedObjectId(b?._id);
        const objectId = generateObjectId();
        dispatch(setUploadDataAction([]));
        dispatch(setLastConversationDataAction({}));
        dispatch(chatMemberListAction([]));
        dispatch(setSelectedBrain(b));
        persistBrainData(b);
        
        if (pathname === routes.main) {
            history.pushState(null, '', `${routes.main}?b=${brainId}&model=${AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED}`);
        } else {
            router.prefetch(`${routes.chat}/${objectId}?b=${brainId}`);
            router.push(`/${routes.main}?b=${brainId}&model=${AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED}`);
        }
    };

    return (
        <>

<ConvertToSharedModal
                open={showConvertModal}
                close={() => setShowConvertModal(false)}
                brain={b}
            />
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className={`${
                                isActive ? 'active' : ''
                            } collapsed-brain-item group relative flex w-full items-center py-1.5 px-2 text-left transition [overflow-anchor:none] hover:z-[2] focus:z-[3] focus:outline-none rounded-custom [&.active]:bg-b12 cursor-pointer`}
                            onClick={() => {
                                handleNewChatClick();
                                closeSidebar();
                            }}
                            key={b?._id}
                        >
                            {b.charimg ? (
                                <Image 
                                    src={b.charimg} 
                                    alt={b.title} 
                                    width={20} 
                                    height={20}
                                    className="mr-2 flex-shrink-0 rounded collapsed-brain-logo"
                                />
                             ) : <Image src={defaultCharacter.image} alt={b.title} width={20} height={20} className="mr-2 flex-shrink-0 rounded collapsed-brain-logo" />
                            }
                            {isEditing ? (
                                <input
                                    type="text"
                                    ref={inputRef}
                                    className="flex-1 mr-3 p-0 m-0 border border-b2 outline-none bg-transparent rounded-custom text-font-14 font-semibold leading-[19px] text-b2 focus:border-b2 collapsed-text"
                                    value={editedTitle}
                                    onChange={handleInputChange}
                                    maxLength={50}
                                    autoFocus
                                />
                            ) : (
                                <span className="collapse-editable-title flex-1 text-font-14 font-medium leading-[19px] collapsed-text">
                                    {b.title !== editedTitle
                                        ? truncateText(editedTitle, 29)
                                        : truncateText(b.title, 29)}
                                </span>
                            )}
                            {isEditing ? (
                                <button
                                    type="button"
                                    className="edit-title transparent-ghost-btn btn-round btn-round-icon collapsed-text"
                                    onClick={handleSaveClick}
                                    ref={buttonRef}
                                    disabled={isUpdatePending}
                                >
                                    <CheckIcon className="size-4 object-contain fill-b6" />
                                </button>
                            ) : null}
                            {b?.slug != `default-brain-${currentUser?._id}` &&
                                b?.slug !== GENERAL_BRAIN_SLUG &&
                                ((currentUser?.roleCode === ROLE_TYPE.USER &&
                                    b.user.id === currentUser?._id) ||
                                    currentUser?.roleCode !== ROLE_TYPE.USER) && (
                                    <DefaultEditOption
                                        onEdit={handleEditClick}
                                        handleEditBrain={() => handleEditBrain(b)}
                                        handleDeleteBrain={() => handleDeleteBrain(b)}
                                        handleConvertToShared={!b.isShare ? handleConvertToShared : undefined}
                                        isDeletePending={isDeletePending}
                                        isPrivate={!b.isShare}
                        />
                                )}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="border-none collapsed-only-tooltip">
                        <p className='text-font-14'>{b.title !== editedTitle ? editedTitle : b.title}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </>
    );
};