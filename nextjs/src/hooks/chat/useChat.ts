import commonApi from '@/api';
import { DEFAULT_SORT, MODULES, MODULE_ACTIONS, SEARCH_AND_FILTER_OPTIONS, TOKEN_PREFIX, IMPORT_ERROR_MESSAGE, IMPORT_IN_PROGRESS_MESSAGE, API_TYPE_OPTIONS } from '@/utils/constant';
import routes from '@/utils/routes';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setChatMessageAction, setLastConversationDataAction } from '@/lib/slices/aimodel/conversation';
import { decodedObjectId, decryptedPersist, formatBrain, retrieveBrainData } from '@/utils/helper';
import Toast from '@/utils/toast';
import { getCurrentUser } from '@/utils/handleAuth';
import { setChatAccessAction } from '@/lib/slices/chat/chatSlice';
import { WORKSPACE } from '@/utils/localstorage';
import { addToPrivateList, cachePrivateList,addToShareList,cacheShareList } from '@/lib/slices/brain/brainlist';
import { useSelector } from 'react-redux';
import { isEmptyObject } from '@/utils/common';
import { ChatListType, PromptEnhancePayloadType, UploadedFileType } from '@/types/chat';
import { APIResponseType, DefaultPaginationType, ObjectType, PaginatorType } from '@/types/common';
import { API_PREFIX } from '@/config/config';
import { LINK } from '@/config/config';
import useConversation from '../conversation/useConversation';

const useChat = (b ?: string) => {
    const router = useRouter();
    const [chatList, setChatList] = useState<ChatListType[]>([])
    const [chatInfo, setChatInfo] = useState()
    const [isLoading, setIsLoading] = useState(true);
    const [showFavorites, setShowFavorites] = useState(false);
    const [addChatLoading, setAddChatLoading] = useState(false);
    const [paginator, setPaginator] = useState<PaginatorType>({});
    const { getCommonPythonPayload } = useConversation();
    const brainId = useMemo(() => decodedObjectId(b), [b]);

    const dispatch = useDispatch();
    const cachePrivate = useSelector((store:any) => store.brain.privateList);
    const cacheShare = useSelector((store:any) => store.brain.shareList);
    const user = getCurrentUser();
    const currWorkspace=decryptedPersist(WORKSPACE)
    const braindata = retrieveBrainData();

    const addNewChat = async (addToGivenBrainSlug:any = false, brainDetails:any = {}) => {
        const brainData = isEmptyObject(brainDetails) ? braindata : brainDetails;
        try {
            setAddChatLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.CREATE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CHAT,
                common: true,
                data: {
                    brain: addToGivenBrainSlug ? {} :formatBrain(brainData),
                    isShare: addToGivenBrainSlug && addToGivenBrainSlug.includes('general-brain') ? true : brainData?.isShare,
                    ...(addToGivenBrainSlug
                    ? {
                        addDefaultBrain: true,
                        workspaceId: currWorkspace?._id,
                    }
                    : {}),
                },
            });

           
            setChatInfo(
                response.data.chat ? response.data.chat : response.data
            );
            dispatch(setLastConversationDataAction({}));
            dispatch(setChatMessageAction(''));
            router.push(
                `${routes.chat}/${
                    response.data.chat ? response.data.chat._id : response.data._id
                }?slug=${
                        addToGivenBrainSlug
                        ? addToGivenBrainSlug
                        : brainData.slug
                }`
            );

            if (addToGivenBrainSlug.startsWith('default-brain-') && response.data.createdDefaultBrain) {
                dispatch(
                    addToPrivateList({
                        type: 'add',
                        payload: response.data.createdDefaultBrain,
                    })
                );
                dispatch(
                    cachePrivateList([
                        response.data.createdDefaultBrain,
                        ...cachePrivate,
                    ])
                );
            }else if(addToGivenBrainSlug.startsWith('general-brain') && response.data.createdDefaultBrain){
                dispatch(
                    addToShareList({
                        type: 'add',
                        payload: response.data.createdDefaultBrain,
                    })
                );
                dispatch(
                    cacheShareList([
                        response.data.createdDefaultBrain,
                        ...cacheShare,
                    ])
                );
            }
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setAddChatLoading(false);
        }
    }
  


    const getAllChatList = async (search = '', pagination: DefaultPaginationType = { offset: 0, limit: 10 }) => {
        if (!b) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const finalFilterOptions = showFavorites 
                ? { isFavourite: true }
                : '';

            const response: APIResponseType<ChatListType[]> = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CHAT_MEMBER,
                common: true,
                data: {
                    options: {
                        sort: { createdAt: DEFAULT_SORT },
                        populate: [
                            {
                                path: 'chatId',
                                select: 'title user createdAt'
                            }
                        ],
                        ...pagination
                    },
                    query: { 'user.id': user._id, isNewChat: false, 'brain.id': brainId, 
                        search: search, searchColumns: [SEARCH_AND_FILTER_OPTIONS.NORMAL_TITLE],
                        ...finalFilterOptions
                    }
                }       
            })
            // setChatList(response.data as ObjectType[]);
            if(showFavorites && pagination.offset === 0){
                setChatList(response.data);
            } else if(pagination.offset === 0){
                setChatList(response.data);
            } else {
                setChatList((prev: ChatListType[]) => [...prev, ...response.data]);
            }
            
            setPaginator(response.paginator as PaginatorType);
            dispatch(setChatMessageAction(''));
        } catch (error) {
            if(error?.response?.status===302){
                router.push('/')
            }
            console.log('error: ', error);
        } finally {
            setIsLoading(false);
        }
    }

    const getChatById = async (id) => {
        try {
            setIsLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.GET,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CHAT,
                common: true,
                parameters: [id]
            })
            dispatch(setChatMessageAction(response.data?.title));
            setChatList(response.data?.title);
            setChatInfo(response.data);
            setIsLoading(false);
        } catch (error) {
            console.log('error: ', error);
        }
    }

    const editChat = async (id, data) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.UPDATE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CHAT,
                data: data,
                common: true,
                parameters: [id]
            })
            Toast(response.message);
            setChatInfo(response.data);
            dispatch(setChatMessageAction(response.data.title));
            if (response.status == 200) {
                chatList.map((item, key) => {
                    if (item.chatId._id == id)
                        return chatList[key].chatId.title = data.title;
                });
                setChatList(chatList);
            }
        } catch (error) {
            console.log('error: ', error);
        }
    }

    const deleteChat = async (id, chatId) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.DELETE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CHAT,
                common: true,
                parameters: [chatId]
            })
            Toast(response.message);
            const updatedObj = chatList.filter(obj => obj?.chatId?._id !== chatId);
            setChatList(updatedObj);
        } catch (error) {
            console.log('error: ', error);
        }
    }

    const chatAccessStatus = async (id) => {
        try {
            await commonApi({
                action: MODULE_ACTIONS.CHECK_CHAT_ACCESS,
                data: {
                    id
                }
            })
            dispatch(setChatAccessAction(true));
        } catch (error) {
            console.error('error: ', error);
        }
    }

    const socketChatById = async (response) => {
        try {
            if (!response) return;
            dispatch(setChatMessageAction(response?.title));
            setChatList(response?.title);
            setChatInfo(response);
        } catch (error) {
            console.log('error: ', error);
        }
    }

    const pyUploadImportChat = async (formData: FormData, setShowImportChat:React.Dispatch<React.SetStateAction<boolean>>) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.IMPORT_UPLOAD,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.IMPORT_CHAT,
                common: true,
                data: formData,
                config: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response?.code === 'SUCCESS') {
                Toast(response?.message || IMPORT_IN_PROGRESS_MESSAGE, "success");
                return response
            }

            // if (response?.code === 'ERROR') {
            //     Toast(response?.message || IMPORT_ERROR_MESSAGE, "error");
            //     setShowImportChat(false);
            // }

            return response;
        } catch (error) {
            console.error('error: ', error);
            // Toast(IMPORT_ERROR_MESSAGE, "error");
            throw error;
        }
    }
    const promptEnhanceByLLM = async (promptPayload: PromptEnhancePayloadType) => {
        try {
            const payload = {
                query: promptPayload.query,
                apiKey: promptPayload.apiKey,
            }
            const response = await commonApi({
                action: MODULE_ACTIONS.ENHANCE_PROMPT_BY_LLM,
                data: payload,
            })
            return response.data;
        } catch (error) {
            console.error('error: ', error);
        }
    }

    const handleAIApiType = (uploadedFile: UploadedFileType[]) => {
        if (!uploadedFile) return;
        const hasImage = Array.isArray(uploadedFile) && uploadedFile?.some((file: UploadedFileType) => file?.mime_type?.startsWith('image/'));
        const hasDocument = Array.isArray(uploadedFile) && uploadedFile?.some((file: UploadedFileType) => file.isDocument);
        const hasAgent = Array.isArray(uploadedFile) && uploadedFile?.some((file: UploadedFileType) => file?.isCustomGpt);
        if (hasImage) return API_TYPE_OPTIONS.OPEN_AI;
        if (hasDocument) return hasAgent ? API_TYPE_OPTIONS.OPEN_AI_CUSTOM_GPT_WITH_DOC : API_TYPE_OPTIONS.OPEN_AI_WITH_DOC;
        if (hasAgent) return API_TYPE_OPTIONS.OPEN_AI_CUSTOM_GPT_WITH_DOC;
        return API_TYPE_OPTIONS.OPEN_AI;
    }
    return {
        addNewChat,
        getAllChatList,
        chatList,
        getChatById,
        addChatLoading,
        chatInfo,
        editChat, deleteChat,
        isLoading,
        chatAccessStatus,
        socketChatById,
        paginator,
        showFavorites,
        setShowFavorites,
        setChatList,
        pyUploadImportChat,
        promptEnhanceByLLM,
        handleAIApiType
    }
}

export default useChat