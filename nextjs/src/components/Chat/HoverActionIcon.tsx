import ForkIcon from '@/icons/ForkIcon';
import MessagingIcon from '@/icons/MessagingIcon';
import PromptIcon from '@/icons/Prompt';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import useModal from '@/hooks/common/useModal';
import ForkChatModal from './ForkChatModal';
import AddNewPromptModal from '@/components/Prompts/AddNewPromptModal';
import AddPageModal from './AddPageModal';
import CopyIcon from '@/icons/CopyIcon';
import DownloadIcon from '@/icons/DownloadIcon';
import CloudIcon from '@/icons/CloudIcon';
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
import commonApi from '@/api';
import { MODULE_ACTIONS } from '@/utils/constant';
import Toast from '@/utils/toast';
import axios from 'axios';

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
    citations: CitationResponseType[],
    onAddToPages?: (title: string) => Promise<void>,
    hasBeenEdited?: boolean,
    isAnswer?: boolean
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

const HoverActionIcon = React.memo(({ content, proAgentData, conversation, sequence, onOpenThread, copyToClipboard, getAgentContent, index, showCitations, citations, onAddToPages, hasBeenEdited, isAnswer }: HoverActionIconProps) => {
    const { isOpen, openModal, closeModal } = useModal();
    const { isOpen: isForkOpen, openModal: openForkModal, closeModal: closeForkModal } = useModal();
    const { isOpen: isDownloadOpen, openModal: openDownloadModal, closeModal: closeDownloadModal } = useModal();
    const { isOpen: isAddPageOpen, openModal: openAddPageModal, closeModal: closeAddPageModal } = useModal();
    const { isOpen: isCitationsOpen, openModal: openCitationsModal, closeModal: closeCitationsModal } = useModal();
    const [forkData, setForkData] = useState([]);
    const [isUploadingToMinIO, setIsUploadingToMinIO] = useState(false);
    const downloadDropdownRef = useRef<HTMLDivElement>(null);

    let copyContent = content;
    if(proAgentData?.code){
        copyContent = getAgentContent(proAgentData);
    }
    
    // MinIO Upload functionality
    const uploadResponseToMinIO = async () => {
        try {
            setIsUploadingToMinIO(true);
            
            // Create a text file from the response content
            const responseContent = copyContent;
            // Generate a unique filename using just the ID part, starting with numbers
            const uniqueId = Math.random().toString(16).substring(2, 15) + Math.random().toString(16).substring(2, 15);
            const fileName = `${uniqueId}.txt`;
            const file = new File([responseContent], fileName, { type: 'text/plain' });
            
            // Generate presigned URL for MinIO upload
            const presignedUrlResponse = await commonApi({
                action: MODULE_ACTIONS.GENERATE_PRESIGNED_URL,
                data: {
                    fileKey: [{
                        key: fileName,
                        type: 'text/plain'
                    }],
                    folder: 'documents'
                }
            });
            
            if (!presignedUrlResponse.data?.length) {
                Toast('Failed to generate upload URL', 'error');
                return;
            }
            
            const presignedUrl = presignedUrlResponse.data[0];
            const uploadStartTime = Date.now();
            await axios.put(presignedUrl, file, { headers: { 'Content-Type': 'text/plain' } });
            const uploadEndTime = Date.now();
            const uploadDuration = uploadEndTime - uploadStartTime;
            
            // Extract the MinIO key from the presigned URL
            const minioUrl = new URL(presignedUrl);
            const minioPath = minioUrl.pathname;
            const pathParts = minioPath.split('/').filter(part => part.length > 0);
            const minioKey = pathParts.join('/');
            
            console.log('🎉 File uploaded to MinIO successfully!', { 
                fileName, 
                fileSize: `${(file.size / 1024).toFixed(2)} KB`, 
                uploadDuration: `${uploadDuration}ms`, 
                uploadSpeed: `${((file.size / 1024) / (uploadDuration / 1000)).toFixed(2)} KB/s`, 
                minioLocation: minioKey, 
                finalUri: `/${minioKey}`, 
                timestamp: new Date().toISOString() 
            });
            
            Toast('Response uploaded successfully!', 'success');
            
            console.log('💾 Storing file record in database...');
            try {
                // Create file metadata that the API can work with
                const fileMetadata = {
                    name: fileName,
                    type: 'txt',
                    uri: `/${minioKey}`,
                    mime_type: 'text/plain',
                    file_size: file.size.toString(),
                    module: 'documents',
                    isActive: true
                };

                console.log('📋 File metadata for database record:', fileMetadata);
                console.log('�� Sending request to CREATE_FILE_RECORD API with:', {
                    action: MODULE_ACTIONS.CREATE_FILE_RECORD,
                    data: fileMetadata
                });

                // Use the CREATE_FILE_RECORD API for metadata-only file record creation
                const dbResponse = await commonApi({
                    action: MODULE_ACTIONS.CREATE_FILE_RECORD,
                    data: fileMetadata
                });

                console.log('📡 Database API Response:', dbResponse);
                console.log('📡 Response type:', typeof dbResponse);
                console.log('📡 Response keys:', Object.keys(dbResponse || {}));

                if (dbResponse && dbResponse.code === 'SUCCESS') {
                    console.log('✅ File record stored in database successfully:', {
                        response: dbResponse,
                        fileMetadata: fileMetadata
                    });
                } else {
                    
                    // Show a warning toast instead of error
                    Toast('File uploaded to MinIO but database record creation failed', 'error');
                }
                
            } catch (dbError) {
                console.error('❌ Database record creation failed:', {
                    error: dbError.message,
                    errorStack: dbError.stack,
                    errorType: dbError.constructor.name,
                    fileName: fileName,
                    minioKey: minioKey,
                    note: 'File is still available in MinIO but not recorded in database'
                });
                
                // Show a warning toast instead of error
                Toast('File uploaded to MinIO but database record creation failed', 'error');
            }

            
        } catch (error) {
            Toast('Failed to upload response to MinIO', 'error');
        } finally {
            setIsUploadingToMinIO(false);
            console.log('🏁 MinIO upload process completed');
        }
    };

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

    // Handle Escape key to close download modal
    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isDownloadOpen) {
                closeDownloadModal();
            }
        };

        if (isDownloadOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isDownloadOpen, closeDownloadModal]);

    // Handle click outside download dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
                closeDownloadModal();
            }
        };

        if (isDownloadOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDownloadOpen, closeDownloadModal]);

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
            {/* Copy End */}

                         {/* Download start - Only show for answers */}
             {isAnswer && (
                <HoverActionTooltip
                     content='Download Response'
                     onClick={openDownloadModal}
                     className="cursor-pointer flex items-center justify-center lg:w-8 w-5 h-8 md:min-w-8 rounded-custom p-1 transition ease-in-out duration-150 [&>svg]:h-[18px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:fill-b6 hover:bg-b12"
                >
                     <img 
                         src="/File-download-01.jpg" 
                         alt="Download" 
                         className="lg:h-[15px] h-[14px] w-auto object-contain"
                     />
                </HoverActionTooltip>
            )}
                         {isAnswer && isDownloadOpen && (
                <div ref={downloadDropdownRef} className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px]">
                    <div className="py-1">
                        <button
                            onClick={() => {
                                const { downloadResponse } = require('@/utils/downloadUtils');
                                downloadResponse(copyContent, 'pdf', {
                                    title: 'AI Response',
                                    filename: 'weam-ai-response',
                                    includeTimestamp: true
                                });
                                closeDownloadModal();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4 text-red-500" />
                            PDF
                        </button>
                        
                        <button
                            onClick={() => {
                                const { downloadResponse } = require('@/utils/downloadUtils');
                                downloadResponse(copyContent, 'html', {
                                    title: 'AI Response',
                                    filename: 'weam-ai-response',
                                    includeTimestamp: true
                                });
                                closeDownloadModal();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4 text-red-500" />
                            HTML
                        </button>
                        
                        <button
                            onClick={() => {
                                const { downloadResponse } = require('@/utils/downloadUtils');
                                downloadResponse(copyContent, 'txt', {
                                    title: 'AI Response',
                                    filename: 'weam-ai-response',
                                    includeTimestamp: true
                                });
                                closeDownloadModal();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4 text-gray-500" />
                            TXT
                        </button>
                    </div>
                </div>

                         )}
             {/* Download End */}

             {/* Add to Pages - Only show for answers */}
             {isAnswer && onAddToPages && (
                 <HoverActionTooltip
                     content='Add to Pages'
                     onClick={openAddPageModal}
                     className="cursor-pointer flex items-center justify-center lg:w-8 w-5 h-8 md:min-w-8 rounded-custom p-1 transition ease-in-out duration-150 [&>svg]:h-[18px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:fill-b6 hover:bg-b12"
                 >
                    <svg className="lg:h-[15px] h-[14px] w-auto fill-b6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        <path d="M12,16H10V14H8V12H10V10H12V12H14V14H12V16Z" fill="white"/>
                    </svg>
                 </HoverActionTooltip>
             )}

                         {/* Upload Document - Only show for answers */}
            {isAnswer && (
                <HoverActionTooltip
                    content={isUploadingToMinIO ? 'Uploading...' : 'Upload Document'}
                    onClick={isUploadingToMinIO ? undefined : uploadResponseToMinIO}
                    className={`cursor-pointer flex items-center justify-center lg:w-8 w-5 h-8 md:min-w-8 rounded-custom p-1 transition ease-in-out duration-150 [&>svg]:h-[18px] [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:fill-b6 hover:bg-b12 ${isUploadingToMinIO ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isUploadingToMinIO ? (
                        <svg className="lg:h-[15px] h-[14px] w-auto fill-b6 animate-spin" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                        </svg>
                    ) : (
                        <CloudIcon className="lg:h-[15px] h-[14px] w-auto fill-b6" height={15} width={15} />
                    )}
                </HoverActionTooltip>
                )}



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

             {/* Add Page Modal */}
             <AddPageModal
                 isOpen={isAddPageOpen}
                 onClose={closeAddPageModal}
                 onSave={onAddToPages}
                 defaultTitle=""
             />
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
