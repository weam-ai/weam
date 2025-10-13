import React, { useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import PromptEnhanceIcon from '@/icons/PromptEnhance';
import  useChat  from '@/hooks/chat/useChat';
import Toast from '@/utils/toast';

type PromptEnhanceProps = {
    isWebSearchActive: boolean;
    text: string;
    setText: (text: string) => void;
    apiKey: string;
};

const PromptEnhance = ({ isWebSearchActive, text, setText, apiKey }: PromptEnhanceProps) => {
    const [localLoading, setLocalLoading] = useState(false);
    const { promptEnhanceByLLM } = useChat();
    const handleEnhanceClick = async () => {
        if (isWebSearchActive) return;
        setLocalLoading(true);
        try {
            const response = await promptEnhanceByLLM({ query: text, apiKey: apiKey });
            setText(response);
        } catch (error) {
            console.error('Error enhancing prompt:', error);
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger className={`${!localLoading && !isWebSearchActive && text.trim() !== '' ? '' : 'cursor-default'}`} >
                <div
                className={`transition ease-in-out duration-200 w-auto h-8 flex items-center px-2
                    ${isWebSearchActive || !text.trim() ? 'opacity-60 pointer-events-none cursor-not-allowed' : 'cursor-pointer hover:bg-b11'}
                    ${localLoading ? 'bg-black rounded-[15px] pointer-events-none cursor-not-allowed' : 'rounded-md'}`}
                onClick={handleEnhanceClick}
                >
                <PromptEnhanceIcon
                    width="18"
                    height="18"
                    className={`w-auto h-[15px] ${localLoading ? 'fill-white' : 'fill-b5'}`}
                />
                {localLoading && (
                    <span 
                    className="border-2 border-[rgba(255,255,255,0.35)] border-r-white animate-spin h-4 w-4 bg-transparent box-border transition-all duration-500 ease-in-out ml-2 rounded-full"
                    ></span>
                )}
                </div>
                </TooltipTrigger>
                <TooltipContent>
                <p className="text-font-14">
                    {!text.trim()
                    ? "Ask a question or start with an idea to activate Power Prompt"
                    : isWebSearchActive
                    ? "This feature is unavailable in web search"
                    : "Power Prompt"}
                </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default PromptEnhance;
