'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Userimg from '@/../public/user.png';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import LogOutIcon from '@/icons/LogOutIcon';
import UserSetting from '@/icons/UserSetting';
import useModal from '@/hooks/common/useModal';
import LogOutModal from '../Profile/LogOutModal';
import Link from 'next/link';
import routes from '@/utils/routes';
import { useDispatch, useSelector } from 'react-redux';
import { LINK } from '@/config/config';
import { setProfileImgAction } from '@/lib/slices/profile/profileSlice';
import { getCurrentUser } from '@/utils/handleAuth';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { useSidebar } from '@/context/SidebarContext';

const UserProfile = () => {
    const {
        isOpen: isLogoutOpen,
        openModal: openLogoutModal,
        closeModal: closeLogoutModal,
    } = useModal();
    const userDetail = getCurrentUser();
    const [myImage, setMyImage] = useState(undefined);
    const dispatch = useDispatch();
    const { closeSidebar, isCollapsed } = useSidebar();
    
    // Determine tooltip side based on sidebar collapse state
    const tooltipSide = isCollapsed ? "right" : "top";

    dispatch(setProfileImgAction(userDetail?.profileImg));

    const profileImg = useSelector(
        (store:any) => store.profile.profileImg
    );

    useEffect(() => {
        setMyImage(profileImg);
    }, [profileImg]);

    // Function to handle profile settings click
    const handleProfileSettingsClick = () => {
        // Close the sidebar
        closeSidebar();
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className={`outline-none`}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <div className="user-profile relative mt-[6px] outline-none">
                                <Image
                                    src={myImage !== undefined
                                        ? `${LINK.AWS_S3_URL}${myImage}`
                                        : Userimg}
                                    width="28"
                                    height="28"
                                    className="rounded-full h-7 object-cover"
                                    alt="user"
                                />
                            </div>
                            </TooltipTrigger>
                            <TooltipContent side={tooltipSide} className="border-none">
                            <p className='text-font-14'>Profile Settings</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[180px] rounded-lg">
                    <DropdownMenuItem>
                        <UserSetting
                            width={14}
                            height={16}
                            className="w-[14] h-4 object-contain fill-b4 me-2.5"
                        />
                        <Link href={routes.profileSetting}
                        onClick={handleProfileSettingsClick}>
                            Profile Settings
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className="text-reddark"
                        onSelect={() => openLogoutModal()}
                    >
                        <LogOutIcon
                            width={14}
                            height={16}
                            className="w-[14] h-4 object-contain fill-reddark me-2.5"
                        />
                        Log Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {isLogoutOpen && (
                <LogOutModal
                    open={openLogoutModal}
                    closeModal={closeLogoutModal}
                />
            )}
        </>
    );
};

export default UserProfile;
