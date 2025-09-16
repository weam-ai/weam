'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { useSidebar } from '@/context/SidebarContext';

interface ProfileSettingOption {
    name: string;
    icon: React.ReactNode;
    hasAccess: boolean;
    navigate: string;
    slug: string;
}

interface ProfileSettingOptionsProps {
    settingOptions: ProfileSettingOption[];
    onLinkClick: () => void;
}

const ProfileSettingOptions: React.FC<ProfileSettingOptionsProps> = ({ settingOptions, onLinkClick }) => {
    const pathname = usePathname();
    const { isCollapsed } = useSidebar();
    
    return (
        <div className="my-2.5">
            {settingOptions.map((setting, index) => {
                if (!setting.hasAccess) return null;
                
                // Conditionally apply hover class based on sidebar collapse state
                const hoverClass = isCollapsed ? '' : 'hover:bg-b11';
                
                return (
                    <Link
                        key={index}
                        href={setting.navigate}
                        className={`${
                            pathname === setting.slug ? 'active' : ''
                        } sidebar-sub-menu-items cursor-pointer flex items-center py-2.5 px-5 mb-2 rounded-custom ${hoverClass} [&.active]:bg-b12`}
                        onClick={onLinkClick}
                    >
                        <div className="menu-item-icon mr-2.5">
                            {isCollapsed ? (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            {setting.icon}
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="border-none">
                                            <p className="text-font-14">{setting.name}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : (
                                setting.icon
                            )}
                        </div>
                        <div className="menu-item-label text-font-14 font-normal leading-[20px] text-b2 collapsed-text">
                            {setting.name}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default ProfileSettingOptions;
