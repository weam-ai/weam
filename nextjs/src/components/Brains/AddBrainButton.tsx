'use client';
import { memo } from 'react';
import SharedBrainIcon from '@/icons/SharedIcon';
import PrivateBrainIcon from '@/icons/PrivateBrainIcon';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { useDispatch } from 'react-redux';
import { setModalStatus, setToPrivateBrain } from '@/lib/slices/brain/brainlist';
import { useSidebar } from '@/context/SidebarContext';
import AddBrainIcon from '@/icons/AddBrainIcon';
const AddBrainButton = memo(({ text, isPrivate }) => {
    const dispatch = useDispatch();
    const { isCollapsed } = useSidebar();
    
    // Determine tooltip side based on sidebar collapse state
    const tooltipSide = isCollapsed ? "right" : "top";
    
    const handleBrainButtonClick = () => {
        if (isPrivate) dispatch(setToPrivateBrain(true));
        else dispatch(setToPrivateBrain(false));
        dispatch(setModalStatus(true));
    };
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                <button
                    className="cursor-pointer"
                    onClick={handleBrainButtonClick}
                >   
                    <span className='collapsed-brain'>
                      {isPrivate ? (
                            <PrivateBrainIcon width={18} height={(18 * 20) / 22} className="fill-b6 collapsed-icon h-auto hover:fill-b2" />
                        ) : (
                            <SharedBrainIcon width={18} height={(18 * 20) / 22} className="fill-b6 collapsed-icon h-auto hover:fill-b2" />
                        )}
                    </span>
                    <AddBrainIcon width={18} height={(18 * 151) / 160} className="fill-b6 w-[18px] h-[18px] collapsed-text hover:fill-b2" />
                </button>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} className="border-none">
                <p className='text-font-14 font-normal'>{text}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        
    );
});

export default AddBrainButton;
