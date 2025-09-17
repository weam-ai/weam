import ForkIcon from '@/icons/ForkIcon';
import MessagingIcon from '@/icons/MessagingIcon';
import PromptIcon from '@/icons/Prompt';
import React, { useCallback, useState } from 'react';
import useModal from '@/hooks/common/useModal';
import ForkChatModal from './ForkChatModal';
import AddNewPromptModal from '@/components/Prompts/AddNewPromptModal';
import CopyIcon from '@/icons/CopyIcon';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { AgentChatPayloadType, CitationResponseType, ConversationType, DocumentChatPayloadType, NormalChatPayloadType, ProAgentDataType } from '@/types/chat';
import { Socket } from 'socket.io-client';
import CitationSourceSheet from '../Citations/CitationSourceSheet';
import GlobeIcon from '@/icons/GlobalIcon';

type HoverActionIconProps = {
    content: string,
    proAgentData: ProAgentDataType,
    conversation: ConversationType[],
    sequence: string | number,
    onOpenThread: () => void,
    copyToClipboard: (content: string) => void,
    index?: number,
    chatId?: string,
    socket?: Socket,
    getAINormatChatResponse?: (payload: NormalChatPayloadType, socket: Socket) => void,
    getAICustomGPTResponse?: (payload: AgentChatPayloadType, socket: Socket) => void,
    getPerplexityResponse?: (socket: Socket, payload: unknown) => void,
    getAIDocResponse?: (payload: DocumentChatPayloadType, socket: Socket) => void,
    setConversations: (payload: ConversationType[]) => void,
    custom_gpt_id?: string,
    getAgentContent: (proAgentData: ProAgentDataType) => string,
    showCitations: boolean,
    citations: CitationResponseType[]
}

type HoverActionTooltipProps = {
    children: React.ReactNode,
    content: string,
    onClick: () => void,
    className?: string
}

const HoverActionTooltip = ({ children, content, onClick, className }: HoverActionTooltipProps) => {
    return (
        <span
            onClick={onClick}
            className={className}
        >
            <TooltipProvider delayDuration={0} skipDelayDuration={0}>
                <Tooltip>
                    <TooltipTrigger>
                        {children}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p className="text-font-14">{content}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </span>
    )
}

const HoverActionIcon = React.memo(({ content, proAgentData, conversation, sequence, onOpenThread, copyToClipboard, getAgentContent, index, showCitations, citations }: HoverActionIconProps) => {
    const { isOpen, openModal, closeModal } = useModal();
    const { isOpen: isForkOpen, openModal: openForkModal, closeModal: closeForkModal } = useModal();
    const { isOpen: isCitationsOpen, openModal: openCitationsModal, closeModal: closeCitationsModal } = useModal();
    const [forkData, setForkData] = useState([]);

    let copyContent = content;
    if(proAgentData?.code){
        copyContent = getAgentContent(proAgentData);
    }
    
    const handleForkChanges = useCallback(() => {
        const data = conversation.filter((c: ConversationType) => {
            let seqValue = c.seq;
            if (typeof seqValue === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(seqValue)) {
                seqValue = new Date(seqValue).getTime(); // Convert ISO date to timestamp
            }
            if (typeof sequence === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(sequence)) {
                sequence = new Date(sequence).getTime();
            }
            if (seqValue <= sequence) {
                return {
                    message: c.message,
                    response: c.response,
                    responseModel: c.responseModel,
                    responseAddKeywords: c?.responseAddKeywords,
                    cloneMedia: c?.cloneMedia,
                    customGptId: c?.customGptId,
                    customGptTitle: c?.customGptTitle,
                    coverImage: c?.coverImage,
                    id: c?.id
                };
            }
        });
        setForkData(data);
    }, [conversation]);

    return (
        <div
      className={`${conversation.length - 1 === index ? '' : 'xl:invisible'} xl:group-hover:visible z-[1] absolute xl:right-[30px] top-auto xl:top-auto bottom-1 max-md:bottom-0 right-auto xl:left-auto left-[40px] flex items-center rounded-custom xl:bg-transparent transition ease-in-out duration-150`}
    >
            {/* Fork start */}
            <HoverActionTooltip 
                content='Fork this chat'
                onClick={() => {
                    openForkModal();
                    handleForkChanges();
                }}
                className="cursor-pointer flex items-center justify-center xl:w-8 w-6 h-8 xl:min-w-8 rounded-custom p-1 transition ease-in-out duration-150 hover:bg-b12"
            >
                <ForkIcon className='lg:h-[15px] h-[12px] w-auto fill-b6 object-contain'/>
            </HoverActionTooltip>
            {isForkOpen && (
                <ForkChatModal
                    open={openForkModal}
                    closeModal={closeForkModal}
                    forkData={forkData}
                />
            )}
            {/* Fork End */}

            {/* Chat start */}
            <HoverActionTooltip
                content='Reply in thread'
                onClick={onOpenThread}
                className="cursor-pointer flex items-center justify-center lg:w-8 w-6 h-8 lg:min-w-8 rounded-custom p-1 transition ease-in-out duration-150 [&>svg]:h-[18px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:fill-b6 hover:bg-b12"
            >
                <MessagingIcon className="lg:h-[15px] h-[14px] w-auto fill-b6 object-contain" />
            </HoverActionTooltip>
            {/* Chat End */}

            {/* Prompts start */}
            <HoverActionTooltip
                content='Save this Prompt'
                onClick={() => openModal()}
                className="cursor-pointer flex items-center justify-center lg:w-8 w-6 h-8 lg:min-w-8 rounded-custom p-1 transition ease-in-out duration-150 [&>svg]:h-[16px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:fill-b6 hover:bg-b12"
            >
                <PromptIcon
                    open={isOpen}
                    closeModal={closeModal}
                    className="lg:h-[13px] h-[12px] w-auto fill-b6 object-contain"
                />
            </HoverActionTooltip>
            {isOpen && (
                <AddNewPromptModal
                    open={isOpen}
                    closeModal={closeModal}
                    mycontent={content}
                    chatprompt={true}
                />
            )}
            {/* Prompts End */}

            {/* Copy start */}
            <HoverActionTooltip
                content='Copy Text'
                onClick={() => copyToClipboard(copyContent)}
                className="cursor-pointer flex items-center justify-center lg:w-8 w-5 h-8 md:min-w-8 rounded-custom p-1 transition ease-in-out duration-150 [&>svg]:h-[18px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:fill-b6 hover:bg-b12"
            >
                <CopyIcon className="lg:h-[15px] h-[14px] w-auto fill-b6 object-contain" />
            </HoverActionTooltip>
            {/* {
                conversation.length - 1 === index && (
                    <RegenerateResponse 
                        conversation={conversation} 
                        chatId={chatId} 
                        socket={socket} 
                        getAINormatChatResponse={getAINormatChatResponse}
                        getAICustomGPTResponse={getAICustomGPTResponse}
                        getPerplexityResponse={getPerplexityResponse}
                        getAIDocResponse={getAIDocResponse}
                        setConversations={setConversations}
                        custom_gpt_id={custom_gpt_id}
                    />
                )
            } */}
            {
                showCitations && citations?.length > 0 && (
                    <HoverActionTooltip
                        content='Sources'
                        onClick={openCitationsModal}
                        className="cursor-pointer flex items-center justify-center lg:w-8 w-5 h-8 min-w-8 rounded-custom p-1 transition ease-in-out duration-150 [&>svg]:h-[18px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:fill-b6 hover:bg-b12"
                    >
                        <GlobeIcon className="lg:h-[15px] h-[15px] w-auto fill-b6 object-contain" height={15} width={15}/>
                    </HoverActionTooltip>
                )
            }
            {
                isCitationsOpen && (
                    <CitationSourceSheet
                        citations={citations}
                        isOpen={isCitationsOpen}
                        onOpenChange={closeCitationsModal}
                    />
                )
            }
        </div>
    );
});

export default HoverActionIcon;
