import React from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import AttachFileIcon from '@/icons/AttachFileIcon';

type AttachMentToolTipProps = {
    fileLoader: boolean;
    isWebSearchActive: boolean;
    handleAttachButtonClick: () => void;
};

const AttachMentToolTip = ({
    fileLoader,
    isWebSearchActive,
    handleAttachButtonClick,
}: AttachMentToolTipProps) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger disabled={isWebSearchActive}>
                    <div
                         className={`chat-btn cursor-pointer transition ease-in-out duration-200 rounded-md w-auto h-8 flex items-center px-[5px] ${
                            isWebSearchActive ? 'opacity-50 pointer-events-none' : ''
                            }`}
                        onClick={handleAttachButtonClick}
                    >
                        <AttachFileIcon
                            width={'14'}
                            height={'14'}
                            className={'fill-b5 w-auto h-[17px]'}
                        />
                        <span className={`ml-3 ${isWebSearchActive  ? 'opacity-50 pointer-events-none' : ''}`}>Link Files</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-font-14">
                        {isWebSearchActive
                            ? 'This feature is unavailable in web search'
                            : 'Upload a File'}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default AttachMentToolTip;