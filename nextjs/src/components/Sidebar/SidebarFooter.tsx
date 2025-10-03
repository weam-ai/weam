'use client';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import Notification from './Notification';
import NotificationDot from './NotificationDot';
import UserProfile from './UserProfile';
import { TemplateLibrary } from './SettingSelection';
import SettingsLink from './SettingsLink';
import { useSidebar } from '@/context/SidebarContext';

const SidebarFooter = () => {
    const { isCollapsed } = useSidebar();
    
    // Determine tooltip side based on sidebar collapse state
    const tooltipSide = isCollapsed ? "right" : "top";
    
    return (
        <div className="flex items-center justify-between px-5 py-1 mt-auto border-t sidebar-footer">
            <div className="relative inline-block hover:bg-b5 hover:bg-opacity-[0.2] w-10 h-10 rounded-full text-center">
                <UserProfile />
            </div>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <SettingsLink />
                    </TooltipTrigger>
                    <TooltipContent
                        side={tooltipSide}
                        className="border-none"
                    >
                        <p className="text-font-14">Settings</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <TemplateLibrary />
                    </TooltipTrigger>
                    <TooltipContent
                        side={tooltipSide}
                        className="border-none"
                    >
                        <p className="text-font-14">
                            Agents and Prompts library
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <div className="relative inline-block">
                {/* <div className="hidden">
                            <SSESubscription />
                        </div> */}
                <Notification />
                <NotificationDot />
            </div>
        </div>
    );
};

export default SidebarFooter;
