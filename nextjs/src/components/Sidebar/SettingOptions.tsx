'use client';

import React from 'react';
import { SettingActiveIcon } from './SettingSelection';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { useSidebar } from '@/context/SidebarContext';

interface SettingOption {
    name: string;
    icon: React.ReactNode;
    hasAccess: boolean;
    navigate: string;
    slug: string;
    target?: string;
}

interface SettingOptionsProps {
    settingOptions: SettingOption[];
}

const SettingOptions: React.FC<SettingOptionsProps> = ({ settingOptions }) => {
    const { isCollapsed } = useSidebar();
    
    return (
        <div className="my-2.5">
            {settingOptions.map((setting, index) => {
                if (!setting.hasAccess) return null;
                
                return (
                    <SettingActiveIcon
                        key={index}
                        setting={setting}
                        isCollapsed={isCollapsed}
                    >
                        <div className="menu-item-icon mr-2.5">
                            {isCollapsed ? (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
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
                    </SettingActiveIcon>
                );
            })}
        </div>
    );
};

export default SettingOptions;
