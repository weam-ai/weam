'use client';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UpLongArrow from '@/icons/UpLongArrow';
import StopStreamButton from '@/icons/StopStreamButton';
import Toast from '@/utils/toast';
import { useDispatch, useSelector } from 'react-redux';
import { setIsWebSearchActive, setSelectedAIModal } from '@/lib/slices/aimodel/assignmodelslice';
import useAssignModalList from '@/hooks/aiModal/useAssignModalList';
import Image from 'next/image';
import { BrainAgentType, BrainPromptType, BrainListType } from '@/types/brain';
import {
    encodedObjectId,
    generateObjectId,
    retrieveBrainData,
    persistBrainData,
} from '@/utils/helper';
import {
    AI_MODAL_NAME,
    AI_MODEL_CODE,
    API_KEY_MESSAGE,
    API_TYPE_OPTIONS,
    GENERAL_BRAIN_TITLE,
    GPTTypes,
} from '@/utils/constant';
import { getSelectedBrain } from '@/utils/common';
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
import useMCP from '@/hooks/mcp/useMCP';
import ToolsConnected from './ToolsConnected';
import useCustomGpt from '@/hooks/customgpt/useCustomGpt';
import { LINK } from '@/config/config';
import defaultCustomGptImage from '../../../public/defaultgpt.jpg';
import { getDisplayModelName } from '@/utils/helper';
import ThreeDotLoader from '@/components/Loader/ThreeDotLoader';
import useIntersectionObserver from '@/hooks/common/useIntersectionObserver';
import useDebounce from '@/hooks/common/useDebounce';
import SearchIcon from '@/icons/Search';
import routes from '@/utils/routes';
import ChatIcon from '@/icons/Chat';
import PromptIcon from '@/icons/Prompt';
import Customgpt from '@/icons/Customgpt';
import DocumentIcon from '@/icons/DocumentIcon';
import BookMarkIcon from '@/icons/Bookmark';
import { isEmptyObject, truncateText } from '@/utils/common';
import AIPagesIcon from '@/icons/AIPagesIcon';
import Link from 'next/link';
import CustomPromptAction from '@/actions/CustomPromptAction';
import PromptCardSkeleton from '@/components/Loader/PromptCardSkeleton';
import { PagesIcon } from '@/icons/PagesIcon';
import AgentCardSkeleton from '../Loader/AgentCardSkeleton';
import CustomBotAction from '@/actions/CustomTemplateAction';
import Plus from '@/icons/Plus';
import { 
    getCachedPrompts, 
    getCachedAgents, 
    setCachedPrompts, 
    setCachedAgents, 
    clearExpiredCache 
} from '@/utils/promptAgentCache';


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
};

type TextAreaFileInputProps = {
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    multiple: boolean;
};

type StopStreamSubmitButtonProps = {
    handleStop: () => void;
};

export const TextAreaSubmitButton = ({
    disabled,
    handleSubmit,
}: TextAreaSubmitButtonProps) => {
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

export const StopStreamSubmitButton = ({ handleStop }: StopStreamSubmitButtonProps) => {
    return (
        <button
            className="chat-submit ml-2 group bg-white w-[32px] h-[32px] z-10 flex items-center justify-center rounded-full transition-colors border border-gray-600 hover:border-gray-500 shadow-md"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                handleStop();
            }}
        >
            <StopStreamButton width="30" height="30" />
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
    
    const { toolStates, setToolStates } = useMCP();
    const [searchValue, setSearchValue] = useState('');
    const [randomPrompts, setRandomPrompts] = useState<BrainPromptType[]>([]);
    const [customPrompts, setCustomPrompts] = useState([]);
    const [isLoadingCustomPrompts, setIsLoadingCustomPrompts] = useState(true);
    const [randomAgents, setRandomAgents] = useState([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const dispatch = useDispatch();
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
    };
    const selectedAiModal = useSelector((state: RootState) => state.assignmodel.selectedModal);
    const brains= useSelector((state: RootState) => state.brain.combined);
    const isWebSearchActive = useSelector((store: RootState) => store.assignmodel.isWebSearchActive);
    const creditInfoSelector = useSelector((store: RootState) => store.chat.creditInfo);
    const selectedBrain = useSelector((store: RootState) => store.brain.selectedBrain);
    
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

    // Function to get random prompts
    const getRandomPrompts = useCallback((prompts: BrainPromptType[], count: number = 4) => {
        if (!prompts || prompts.length === 0) return [];
        
        const shuffled = [...prompts].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }, []);


    // Function to get random custom prompts
    const getRandomCustomPrompts = useCallback((prompts: any[], count: number = 4) => {
        if (!prompts || prompts.length === 0) return [];
        
        const shuffled = [...prompts].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }, []);

    // Function to truncate text with title and content totaling 250 characters
    const getTruncatedPromptText = useCallback((title: string, content: string, maxLength: number = 250) => {
        const titleLength = title.length;
        const availableLength = Math.max(maxLength - titleLength - 3, 0); // -3 for "..."
        
        if (content.length <= availableLength) {
            return content;
        }
        
        return content.slice(0, availableLength) + '...';
    }, []);

    // Update random prompts when prompts change
    useEffect(() => {
        if (prompts && prompts.length > 0) {
            const random = getRandomPrompts(prompts, 4);
            setRandomPrompts(random);
        }
    }, [prompts, getRandomPrompts]);


    // Handle prompt selection
    const handlePromptClick = (prompt: BrainPromptType) => {
        const summaries = prompt?.summaries
            ? Object.values(prompt.summaries)
                .map((currSummary: any) => `${currSummary.website} : ${currSummary.summary}`)
                .join('\n')
            : '';
        const promptContent = prompt.content + (summaries ? '\n' + summaries : '');
        onSelectMenu(GPTTypes.Prompts, prompt);
        setMessage(promptContent);
    };

    // Handle custom prompt selection
    const handleCustomPromptClick = (prompt: any) => {
        onSelectMenu(GPTTypes.Prompts, prompt);
        setMessage(prompt.content);
    };

    // Handle See More navigation
    const handleSeeMoreClick = () => {
        router.push('/custom-templates?tab=prompttemplate');
    };


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
                icon: <ChatIcon width={18} height={18}  className="fill-b6 group-hover:fill-white w-4 h-auto"/>,
                text: 'Chats',
                id: 1,
                href: routes.chat,
            },
            {
                icon: <PromptIcon width={18} height={18} className="fill-b6 group-hover:fill-white w-4 h-auto" />,
                text: 'Prompts',
                id: 2,
                href: routes.prompts,
            },
            {
                icon: <Customgpt width={18} height={18} className="fill-b6 group-hover:fill-white w-4 h-auto" />,
                text: 'Agents',
                id: 3,
                href: routes.customGPT,
            },
            {
                icon: <DocumentIcon width={18} height={18} className="fill-b6 group-hover:fill-white w-4 h-auto" />,
                text: 'Docs',
                id: 4,
                href: routes.docs,
            },
            {
                icon: <PagesIcon width={16} height={16} className="fill-b6 group-hover:fill-white" />,
                text: 'Pages',
                id: 5,
                href: routes.pages,
            },
        ];

        return (
            <>
                {listOptions.map((option) => (
                    <button
                        key={option.id}
                        className="btn btn-outline-gray flex items-center justify-center gap-x-2 group"
                        onClick={() => handleNavigation(option.href)}
                    >
                        <div className="flex items-center justify-center">
                            {option.icon}
                        </div>
                        <span className="">{option.text}</span>
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
        // Clear expired cache on component mount
        clearExpiredCache();

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
        

    const handleToolStatesChange = (newToolStates: Record<string, string[]>) => {
        setToolStates(newToolStates);
        // The persistence is automatically handled in the Redux slice
    };
    const [showAgentList, setShowAgentList] = useState(false);
    const [showPromptList, setShowPromptList] = useState(false);
    const agentPromptDropdownRef = useRef<HTMLDivElement>(null);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
    const [isEnhanceLoading, setIsEnhanceLoading] = useState(false);
    const plusMenuRef = useRef<HTMLDivElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    
    const handleTextAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMessage(value);

        // Show agent list if first character is '@'
        setShowAgentList(value.startsWith('@'));

        // Show prompt list if first character is '/'
        setShowPromptList(value.startsWith('/'));
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
            if (
                plusMenuRef.current &&
                !plusMenuRef.current.contains(event.target as Node) &&
                plusButtonRef.current &&
                !plusButtonRef.current.contains(event.target as Node)
            ) {
                setShowPlusMenu(false);
            }
        }
        if (showAgentList || showPromptList || showPlusMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAgentList, showPromptList, showPlusMenu]);


    const {
        customgptList,
        loading: customgptLoading,
        getTabAgentList,
        paginator: agentPaginator,
        setCustomGptList
    } = useCustomGpt();


    // Fetch custom prompts from prompt library on component mount
    useEffect(() => {
        const fetchCustomPrompts = async () => {
            setIsLoadingCustomPrompts(true);
            try {
                // Check cache first
                const cachedData = getCachedPrompts();
                
                if (cachedData && cachedData.length > 0) {
                    // Use cached data
                    const randomPrompts = getRandomCustomPrompts(cachedData, 4);
                    setCustomPrompts(randomPrompts);
                    setIsLoadingCustomPrompts(false);
                    return;
                }
                
                // Fetch from API if no valid cache
                const response = await CustomPromptAction('', '');
                if (response && response.length > 0) {
                    // Store in cache
                    
                    setCachedPrompts(response.slice(0, 6));
                    const randomPrompts = getRandomCustomPrompts(response, 4);
                    setCustomPrompts(randomPrompts);
                }
            } catch (error) {
                console.error('Error fetching custom prompts:', error);
            } finally {
                setIsLoadingCustomPrompts(false);
            }
        };
        
        fetchCustomPrompts();
    }, [getRandomCustomPrompts]);

    useEffect(() => {
        const fetchRandomAgents = async () => {
            setIsLoadingAgents(true);
            try {
                // Check cache first
                const cachedData = getCachedAgents();
                
                if (cachedData && cachedData.length > 0) {
                    // Use cached data
                    setRandomAgents(cachedData.slice(0, 5));
                    setIsLoadingAgents(false);
                    return;
                }
                
                // Fetch from API if no valid cache
                const response = await CustomBotAction('');
                if (response && response.length > 0) {
                    // Store in cache
                    setCachedAgents(response.slice(0, 5));
                    
                    setRandomAgents(response.slice(0, 5));
                }
            } catch (error) {
                console.error('Error fetching random agents:', error);
            } finally {
                setIsLoadingAgents(false);
            }
        };

        fetchRandomAgents();
    }, []);

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

    // Unified loading state - both skeletons show/hide together
    const isLoadingContent = isLoadingCustomPrompts || isLoadingAgents;

    // Don't render if AI models are not properly loaded
    // if (!aiModals || aiModals.length == 0) {
    //     return (
    //         <div className="w-full h-full overflow-y-auto flex justify-center">
    //             <div className="w-full flex flex-col max-lg:flex-col-reverse mx-auto px-5 md:max-w-[90%] lg:max-w-[980px] xl:max-w-[1100px]">
    //                 <div className="flex items-center justify-center h-32">
    //                     <div className="text-font-14 text-b6">Loading AI models...</div>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <div className="w-full h-full overflow-y-auto flex justify-center custom-scrollbar">
            <div className={`w-full flex flex-col max-lg:flex-col-reverse mx-auto px-5 md:max-w-[90%] lg:max-w-[980px] xl:max-w-[1100px] ${isNavigating ? 'opacity-50' : ''}`}>
                <div className='flex items-center justify-between mt-3 mb-3'>
                    <h2 className="hidden lg:block font-sans font-bold text-xl leading-[20px] tracking-normal align-middle">
                        Smart Prompt Ideas
                    </h2>
                    <p className="text-right hidden lg:block">
                        <button 
                            onClick={handleSeeMoreClick}
                            className='text-font-14 text-b4 underline hover:text-b2 transition-colors'
                        >
                            See More
                        </button>
                    </p>
                </div>
                <div className="hidden lg:grid md:grid-cols-4 gap-4 mb-10">
                    {isLoadingContent ? (
                        <PromptCardSkeleton count={4} />
                    ) : (
                        customPrompts.map((prompt, index) => (
                            <div
                                key={prompt._id || index}
                                className="border rounded-md p-5 bg-white hover:bg-b12 cursor-pointer transition-colors"
                                onClick={() => handleCustomPromptClick(prompt)}
                            >
                                <h3 className="text-font-16 font-medium mb-2">
                                    {truncateText(prompt.title, 60)}
                                </h3>
                                <p className="text-font-14 text-b6 font-normal">
                                    {truncateText(prompt.content, 160)}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                <div className="relative mt-8 md:mb-10 mb-2">
                {(showAgentList || showPromptList) && (
                    <div className='absolute bottom-full w-full z-10' ref={agentPromptDropdownRef}>
                        {showAgentList && (
                            <div className='w-full p-4 border rounded-lg mb-1 bg-white'>
                                <div className='normal-agent'>
                                    <div className='flex mb-1'>
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                className="text-font-14 pl-[36px] py-2 w-full focus:outline-none focus:border-none bg-transparent"
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
                                                                : ' border-b10'
                                                        } flex-wrap`}
                                                        onClick={() => handleAgentSelection(gpt)}
                                                        ref={gptArray.length - 1 === index ? gptListRef : null}
                                                    >
                                                        
                                                        <div className="flex items-center flex-wrap xl:flex-nowrap">
                                                            <Image
                                                                src={
                                                                    gpt?.coverImg?.uri
                                                                        ? `${LINK.AWS_S3_URL}${gpt.coverImg.uri}`
                                                                        : gpt?.charimg
                                                                        ? gpt.charimg
                                                                        : defaultCustomGptImage.src
                                                                }
                                                                height={60}
                                                                width={60}
                                                                className="w-6 h-6 object-contain rounded-custom inline-block"
                                                                alt={
                                                                    gpt?.coverImg
                                                                        ?.name ||
                                                                    gpt?.charimg
                                                                        ? 'Character Image'
                                                                        : 'Default Image'
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
                            <div className='w-full p-4 border rounded-lg mb-1 bg-white'>
                                <div className='prompt-list'>
                                    <div className='flex mb-1'>
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                className="text-font-14 pl-[36px] py-2 w-full focus:outline-none focus:border-none bg-transparent"
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
                                                            ? ' border-b10'
                                                            : ' border-b10'
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
                                                        <p className='text-font-12 font-normal text-b6 mt-1'>
                                                            {getTruncatedSystemPrompt(currPrompt.title, currPrompt.content, 100)}
                                                        </p>
                                                    </div>
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
                    {/* <div className='absolute top-0 left-0 right-0 mx-auto w-[95%] h-[40px]' style={{
                        background: 'linear-gradient(90deg, #9D80ED 0%, #CD8AE1 50%, #F74649 100%)',
                        filter: 'blur(99px)'
                    }}></div> */}
                        <div className="bg-white flex-none mt-auto flex flex-col text-font-14 sm:text-font-16 mx-auto group overflow-hidden rounded-[12px] sm:rounded-[18px] [&:has(textarea:focus)]:shadow-[0_2px_6px_rgba(0,0,0,.05)] w-full relative border border-b10">
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
                        <div className="flex items-center z-10 px-4 pb-[6px] mt-3">
                              {/* Plus Menu Button */}
                              <button
                                    ref={plusButtonRef}
                                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                                    className="p-2 hover:bg-gray-100 rounded-md transition-colors relative"
                                    type="button"
                                    disabled={isEnhanceLoading}
                                >
                                    {/* Show loading spinner when enhancing */}
                                    {isEnhanceLoading && (
                                        <div className="transition ease-in-out duration-200 w-auto h-8 flex items-center px-[5px] bg-b2 rounded-[15px] hover:bg-b2">
                                            <div className="animate-spin h-4 w-4 border-2 border-[rgba(255,255,255,0.35)] border-t-white rounded-full"></div>
                                            <span className="ml-1 text-font-14 font-medium text-white">Enhancing...</span>
                                        </div>
                                    )}
                                    {/* Animated Plus/Close icon - rotates 45deg to form X shape */}
                                    {!isWebSearchActive && !isEnhanceLoading && (
                                        <div className={`transform transition-all duration-300 ease-in-out ${showPlusMenu ? 'rotate-45 scale-110' : 'rotate-0 scale-100'}`}>
                                            <Plus width={16} height={16} className="fill-b7" />
                                        </div>
                                    )}
                                {isWebSearchActive && !isEnhanceLoading && (
                                    <WebSearchToolTip
                                            loading={false}
                                            isWebSearchActive={isWebSearchActive}
                                            handleWebSearchClick={handleWebSearchClick}
                                        />
                                )}
                                </button>

                            <ThunderBoltDialog
                                isWebSearchActive={isWebSearchActive}
                                dialogOpen={dialogOpen}
                                uploadedFile={uploadedFile}
                                setDialogOpen={setDialogOpen}
                                onSelect={onSelectMenu}
                                setText={setMessage}
                                selectedContext={selectedContext}
                                handlePrompts={handlePrompts}
                                setHandlePrompts={setHandlePrompts}
                                getList={getTabPromptList}
                                promptLoader={loading}
                                setPromptLoader={setLoading}
                                paginator={paginator}
                                setPromptList={setPromptList}
                                promptList={prompts}
                            />
                            {/* <AttachMentToolTip
                                fileLoader={fileLoader}
                                isWebSearchActive={isWebSearchActive}
                                handleAttachButtonClick={handleAttachButtonClick}
                            /> */}
                            <ToolsConnected 
                                isWebSearchActive={isWebSearchActive} 
                                toolStates={toolStates}
                                onToolStatesChange={handleToolStatesChange}
                            />
                            {/* <BookmarkDialog
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
                                apiKey={selectedAiModal?.config?.apikey}
                            />                        */}
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

                      {/* Plus Menu Dropdown - Positioned below textarea */}
                      {showPlusMenu && (
                            <div
                                className="absolute left-4 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-[100]"
                                ref={plusMenuRef}
                            >
                                <div className="px-2 space-y-1">
                                    {/* Attach Files */}
                                    <div 
                                        className="w-full flex items-center gap-2 px-2 hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                                        onClick={() => {
                                            handleAttachButtonClick();
                                            setShowPlusMenu(false);
                                        }}
                                    >
                                        <AttachMentToolTip
                                            fileLoader={fileLoader}
                                            isWebSearchActive={isWebSearchActive}
                                            handleAttachButtonClick={() => {}} // Empty handler, we handle click on parent
                                        />
                                    </div>
                                 
                                    {/* Bookmark Dialog Trigger */}
                                    <button 
                                        className="w-full flex items-center gap-2 px-2 hover:bg-gray-100 rounded-md transition-colors text-left"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowBookmarkDialog(true);
                                            setShowPlusMenu(false);
                                        }}
                                    >
                                        <div className={`chat-btn cursor-pointer transition ease-in-out duration-200 rounded-md w-auto h-8 flex items-center px-[5px] ${
                                            isWebSearchActive ? 'opacity-50 pointer-events-none' : ''
                                        }`}>
                                            <BookMarkIcon width={16} height={15} className='fill-b5 w-auto h-[15px]'/>
                                            <span className={`ml-4 ${isWebSearchActive ? 'opacity-50 pointer-events-none' : ''}`}>Favorite</span>
                                        </div>
                                    </button>
                                 
                                  {/* Web Search Tooltip */}
                                  <button
                                        onClick={() => {
                                            handleWebSearchClick();
                                            setShowPlusMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-2 hover:bg-gray-100 rounded-md transition-colors text-left"
                                        type="button"
                                    >
                                        <WebSearchToolTip
                                            loading={false}
                                            isWebSearchActive={isWebSearchActive}
                                            handleWebSearchClick={() => {}} // Empty handler, we handle click on button
                                            showHighlight={false}
                                        />
                                      
                                        <span>Web Search</span>
                                    </button>

                                    {/* Prompt Enhance */}
                                    <div 
                                        className="w-full flex items-center gap-2 px-2 hover:bg-gray-100 rounded-md transition-colors text-left"
                                        onClick={(e) => {e.stopPropagation(); setShowPlusMenu(false)}}
                                    >
                                        <PromptEnhance
                                            isWebSearchActive={isWebSearchActive}
                                            text={message}
                                            setText={setMessage}
                                            apiKey={selectedAiModal?.config?.apikey}
                                            onEnhanceClick={() => setShowPlusMenu(false)}
                                            onLoadingChange={setIsEnhanceLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                      )}

                        {/* Bookmark Dialog - Rendered outside plus menu to persist when menu closes */}
                        <BookmarkDialog
                            onSelect={onSelectMenu}
                            isWebSearchActive={isWebSearchActive}
                            selectedAttachment={uploadedFile}
                            open={showBookmarkDialog}
                            onOpenChange={setShowBookmarkDialog}
                        />

                        <p className='text-[10px] sm:text-font-12 md:text-font-13 mt-1 sm:mt-2 text-b7 text-center px-2 sm:px-4'>Weam can make mistakes. Consider checking the following information.</p>
                </div>

                {!isEmptyObject(selectedBrain) && (
                    <div className="left-0 right-0 py-3 sm:pt-10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-5">
                        <DefaultListOption brain={selectedBrain} />
                    </div>
                </div>
                )}
                
                {/* Agents Section */}
                <div className="hidden lg:block mt-8">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-sans font-bold text-xl leading-[20px] tracking-normal align-middle">
                                Agents
                            </h2>
                            <button
                                onClick={() => router.push('/custom-gpt')}
                                className="text-font-14 text-b4 underline hover:text-b2 transition-colors"
                            >
                                See More
                            </button>
                        </div>
                        <div className="grid grid-cols-5 gap-4">
                            {isLoadingContent ? (
                                <AgentCardSkeleton count={5} />
                            ) : (
                                randomAgents.map((agent) => (
                                    <button
                                        key={agent._id}
                                        className="btn btn-outline-gray py-2 flex items-center justify-center gap-x-2 group"
                                        onClick={() =>
                                            router.push(`/custom-templates`)
                                        }
                                    >
                                        <div className="flex items-center justify-center">
                                            <Image
                                                src={
                                                    agent?.coverImg?.uri
                                                        ? `${LINK.AWS_S3_URL}${agent.coverImg.uri}`
                                                        : agent?.charimg
                                                        ? agent.charimg
                                                        : "/cool-1.png"
                                                }
                                                height={20}
                                                width={20}
                                                className="w-6 h-auto"
                                                alt={agent?.title || 'Agent'}
                                            />
                                        </div>
                                        <span className="truncate">
                                            {agent.title}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

            </div>
        </div>
    );
};

export default ChatInput;