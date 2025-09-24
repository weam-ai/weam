import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import TabGptList, { TabGptListProps } from '../Chat/TabGptList';
import ThunderIcon from '@/icons/ThunderIcon';
import { BrainPromptType } from '@/types/brain';
import { useSearchParams } from 'next/navigation';

type ThunderBoltToopTipProps = {
    isWebSearchActive: boolean;
};

type ThunderBoltDialogProps = ThunderBoltToopTipProps & TabGptListProps & {
    setDialogOpen: (isOpen: boolean) => void;
    dialogOpen: boolean;
    promptList: BrainPromptType[];
    setText?: (text: string) => void; // <-- Add this line
};

const ThunderBoltToopTip = ({ isWebSearchActive }: ThunderBoltToopTipProps) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger disabled={isWebSearchActive}>
                    <div
                        className={`chat-btn cursor-pointer transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ${
                            isWebSearchActive
                                ? 'opacity-50 pointer-events-none'
                                : ''
                        }`}
                    >
                        <ThunderIcon
                            width={'14'}
                            height={'14'}
                            className={'fill-b5 w-auto h-[17px]'}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-font-14">
                        {isWebSearchActive
                            ? 'This feature is unavailable in web search'
                            : 'Add Promps, Agents, or Docs to chat'}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const ThunderBoltDialog = ({
    isWebSearchActive,
    dialogOpen,
    setDialogOpen,
    onSelect,
    selectedContext,
    setText,
    handlePrompts,
    setHandlePrompts,
    getList,
    promptLoader,
    setPromptLoader,
    paginator,
    setPromptList,
    promptList,
}: ThunderBoltDialogProps) => {
    const queryParams = useSearchParams();
    return (
        <Dialog
            open={!isWebSearchActive && dialogOpen}
            onOpenChange={(isOpen: boolean) => {
                if (!isWebSearchActive) {
                    setDialogOpen(isOpen); 
                    if (!isOpen) {
                        // block if and only if proagent is active and there is a conversation
                        history.pushState(null, '', `${window.location.pathname}?b=${queryParams.get('b')}&model=${queryParams.get('model')}`);
                    }
                }
            }}
        >
            <DialogTrigger
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); // Prevent Enter key from triggering the dialog
                    }
                }}
            >
                <ThunderBoltToopTip isWebSearchActive={isWebSearchActive} />
            </DialogTrigger>
            <DialogContent
                className="xl:max-w-[670px] max-w-[calc(100%-30px)] block pt-7 max-md:max-h-[calc(100vh-70px)] overflow-y-auto"
                onOpenAutoFocus={(e: React.FocusEvent<HTMLDivElement>) =>
                    e.preventDefault()
                }
            >
                <DialogHeader className="rounded-t-10 px-[30px] pb-5 ">
                    {/* <DialogTitle className="font-semibold flex items-center">
                        <h2 className="text-font-16">
                            Select Prompts, Agents, and Docs
                        </h2>
                    </DialogTitle> */}
                </DialogHeader>
                <div className="dialog-body relative h-full w-full md:max-h-[650px] px-8 pt-6 flex min-h-[450px] top-[-36px]">
                    <TabGptList
                        onSelect={onSelect}
                        // selectedContext={selectedContext}
                        // setUploadedFile={setUploadedFile}
                        setText={setText}
                        handlePrompts={handlePrompts}
                        setHandlePrompts={setHandlePrompts}
                        getList={getList}
                        promptLoader={promptLoader}
                        setPromptLoader={setPromptLoader}
                        paginator={paginator}
                        promptList={promptList}
                        setPromptList={setPromptList}
                        setDialogOpen={setDialogOpen}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ThunderBoltDialog;
