import React from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import GlobeIcon from '@/icons/GlobalIcon';

type WebSearchToolTipProps = {
    loading: boolean;
    isWebSearchActive: boolean;
    handleWebSearchClick: () => void;
    showHighlight?: boolean;
};

const WebSearchToolTip = ({
    loading,
    isWebSearchActive,
    handleWebSearchClick,
    showHighlight=true,
}: WebSearchToolTipProps) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger disabled={loading}>
                    <div
                       className={`web-search cursor-pointer transition ease-in-out duration-200 w-auto h-8 flex items-center px-[5px] ${
                            isWebSearchActive && showHighlight ? 'bg-b2 rounded-[15px] hover:bg-b2' : 'rounded-md'
                        }`}
                        onClick={handleWebSearchClick}
                    >
                        <GlobeIcon
                            width={'14'}
                            height={'14'}
                            className={`w-auto h-[16px] ${
                                isWebSearchActive && showHighlight ? 'fill-white' : 'fill-b5'
                            }`}
                        />
                        {isWebSearchActive && showHighlight && (
                            <span
                                className={`ml-1 text-font-14 font-medium transition-opacity duration-300 opacity-100 ${
                                    isWebSearchActive && showHighlight ? 'text-white' : ''
                                }`}
                            >
                                Search
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-font-14">Search the web</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default WebSearchToolTip;