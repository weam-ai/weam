'use client';
import React, { useCallback, useEffect, useState, useRef, memo, useMemo } from 'react';
import ScrollToBottomButton from '@/components/ScrollToBottomButton';
import HoverActionIcon from '@/components/Chat/HoverActionIcon';
import useConversation from '@/hooks/conversation/useConversation';
import { useSelector } from 'react-redux';
import Toast from '@/utils/toast';
import useChat from '@/hooks/chat/useChat';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useMediaUpload from '@/hooks/common/useMediaUpload';
import UploadFileInput from '@/components/Chat/UploadFileInput';
import TabGptList from '@/components/Chat/TabGptList';
import Image from 'next/image';
import defaultCustomGptImage from '../../../public/defaultgpt.jpg';
import { BrainAgentType } from '@/types/brain';
import { BrainPromptType } from '@/types/brain';
import { GPTTypes } from '@/utils/constant';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTrigger,
} from '@/components/ui/dialog';

import { LINK } from '@/config/config';
import {
    API_KEY_MESSAGE,
    API_TYPE_OPTIONS,
    SOCKET_EVENTS,
    THREAD_MESSAGE_TYPE,
    COMPANY_ADMIN_SUBSCRIPTION_UPDATED,
    AI_MODAL_NAME,
    AI_MODEL_CODE,
    getModelImageByName,
    STREAMING_RESPONSE_STATUS,
} from '@/utils/constant';
import { useDispatch } from 'react-redux';
import { setChatMessageAction, setLastConversationDataAction, setUploadDataAction } from '@/lib/slices/aimodel/conversation';
import ChatThreadOffcanvas, { TypingTextSection } from '@/components/Chat/ChatThreadOffcanvas';
import ThreadItem from '@/components/Chat/threadItem';
import EditResponseModal from '@/components/Chat/EditResponseModal';
import {
    setAddThreadAction,
    setChatAccessAction,
    setCreditInfoAction,
    setInitialMessageAction,
    setIsOpenThreadModalAction,
    setThreadAction,
} from '@/lib/slices/chat/chatSlice';
import useSocket from '@/utils/socket';
import ChatUploadedFiles from '@/components/Chat/ChatUploadedFiles';
import ProfileImage from '@/components/Profile/ProfileImage';
import ChatResponse from '@/components/Chat/ChatResponse';
import ResponseTime from '@/components/Chat/ResponseTime';
import { getCompanyId, getCurrentUser } from '@/utils/handleAuth';
import { filterUniqueByNestedField, isEmptyObject, chatHasConversation } from '@/utils/common';
import { getModelCredit, formatMessageUser, generateObjectId, formatBrain, decodedObjectId, formatDateToISO, isUserNameComplete, getDisplayModelName, hasImageFile } from '@/utils/helper';
import ThunderIcon from '@/icons/ThunderIcon';
import usePrompt from '@/hooks/prompt/usePrompt';
import store, { RootState } from '@/lib/store';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { setIsWebSearchActive, setSelectedAIModal } from '@/lib/slices/aimodel/assignmodelslice';
import { UploadedFileType, GPTTypesOptions, SelectedContextType } from '@/types/chat';
import { AiModalType } from '@/types/aimodels';
import { BrainListType } from '@/types/brain';
import BookmarkDialog from './BookMark';
import PromptEnhance from './PromptEnhance';
import VoiceChat from './VoiceChat';
import useConversationHelper from '@/hooks/conversation/useConversationHelper';
import useCustomGpt from '@/hooks/customgpt/useCustomGpt';
import useDebounce from '@/hooks/common/useDebounce';
import RenderAIModalImage from './RenderAIModalImage';
import AttachMentToolTip from './AttachMentToolTip';
import WebSearchToolTip from './WebSearchToolTip';
import { TextAreaFileInput, TextAreaSubmitButton, StopStreamSubmitButton } from './ChatInput';
import TextAreaBox from '@/widgets/TextAreaBox';
import DrapDropUploader from '../Shared/DrapDropUploader';
import ProAgentQuestion from './ProAgentQuestion';
import { ProAgentCode } from '@/types/common';
import useProAgent from '@/hooks/conversation/useProAgent';
import SeoProAgentResponse from '@/components/ProAgentAnswer/SeoProAgentResponse';
import routes from '@/utils/routes';
import useChatMember from '@/hooks/chat/useChatMember';
import { useThunderBoltPopup } from '@/hooks/conversation/useThunderBoltPopup';
import ChatInputFileLoader, { ChatWebSearchLoader } from '@/components/Loader/ChatInputFileLoader';
import useMCP from '@/hooks/mcp/useMCP';
import ToolsConnected from './ToolsConnected';
import SearchIcon from '@/icons/Search';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import { useResponseUpdate } from '@/hooks/chat/useResponseUpdate';
import { usePageOperations } from '@/hooks/chat/usePageOperations';
const defaultContext: SelectedContextType = {
    type: null,
    prompt_id: undefined,
    custom_gpt_id: undefined,
    doc_id: undefined,
    textDisable: false,
    attachDisable: false,
    title: undefined,
    isRemove: false,
};
let API_TYPE = API_TYPE_OPTIONS.OPEN_AI;

const ChatPage = memo(() => {
    const dispatch = useDispatch();
    const router = useRouter();
    const [message, setMessage] = useState('');
    // Textarea expand on typing
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
    const [selectedContext, setSelectedContext] = useState(defaultContext);
    const [typingUsers, setTypingUsers] = useState([]);
    const [handlePrompts, setHandlePrompts] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [queryId, setQueryId] = useState<string>(''); //enhance prompt id
    
    // Use MCP hook to get toolStates from Redux
    const { toolStates, setToolStates } = useMCP();
    const [showAgentList, setShowAgentList] = useState(false);
    const [showPromptList, setShowPromptList] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    // EditResponseModal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingMessageContent, setEditingMessageContent] = useState<string>('');
    const [toolCallLoading, setToolCallLoading] = useState({
        webSearch: false,
        imageGeneration: false,
    })

    // For the tab GPT prompts
    const { getTabPromptList, promptList: prompts, loading: promptLoader, setLoading: setPromptLoader, paginator: promptPaginator, setPromptList } = usePrompt();
    
    const userModal = useSelector((store:RootState) => store.assignmodel.list);
    const selectedAIModal = useSelector(
        (store: RootState) => store.assignmodel.selectedModal
    );
    const chatTitle = useSelector((store: RootState) => store.conversation.chatTitle);
    const persistFileData = useSelector(
        (store: RootState) => store.conversation.uploadData
    );
    const canvasOptions = useSelector((store: RootState) => store.chat.canvasOptions);
     const isWebSearchActive = useSelector((store: RootState) => store.assignmodel.isWebSearchActive);
    const params = useParams();
    const queryParams = useSearchParams();

    const currentUser = useMemo(() => getCurrentUser(), []);
    const companyId = useMemo(() => getCompanyId(currentUser), [currentUser]);

    const creditInfoSelector = useSelector((store: RootState) => store.chat.creditInfo);
    const brainData = useSelector((store: RootState) => store.brain.combined);
    const globalUploadedFile = useSelector((store: RootState) => store.conversation.uploadData);
    const initialMessage = useSelector((store:RootState) => store.chat.initialMessage);
    const agentPromptDropdownRef = useRef<HTMLDivElement>(null);

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
   
    const agentRecord = useMemo(() => {
        return globalUploadedFile.find((file) => file.isCustomGpt);
    }, [globalUploadedFile]);
    const persistTagData = useMemo(() => {
        return agentRecord?.persistTag;
    }, [agentRecord]);
    const proAgentData = useMemo(() => {
        return initialMessage?.proAgentData || {};
    }, [initialMessage]);
    const serializableProAgentData = useMemo(() => {
        return proAgentData?.code ? { ...proAgentData } : {};
    }, [proAgentData]);
    const defaultToolCallLoading = useMemo(() => {
        return {
            webSearch: false,
            imageGeneration: false,
        }
    }, []);

    const handleApiKeyRequired = useCallback((data) => {
        if (data.message) {
            Toast(data.message, 'error');
            setText('');
        }
    }, []);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = event.target;
        setText(value);
        onQueryTyping();
        setShowAgentList(value.startsWith('@'));
        setShowPromptList(value.startsWith('/'));
    };

    const handleInputChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };

    const handleAgentSelection = (gpt: BrainAgentType) => {
        onSelectMenu(GPTTypes.CustomGPT as GPTTypesOptions, gpt);
        setShowAgentList(false);
        setText('');
    };



    const {
        enterNewPrompt,
        conversations,
        answerMessage,
        setConversations,
        getAINormatChatResponse,
        setChatTitleByAI,
        loading,
        getAIDocResponse,
        getAICustomGPTResponse,
        responseLoading,
        conversationPagination,
        showTimer,
        setShowTimer,
        setAnswerMessage,
        disabledInput,
        setLoading,
        chatCanvasAiResponse,
        listLoader,
        socketAllConversation,
        getPerplexityResponse,
        showHoverIcon,
        getAIProAgentChatResponse,
        isStreamingLoading,
        isActivelyStreaming,
        generateSeoArticle,
        getSalesCallResponse,
        stopStreaming
    } = useConversation();
    const { chatInfo, socketChatById, handleAIApiType } = useChat();
    const {
        fileLoader,
        handleFileChange,
        fileInputRef,
        // setUploadedFile,
        isFileUpload,
        handlePasteFiles,
        isFileDragging
    } = useMediaUpload({ selectedAIModal: selectedAIModal });
    const { getSeoKeyWords, isLoading, leftList, rightList, setLeftList, setRightList } = useProAgent();

    const socket = useSocket(); // Hook for socket connection
    
    // Track which responses have been edited
    const [editedResponses, setEditedResponses] = useState<Set<string>>(new Set());
    
    // Response update functionality
    const { handleResponseUpdate, updateConversationResponse } = useResponseUpdate({
        onUpdateResponse: async (messageId: string, updatedResponse: string) => {
            // Update the conversation in the state
            setConversations(prevConversations => 
                prevConversations.map(conv => 
                    conv.id === messageId 
                        ? { ...conv, response: updatedResponse }
                        : conv
                )
            );
            
            // Here you can make an API call to persist the changes
            // await updateResponseInDatabase(messageId, updatedResponse);
        }
    });

    // Page operations
    const { createPageFromResponse, isCreatingPage } = usePageOperations({
        onPageCreated: (pageData, isUpdate) => {
        },
        onError: (error) => {
            console.error('Error with page operation:', error);
            Toast('Failed to process page. Please try again.', 'error');
        }
    });


    const { copyToClipboard, handleModelSelectionUrl, getDecodedObjectId, blockProAgentAction, handleProAgentUrlState, getAgentContent } = useConversationHelper();
    const { getChatMembers } = useChatMember();
    const { onSelectMenu } = useThunderBoltPopup({
        selectedContext,
        setSelectedContext,
        selectedAIModal,
        uploadedFile: globalUploadedFile,
        removeSelectedContext,
        setText,
    });
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

    const handleWebSearchClick = useCallback(() => {
        dispatch(setIsWebSearchActive(!isWebSearchActive));
    }, [isWebSearchActive]);

    // EditResponseModal handlers
    const handleOpenEditModal = useCallback((messageId: string, content: string) => {
        setEditingMessageId(messageId);
        setEditingMessageContent(content);
        setIsEditModalOpen(true);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setEditingMessageId(null);
        setEditingMessageContent('');
    }, []);

    const handleSaveEditModal = useCallback(async (messageId: string, updatedContent: string) => {
        try {
            await handleResponseUpdate(messageId, updatedContent);
            handleCloseEditModal();
        } catch (error) {
            console.error('Error saving response:', error);
        }
    }, [handleResponseUpdate, handleCloseEditModal]);

    const handleAddToPages = useCallback(async (title: string, message: any) => {
        try {
            // Get the current brain data
            const currentBrainId = getDecodedObjectId();
            
            let brain :any = brainData.find((brain: BrainListType) => {
                return brain._id === currentBrainId
            });
            
            // If no brain found, create a default brain object
            if (!brain) {
                brain = {
                    _id: currentBrainId,
                    title: 'General Brain',
                    slug: 'general-brain'
                };
            }
            
            // Format the brain data properly using formatBrain function
            const formattedBrain = formatBrain(brain);
            
            const pageData :any = {
                originalMessageId: message.id,
                title: title,
                content: message.response,
                chatId: params.id,
                user: message.user,
                brain: formattedBrain,
                model: message.model,
                tokens: message.tokens,
                responseModel: message.responseModel,
                responseAPI: message.responseAPI,
                companyId: companyId
            };

            const result :any = await createPageFromResponse(pageData);
            
            // Show appropriate message based on whether it's an update or create
            if (result.isUpdate) {
                Toast('Page updated successfully!', 'success');
            } else {
                Toast('Page added successfully!', 'success');
            }
        } catch (error) {
            console.error('Error creating page:', error);
            Toast('Failed to add page. Please try again.', 'error');
        }
    }, [createPageFromResponse, brainData, params.id, companyId]);



    const handleImageConversation = useCallback((files: UploadedFileType[]) => {
        const hasImage = files.some((file) => file?.mime_type?.startsWith('image/'));
        const images = [];
        if (hasImage) {
            files.forEach((file) => {
                images.push(`${LINK.AWS_S3_URL}${file.uri}`)
            })
            removeUploadedFile();
        }
        return images;
    }, []);


    const handleSubmitPrompt = async (chatCanvas: boolean = false) => {
        setShouldScrollToBottom(true); // Enable auto-scroll for new messages

        if (!userModal.length) {
            Toast(API_KEY_MESSAGE, 'error');
            setText('');
            return;
        }

        const modalCode = selectedAIModal.bot.code;

            const modelCredit = (isEmptyObject(serializableProAgentData)) ? getModelCredit(persistTagData?.responseModel || selectedAIModal?.name) : getModelCredit(proAgentData?.code);
            // if((creditInfoSelector?.msgCreditLimit >= creditInfoSelector?.msgCreditUsed + modelCredit))
            // {
                const updatedCreditInfo = {
                    ...creditInfoSelector,
                    msgCreditUsed: creditInfoSelector.msgCreditUsed + modelCredit
                };
                dispatch(setCreditInfoAction(updatedCreditInfo));

        // } else if((creditInfoSelector?.msgCreditLimit <= creditInfoSelector?.msgCreditUsed + modelCredit)) {
        //         Toast(MESSAGE_CREDIT_LIMIT_REACHED, 'error');
        //         setText('');
        //         return;
        //     } else {
        //         setText('');
        //         return;
        // }

        //Chat Member Create and reset URL to remove isNew
        if (!chatHasConversation(conversations)) {
            const brain = brainData.find((brain: BrainListType) => {
                return brain._id === getDecodedObjectId()
            })
            if (!brain) return;
            socket.emit(SOCKET_EVENTS.INITIALIZE_CHAT, { chatId: params.id, user: formatMessageUser(currentUser), brain: formatBrain(brain) });
            // manage proagent state to block chat message
            if (blockProAgentAction())
                handleProAgentUrlState(selectedAIModal.name, proAgentData?.code);
            else
                handleModelSelectionUrl(selectedAIModal.name);
        }
        socket.emit(SOCKET_EVENTS.DISABLE_QUERY_INPUT, { chatId: params.id });
        let query = chatCanvas ? store.getState().chat.canvasOptions?.question : (!isEmptyObject(serializableProAgentData)) ? proAgentData?.url : text || initialMessage.message;
        let img_url;

        let cloneContext = selectedContext; // selected content by typing @
        const modalName = chatCanvas ? selectedAIModal?.name : persistTagData?.responseModel || selectedAIModal?.name;
        const messageId = generateObjectId();
        setText('');
        dispatch(setChatAccessAction(true));
         // Calculate model credit before sending request
        //  const modelCredit = getModelCredit(modalName);
        if (!chatHasConversation(conversations) && Object.keys(initialMessage).length > 0) {
            const newMessage = {
                ...initialMessage,
                id: messageId,
                media: globalUploadedFile || [], // due to async state update due to that files are not show proper in ui
                cloneMedia: globalUploadedFile || [],
                proAgentData: JSON.parse(JSON.stringify(serializableProAgentData)), // Deep clone to break circular references
                isPaid: true,
                usedCredit: modelCredit,
            };
            setConversations([newMessage]);
            dispatch(setInitialMessageAction({}));
            setTimeout(() => {
                getChatMembers(params.id);
            }, 3000);
        } else if (chatHasConversation(conversations)) {
            setConversations([
                ...conversations,
                {
                    message: query.trim(),
                    response: '',
                    responseModel: modalName,
                    media: globalUploadedFile || [],
                    seq: Date.now(),
                    promptId: cloneContext?.prompt_id,
                    customGptId: cloneContext?.custom_gpt_id,
                    answer_thread: {
                        count: 0,
                        users: [],
                    },
                    question_thread: {
                        count: 0,
                        users: [],
                    },
                    threads: [],
                    customGptTitle: cloneContext.title, // custom gpt title show
                    coverImage: cloneContext.gptCoverImage,
                    user: currentUser,
                    model: selectedAIModal?.bot,
                    id: messageId,
                    cloneMedia: globalUploadedFile || [],
                    proAgentData: serializableProAgentData,
                    citations: [],
                    isPaid: true,
                    usedCredit: modelCredit,
                },
            ]);
        }

        const newPromptReqBody = {
            text: query,
            chatId: params.id,
            model: selectedAIModal,
            promptId: cloneContext?.prompt_id,
            customGptId: cloneContext?.custom_gpt_id || persistTagData?.custom_gpt_id,
            media: (globalUploadedFile?.length === 1 && globalUploadedFile[0]?._id === undefined) ? [] : globalUploadedFile || [],
            cloneMedia: (persistFileData?.length === 1 && persistFileData[0]?._id === undefined) ? [] : globalUploadedFile || [],
            responseModel: modalName,
            messageId: messageId,
            companyId: companyId,
            user: formatMessageUser(currentUser),
            isPaid: true,
            apiKey: selectedAIModal.config.apikey,
            usedCredit: modelCredit
        };
        img_url = handleImageConversation(globalUploadedFile);
        removeSelectedContext();

        // Handle AI API Type
        if (isWebSearchActive) API_TYPE = API_TYPE_OPTIONS.PERPLEXITY;
        else API_TYPE = handleAIApiType(globalUploadedFile);

        if (!isEmptyObject(proAgentData)) API_TYPE = API_TYPE_OPTIONS.PRO_AGENT;

        // if chat canvas then set api type open ai chat canvas
        if (chatCanvas) API_TYPE = API_TYPE_OPTIONS.OPEN_AI_CHAT_CANVAS;
        if (!isEmptyObject(proAgentData) && proAgentData?.code) API_TYPE = API_TYPE_OPTIONS.PRO_AGENT;

        newPromptReqBody['responseAPI'] = API_TYPE;
        newPromptReqBody['proAgentData'] = serializableProAgentData;
        setConversations((prevConversations) => {
            const updatedConversations = [...prevConversations];
            const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
            lastConversation.responseAPI = API_TYPE;
            updatedConversations[updatedConversations.length - 1] = lastConversation;
            return updatedConversations;
        });
        //Insert in message table
        // enterNewPrompt(newPromptReqBody, socket);
        setLoading(true);
        
        // Calculate model credit before sending request
        //const modelCredit = getModelCredit(modalName);
        const matchedModel = userModal.find((el) => el.name === modalName);
        socket.emit(SOCKET_EVENTS.LLM_RESPONSE_SEND, {
            query: query,
            chatId: params.id,
            model: matchedModel.name,
            code: matchedModel.bot.code,
            promptId: cloneContext?.prompt_id,
            customGptId: cloneContext?.custom_gpt_id || persistTagData?.custom_gpt_id,
            threadId: messageId,
            media: Array.isArray(globalUploadedFile) ? globalUploadedFile : [],
            cloneMedia: hasImageFile(globalUploadedFile) ? [] : globalUploadedFile, // Don't send cloneMedia when images are present
            imageUrls: img_url || [], // Add image URLs for vision support
            responseModel: matchedModel.name,
            messageId: messageId,
            companyId: companyId,
            user: formatMessageUser(currentUser),
            isPaid: true,
            responseAPI: API_TYPE,
            proAgentData: serializableProAgentData,
            apiKey: matchedModel.config.apikey,
            brainId: getDecodedObjectId(),
            usedCredit: modelCredit
        })
        if (chatTitle == '' || chatTitle === undefined) {
            socket.emit(SOCKET_EVENTS.GENERATE_TITLE_BY_LLM, {
                query: query,
                chatId: params.id,
                code: selectedAIModal.bot.code,
                apiKey: selectedAIModal.config.apikey
            })
        }
    };
    
    const handleKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (dialogOpen) {
                // Prevent default behavior if the dialog is open
                e.preventDefault();
                return;
            }

            if (
                text?.trim() !== '' &&
                e.key === 'Enter' &&
                !e.shiftKey &&
                !disabledInput.current &&
                !fileLoader &&
                !blockProAgentAction()
            ) {
                e.preventDefault();
                e.stopPropagation();
                setQueryId(generateObjectId());
                handleSubmitPrompt();
            }
        },
        [text, handleSubmitPrompt]
    );

    // Initialize queryId when text changes from empty to non-empty
    useEffect(() => {
        if (text && !queryId) {
            setQueryId(generateObjectId());
        } else if (!text) {
            setQueryId(''); // Reset queryId when text is cleared
        }
    }, [text]);

    // Streaming data filled and conversation list state update then reset answermessage field
    useEffect(() => {
        if (contentRef.current && shouldScrollToBottom) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [conversations]);

    useEffect(() => {
        API_TYPE = API_TYPE_OPTIONS.OPEN_AI;

        const handleCopy = (event: ClipboardEvent) => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const documentFragment = range.cloneContents();
            const div = document.createElement('div');
            div.appendChild(documentFragment);

            // Remove only background color styles from each element
            div.querySelectorAll('*').forEach((element: HTMLElement) => {
                element.style.backgroundColor = 'transparent'; // Remove background color only
            });

            // Copy content in both plain text and HTML formats for compatibility
            const plainText = selection.toString(); // Fallback for plain text
            event.clipboardData.setData('text/plain', plainText);
            event.clipboardData.setData('text/html', div.innerHTML);
            event.preventDefault(); // Prevent default copy behavior
        };

        document.addEventListener('copy', handleCopy);
        return () => {
            document.removeEventListener('copy', handleCopy);
            removeUploadedFile();
        };
    }, []);

    const removeUploadedFile = () => {
        // setUploadedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = null; // Reset the file input value
        }
        removeSelectedContext();
        dispatch(setUploadDataAction([]));
    };

    const removeSelectedFile = (index: number) => {
        const updatedFiles = globalUploadedFile.filter((_, i) => i !== index);
        const isClearAll = updatedFiles.length === 0;

        if (isClearAll) {
            // setUploadedFile([]);
            dispatch(setUploadDataAction([]));
        } else {
            // setUploadedFile(updatedFiles);
            dispatch(setUploadDataAction(updatedFiles));
        }

        if (fileInputRef.current && isClearAll) {
            fileInputRef.current.value = null; // Reset the file input value
        }
        if (selectedContext.type && isClearAll) {
            removeSelectedContext();
        }
    }

    const isSubmitDisabled = text.trim() === '' || fileLoader || disabledInput.current || blockProAgentAction();

    // Textarea expand on typing End

    const contentRef = useRef(null);

    // Start On Scroll and Pagination API functionality

    const handleContentScroll = useCallback(() => {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;

        const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10; // bottom of the page

        // Update shouldScrollToBottom based on scroll position
        setShouldScrollToBottom(isAtBottom);

        // Handle pagination when scrolling to top
        if (scrollTop === 0 && !listLoader && conversationPagination?.hasNextPage) {
            const previousScrollHeight = scrollHeight;

            const nextOffset = ((conversationPagination.next || 1) - 1) * (conversationPagination.perPage || 10);

            // Emit socket event to load more messages
            socket.emit(SOCKET_EVENTS.MESSAGE_LIST, {
                chatId: params.id,
                companyId,
                userId: currentUser._id,
                offset: nextOffset,
                limit: conversationPagination.perPage
            });

            // Adjust scroll position after new content loads
            requestAnimationFrame(() => {
                if (contentRef.current) {
                    const newScrollHeight = contentRef.current.scrollHeight;
                    const scrollOffset = newScrollHeight - previousScrollHeight;
                    contentRef.current.scrollTop = scrollOffset;
                }
            });
        }
    }, [conversationPagination.next]);

    // Function to scroll to the bottom of the messages container
    const scrollToBottom = () => {
        if (contentRef.current && shouldScrollToBottom) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    };

    // On messages update, scroll to the bottom
    useEffect(() => {
        scrollToBottom();
    }, [answerMessage]);

    function removeSelectedContext() {
        setSelectedContext(defaultContext);
    };

    const handleOpenThreadModal = (message, type) => {
        let selectedContent = {};
        if (type == THREAD_MESSAGE_TYPE.QUESTION) {
            selectedContent = {
                user: message?.user,
                message: message?.message,
                media: message?.media,
                customGptId: message?.customGptId,
                customGptTitle: message?.customGptTitle
            }
        } else {
            selectedContent = {
                user: message?.user,
                response: message?.response
            }
        }

        dispatch(
            setThreadAction({
                selectedContent,
                messageId: message?.id,
                type,
                data: [],
            })
        );
        dispatch(setIsOpenThreadModalAction(true));
    };

    const mid = queryParams.get('mid');
    const editMode = queryParams.get('edit') === 'true';

    // Auto-open EditResponseModal when editMode is true and we have the target message
    useEffect(() => {
        if (editMode && mid && conversations.length > 0) {
            const targetMessage = conversations.find(m => m.id === mid);
            if (targetMessage && targetMessage.response) {
                handleOpenEditModal(mid, targetMessage.response);
            }
        }
    }, [editMode, mid, conversations, handleOpenEditModal]);

    // Function to scroll to a specific message and optionally open edit mode
    const scrollToMessage = useCallback((messageId: string, openEditMode: boolean = false) => {
        if (!messageId || !contentRef.current) {
            console.warn('Cannot scroll to message: missing messageId or contentRef');
            return;
        }

        // Wait for the next render cycle to ensure DOM is updated
        setTimeout(() => {
            try {
                // Try to find the user message first
                let messageElement = contentRef.current?.querySelector(`[data-message-id="${messageId}"]`);
                let isUserMessage = true;

                // If not found, try to find the AI response
                if (!messageElement) {
                    messageElement = contentRef.current?.querySelector(`[data-message-id="${messageId}-response"]`);
                    isUserMessage = false;
                }

                if (messageElement) {
                    messageElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });


                    // If we want to open edit mode and this is an AI response, trigger the edit
                    if (openEditMode && !isUserMessage) {
                        // Find the edit button or trigger edit mode
                        const editButton = messageElement.querySelector('[data-edit-trigger]');
                        if (editButton) {
                            setTimeout(() => {
                                editButton.click();
                            }, 500); // Small delay to ensure the element is fully rendered
                        } else {
                            // Try to find the clickable area for editing
                            const clickableArea = messageElement.querySelector('.cursor-pointer');
                            if (clickableArea) {
                                setTimeout(() => {
                                    clickableArea.click();
                                }, 500);
                            }
                        }
                    }
                } else {
                    console.warn(`Message element not found for ID: ${messageId}`);
                }
            } catch (error) {
                console.error('Error scrolling to message:', error);
            }
        }, 100);
    }, []);
 
    useEffect(() => {
        if (mid && conversations.length > 0) {
            const message = conversations.find(conversion => conversion.id === mid);
            if (message) {
                // If there's a type parameter, open thread modal
                if (queryParams.get('type')) {
                            handleOpenThreadModal(message, queryParams.get('type'));
                } else {
                    // Otherwise, scroll to the message and optionally open edit mode
                    scrollToMessage(mid, editMode);
                }
            } else {
                console.warn(`Message with ID ${mid} not found in conversations`);
            }
        }
    }, [queryParams, conversationPagination, mid, editMode, scrollToMessage, conversations]);

    // Receive Thread socket event and manage with exisiting conversation and open threads

    const threadReceiveFromSocket = useCallback(async () => {
        if (socket) {
            socket.on(SOCKET_EVENTS.THREAD, (payload) => {
                if (payload.chatId == params.id) {
                    setConversations((prevConversations) => {
                        const findIndex = prevConversations.findIndex(
                            (item) => item.id === payload.messageId
                        );
                        if (findIndex !== -1) {
                            const updatedItems = [...prevConversations];
                            if (payload.type == THREAD_MESSAGE_TYPE.QUESTION) {
                                updatedItems[findIndex] = {
                                    ...updatedItems[findIndex],
                                    question_thread: {
                                        count: updatedItems[findIndex]
                                            ?.question_thread
                                            ? updatedItems[findIndex]
                                                .question_thread.count + 1
                                            : 0,
                                        users: updatedItems[findIndex]
                                            ?.question_thread
                                            ? [
                                                ...updatedItems[findIndex]
                                                    .question_thread.users,
                                                payload.sender,
                                            ]
                                            : [payload.sender],
                                        last_time: payload.createdAt,
                                    },
                                };
                            } else {
                                updatedItems[findIndex] = {
                                    ...updatedItems[findIndex],
                                    answer_thread: {
                                        count: updatedItems[findIndex]
                                            ?.answer_thread
                                            ? updatedItems[findIndex]
                                                .answer_thread.count + 1
                                            : 0,
                                        users: updatedItems[findIndex]
                                            ?.answer_thread
                                            ? [
                                                ...updatedItems[findIndex]
                                                    .answer_thread.users,
                                                payload.sender,
                                            ]
                                            : [payload.sender],
                                        last_time: payload.createdAt,
                                    },
                                };
                            }
                            return updatedItems;
                        } else {
                            return prevConversations;
                        }
                    });
                    dispatch(setAddThreadAction(payload));
                }
            });
        }
    }, [conversations, socket]);

    const handleUserQuery = useCallback((payload) => {
        if (currentUser._id !== payload.user.id) {
            setConversations(prev => [
                ...prev,
                {
                    id: payload.id,
                    message: payload.message.data.content,
                    response: '',
                    responseModel: payload.responseModel,
                    media: payload.media,
                    seq: Date.now(),
                    promptId: payload?.promptId,
                    customGptId: payload?.customGptId,
                    answer_thread: {
                        count: 0,
                        users: [],
                    },
                    question_thread: {
                        count: 0,
                        users: [],
                    },
                    threads: [],
                    // customGptTitle: cloneContext?.title, // custom gpt title show
                    responseAPI: payload.responseAPI,
                    user: payload.user,
                    model: payload.model
                },
            ])
            dispatch(setLastConversationDataAction({
                responseAPI: payload.responseAPI,
                customGptId: {
                    _id: payload?.customGptId,
                },
                responseModel: payload.responseModel
            }));
            setLoading(true);
        }
    }, [socket]);

    const handleSocketStreaming = useCallback((payload) => {
        if (payload?.event === STREAMING_RESPONSE_STATUS.WEB_SEARCH) {
            setToolCallLoading({ ...defaultToolCallLoading, webSearch: true });
            return;
        }
        if (payload?.event === STREAMING_RESPONSE_STATUS.IMAGE_GENERATION_START) {
            setToolCallLoading({ ...defaultToolCallLoading, imageGeneration: true });
            return;
        }
        if (payload?.event === STREAMING_RESPONSE_STATUS.CITATION) {
            setConversations(prev => {
                const updatedConversations = [...prev];
                updatedConversations[updatedConversations.length - 1].citations = payload.chunk;
                return updatedConversations;
            });
            return;
        }
        if (payload.chunk === STREAMING_RESPONSE_STATUS.DONE) {
            handleSocketStreamingStop({ proccedMsg: payload.proccedMsg });
            return;
        }
        setLoading(false);
        setToolCallLoading(defaultToolCallLoading);
        setAnswerMessage(prev => {
            const newMessage = prev + payload.chunk;
            return newMessage;
        });
    }, [shouldScrollToBottom, socket]);

    const handleSocketStreamingStop = useCallback((chunk) => {
        setConversations(prevConversations => {
            const updatedConversations = [...prevConversations];
            const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
            lastConversation.response = chunk.proccedMsg;
            updatedConversations[updatedConversations.length - 1] = lastConversation;

            // Auto-scroll to bottom when streaming stops if shouldScrollToBottom is true
            if (shouldScrollToBottom && contentRef.current) {
                requestAnimationFrame(() => {
                    contentRef.current.scrollTop = contentRef.current.scrollHeight;
                });
            }

            return updatedConversations;
        });
        setAnswerMessage('');
        // if error throw then need to loading false to show error response
        setLoading(false)
        disabledInput.current = null
    }, [socket]);

    const emitQueryTyping = useCallback((user, typing) => {
        socket.emit(SOCKET_EVENTS.ON_QUERY_TYPING, {
            user,
            chatId: params.id,
            typing
        })
    }, [socket]);

    const onQueryTyping = () => {
        if (socket) {
            emitQueryTyping(currentUser, true);
            clearTimeout(typingTimeout);
            var typingTimeout = setTimeout(() => {
                emitQueryTyping(currentUser, false);
            }, 1000);
        }
    };
    const handleAttachButtonClick = () => {
        if (isWebSearchActive) {
            Toast('This feature is unavailable in web search', 'error');
            return false;
        }
        if (!userModal.length) {
            Toast(API_KEY_MESSAGE, 'error');
            return false;
        }
        fileInputRef.current.click();
    };

    const handleOnQueryTyping = useCallback(({ typing, user }) => {
        if (typing && currentUser._id != user._id) {
            setTypingUsers((prevUsers) => filterUniqueByNestedField([...prevUsers, user], 'id'));
        } else {
            setTypingUsers((prevUsers) =>
                prevUsers.filter(
                    (preUser) => preUser._id !== user._id
                )
            );
        }
    }, [socket]);

    const handleStopStreaming = useCallback(() => {
        if (!socket) return;
        try {
            socket.emit(SOCKET_EVENTS.FORCE_STOP, {
                chatId: params.id,
                proccedMsg: answerMessage || '',
                userId: currentUser._id,
            });
        } catch (error) {
            console.error('Failed to emit FORCE_STOP:', error);
        }
    }, [socket, params.id, answerMessage, currentUser]);


    const handleDisableInput = useCallback(() => {
        disabledInput.current = true;
    }, [socket]);


    // const userModal2 = useSelector((store:any) => store.assignmodel.list);
    // const handleAIModelKeyRemove = useCallback((data) => { 
    //     const updatedUserModal = userModal2.filter(record => record.bot.code !== data.botCode);
    //     dispatch(assignModelListAction(updatedUserModal));
    //     if (updatedUserModal.length > 0){
    //         const payload = {
    //             _id: updatedUserModal[0]._id,
    //             bot: updatedUserModal[0].bot,
    //             company: updatedUserModal[0].company,
    //             modelType: updatedUserModal[0].modelType,
    //             name: updatedUserModal[0].name,
    //             provider: updatedUserModal[0]?.provider
    //         }
    //         dispatch(setSelectedAIModal(payload)); 
    //     }        
    // }, [socket]);

    const handleUserSubscriptionUpdate = useCallback((data) => {
        // Only reload page for major subscription changes, not for regular credit updates
        if (data.forceReload || data.subscriptionChanged) {
            Toast(COMPANY_ADMIN_SUBSCRIPTION_UPDATED, 'success');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
        // For regular credit updates, just update the Redux state without reloading
        // The credit info will be updated naturally through other means
    }, [socket]);

    const handleToolStatesChange = (newToolStates: Record<string, string[]>) => {
        setToolStates(newToolStates); // Now using Redux action
    };

    const handleGenerateTitleByLLM = useCallback((payload: { title: string }) => {
        dispatch(setChatMessageAction(payload.title));
    }, [socket]);

    // Start Socket Connection and disconnection configuration
    useEffect(() => {
        if (socket) {
            socket.emit(SOCKET_EVENTS.JOIN_CHAT_ROOM, {
                chatId: params.id,
                companyId: companyId
            });
            socket.emit(SOCKET_EVENTS.JOIN_COMPANY_ROOM, { companyId });
            threadReceiveFromSocket();
            socket.on(SOCKET_EVENTS.USER_QUERY, handleUserQuery);

            socket.on(SOCKET_EVENTS.START_STREAMING, handleSocketStreaming);

            socket.on(SOCKET_EVENTS.STOP_STREAMING, handleSocketStreamingStop);

            socket.on(SOCKET_EVENTS.FORCE_STOP, handleSocketStreamingStop);

            socket.on(SOCKET_EVENTS.ON_QUERY_TYPING, handleOnQueryTyping);

            socket.on(SOCKET_EVENTS.DISABLE_QUERY_INPUT, handleDisableInput);

            socket.on(SOCKET_EVENTS.USER_SUBSCRIPTION_UPDATE, handleUserSubscriptionUpdate);
            socket.on(SOCKET_EVENTS.LLM_RESPONSE_SEND, (data) => {
                if (data.chunk) {
                    handleSocketStreaming(data);
                }
            });
            
            socket.emit(SOCKET_EVENTS.MESSAGE_LIST, { chatId: params.id, companyId, userId: currentUser._id, offset: conversationPagination?.offset || 0, limit: conversationPagination?.perPage || 10 });

            socket.on(SOCKET_EVENTS.MESSAGE_LIST, ({ messageList }) => {
                // Store current scroll height before updating
                const previousScrollHeight = contentRef.current?.scrollHeight || 0;


                if (isEmptyObject(initialMessage)) {
                    socketAllConversation(messageList);
                }


                // After state update, adjust scroll position
                requestAnimationFrame(() => {
                    if (contentRef.current) {
                        const newScrollHeight = contentRef.current.scrollHeight;
                        const scrollOffset = newScrollHeight - previousScrollHeight;
                        contentRef.current.scrollTop = scrollOffset;
                    }
                });
            });

            socket.emit(SOCKET_EVENTS.FETCH_CHAT_BY_ID, { chatId: params.id });

            socket.on(SOCKET_EVENTS.FETCH_CHAT_BY_ID, ({ chat }) => {
                socketChatById(chat);
            });

            socket.on(SOCKET_EVENTS.API_KEY_REQUIRED, handleApiKeyRequired);

            socket.on(SOCKET_EVENTS.GENERATE_TITLE_BY_LLM, handleGenerateTitleByLLM);

            socket.on('disconnect', () => {
                socket.off(SOCKET_EVENTS.THREAD);
                socket.off(SOCKET_EVENTS.USER_QUERY, handleUserQuery);
                socket.off(SOCKET_EVENTS.START_STREAMING, handleSocketStreaming);
                socket.off(SOCKET_EVENTS.STOP_STREAMING, handleSocketStreamingStop);
                socket.off(SOCKET_EVENTS.FORCE_STOP, handleSocketStreamingStop);
                socket.off(SOCKET_EVENTS.ON_QUERY_TYPING, handleOnQueryTyping);
                socket.off(SOCKET_EVENTS.DISABLE_QUERY_INPUT, handleDisableInput);
                // socket.off(SOCKET_EVENTS.SUBSCRIPTION_STATUS, handleSubscriptionStatus);
                socket.off(SOCKET_EVENTS.FETCH_SUBSCRIPTION, () => { });
                // socket.off(SOCKET_EVENTS.AI_MODEL_KEY_REMOVE, handleAIModelKeyRemove);
                socket.off(SOCKET_EVENTS.API_KEY_REQUIRED, handleApiKeyRequired);
                socket.off(SOCKET_EVENTS.FETCH_CHAT_BY_ID, socketChatById);
                socket.off(SOCKET_EVENTS.MESSAGE_LIST, socketAllConversation);
                socket.off(SOCKET_EVENTS.USER_SUBSCRIPTION_UPDATE, handleUserSubscriptionUpdate);
                socket.off(SOCKET_EVENTS.GENERATE_TITLE_BY_LLM, handleGenerateTitleByLLM);
            });

            return () => {
                socket.off('disconnect');
            };
        }
    }, [socket]);
    // End Socket Connection and disconnection configuration

    useEffect(() => {
        if (prompts?.length > 0) {
            if (text) {
                const updateIsActive = prompts.map((currPrompt) => {
                    if (currPrompt.content) {
                        const summaries = currPrompt?.summaries
                            ? Object.values(currPrompt.summaries)
                                .map((currSummary: any) => `${currSummary.website} : ${currSummary.summary}`)
                                .join('\n')
                            : '';

                        const isContentIncluded = text?.replace(/\s+/g, '')?.includes((currPrompt.content + (summaries ? '\n' + summaries : ''))?.replace(/\s+/g, ''));
                        return { ...currPrompt, isActive: isContentIncluded }
                    }

                    return currPrompt
                })

                setHandlePrompts(updateIsActive);
            } else {
                setHandlePrompts(prompts);
            }
        } else {
            setHandlePrompts(prompts)
        }
    }, [prompts, text]);

    useEffect(() => {
        if (socket) {
            if (conversations && !chatHasConversation(conversations) && Object.keys(initialMessage).length > 0) {
                handleSubmitPrompt();
                // router.replace(`/chat/${params.id}?b=${queryParams.get('b')}&model=${selectedAIModal.name}`);
            }
        }
    }, [socket]);

    useEffect(() => {
        if (!isUserNameComplete(currentUser)) {
            router.push(routes.onboard);
        }
    }, [currentUser]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height to auto
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set new height based on scrollHeight
        }
    }, [text]);

    useEffect(() => {
        // select web search toggle button and change the model based on the web search
        if (!chatHasConversation(conversations)) return;
        if (isWebSearchActive && textareaRef.current) {
            textareaRef.current.focus(); // Programmatically focus the textarea
            removeUploadedFile();
            const perplexityAiModal = userModal.find((modal: AiModalType) => modal.bot.code === API_TYPE_OPTIONS.PERPLEXITY && [AI_MODAL_NAME.SONAR, AI_MODAL_NAME.SONAR_REASONING_PRO].includes(modal.name))
            if (perplexityAiModal) {
                if (![AI_MODAL_NAME.SONAR, AI_MODAL_NAME.SONAR_REASONING_PRO].includes(selectedAIModal.name)) {
                    const payload = {
                        _id: perplexityAiModal._id,
                        bot: perplexityAiModal.bot,
                        company: perplexityAiModal.company,
                        modelType: perplexityAiModal.modelType,
                        name: perplexityAiModal.name,
                        provider: perplexityAiModal?.provider
                    }
                    dispatch(setSelectedAIModal(payload));
                    handleModelSelectionUrl(payload.name);
                }
            }

        } else {
            const openAiModal = userModal.find((modal: AiModalType) => modal.bot.code === AI_MODEL_CODE.OPEN_AI && modal.name == AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED);
            if (openAiModal && [AI_MODAL_NAME.SONAR, AI_MODAL_NAME.SONAR_REASONING_PRO].includes(selectedAIModal.name)) {
                const payload = {
                    _id: openAiModal._id,
                    bot: openAiModal.bot,
                    company: openAiModal.company,
                    modelType: openAiModal.modelType,
                    name: openAiModal.name,
                    provider: openAiModal?.provider
                }
                dispatch(setSelectedAIModal(payload));
                handleModelSelectionUrl(payload.name);
            }
        }
    }, [isWebSearchActive, conversations]);

    useEffect(() => {
        const { current: scrollContainer } = contentRef;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleContentScroll);
        }

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener(
                    'scroll',
                    handleContentScroll
                );
            }
        };
    }, [responseLoading, conversationPagination.hasNextPage, handleContentScroll]);
    const getTruncatedSystemPrompt = (title: string, systemPrompt: string, maxLength: number = 70) => {
        const availableLength = Math.max(maxLength - title.length, 0);
        if (systemPrompt.length > availableLength) {
            return systemPrompt.slice(0, availableLength - 3) + '...';
        }
        return systemPrompt;
    };
    
    return (
        <>
            <div className="flex flex-col flex-1 h-full relative overflow-hidden">
                {isFileDragging && <DrapDropUploader isFileDragging={isFileDragging} />}
                {/*Chat page Start  */}
                <div
                    className="h-full overflow-y-auto w-full relative max-md:max-h-[calc(100vh-200px)]"
                    ref={contentRef}
                >
                    {/* chat start */}
                    <div className="chat-wrap flex flex-col flex-1 pb-8 pt-4">
                        {/* Chat item Start*/}
                        {conversations.length > 0 &&
                            conversations.map((m, i) => {
                                return (
                                    <React.Fragment key={i}>
                                        {/* Chat item Start*/}
                                        <div className="chat-item w-full px-4 lg:gap-6 m-auto md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                                            <div
                                                className="relative group bg-gray-100 flex flex-1 text-font-16 text-b2 ml-auto gap-3 rounded-10 transition ease-in-out duration-150 md:max-w-[30rem] xl:max-w-[36rem] px-3 md:pt-4 pt-3 pb-9"
                                                data-message-id={m.id}>
                                                {/* Hover Icons start */}
                                                {!chatInfo?.brain?.id?.deletedAt && !blockProAgentAction() &&
                                                    <HoverActionIcon
                                                        content={m.message}
                                                        proAgentData={m?.proAgentData}
                                                        conversation={conversations}
                                                        sequence={m.seq}
                                                        onOpenThread={() =>
                                                            handleOpenThreadModal(m, THREAD_MESSAGE_TYPE.QUESTION)
                                                        }
                                                        copyToClipboard={copyToClipboard}
                                                        getAgentContent={getAgentContent}
                                                        onAddToPages={async (title: string) => {
                                                            await handleAddToPages(title, m);
                                                        }}
                                                        hasBeenEdited={editedResponses.has(m.id)}
                                                        isAnswer={false}
                                                    />
                                                }
                                                {/* Hover Icons End */}
                                                <div className="relative flex flex-col flex-shrink-0">
                                                    <div className="pt-0.5">
                                                        <div className="relative flex size-[25px] justify-center overflow-hidden rounded-full">
                                                            <ProfileImage user={m?.user} w={25} h={25}
                                                                classname={'user-img w-[25px] h-[25px] rounded-full object-cover'}
                                                                spanclass={'user-char flex items-center justify-center size-6 rounded-full bg-[#B3261E] text-b15 text-font-12 font-normal'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="relative flex w-full flex-col">
                                                    <div className="font-bold select-none mb-1 max-md:text-font-14">
                                                        {`${m.user.fname} ${m.user.lname}` || m.user.email.split('@')[0]}
                                                    </div>
                                                    <div className="flex-col gap-1 md:gap-3">
                                                        <div className="flex flex-grow flex-col max-w-full">
                                                            <div className="min-h-5 text-message flex flex-col items-start gap-2  break-words [.text-message+&]:mt-5 overflow-x-auto">
                                                                <ChatUploadedFiles
                                                                    media={m?.cloneMedia}
                                                                    customGptId={m?.customGptId}
                                                                    customGptTitle={m?.customGptTitle}
                                                                    gptCoverImage={m?.coverImage}
                                                                />
                                                                <div className="chat-content max-w-none w-full break-words text-font-14 md:text-font-16 leading-7 tracking-[0.16px] whitespace-pre-wrap">
                                                                    {m?.responseAPI == API_TYPE_OPTIONS.PRO_AGENT &&
                                                                        <ProAgentQuestion proAgentData={m?.proAgentData} />
                                                                    }
                                                                    {m?.responseAPI != API_TYPE_OPTIONS.PRO_AGENT &&
                                                                        m.message
                                                                    }
                                                                </div>
                                                                {/* Thread Replay Start */}
                                                                <ThreadItem
                                                                    handleOpenChatModal={() =>
                                                                        handleOpenThreadModal(
                                                                            m,
                                                                            THREAD_MESSAGE_TYPE.QUESTION
                                                                        )
                                                                    }
                                                                    thread={
                                                                        m.question_thread
                                                                    }
                                                                />
                                                                {/* Thread Replay End */}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Chat item End*/}
                                        {/* Chat item Start*/}
                                        <div className="chat-item w-full px-4 lg:py-2 py-2 lg:gap-6 m-auto md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                                            <div
                                                className="relative group bg-white flex flex-1 text-font-16 text-b2 mx-auto gap-3 px-3 pt-3 pb-9 rounded-10 transition ease-in-out duration-150"
                                                data-message-id={`${m.id}-response`}>
                                                {/* Hover Icons start */}
                                                {!chatInfo?.brain?.id?.deletedAt && showHoverIcon && !blockProAgentAction() &&
                                                    <HoverActionIcon
                                                        content={m.response}
                                                        proAgentData=''
                                                        conversation={conversations}
                                                        sequence={m.seq}
                                                        onOpenThread={() =>
                                                            handleOpenThreadModal(m, THREAD_MESSAGE_TYPE.ANSWER)
                                                        }
                                                        copyToClipboard={copyToClipboard}
                                                        getAgentContent={getAgentContent}
                                                        index={i}
                                                        showCitations={true}
                                                        citations={m?.citations}
                                                        onAddToPages={async (title: string) => {
                                                            await handleAddToPages(title, m);
                                                        }}
                                                        hasBeenEdited={editedResponses.has(m.id)}
                                                        isAnswer={true}
                                                        messageId={m.id}
                                                        onEditResponse={async (messageId: string, updatedResponse: string) => {
                                                            try {
                                                                await handleResponseUpdate(messageId, updatedResponse);
                                                            } catch (error) {
                                                                console.error('Error updating response:', error);
                                                                throw error;
                                                            }
                                                        }}
                                                    />
                                                }
                                                {/* Hover Icons End */}
                                                {m?.responseAPI !== API_TYPE_OPTIONS.PRO_AGENT &&
                                                    <div className="relative flex flex-col flex-shrink-0">
                                                        <RenderAIModalImage
                                                            src={getModelImageByName(m.responseModel)}
                                                            alt={m.responseModel}
                                                        />
                                                    </div>
                                                }
                                                <div className="relative flex w-full flex-col">
                                                    {m?.responseAPI !== API_TYPE_OPTIONS.PRO_AGENT &&
                                                        <div className="font-bold select-none mb-1 max-md:text-font-14">
                                                            {
                                                                getDisplayModelName(m.responseModel)
                                                            }
                                                        </div>
                                                    }
                                                    <div className="flex-col gap-1 md:gap-3">
                                                        <div className="flex flex-grow flex-col max-w-full">
                                                            {toolCallLoading.webSearch && <ChatWebSearchLoader/>}
                                                            {
                                                                (m?.proAgentData?.code === ProAgentCode.SEO_OPTIMISED_ARTICLES && (m.response === '' && answerMessage === '')) ?
                                                                    <SeoProAgentResponse conversation={conversations} proAgentData={m?.proAgentData} leftList={leftList} rightList={rightList} setLeftList={setLeftList} setRightList={setRightList} isLoading={isLoading} socket={socket} generateSeoArticle={generateSeoArticle} loading={loading} />
                                                                    :
                                                                    <ChatResponse
                                                                        conversations={conversations}
                                                                        i={i}
                                                                        loading={loading}
                                                                        answerMessage={answerMessage}
                                                                        m={m}
                                                                        isStreamingLoading={isStreamingLoading}
                                                                        proAgentCode={m?.proAgentData?.code}
                                                                        onResponseUpdate={handleResponseUpdate}
                                                                        onResponseEdited={(messageId) => {
                                                                            setEditedResponses(prev => new Set([...prev, messageId]));
                                                                        }}
                                                                        onOpenEditModal={handleOpenEditModal}
                                                                    />
                                                            }
                                                        </div>
                                                        {/* Thread Replay Start */}
                                                        <ThreadItem
                                                            handleOpenChatModal={() =>
                                                                handleOpenThreadModal(
                                                                    m,
                                                                    THREAD_MESSAGE_TYPE.ANSWER
                                                                )
                                                            }
                                                            thread={
                                                                m.answer_thread
                                                            }
                                                        />
                                                        {/* Thread Replay End */}
                                                    </div>
                                                </div>
                                            </div>
                                            {(conversations.length - 1 === i ? showTimer : m?.responseTime) && !disabledInput &&
                                                <ResponseTime
                                                    m={m}
                                                    setShowTimer={setShowTimer}
                                                />}
                                        </div>


                                        {/* Chat item End*/}
                                    </React.Fragment>
                                );
                            })}
                        {/* Chat item End*/}
                    </div>
                    {/* chat End */}
                </div>

                <ScrollToBottomButton contentRef={contentRef} />
                
                { !chatInfo?.brain?.id?.deletedAt ?
                <>           
                    <div className="w-full pt-2">
                        
                        
                        <div className="flex flex-col mx-auto relative px-5 md:max-w-[90vw] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                            <div className="flex flex-col text-font-16 mx-auto group overflow-hidden rounded-[12px] [&:has(textarea:focus)]:shadow-[0_2px_6px_rgba(0,0,0,.05)] w-full flex-grow relative border border-b11">
                                {globalUploadedFile.length > 0 && (                          
                                    <UploadFileInput
                                        removeFile={removeSelectedFile}
                                        fileData={globalUploadedFile}                                     
                                    />
                                )}
                                {fileLoader && (<ChatInputFileLoader/>)}
                                {(showAgentList || showPromptList) && (
                                    <div ref={agentPromptDropdownRef}>
                                    {showAgentList && (
                                        <div className='w-full px-5 pt-5 pb-3 rounded-md mb-1'>
                                            <div className='normal-agent'>
                                                <div className='flex mb-3'>
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
                                                            const isSelected = globalUploadedFile?.some((file: UploadedFileType) => file?._id === gpt._id);
                                                            
                                                            return (
                                                                <div
                                                                    key={gpt._id}
                                                                    className={`cursor-pointer border-b10 py-1.5 px-2.5 transition-all ease-in-out rounded-md hover:bg-b12 ${    
                                                                        isSelected
                                                                            ? 'bg-b12 border-b10'
                                                                            : 'bg-white border-b10'
                                                                    } flex-wrap`}
                                                                    onClick={() => handleAgentSelection(gpt)}
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
                                                                        {/* <span className='text-font-12 ml-2 px-2 py-[2px] bg-b13 border rounded-full'>
                                                                            {getDisplayModelName(gpt.responseModel.name)}
                                                                        </span>
                                                                        <div className='ml-1 text-b6 text-font-12 max-md:w-full'>
                                                                            - {gpt.isShare ? 'Shared' : 'Private'} / {gpt.brain.title}
                                                                        </div> */}
                                                                        <p className='text-font-12 font-normal text-b6 mt-1'>
                                                                            {/* {truncateText(gpt.systemPrompt,190)}                                                 */}
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
                                    {/* Show Prompt List if first char is '/' */}
                                    {showPromptList && (
                                        <div className='w-full px-5 pt-5 pb-3 rounded-md mb-1'>
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
                                                            >
                                                                <div className="flex items-center flex-wrap xl:flex-nowrap">
                                                                    <p className="text-font-12 font-medium text-b2 mr-2">
                                                                        {currPrompt.title}
                                                                    </p>
                                                                    {/* <span className='text-b6 ml-1 text-font-12 max-md:w-full'>
                                                                        - {currPrompt.isShare ? 'Shared' : 'Private'} / {currPrompt.brain.title}
                                                                    </span>                                                 */}
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
                                <TextAreaBox
                                    message={text}
                                    handleChange={handleChange}
                                    handleKeyDown={handleKeyDown}
                                    isDisable={selectedContext.textDisable}
                                    autoFocus={isWebSearchActive}
                                    onPaste={handlePasteFiles}
                                    ref={textareaRef}
                                />
                                <div className="flex items-center z-10 px-4 pb-[6px]">
                                    
                                {/* Dialog Start For tabGptList */}
                                <Dialog
                                        open={!isWebSearchActive && dialogOpen}
                                        onOpenChange={(isOpen: boolean) => {
                                            if (!isWebSearchActive) {
                                                setDialogOpen(isOpen); 
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
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger disabled={isWebSearchActive}>
                                                            <div className={`chat-btn cursor-pointer bg-white transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ${isWebSearchActive ? 'opacity-50 pointer-events-none' : ''
                                                                }`}>
                                                                <ThunderIcon width={'14'} height={'14'} className={'fill-b5 w-auto h-[17px]'} />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-font-14">
                                                                {isWebSearchActive
                                                                    ? "This feature is unavailable in web search"
                                                                    : "Add Promps, Agents, or Docs to chat"}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </DialogTrigger>
                                            <DialogContent className="xl:max-w-[670px] max-w-[calc(100%-30px)] block pt-7 max-md:max-h-[calc(100vh-70px)] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
                                                <DialogHeader className="rounded-t-10 px-[30px] pb-5 ">
                                                    {/* <DialogTitle className="font-semibold flex items-center">
                                                    <h2 className='text-font-16'>Select Prompts, Agents, and Docs</h2>
                                                </DialogTitle> */}
                                                </DialogHeader>
                                                <div className="dialog-body relative h-full w-full md:max-h-[650px] px-6 md:px-8 pt-6 flex min-h-[450px] top-[-36px]">
                                                    <TabGptList
                                                        setDialogOpen={setDialogOpen}
                                                        onSelect={onSelectMenu}
                                                        // setUploadedFile={setUploadedFile} 
                                                        setText={setText}
                                                        handlePrompts={handlePrompts}
                                                        setHandlePrompts={setHandlePrompts}
                                                        getList={getTabPromptList}
                                                        promptLoader={promptLoader}
                                                        setPromptLoader={setPromptLoader}
                                                        paginator={promptPaginator}
                                                        setPromptList={setPromptList}
                                                        promptList={prompts}
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        {/* Dialog End For tabGptList */}
                                        <AttachMentToolTip
                                            fileLoader={fileLoader}
                                            isWebSearchActive={isWebSearchActive}
                                            handleAttachButtonClick={handleAttachButtonClick}
                                        />

                                        <BookmarkDialog
                                            onSelect={onSelectMenu}
                                            isWebSearchActive={isWebSearchActive}
                                            selectedAttachment={globalUploadedFile}
                                        />
                                        <WebSearchToolTip
                                            loading={loading}
                                            isWebSearchActive={isWebSearchActive}
                                            handleWebSearchClick={handleWebSearchClick}
                                        />

                                        {/* Prompt Enhance Component */}
                                        <PromptEnhance 
                                            isWebSearchActive={isWebSearchActive} 
                                            text={text} 
                                            setText={setText} 
                                            apiKey={selectedAIModal?.config?.apikey}
                                        />
                                        <ToolsConnected 
                                            isWebSearchActive={isWebSearchActive} 
                                            toolStates={toolStates}
                                            onToolStatesChange={handleToolStatesChange}
                                        />

                                        {/* Voice Chat START */}
                                        <VoiceChat setText={setText} text={text} />
                                        
                                        {/* Voice Chat END */}
                                        <TextAreaFileInput
                                            fileInputRef={fileInputRef}
                                            handleFileChange={handleFileChange}
                                            multiple
                                        />
                                        {((loading) || isStreamingLoading || (answerMessage && answerMessage.length > 0)) ? (
                                            <StopStreamSubmitButton
                                                handleStop={handleStopStreaming}
                                            />
                                        ) : (
                                            <TextAreaSubmitButton
                                                disabled={isSubmitDisabled}
                                                handleSubmit={handleSubmitPrompt}
                                            />
                                        )}
                                </div>
                            </div>
                            <p className='text-font-12 mt-1 text-b7 text-center'>Weam can make mistakes. Consider checking the following information.</p>
                        </div>
                    </div>
                    <div className='relative py-2.5 md:max-w-[30rem] lg:max-w-[38rem] xl:max-w-[45.75rem] max-w-[calc(100%-30px)] w-full mx-auto'>
                        <div className='absolute left-0 right-0 mx-auto top-0 text-font-12'>
                            {typingUsers.length > 0 && <TypingTextSection typingUsers={typingUsers} />}
                        </div>
                    </div>
                </> : <center>This brain is archived by {chatInfo?.brain?.id?.archiveBy?.name}</center>}
                {/* Textarea End */}
                {/*Chat page End  */}
            </div>
            {/* Thread Modal Start */}
            <ChatThreadOffcanvas
                queryParams={queryParams}
                isBrainDeleted={chatInfo?.brain?.id?.deletedAt}
            />
            {/* Thread Modal End */}
            {/* EditResponseModal */}
            <EditResponseModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleSaveEditModal}
                initialContent={editingMessageContent}
                messageId={editingMessageId || ''}
            />
        </>
    );
});

const ChatAccessControl = () => {
    const chatAccess = useSelector((store: any) => store.chat.chatAccess);
    return (
        chatAccess ? <ChatPage /> : null
    )
}

export default ChatAccessControl