'use client';

import Link from 'next/link';
import AppIcon from '@/icons/AppsIcon';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { useSidebar } from '@/context/SidebarContext';

const ConnectionsLink = () => {
    const { isCollapsed } = useSidebar();
    
    return (
        <Link
            href="/mcp"
            className="flex gap-x-2 text-font-14 items-center mb-5 cursor-pointer"
        >
            {isCollapsed ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <AppIcon width={16} height={16} className={"size-[18px] fill-b5 collapsed-icon"} />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="border-none">
                            <p className="text-font-14">Connections</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <AppIcon width={16} height={16} className={"size-[18px] fill-b5 collapsed-icon"} />
            )}
            <span className='collapsed-text'>Connections</span>
        </Link>
    );
};

export default ConnectionsLink;
