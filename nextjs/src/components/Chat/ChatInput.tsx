'use client';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UpLongArrow from '@/icons/UpLongArrow';
import Toast from '@/utils/toast';
import { useDispatch, useSelector } from 'react-redux';
import { setIsWebSearchActive, setSelectedAIModal } from '@/lib/slices/aimodel/assignmodelslice';
import useAssignModalList from '@/hooks/aiModal/useAssignModalList';
import Image from 'next/image';
import { BrainAgentType, BrainPromptType, BrainListType } from '@/types/brain';
import {
    decodedObjectId,
    encodedObjectId,
    generateObjectId,
    persistBrainData,
    retrieveBrainData,
} from '@/utils/helper';
import {
    AI_MODAL_NAME,
    AI_MODEL_CODE,
    API_KEY_MESSAGE,
    API_TYPE_OPTIONS,
    GENERAL_BRAIN_TITLE,
    GPTTypes,
} from '@/utils/constant';
import { UploadedFileType } from '@/types/chat';
import {
    setChatAccessAction,
    setCreditInfoAction,
    setInitialMessageAction,
} from '@/lib/slices/chat/chatSlice';
import { getCurrentUser } from '@/utils/handleAuth';
import UploadFileInput, { getResponseModel } from './UploadFileInput';
import { RootState } from '@/lib/store';
import { setChatMessageAction, setUploadDataAction } from '@/lib/slices/aimodel/conversation';
import usePrompt from '@/hooks/prompt/usePrompt';
import useMediaUpload from '@/hooks/common/useMediaUpload';
import PromptEnhance from './PromptEnhance';
import BookmarkDialog from './BookMark';
import VoiceChat from './VoiceChat';
import {
    ProAgentDataType,
} from '@/types/chat';
import AttachMentToolTip from './AttachMentToolTip';
import WebSearchToolTip from './WebSearchToolTip';
import ThunderBoltDialog from '../Shared/ThunderBoltDialog';
import { AiModalType } from '@/types/aimodels';
import TextAreaBox from '@/widgets/TextAreaBox';
import { ProAgentCode } from '@/types/common';
import useConversationHelper from '@/hooks/conversation/useConversationHelper'
import useConversation from '@/hooks/conversation/useConversation';
import { useThunderBoltPopup } from '@/hooks/conversation/useThunderBoltPopup';
import ChatInputFileLoader from '@/components/Loader/ChatInputFileLoader';
import { setSelectedBrain } from '@/lib/slices/brain/brainlist';
import useCustomGpt from '@/hooks/customgpt/useCustomGpt';
import { LINK } from '@/config/config';
import defaultCustomGptImage from '../../../public/defaultgpt.jpg';
import ThreeDotLoader from '@/components/Loader/ThreeDotLoader';
import useIntersectionObserver from '@/hooks/common/useIntersectionObserver';
import useDebounce from '@/hooks/common/useDebounce';
import SearchIcon from '@/icons/Search';
import routes from '@/utils/routes';
import ChatIcon from '@/icons/Chat';
import PromptIcon from '@/icons/Prompt';
import Customgpt from '@/icons/Customgpt';
import DocumentIcon from '@/icons/DocumentIcon';
import { getSelectedBrain, isEmptyObject } from '@/utils/common';
import useMCP from '@/hooks/mcp/useMCP';
import ToolsConnected from './ToolsConnected';
import { getDisplayModelName } from '@/utils/helper';
import { truncateText } from '@/utils/common';

const defaultContext = {
    type: null,
    prompt_id: undefined,
    custom_gpt_id: undefined,
    doc_id: undefined,
    textDisable: false,
    attachDisable: false,
    title: undefined,
};

type TextAreaSubmitButtonProps = {
    disabled: boolean;
    handleSubmit: () => void;
    loading?: boolean;
    onStopStreaming?: () => void;
    isActivelyStreaming?: boolean;
};

type TextAreaFileInputProps = {
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    multiple: boolean;
};

export const TextAreaSubmitButton = ({
    disabled,
    handleSubmit,
    loading = false,
    onStopStreaming,
    isActivelyStreaming = false,
}: TextAreaSubmitButtonProps) => {
    // Show stop button when actively streaming - use isActivelyStreaming as primary indicator
    if (isActivelyStreaming && onStopStreaming) {
        return (
            <div className="flex items-center ml-2">
                <span className="text-xs text-red-500 mr-2 animate-pulse font-medium">
                    Generating...
                </span>
                                            <button
                                className="chat-submit group bg-gray-800 hover:bg-gray-900 active:bg-black w-[32px] z-20 h-[32px] flex items-center justify-center rounded-full transition-all duration-200 shadow-lg border-2 border-gray-600 hover:border-gray-500"
                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                    event.preventDefault();
                                    onStopStreaming();
                                }}
                                title="Stop generating"
                                style={{
                                    boxShadow: '0 0 10px rgba(31, 41, 55, 0.6)',
                                    animation: 'pulse 2s infinite'
                                }}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    className="fill-white drop-shadow-sm"
                                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))' }}
                                >
                                    <rect x="2" y="2" width="10" height="10" rx="1" />
                                </svg>
                            </button>
            </div>
        );
    }

    // Show regular submit button
    return (
        <button
            className={`chat-submit ml-2 group bg-b2 w-[32px] z-10 h-[32px] flex items-center justify-center rounded-full transition-colors ${
                disabled ? 'disabled:bg-b12' : ''
            }`}
            disabled={disabled}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                handleSubmit();
            }}
        >
            <UpLongArrow
                width="15"
                height="19"
                className="fill-b15 group-disabled:fill-b7"
            />
        </button>
    );
};

export const TextAreaFileInput = ({ fileInputRef, handleFileChange, multiple }: TextAreaFileInputProps) => {
    return (
        <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            multiple={multiple}
        />
    );
};

type ChatInputProps = {
    aiModals: AiModalType[];
}


const URL_PARAMS_AGENT_CODE = {
    [ProAgentCode.QA_SPECIALISTS]: 'QA',
    [ProAgentCode.SEO_OPTIMISED_ARTICLES]: 'SEO',
    [ProAgentCode.SALES_CALL_ANALYZER]: 'SALES',
    [ProAgentCode.WEB_PROJECT_PROPOSAL]: 'PROJECT',
}

const ChatInput = ({ aiModals }: ChatInputProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [message, setMessage] = useState('');
    const [isDisable, setIsDisable] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedContext, setSelectedContext] = useState(defaultContext);
    const [handlePrompts, setHandlePrompts] = useState([]);
    const [queryId, setQueryId] = useState<string>(''); //enhance prompt id
    const [isNavigating, setIsNavigating] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const { toolStates, setToolStates } = useMCP();

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const dispatch = useDispatch();
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
    };
    const selectedAiModal = useSelector((state: RootState) => state.assignmodel.selectedModal);
    const brains= useSelector((state: RootState) => state.brain.combined);
    const isWebSearchActive = useSelector((store: RootState) => store.assignmodel.isWebSearchActive);
    const selectedBrain = useSelector((store: RootState) => store.brain.selectedBrain);
    const creditInfoSelector = useSelector((store: RootState) => store.chat.creditInfo);

    const { assignServerActionModal } = useAssignModalList();
    const { getDecodedObjectId } = useConversationHelper();
    const {
        loading,
        setPromptList,
        getTabPromptList,
        paginator,
        setLoading,
        promptList:prompts,
    } = usePrompt();
    const { fileInputRef, fileLoader, handleFileChange, handlePasteFiles } = useMediaUpload({
        selectedAIModal: selectedAiModal,
    });
    const uploadedFile = useSelector(
        (store: RootState) => store.conversation.uploadData
    );

    const { blockProAgentAction } = useConversationHelper();
    const { disabledInput } = useConversation();

    const chatId = useMemo(() => generateObjectId(), []);
    const currentUser = useMemo(() => getCurrentUser(), []);

    const { onSelectMenu } = useThunderBoltPopup({
        selectedContext,
        setSelectedContext,
        selectedAIModal: selectedAiModal,
        uploadedFile,
        setText: setMessage,
    });

    const DefaultListOption = React.memo(({ brain } : { brain: BrainListType }) => {
        const router = useRouter();
        const searchParams = useSearchParams();
        
        const handleNavigation = (href: string) => {
            if (!brain?._id) {
                console.warn('Brain ID is undefined, cannot navigate');
                return;
            }
            const brainId = encodedObjectId(brain._id);
            const modelName = searchParams.get('model') || AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED;
            const url = `${href}?b=${brainId}&model=${modelName}`;
            router.push(url);
        };

        const listOptions = [
            {
                icon: <ChatIcon width={20} height={20}  className="fill-b6"/>,
                text: 'Chats',
                id: 1,
                href: routes.chat,
            },
            {
                icon: <PromptIcon width={20} height={20} className="fill-b6" />,
                text: 'Prompts',
                id: 2,
                href: routes.prompts,
            },
            {
                icon: <Customgpt width={20} height={20} className="fill-b6" />,
                text: 'Agents',
                id: 3,
                href: routes.customGPT,
            },
            {
                icon: <DocumentIcon width={20} height={20} className="fill-b6" />,
                text: 'Docs',
                id: 4,
                href: routes.docs,
            },
        ];

        return (
            <>
                {listOptions.map((option) => (
                    <button
                        key={option.id}
                        className="flex text-font-14 flex-row items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-md border border-gray-300 bg-white hover:bg-b12"
                        onClick={() => handleNavigation(option.href)}
                    >
                        <div className="flex items-center justify-center">
                            {option.icon}
                        </div>
                        <span className="text-b3 transition-all ease-in-out duration-500 text-xs font-medium hidden sm:block">{option.text}</span>
                    </button>
                ))}
            </>
        );
    });

    const handleInitialMessage = async (proAgentData: ProAgentDataType = {}) => {
        if (isNavigating) return; // Prevent multiple navigations
        
        if (!aiModals.length) {
            Toast(API_KEY_MESSAGE, 'error');
            setMessage('');
            return;
        }

        setIsNavigating(true);

        const serializableProAgentData = proAgentData?.code ? { ...proAgentData } : {};

        const payload = {
            message: message,
            response: '',
            responseModel: uploadedFile.some((file) => file.isCustomGpt) 
                ? uploadedFile.find((file) => file.isCustomGpt)?.responseModel 
                : selectedAiModal?.name,
            media: uploadedFile || [],
            seq: Date.now(),
            promptId: selectedContext?.prompt_id,
            customGptId: selectedContext?.custom_gpt_id,
            answer_thread: {
                count: 0,
                users: [],
            },
            question_thread: {
                count: 0,
                users: [],
            },
            threads: [],
            customGptTitle: selectedContext.title,
            coverImage: selectedContext.gptCoverImage,
            user: currentUser,
            model: selectedAiModal.bot,
            cloneMedia: uploadedFile || [],
            proAgentData: serializableProAgentData,
            mcp_tools: toolStates // Now using Redux state
        };

        // Batch the dispatches to avoid multiple renders
        const batchDispatches = () => {
            dispatch(setInitialMessageAction(payload));
            dispatch(setChatAccessAction(true));
            dispatch(
                setCreditInfoAction({
                    msgCreditLimit: creditInfoSelector?.msgCreditLimit,
                    msgCreditUsed: creditInfoSelector?.msgCreditUsed,
                })
            );
        };

        // Use requestAnimationFrame to batch updates
        requestAnimationFrame(() => {
            batchDispatches();
            assignServerActionModal(aiModals);
            setIsDisable(true);
            setMessage('');
            
            const { code } = serializableProAgentData;
            const agentParam = code ? `&agent=${URL_PARAMS_AGENT_CODE[code]}` : '';
            
            router.push(
                `/chat/${chatId}?b=${searchParams.get('b')}&model=${selectedAiModal.name}${agentParam}`,
                { scroll: false }
            );
            
            // Reset navigation state after a short delay to allow transition
            setTimeout(() => {
                setIsNavigating(false);
            }, 300);
        });
    };

    const handleKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (message?.trim() !== '' && e.key == 'Enter' && !e.shiftKey && !fileLoader && !blockProAgentAction()) {
                e.preventDefault();
                setQueryId(generateObjectId());
                handleInitialMessage();
            }
        },
        [message]
    );
   
    const removeUploadedFile = () => {
        dispatch(setUploadDataAction([]));
    };

    const isSubmitDisabled = message.trim() === '' || fileLoader || disabledInput.current || blockProAgentAction();

    const handleWebSearchClick = () => {
        dispatch(setIsWebSearchActive(!isWebSearchActive));
    };

    const handleAttachButtonClick = () => {
        fileInputRef.current.click();
    };

    const removeSelectedFile = (index: number) => {
        const updatedFiles = uploadedFile.filter((_, i) => i !== index);
        const isEmptyFiles = updatedFiles.length === 0;
        if (isEmptyFiles) {
            dispatch(setUploadDataAction([]));
            setSelectedContext(defaultContext);
        }
        else {
            dispatch(setUploadDataAction(updatedFiles));
        }
        if (fileInputRef.current && isEmptyFiles) {
            fileInputRef.current.value = null; // Reset the file input value
        }
    };

     // Initialize queryId when text changes from empty to non-empty
    useEffect(() => {
        if (message && !queryId) {
            setQueryId(generateObjectId());
        } else if (!message) {
            setQueryId(''); // Reset queryId when text is cleared
        }
    }, [message]);


    useEffect(() => {
        router.prefetch(`/chat/${chatId}`);     
        const defaultModal = aiModals.find(
            (el: AiModalType) => el.name === AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED
        );
        if (defaultModal) {
            dispatch(setSelectedAIModal(defaultModal));
        }
        dispatch(setChatMessageAction(''));
    }, []);

    useEffect(() => {
        if (isWebSearchActive) {
            removeUploadedFile();
            const perplexityAiModal = aiModals.find(
                (modal) =>
                    modal.bot.code === API_TYPE_OPTIONS.PERPLEXITY &&
                    [AI_MODAL_NAME.SONAR, AI_MODAL_NAME.SONAR_REASONING_PRO].includes(
                        modal.name
                    )
            );
            if (perplexityAiModal) {
                if (
                    selectedAiModal?.name &&
                    ![AI_MODAL_NAME.SONAR, AI_MODAL_NAME.SONAR_REASONING_PRO].includes(
                        selectedAiModal.name
                    )
                ) {
                    const payload = {
                        _id: perplexityAiModal._id,
                        bot: perplexityAiModal.bot,
                        company: perplexityAiModal.company,
                        modelType: perplexityAiModal.modelType,
                        name: perplexityAiModal.name,
                        provider: perplexityAiModal?.provider,
                    };
                    dispatch(setSelectedAIModal(payload));
                }
                dispatch(setUploadDataAction([]));
            }
        } else {
            const openAiModal = aiModals.find(
                (modal) =>
                    modal.bot.code === AI_MODEL_CODE.OPEN_AI &&
                    modal.name == AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED
            );
            if (
                openAiModal &&
                selectedAiModal?.name &&
                [AI_MODAL_NAME.SONAR, AI_MODAL_NAME.SONAR_REASONING_PRO].includes(
                    selectedAiModal.name
                )
            ) {
                const payload = {
                    _id: openAiModal._id,
                    bot: openAiModal.bot,
                    company: openAiModal.company,
                    modelType: openAiModal.modelType,
                    name: openAiModal.name,
                    provider: openAiModal?.provider,
                };
                dispatch(setSelectedAIModal(payload));
            }
        }
        dispatch(setUploadDataAction([]));
    }, [isWebSearchActive]);

    useEffect(() => {
        if (!selectedAiModal?.name) return;
        const modelName = getResponseModel(selectedAiModal.name);
        const brain = getSelectedBrain(brains,currentUser);
        history.pushState({}, null, `/?b=${encodedObjectId(brain?._id)}&model=${modelName}`);
    }, [selectedAiModal,currentUser]);

    useEffect(() => {
        if(prompts?.length > 0){
            if(message){
                const updateIsActive = prompts.map((currPrompt) => {
                    if(currPrompt.content){
                        const summaries = currPrompt?.summaries 
                            ? Object.values(currPrompt.summaries)
                                .map((currSummary:any) => `${currSummary.website} : ${currSummary.summary}`)
                                .join('\n')
                            : '';
                
                        const isContentIncluded = message?.replace(/\s+/g, '')?.includes((currPrompt.content + (summaries ? '\n' + summaries : ''))?.replace(/\s+/g, ''));
                        return {...currPrompt,isActive:isContentIncluded}
                    }

                    return currPrompt
                })

                setHandlePrompts(updateIsActive);
            }else{
                setHandlePrompts(prompts);
            }
        }else{
            setHandlePrompts(prompts)
        }
    }, [prompts, message]);

    // Auto-adjust textarea height based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height to auto
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set new height based on scrollHeight
        }
    }, [message]);

    const generalBrain = useMemo(() => 
        brains?.find((brain) => brain.title === GENERAL_BRAIN_TITLE), 
        [brains]
    );

    const defaultModal = useMemo(() => 
        aiModals.find((modal) => modal.name === AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED), 
        [aiModals]
    );

    useEffect(() => {
        if (!brains || brains.length === 0) {
            return;
        }

        if (!generalBrain) {
            const firstBrain = brains[0];
            if (firstBrain) {
                persistBrainData(firstBrain);
            }
        } 
        else if (isEmptyObject(selectedBrain) && generalBrain) {
            dispatch(setSelectedBrain(generalBrain));
        } else {
            if (!retrieveBrainData()) {
                persistBrainData(generalBrain);
            }
        }
    }, [brains, generalBrain, selectedBrain, dispatch]);

    useEffect(() => {
        if (defaultModal) {
            setSelectedAIModal(defaultModal);
        }
    }, [defaultModal]);
        
    const [showAgentList, setShowAgentList] = useState(false);
    const [showPromptList, setShowPromptList] = useState(false);
    const agentPromptDropdownRef = useRef<HTMLDivElement>(null);
    
    const handleTextAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMessage(value);

        // Show agent list if first character is '@'
        setShowAgentList(value.startsWith('@'));

        // Show prompt list if first character is '/'
        setShowPromptList(value.startsWith('/'));
    };
    const handleAgentSelect = (agent) => {
        // handle agent selection logic
        setShowAgentList(false);
    };
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                agentPromptDropdownRef.current &&
                !agentPromptDropdownRef.current.contains(event.target as Node)
            ) {
                setShowAgentList(false);
                setShowPromptList(false);
            }
        }
        if (showAgentList || showPromptList) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAgentList, showPromptList]);


    const {
        customgptList,
        loading: customgptLoading,
        getTabAgentList,
        paginator: agentPaginator,
        setCustomGptList
    } = useCustomGpt();

    const [debouncedSearchValue] = useDebounce(searchValue, 500);

    useEffect(() => {
        if (debouncedSearchValue) {
            setCustomGptList([]);
            getTabAgentList(debouncedSearchValue);
            setPromptList([]);
            getTabPromptList(debouncedSearchValue);
        } else {
            setCustomGptList([]);
            getTabAgentList('');
            setPromptList([]);
            getTabPromptList('');
        }
    }, [debouncedSearchValue]);

    const gptListRef = useIntersectionObserver(() => {
        if (agentPaginator.hasNextPage && !customgptLoading) {
            getTabAgentList(searchValue, {
                offset: agentPaginator.offset + agentPaginator.perPage, limit: agentPaginator.perPage 
            });
        }
    }, [agentPaginator?.hasNextPage, !customgptLoading]);

    const handleAgentSelection = (gpt) => {
        onSelectMenu(GPTTypes.CustomGPT, gpt);
        setShowAgentList(false);
        setMessage('');
    };
    const handleInputChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };

    const getTruncatedSystemPrompt = (title: string, systemPrompt: string, maxLength: number = 70) => {
        const availableLength = Math.max(maxLength - title.length, 0);
        if (systemPrompt.length > availableLength) {
            return systemPrompt.slice(0, availableLength - 3) + '...';
        }
        return systemPrompt;
    };

    const handleToolStatesChange = (newToolStates: Record<string, string[]>) => {
        setToolStates(newToolStates);
        // The persistence is automatically handled in the Redux slice
    };

    return (
        <>
        <div className="w-full h-full flex items-center justify-center">
            <div className={`w-full mx-auto px-5 md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem] ${isNavigating ? 'opacity-50' : ''}`}>
                <h1 className='text-center mb-4 font-bold text-font-24'>Hello, {currentUser?.fname} 👋🏻 </h1>
                <h2 className='text-center mb-4 text-font-16 text-b6'>How Weam can help you today?</h2>
                {(showAgentList || showPromptList) && (
                    <div ref={agentPromptDropdownRef}>
                        {showAgentList && (
                            <div className='w-full p-4 border rounded-md mb-1'>
                                <div className='normal-agent'>
                                    <div className='flex mb-1'>
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                className="text-font-14 pl-[36px] py-2 w-full focus:outline-none focus:border-none"
                                                id="searchBots"
                                                placeholder="Search Agents"
                                                onChange={handleInputChanges}
                                                value={searchValue}
                                            />
                                            <span className="inline-block absolute left-[12px] top-1/2 -translate-y-1/2">
                                                <SearchIcon className="w-3 h-auto fill-b6" />
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pr-1 h-full overflow-y-auto max-md:overflow-x-hidden w-full max-h-[250px]">
                                        {
                                            customgptList.length > 0 && (
                                            customgptList.map((gpt: BrainAgentType, index: number, gptArray: BrainAgentType[]) => {
                                                const isSelected = uploadedFile?.some((file: UploadedFileType) => file?._id === gpt._id);
                                                
                                                return (
                                                    <div
                                                        key={gpt._id}
                                                        className={`cursor-pointer border-b10 py-1.5 px-2.5 transition-all ease-in-out rounded-md hover:bg-b12 ${    
                                                            isSelected
                                                                ? 'bg-b12 border-b10'
                                                                : 'bg-white border-b10'
                                                        } flex-wrap`}
                                                        onClick={() => handleAgentSelection(gpt)}
                                                        ref={gptArray.length - 1 === index ? gptListRef : null}
                                                    >
                                                        
                                                        <div className="flex items-center flex-wrap xl:flex-nowrap">
                                                            <Image
                                                                src={
                                                                    gpt?.coverImg?.uri
                                                                        ? `${LINK.AWS_S3_URL}${gpt.coverImg.uri}`
                                                                        : defaultCustomGptImage.src
                                                                }
                                                                height={60}
                                                                width={60}
                                                                className="w-6 h-6 object-contain rounded-custom inline-block"
                                                                alt={
                                                                    gpt?.coverImg
                                                                        ?.name ||
                                                                    'Default Image'
                                                                }
                                                            />
                                                            <p className="text-font-12 font-medium text-b2 mx-2">
                                                                {gpt.title}
                                                            </p>
                                                            <p className='text-font-12 font-normal text-b6 mt-1'>
                                                                {getTruncatedSystemPrompt(gpt.title, gpt.systemPrompt, 100)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                            )
                                        }
                                        {
                                            customgptLoading && (
                                                <ThreeDotLoader className="justify-start ml-8 mt-3" />
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                        {showPromptList && (
                            <div className='w-full p-4 border rounded-md mb-1'>
                                <div className='prompt-list'>
                                    <div className='flex mb-1'>
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                className="text-font-14 pl-[36px] py-2 w-full focus:outline-none focus:border-none"
                                                id="searchPrompts"
                                                placeholder="Search Prompts"
                                                onChange={handleInputChanges}
                                                value={searchValue}
                                            />
                                            <span className="inline-block absolute left-[12px] top-1/2 -translate-y-1/2">
                                                <SearchIcon className="w-3 h-auto fill-b6" />
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pr-1 h-full overflow-y-auto max-md:overflow-x-hidden w-full max-h-[250px]">
                                        {
                                            handlePrompts?.length > 0 && (
                                            handlePrompts?.map((currPrompt: BrainPromptType, index: number, promptArray: BrainPromptType[]) => (
                                                <div
                                                    key={currPrompt._id}
                                                    className={`cursor-pointer border-b10 py-1.5 px-2.5 transition-all ease-in-out rounded-md hover:bg-b12 ${
                                                        currPrompt.isActive
                                                            ? 'bg-b12 border-b10'
                                                            : 'bg-white border-b10'
                                                    }`}
                                                    onClick={() => {
                                                        const summaries = currPrompt?.summaries
                                                            ? Object.values(currPrompt.summaries)
                                                                .map((currSummary: any) => `${currSummary.website} : ${currSummary.summary}`)
                                                                .join('\n')
                                                            : '';
                                                        const promptContent = currPrompt.content + (summaries ? '\n' + summaries : '');
                                                        onSelectMenu(GPTTypes.Prompts, currPrompt);
                                                        setMessage(promptContent);
                                                        setShowPromptList(false);
                                                    }}
                                                    ref={promptArray.length - 1 === index ? null : null}
                                                >
                                                    <div className="flex items-center flex-wrap xl:flex-nowrap">
                                                        <p className="text-font-12 font-medium text-b2 mr-2">
                                                            {currPrompt.title}
                                                        </p>
                                                        {/* <span className='text-b6 ml-1 text-font-12 max-md:w-full'>
                                                            - {currPrompt.isShare ? 'Shared' : 'Private'} / {currPrompt.brain.title}
                                                        </span> */}
                                                        <p className='text-font-12 font-normal text-b6 mt-1'>
                                                            {getTruncatedSystemPrompt(currPrompt.title, currPrompt.content, 100)}
                                                        </p>
                                                    </div>
                                                    {/* <p className='text-font-12 font-normal text-b6 mt-1'>
                                                        {truncateText(currPrompt.content,100)}       
                                                    </p> */}
                                                </div>
                                            ))
                                            )
                                        }
                                        {
                                            loading && (
                                                <ThreeDotLoader className="justify-start ml-8 mt-3" />
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                <div className="flex flex-col text-font-16 mx-auto group overflow-hidden rounded-[18px] [&:has(textarea:focus)]:shadow-[0_2px_6px_rgba(0,0,0,.05)] w-full flex-grow relative border border-b11">
                    <UploadFileInput
                        removeFile={removeSelectedFile}
                        fileData={uploadedFile}
                    />
                    {fileLoader && (<ChatInputFileLoader />)}
                    <TextAreaBox
                        message={message}
                        handleChange={handleTextAreaChange}
                        handleKeyDown={handleKeyDown}
                        isDisable={isDisable}
                        autoFocus={isWebSearchActive}
                        onPaste={handlePasteFiles}
                        ref={textareaRef}
                    />
                    <div className="flex items-center z-10 px-4 pb-[6px] mt-2">
                        <ThunderBoltDialog
                            isWebSearchActive={isWebSearchActive}
                            dialogOpen={dialogOpen}
                            uploadedFile={uploadedFile}
                            setDialogOpen={setDialogOpen}
                            onSelect={onSelectMenu}
                            selectedContext={selectedContext}
                            handlePrompts={handlePrompts}
                            setHandlePrompts={setHandlePrompts}
                            getList={getTabPromptList}
                            promptLoader={loading}
                            setPromptLoader={setLoading}
                            paginator={paginator}
                            setPromptList={setPromptList}
                            promptList={prompts}
                            handleSubmitPrompt={handleInitialMessage}
                        />
                        <AttachMentToolTip
                            fileLoader={fileLoader}
                            isWebSearchActive={isWebSearchActive}
                            handleAttachButtonClick={handleAttachButtonClick}
                        />
                        <BookmarkDialog
                            onSelect={onSelectMenu}
                            isWebSearchActive={isWebSearchActive}
                            selectedAttachment={uploadedFile}
                        />
                        <WebSearchToolTip
                            loading={false}
                            isWebSearchActive={isWebSearchActive}
                            handleWebSearchClick={handleWebSearchClick}
                        />
                        <PromptEnhance
                            isWebSearchActive={isWebSearchActive}
                            text={message}
                            setText={setMessage}
                            promptId={selectedContext.prompt_id}
                            queryId={queryId}
                            brainId={getDecodedObjectId()}
                        />
                        <ToolsConnected 
                            isWebSearchActive={isWebSearchActive} 
                            toolStates={toolStates}
                            onToolStatesChange={handleToolStatesChange}
                        />
                        <VoiceChat setText={setMessage} text={message} />
                        <TextAreaFileInput
                            fileInputRef={fileInputRef}
                            handleFileChange={handleFileChange}
                            multiple
                        />
                        <TextAreaSubmitButton
                            disabled={isSubmitDisabled || isNavigating}
                            handleSubmit={handleInitialMessage}
                        />
                    </div>                    
                </div>
                
                {!isEmptyObject(selectedBrain) && (
                <div className="left-0 right-0 bg-white px-2 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                        <DefaultListOption brain={selectedBrain} />
                    </div>
                </div>
                )}
            </div>
        </div>
        </>
    );
};

export default ChatInput;