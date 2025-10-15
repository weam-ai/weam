import commonApi from '@/api';
import { API_PREFIX, LINK } from '@/config/config';
import {  setChatMessageAction, setLastConversationDataAction } from '@/lib/slices/aimodel/conversation';
import store, { RootState } from '@/lib/store';
import { DECENDING_SORT, MESSAGE_TYPE, MODULES, MODULE_ACTIONS, SOCKET_EVENTS, TOKEN_PREFIX, STATUS_CODE, AI_MODEL_CODE, API_TYPE_OPTIONS, AI_MODAL_NAME, WEB_RESOURCES_DATA } from '@/utils/constant';
import { decryptedData } from '@/utils/helper';
import { useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Toast from '@/utils/toast';
import { getCompanyId, getCurrentUser, pythonRefreshToken } from '@/utils/handleAuth';
import defaultCustomGptImage from '../../../public/defaultgpt.jpg';
import { getAccessToken } from '@/actions/serverApi';
import { AgentChatPayloadType, ChatTitlePayloadType, DocumentChatPayloadType, NormalChatPayloadType, PerplexityPayloadType, SocketConversationType, ProAgentChatPayloadType, ProAgentPayloadType, UploadedFileType } from '@/types/chat';
import { Socket } from 'socket.io-client';
import { BrainListType } from '@/types/brain';
import { useParams, useRouter } from 'next/navigation';
import useConversationHelper from './useConversationHelper';
import { ProAgentCode } from '@/types/common';
import { SalesCallPayloadType, SeoArticlePayloadType } from '@/types/proAgents';
import useChatMember from '../chat/useChatMember';
import routes from '@/utils/routes';
type CustomErrorPayloadType = {
    chatId: string | string[];
    messageId: string;
}

export const PAGE_SPEED_RECORD_KEY = 'desktop_metrics';

const useConversation = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listLoader, setListLoader] = useState(true);
    const [showTimer, setShowTimer] = useState(false);
    const [responseLoading, setResponseLoading] = useState(false);
    const [showHoverIcon, setShowHoverIcon] = useState(true);
    const [conversationPagination, setConversationPagination] = useState({});
    const [isStreamingLoading, setIsStreamingLoading] = useState(false);
    const dispatch = useDispatch();
    const [answerMessage, setAnswerMessage] = useState('');
    const disabledInput = useRef(null);
    const currentUser = useMemo(() => getCurrentUser(), []);
    const brainData = useSelector((store: RootState) => store.brain.combined);
    const { uploadData } = useSelector((state:RootState) => state.conversation);
    const { getDecodedObjectId, handleModelSelectionUrl, handleProAgentUrlState, blockProAgentAction } = useConversationHelper();
    const { getChatMembers } = useChatMember();
    const params = useParams();
    const router = useRouter();

    async function customErrorResponse(response: Response, payload: CustomErrorPayloadType, socket: Socket) {
        try {
            const result = await response.json();
            Toast(result.message, 'error');
            const answer = result.data.content;
            setConversations(prevConversations => {
                const updatedConversations = [...prevConversations];
                const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
                lastConversation.response = answer;
                updatedConversations[updatedConversations.length - 1] = lastConversation;
                return updatedConversations;
            });
            setAnswerMessage(answer);
            socket.emit(SOCKET_EVENTS.STOP_STREAMING, { chatId: payload.chatId, proccedMsg: answer, userId: currentUser._id });
            setAnswerMessage('');
            return;
        } catch (error) {
            console.error("In CustomErrorResponse",error)
        }
    }

    const getCommonPythonPayload = async (): Promise<{ token: string, companyId: string }> => {
        try {
            const token = await getAccessToken();
            const companyId = getCompanyId(currentUser);
            return { token, companyId }
        } catch (error) {
            console.error('error: getCommonPythonPayload', error);
        }
    } 

    /**
     * 
     * @param response 
     * @param socket 
     * @param chatId 
     * Note: Whenever this function is called in any api, set current ref to null to enable input field
     */
    const streamResponseHandler = async (response: Response, socket: Socket, chatId: string | string[]) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let proccedMsg = '';
        const currentUser = getCurrentUser();
        
        while (true) {
            const { value, done } = await reader.read();

            if (done) {
                setConversations(prevConversations => {
                    const updatedConversations = [...prevConversations];
                    const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
                    lastConversation.response = proccedMsg;
                    updatedConversations[updatedConversations.length - 1] = lastConversation;
                    return updatedConversations;
                });
                setAnswerMessage('');
                break;
            }

            const chunk = decoder.decode(value);
            
            const chunkParts = chunk.split('\n').filter(line => line.startsWith('data: ')).map(line => line.split('data: ')[1]);
            const decodedMessage = chunkParts.map(part => {
                try {
                    return JSON.parse(part);
                } catch (error) {
                    if (part.startsWith("b'") || part.startsWith('b"')) {
                        part = part.slice(2, -1);
                        part = part.replace(/\\(['"\\])/g, '$1')
                                   .replace(/\\n/g, '\n')
                                   .replace(/\\t/g, '\t')
                                   .replace(/\\t\\t/g, '\t\t');
                    }
                    part = part.replace(/\\x([\d\w]{2})/gi, (_, grp) => String.fromCharCode(parseInt(grp, 16)));
                    part = part.replace(/\\u([\d\w]{4})/gi, (_, grp) => String.fromCharCode(parseInt(grp, 16)));                    
                }
                // handle QA report markdown 
                if (part.includes(PAGE_SPEED_RECORD_KEY)) {
                    let cleaned = part.replace(/"file_url":\s*"([^"]*?)"/, (match, p1) => {
                        const escaped = p1
                            .replace(/\n/g, "\\n")
                            .replace(/"/g, '\\"');
                        return `"file_url": "${escaped}"`;
                    });
                    return cleaned;
                }
                return decodeURIComponent(escape(part));
            }).join('');
            // show checking next step loader for QA agent
            if(decodedMessage == 'START_PRO_AGENT_LOADER'){
                setIsStreamingLoading(true);
                continue;
            }
            if (['LOOM_VIDEO_LOADER', 'AUDIO_LOADER'].includes(decodedMessage)){
                continue;
            }
            // show page speed record for QA agent
            if (decodedMessage.includes(PAGE_SPEED_RECORD_KEY)) {
                const parsedMessage = JSON.parse(decodedMessage);
                setConversations(prevConversations => {
                    const updatedConversations = [...prevConversations];
                    updatedConversations[0].responseAddKeywords = parsedMessage;
                    return updatedConversations;
                });
                continue;
            }
            if (decodedMessage.includes(WEB_RESOURCES_DATA)) {
                const cleaned = decodedMessage.trim().replace(/^[^\[{]*/, '');
                const parsedMessage = JSON.parse(cleaned);
                setConversations(prevConversations => {
                    const updatedConversations = [...prevConversations];
                    const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
                    lastConversation.responseAddKeywords = parsedMessage;
                    updatedConversations[updatedConversations.length - 1] = lastConversation;
                    return updatedConversations;
                });
                continue;
            }
            setIsStreamingLoading(false);
            setLoading(false);
            socket.emit(SOCKET_EVENTS.START_STREAMING, { chunk: decodedMessage, chatId, userId: currentUser._id });
            proccedMsg += decodedMessage;
            setAnswerMessage((prev: string) => prev + decodedMessage);
        }
        setShowTimer(true);
        socket.emit(SOCKET_EVENTS.STOP_STREAMING, { chatId, proccedMsg, userId: currentUser._id });
    };
    
    const enterNewPrompt = (payload, socket: Socket) => {
        try {
            const brain = brainData.find((brain: BrainListType) => brain._id === getDecodedObjectId());
            if (!brain) return;
            socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
                message: {
                    type: MESSAGE_TYPE.HUMAN,
                    data: {
                        content: payload.text,
                        additional_kwargs: {},
                        response_metadata: {},
                        type: MESSAGE_TYPE.HUMAN,
                        name: null,
                        id: null,
                        example: false,
                        tool_calls: [],
                        invalid_tool_calls: [],
                    },
                },
                chatId: payload.chatId,
                model: payload.model.bot,
                brain: {
                    title: brain?.title,
                    slug: brain?.slug,
                    id: brain?._id,
                },
                responseModel: payload.responseModel,
                media: payload.media,
                responseAPI: payload.responseAPI,
                proAgentData: payload.proAgentData,
                promptId: payload?.promptId,
                customGptId: payload?.customGptId,
                cloneMedia: payload?.cloneMedia,
                messageId: payload?.messageId,
                user: payload?.user,
                companyId: payload?.companyId,
                isPaid: payload?.isPaid ? true : false
            })
            dispatch(setLastConversationDataAction({ 
                responseAPI: payload.responseAPI,
                customGptId: payload?.customGptId,
                responseModel: payload.model.name
            }));
        } catch (error) {
            console.error('error: ', error);
        }
    };

    const getAllConversation = async (payload) => {
        try {
            const paginationObj = {};
            if(payload.limit){
                Object.assign(paginationObj, { limit: payload.limit, offset: (payload.page - 1) * payload.limit })
            } 
            setResponseLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.MESSAGE,
                common: true,
                data: {
                    options: {
                        sort: { createdAt: DECENDING_SORT },
                        select: 'user message responseModel ai seq media promptId customGptId responseAPI cloneMedia openai_error model proAgentData',
                        pagination: payload.limit ? true : false,
                        ...paginationObj,
                        populate: [
                            {
                                path: 'customGptId',
                                select: "title slug systemPrompt coverImg"
                            }
                        ]
                    },
                    query: {
                        chatId: payload.chatId,
                    }
                }
            })

            if (!response.data?.length) {
                return;
            }
            const data = response.data.map((m) => {
                const decodedMessage = decryptedData(m.message); 
                const decodedAnswer = m.ai ? decryptedData(m.ai) : null;
                const prompt = JSON.parse(decodedMessage);
                const answer = decodedAnswer ? JSON.parse(decodedAnswer) : { data: { content: m.openai_error.content || AI_MODEL_CODE.CONVERSATION_ERROR } };


                const gptCoverImage=m?.customGptId?.coverImg?.uri?`${LINK.AWS_S3_URL}${m?.customGptId?.coverImg?.uri}`:defaultCustomGptImage.src
                return {
                    id: m._id,
                    user: m.user,
                    message: prompt.data.content,
                    response: answer.data.content,
                    responseModel: m.responseModel,
                    seq: m.seq,
                    media: m?.media,
                    promptId: m?.promptId,
                    customGptId: m?.customGptId,
                    answer_thread: m?.answer_thread || {
                        count:0,
                        users:[]
                    },
                    question_thread: m?.question_thread || {
                        count:0,
                        users:[]
                    },
                    proAgentData: m?.proAgentData,
                    responseAPI: m?.responseAPI,
                    cloneMedia: m?.cloneMedia,
                    model:m?.model,
                    coverImage:gptCoverImage,
                    responseAddKeywords: answer.data.additional_kwargs
                }
            }).reverse();
           
            // setConversations(data);
            setConversations([...data, ...conversations]);
            
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setResponseLoading(false);
            setListLoader(false);
        }
    }

    const getAINormatChatResponse = async (payload: NormalChatPayloadType, socket: Socket, newToken?: string) => {
        try {
            setLoading(true);
            setShowHoverIcon(false);
            const { token, companyId } = await getCommonPythonPayload();
            const messageId = payload.messageId

            const authToken = newToken || token;

            const response = await fetch(
                `${LINK.PYTHON_API_URL}${API_PREFIX}/tool/stream-tool-chat-with-openai`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        thread_id: messageId,
                        query: payload.text,
                        prompt_id: payload.prompt_id,
                        llm_apikey: payload.modelId,
                        chat_session_id: payload.chatId,
                        image_url: payload.img_url,
                        company_id: companyId,
                        delay_chunk: 0.02,
                        code: payload.code,
                        model_name: payload.model_name,
                        provider: payload.provider,
                        // isregenerated: payload.isregenerated,
                        msgCredit: payload.msgCredit,
                        mcp_tools: payload.mcp_tools
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${TOKEN_PREFIX}${authToken}`,
                    },
                }
            );
                       
            if (!response.ok) {
                return await retryApiCall(response, payload, socket, (newToken) => getAINormatChatResponse(payload, socket, newToken), payload.messageId);
            }
            if (response.status === STATUS_CODE.SUCCESS)
                await streamResponseHandler(response, socket, payload.chatId);
            else if (response.status === STATUS_CODE.MULTI_RESPONSE)
                await generateImageOpenAI(socket, response, { chatId: payload.chatId, messageId });
        } catch (error) {  
            console.error('error: ', error);
        } finally {
            setLoading(false);
            disabledInput.current = null;
            setShowHoverIcon(true);
        }
    }

    const getAIDocResponse = async (payload: DocumentChatPayloadType, socket: Socket, isRegenerated: boolean = false, newToken?: string) => {
        try {
            setLoading(true);
            setShowHoverIcon(false);
            const brain = brainData.find((brain: BrainListType) => brain._id === getDecodedObjectId());
            if (!brain) return;
            const { token, companyId } = await getCommonPythonPayload();
            const authToken = newToken || token;
            const messageId = payload.messageId;
            const fileIds = [], tags = [], embeddingApiKeys = [];
            
            if (isRegenerated) {
                payload.media.forEach((file: UploadedFileType) => {
                    fileIds.push(file._id);
                    if (file.uri.startsWith('http')) tags.push(file.uri.split('/documents/')[1]);
                    else tags.push(file.uri.split('/')[2]);
                });
            } else {
                const fileData = store.getState().conversation.uploadData;
                const files = Array.isArray(fileData) ? fileData : [fileData];
                files.forEach((file: UploadedFileType) => {
                    fileIds.push(file._id);
                    if (file.uri.startsWith('http')) tags.push(file.uri.split('/documents/')[1]);
                    else tags.push(file.uri.split('/')[2]);
                });
            }

            const response = await fetch(
                `${LINK.PYTHON_API_URL}${API_PREFIX}/chat/streaming-chat-with-doc`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        thread_id: messageId,
                        query: payload.text,
                        prompt_id: payload.prompt_id,
                        llm_apikey: payload.modelId,
                        chat_session_id: payload.chatId,
                        file_id: fileIds,
                        tag: tags,
                        embedding_api_key: embeddingApiKeys[0],
                        brain_id: brain._id.toString(),
                        companypinecone: 'companypinecone',
                        company_id: companyId,
                        delay_chunk: 0.02,
                        code: payload.code,
                        model_name: payload.model_name,
                        provider: payload.provider,
                        // isregenerated: payload.isregenerated,
                        msgCredit: payload.msgCredit,
                        // is_paid_user: payload.is_paid_user
                    }),
                        headers: {
                       
                        'Content-Type': 'application/json',
                        Authorization: `${TOKEN_PREFIX}${authToken}`,
                    },
                }
            );
            if (!response.ok) {
                return await retryApiCall(response, payload, socket, (newToken) => getAIDocResponse(payload, socket, isRegenerated, newToken), messageId);
            }
            await streamResponseHandler(response, socket, payload.chatId);
            
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setLoading(false);
            disabledInput.current = null;
            setShowHoverIcon(true);
        }
    }

    const getAICustomGPTResponse = async (payload: AgentChatPayloadType, socket: Socket, isRegenerated: boolean = false, newToken?: string) => {
        try {
            setLoading(true);
            setShowHoverIcon(false);
            const { token, companyId } = await getCommonPythonPayload();
            const authToken = newToken || token;
            const messageId = payload.messageId

            const fileIds = [], tags = [];
            
            if (isRegenerated) {
                payload.media.forEach((file: UploadedFileType) => {
                    if (file.isCustomGpt) return;
                    if (file.uri.startsWith('http')) return;
                    fileIds.push(file._id);
                    tags.push(file.uri.split('/')[2]);
                });
            } else {
                const fileData = uploadData;

                if (!uploadData || uploadData.length === 0) {
                    console.error('Upload data is empty or unavailable:', uploadData);
                    return;
                }

                const files = Array.isArray(fileData) ? fileData : [fileData];
                files.forEach((file: UploadedFileType) => {
                    if (file.isCustomGpt) return;
                    if (file.uri.startsWith('http')) tags.push(file.uri.split('/documents/')[1]);
                    else tags.push(file.uri.split('/')[2]);
                    fileIds.push(file._id);
                });
            }
            const response = await fetch(
                `${LINK.PYTHON_API_URL}${API_PREFIX}/chat/streaming-custom-gpt-chat-with-doc`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        thread_id: messageId,
                        query: payload.text,
                        custom_gpt_id: payload.custom_gpt_id,
                        prompt_id: payload.prompt_id,
                        llm_apikey: payload.modelId,
                        chat_session_id: payload.chatId,
                        company_id: companyId,
                        delay_chunk: 0.02,
                        code: payload.code,
                        model_name: payload.model_name,
                        provider: payload.provider,
                        file_id: fileIds,
                        tag: tags,
                        // isregenerated: payload.isregenerated,
                        msgCredit: payload.msgCredit,
                        // is_paid_user: payload.is_paid_user
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${TOKEN_PREFIX}${authToken}`,
                    },
                }
            );
            if (!response.ok) {
                return await retryApiCall(response, payload, socket, (newToken) => getAICustomGPTResponse(payload, socket, isRegenerated, newToken), messageId);
            }
            if (response.status === STATUS_CODE.SUCCESS)
                await streamResponseHandler(response, socket, payload.chatId);
            else if (response.status === STATUS_CODE.MULTI_RESPONSE)
                await generateImageOpenAI(socket, response, { chatId: payload.chatId, messageId });
            
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setLoading(false);
            disabledInput.current = null;
            setShowHoverIcon(true);
        }
    }

    const setChatTitleByAI = async (payload: ChatTitlePayloadType, newToken?: string) => {
        try {
            const { token, companyId } = await getCommonPythonPayload();
            const authToken = newToken || token;

            const response = await fetch(`${LINK.PYTHON_API_URL}${API_PREFIX}/title/title-chat-generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${TOKEN_PREFIX}${authToken}`,
                },
                body: JSON.stringify({
                    title: '',
                    thread_id: payload.messageId,
                    llm_apikey: payload.modelId,
                    chat_session_id: payload.chatId,
                    code: payload.code,
                    provider: payload.provider,
                    model_name: payload.model_name,
                    company_id: companyId
                })
            })
            if (!response.ok) {
                if (response.status === STATUS_CODE.UNAUTHENTICATED) {
                    const newToken = await pythonRefreshToken();
                    return await setChatTitleByAI(payload, newToken);
                }
                return;
            }
            const data = await response.json();
            dispatch(setChatMessageAction(data));
        } catch (error) {
            console.error('error: ', error);
        }
    }

    const generateImageOpenAI = async (socket: Socket, response: Response, payload: CustomErrorPayloadType) => {
        try {
            setLoading(true);
            const data = await response.json();
            if (!response.ok) {
                // set error message 
                setConversations(prevConversations => {
                    const updatedConversations = [...prevConversations];
                    const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
                    lastConversation.response = data.message;
                    updatedConversations[updatedConversations.length - 1] = lastConversation;
                    return updatedConversations;
                });
                setAnswerMessage(data.message);
                return;
            }
            setConversations(prevConversations => {
                const updatedConversations = [...prevConversations];
                const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
                lastConversation.response = data.message;
                updatedConversations[updatedConversations.length - 1] = lastConversation;
                return updatedConversations;
            });
            setAnswerMessage(data.message);
            socket.emit(SOCKET_EVENTS.STOP_STREAMING, { chatId: payload.chatId, proccedMsg: data.message });
        } catch (error) {
            console.error('error: generateImageOpenAI', error);
        } finally {
            setLoading(false);
            disabledInput.current = null;
        }
    }

    const chatCanvasAiResponse = async (socket: Socket, payload, newToken?: string) => {
        try {
            setLoading(true);
            setShowHoverIcon(false);
            const { token, companyId } = await getCommonPythonPayload();
            const authToken = newToken || token;
            const messageId = payload.messageId

            const response = await fetch(
                `${LINK.PYTHON_API_URL}${API_PREFIX}/canvas/canvas-chat-generate`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        old_thread_id: payload.currentMessageId, // selected conversation Id
                        new_thread_id: messageId, // new messageId
                        query: payload.text,
                        llm_apikey: payload.modelId,
                        chat_session_id: payload.chatId,
                        company_id: companyId,
                        start_index: payload.startIndex,
                        end_index: payload.endIndex,
                        delay_chunk: 0.02,
                        code: payload.code,
                        model_name:payload.model_name,
                        provider: payload.provider,
                        // isregenerated: payload.isregenerated,
                        msgCredit: payload.msgCredit,
                        // is_paid_user: payload.is_paid_user
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${TOKEN_PREFIX}${authToken}`,
                    },
                }
            );
            if (!response.ok) {
                return await retryApiCall(response, payload, socket, (newToken) => chatCanvasAiResponse(socket, payload, newToken), messageId);
            }
            await streamResponseHandler(response, socket, payload.chatId);
        } finally {
            setLoading(false);
            setShowHoverIcon(true);
            disabledInput.current = null;
        }
    }


    const getAIProAgentChatResponse = async (payload: ProAgentChatPayloadType, socket: Socket, newToken?: string) => {
        try {
            setLoading(true);
            setShowHoverIcon(false);
            const { token, companyId } = await getCommonPythonPayload();
            const authToken = newToken || token;
            const messageId = payload.thread_id

            const response = await fetch(
                `${LINK.PYTHON_API_URL}${API_PREFIX}/agent/pro-agent`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        thread_id: messageId,
                        query: payload.query,
                        chat_session_id: payload.chatId,
                        company_id: companyId,
                        delay_chunk: 0.02,
                        pro_agent_code: payload.pro_agent_code,
                        brain_id: payload.brain_id,
                        agent_extra_info: payload.agent_extra_info,
                        msgCredit: payload.msgCredit
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${TOKEN_PREFIX}${authToken}`,
                    },
                }
            );
            if (!response.ok) {
                return await retryApiCall(response, payload, socket, (newToken) => getAIProAgentChatResponse(payload, socket, newToken), messageId);
            }
            
            await streamResponseHandler(response, socket, payload.chatId);            
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setLoading(false);
            disabledInput.current = null;
            setShowHoverIcon(true);
        }
    }

    const socketAllConversation = async (response: SocketConversationType) => {
        try {
            if (!response) {
                setListLoader(false);
                return;
            }
            setResponseLoading(true);
            const { data, paginator } = response;
            if (!data.length) {
                dispatch(setLastConversationDataAction({}));
                router.push(routes.main);
                setListLoader(false);
                return;
            }
            const conversations = data.map((m) => {
                try {
                    // Decrypt the message and answer with error handling
                    let decodedMessage;
                    try {
                        
                        // Check if message is already an object (not encrypted)
                        if (typeof m.message === 'object' && m.message !== null) {
                            // Message is already decrypted/plain object
                            decodedMessage = JSON.stringify(m.message);
                        } else if (typeof m.message === 'string') {
                            // Message is encrypted string, decrypt it
                            decodedMessage = decryptedData(m.message);
                        } else {
                            throw new Error('Invalid message format');
                        }

                        if (!decodedMessage || decodedMessage.trim() === '') {
                            throw new Error('Decryption returned empty string');
                        }
                    } catch (decryptError) {
                        console.error('Error decrypting message:', decryptError, 'Message ID:', m._id, 'Message type:', typeof m.message);
                        decodedMessage = JSON.stringify({ data: { content: 'Error decrypting message' } });
                    }

                    let decodedAnswer = null;
                    if (m.ai) {
                        try {
                            // Check if AI response is already an object (not encrypted)
                            if (typeof m.ai === 'object' && m.ai !== null) {
                                // AI response is already decrypted/plain object
                                decodedAnswer = JSON.stringify(m.ai);
                            } else if (typeof m.ai === 'string') {
                                // AI response is encrypted string, decrypt it
                                decodedAnswer = decryptedData(m.ai);
                            } else {
                                throw new Error('Invalid AI response format');
                            }

                            if (!decodedAnswer || decodedAnswer.trim() === '') {
                                throw new Error('Decryption returned empty string');
                            }
                        } catch (decryptError) {
                            console.error('Error decrypting answer:', decryptError, 'Message ID:', m._id, 'AI type:', typeof m.ai);
                            decodedAnswer = JSON.stringify({ data: { content: 'Error decrypting response' } });
                        }
                    }

                    // Safely parse JSON with error handling
                    let prompt;
                    try {
                        prompt = JSON.parse(decodedMessage);
                    } catch (parseError) {
                        console.error('Error parsing message JSON:', parseError, 'Raw message:', decodedMessage?.substring(0, 100));
                        prompt = { data: { content: m.message || 'Error parsing message' } }; // Fallback structure
                    }

                    let answer;
                    if (m.proAgentData?.code === ProAgentCode.SEO_OPTIMISED_ARTICLES && !m.proAgentData?.hasOwnProperty('step4')) {
                        answer = { data: { content: '' } };
                    } else if (decodedAnswer) {
                        try {
                            answer = JSON.parse(decodedAnswer);
                        } catch (parseError) {
                            console.error('Error parsing answer JSON:', parseError, 'Raw answer:', decodedAnswer);
                            answer = { data: { content: decodedAnswer || '' } }; // Fallback structure
                        }
                    } else {
                        answer = { data: { content: m.openai_error?.content || AI_MODEL_CODE.CONVERSATION_ERROR } };
                    }

            let formattedResponse = answer.data.content;

                // Handle images and citations only if responseAPI is "PERPLEXITY"
            if (m?.responseAPI === AI_MODEL_CODE.PERPLEXITY) {
                const additionalKwargs = answer.data.additional_kwargs || {};
                const images = additionalKwargs.images || [];
                const citations = additionalKwargs.citations || [];

                if (images.length > 0 || citations.length > 0) {
                    const markdownExtras = buildImagesThenCitationsMarkdown([], citations);
                    formattedResponse = `${answer.data.content}\n\n${markdownExtras}`;
                }
            }

            const gptCoverImage = typeof m.customGptId === 'object' && m?.customGptId?.coverImg?.uri ? `${LINK.AWS_S3_URL}${m?.customGptId?.coverImg?.uri}` : defaultCustomGptImage.src
                return {
                    id: m._id,
                    user: m.user,
                    message: prompt.data.content,
                    response: formattedResponse,
                    responseModel: m.responseModel,
                    seq: m.seq,
                    media: m?.media,
                    promptId: m?.promptId,
                    customGptId: m?.customGptId,
                    proAgentData: m?.proAgentData,
                    answer_thread: m?.answer_thread || {
                        count:0,
                        users:[]
                    },
                    question_thread: m?.question_thread || {
                        count:0,
                        users:[]
                    },
                    responseAPI: m?.responseAPI,
                    cloneMedia: m?.cloneMedia,
                    model:m?.model,
                    coverImage:gptCoverImage,
                    responseAddKeywords: answer.data.additional_kwargs,
                    citations: m.citations,
                    responseMetadata: answer.data.response_metadata
                }
                } catch (error) {
                    console.error('Error processing conversation message:', error, 'Message ID:', m._id);
                    // Return a fallback conversation object to prevent the entire map from failing
                    return {
                        id: m._id,
                        user: m.user,
                        message: 'Error loading message',
                        response: 'Error loading response',
                        responseModel: m.responseModel,
                        seq: m.seq,
                        media: m?.media,
                        promptId: m?.promptId,
                        customGptId: m?.customGptId,
                        proAgentData: m?.proAgentData,
                        answer_thread: m?.answer_thread || { count: 0, users: [] },
                        question_thread: m?.question_thread || { count: 0, users: [] },
                        responseAPI: m?.responseAPI,
                        cloneMedia: m?.cloneMedia,
                        model: m?.model,
                        coverImage: defaultCustomGptImage.src,
                        responseAddKeywords: {},
                        citations: m.citations
                    };
                }
            });
           
            // Update both state values together to ensure synchronization
            setConversations((prevConversations) => {
                const existingIds = new Set(prevConversations.map(conv => conv.id));
                const newConversations = conversations.filter(conv => !existingIds.has(conv.id));
                
                const updatedConversations = [...prevConversations];
                updatedConversations.unshift(...newConversations);     
                setConversationPagination(paginator);
                
                return updatedConversations;
            });
            if (paginator.offset === 0) {
                const lastConversation = conversations[conversations.length - 1];
                dispatch(setLastConversationDataAction(lastConversation));
                if (lastConversation.responseAPI === API_TYPE_OPTIONS.PRO_AGENT && !lastConversation.response && blockProAgentAction(true, lastConversation?.proAgentData?.code)) {
                    handleProAgentUrlState(lastConversation.responseModel, lastConversation.proAgentData.code);
                } else {
                    const includeModel = Object.values(AI_MODAL_NAME).includes(lastConversation.responseModel)
                    if(includeModel){
                        handleModelSelectionUrl(lastConversation.responseModel);
                    }else{
                        handleModelSelectionUrl(AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED);
                    }
                }
                getChatMembers(params.id);
            }
        } finally {
            setListLoader(false);
        }
    }

    // Function to extract section based on start and optional end keywords
    // const extractSection = (input, startKeyword, endKeyword = null) => {
    //     const regex = endKeyword
    //         ? new RegExp(
    //               `${startKeyword}\\s*(\\[[\\s\\S]*?\\])(?=\\s*,\\s*${endKeyword}|$)`
    //           )
    //         : new RegExp(`${startKeyword}\\s*(\\[[\\s\\S]*?\\])`); // Without end keyword
    //     const match = regex.exec(input);
    //     if (!match) {
    //         console.error(`No data found for ${startKeyword}.`);
    //         return [];
    //     }

    //     let rawData = match[1].trim();
    //     rawData = rawData.replace(/'/g, '"'); // Convert single quotes to double quotes
    //     try {
    //         return JSON.parse(rawData);
    //     } catch (error) {
    //         console.error(`Error parsing data for ${startKeyword}:`, error);
    //         return [];
    //     }
    // }

    // Function to generate markdown for images and citations
    const buildImagesThenCitationsMarkdown = (imagesArray, citationsArray) => {
        let md = '';

        // 1) Images at the top
        // if (imagesArray.length > 0) {
        //     md += '### Images\n\n';
        //     const markdownImages = imagesArray
        //         .map((image) => `[![Image](${image.image_url})](${image.origin_url} "View Image")`)
        //         .join('\n');
        //     md += markdownImages + '\n\n';
        // }

        // 2) Citations after images
        if (citationsArray.length > 0) {
            md += '### Sources\n\n';
            const markdownCitations = citationsArray
                .map((citation) => `- [${citation}](${citation})`)
                .join('\n');
            md += markdownCitations + '\n\n';
        }
        return md;
    }

    // Main streaming function
    const streamPerplexityResponse = async (
        response: Response,
        messageId: string,
        socket: Socket,
        chatId: string | string[]
    ) => {
        // setLoading(true);

        // const reader = response.body.getReader();
        // const decoder = new TextDecoder('utf-8');
        // const currentUser = getCurrentUser();

        // let proccedMsg = '';

        // // Store images/citations from the first chunk
        // let firstChunkImages = [];
        // let firstChunkCitations = [];
        // let firstChunk = true;

        // while (true) {
        //     const { value, done } = await reader.read();
        //     if (done) {
        //         setConversations((prevConversations) => {
        //             const updatedConversations = [...prevConversations];
        //             const lastConversation = {
        //                 ...updatedConversations[
        //                     updatedConversations.length - 1
        //                 ],
        //             };
        //             lastConversation.response = proccedMsg;
        //             updatedConversations[updatedConversations.length - 1] =
        //                 lastConversation;
        //             return updatedConversations;
        //         });
        //         setAnswerMessage('');
        //         break;
        //     }

        //     const chunk = decoder.decode(value);
        //     const lines = chunk.split('\n');
        //     let thisChunkText = '';

        //     lines.forEach((line) => {
        //         if (firstChunk && line.includes('images:')) {
                   
        //             firstChunkImages = extractSection(
        //                 chunk,
        //                 'images:',
        //                 'citations:'
        //             );
        //             firstChunkCitations = extractSection(chunk, 'citations:');
        //         }

                
        //         if (line.startsWith('data:')) {
        //             // Match everything from 'data:' to ',images'
        //             const dataRegex = /^data:\s*(.*?)(?=,images|$)/;
        //             const dataMatch = dataRegex.exec(line);
        //             if (dataMatch) {
        //                 let dataPart = dataMatch[1].trim(); 
        //                 if (
        //                     dataPart.startsWith("b'") ||
        //                     dataPart.startsWith('b"')
        //                 ) {
        //                     dataPart = dataPart.slice(2, -1);
        //                     dataPart = dataPart
        //                         .replace(/\\(['"\\])/g, '$1')
        //                         .replace(/\\n/g, '\n')
        //                         .replace(/\\t/g, '\t')
        //                         .replace(/\\t\\t/g, '\t\t');
        //                 }
        //                 dataPart = dataPart.replace(
        //                     /\\x([\d\w]{2})/gi,
        //                     (_, grp) => String.fromCharCode(parseInt(grp, 16))
        //                 );
        //                 dataPart = dataPart.replace(
        //                     /\\u([\d\w]{4})/gi,
        //                     (_, grp) => String.fromCharCode(parseInt(grp, 16))
        //                 );

        //                 thisChunkText += decodeURIComponent(escape(dataPart));
        //             }
        //         }
        //     });

        //     let finalTextForThisChunk = thisChunkText;
        //     if (firstChunk) {
        //         const mdBlock = buildImagesThenCitationsMarkdown(
        //             firstChunkImages,
        //             firstChunkCitations
        //         );
        //         finalTextForThisChunk = thisChunkText + mdBlock;
        //         firstChunk = false;
        //     }

        //     proccedMsg += finalTextForThisChunk;
        //     setAnswerMessage((prev) => prev + finalTextForThisChunk);

        //     socket.emit(SOCKET_EVENTS.START_STREAMING, {
        //         chunk: finalTextForThisChunk,
        //         chatId,
        //         userId: currentUser._id,
        //     });

        //     setLoading(false);
        // }

        // setShowTimer(true);
        // socket.emit(SOCKET_EVENTS.STOP_STREAMING, {
        //     chatId,
        //     proccedMsg,
        //     userId: currentUser._id,
        // });


        setLoading(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let proccedMsg = '';
        const currentUser = getCurrentUser();

        const citationsList = new Set(); 
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) {   
                setConversations(prevConversations => {
                    const updatedConversations = [...prevConversations];
                    const lastConversation = { ...updatedConversations[updatedConversations.length - 1] };
                    
                    if(lastConversation.model.code == API_TYPE_OPTIONS.PERPLEXITY){
                        const citationPattern = /\[(\d+)\]\(([^)]+)\)/g;

                        proccedMsg = proccedMsg.replace(citationPattern, (match, p1, p2) => {
                            return ` [${p1}](${p2})`;
                        });


                    // Append Sources with citations to proccedMsg
                    if (citationsList.size > 0) {
                        const formattedSources = Array.from(citationsList)
                            .map(citation => `- ${citation}`)
                            .join('\n');

                        proccedMsg += `\n\n### Sources\n${formattedSources}`;
                    }


                        lastConversation.response = proccedMsg;
                    }else{
                        lastConversation.response = proccedMsg;
                    }
                    updatedConversations[updatedConversations.length - 1] = lastConversation;
                    return updatedConversations;
                });
                setAnswerMessage('');
                break;
            }

            const chunk = decoder.decode(value);
         

            const chunkParts = chunk.split('\n')
            .filter(line => line.startsWith('data: '))
            .map(line => {
                
                const dataRegex = /^data:\s*(.*?)(?=,citations:|$)/;
                const dataMatch = dataRegex.exec(line);

                
                const citationRegex = /,citations:\[(.*?)\]/;
                const citationMatch = citationRegex.exec(line);

                if (citationMatch) {
                    const citations = citationMatch[1]
                        .split(',')
                        .map(cite => cite.trim().replace(/^['"]|['"]$/g, '')); 

                    citations.forEach(cite => citationsList.add(cite));
                }

                return dataMatch ? dataMatch[1].trim() : null;
            })
            .filter(Boolean); // Remove null values


            
            const decodedMessage = chunkParts.map(part => {
                try {
                    return JSON.parse(part);
                } catch (error) {
                    if (part.startsWith("b'") || part.startsWith('b"')) {
                        part = part.slice(2, -1);
                        part = part.replace(/\\(['"\\])/g, '$1')
                                   .replace(/\\n/g, '\n')
                                   .replace(/\\t/g, '\t')
                                   .replace(/\\t\\t/g, '\t\t');
                    }
                    part = part.replace(/\\x([\d\w]{2})/gi, (_, grp) => String.fromCharCode(parseInt(grp, 16)));
                    part = part.replace(/\\u([\d\w]{4})/gi, (_, grp) => String.fromCharCode(parseInt(grp, 16)));
                }
                return decodeURIComponent(escape(part));
            }).join('');

            setLoading(false);
            socket.emit(SOCKET_EVENTS.START_STREAMING, { chunk: decodedMessage, chatId, userId: currentUser._id });
            proccedMsg += decodedMessage;
            setAnswerMessage(prev => prev + decodedMessage);
        }
        setShowTimer(true);
        socket.emit(SOCKET_EVENTS.STOP_STREAMING, { chatId, proccedMsg, userId: currentUser._id });
    };

    const getPerplexityResponse = async (socket: Socket, payload: PerplexityPayloadType, newToken?: string) => {
        try {

            setLoading(true);
            setShowHoverIcon(false);
            const { token, companyId } = await getCommonPythonPayload();
            const authToken = newToken || token;
            const messageId = payload.messageId

            const response = await fetch(`${LINK.PYTHON_API_URL}${API_PREFIX}/browser/stream-browser-chat`, {
                method: 'POST',
                  body: JSON.stringify({
                    thread_id: payload.messageId,
                    query: payload.text,
                    prompt_id: payload.prompt_id,
                    llm_apikey: payload.modelId,
                    chat_session_id: payload.chatId,
                    company_id: companyId,
                    delay_chunk: 0.02,
                    code: payload.code,
                    model_name: payload.model_name,
                    provider: payload.provider,
                    // isregenerated: payload.isregenerated,
                    msgCredit: payload.msgCredit,
                    // is_paid_user: payload.is_paid_user
                }),
                  headers:{
                      'Content-Type': 'application/json',
                      'Authorization': `${TOKEN_PREFIX}${authToken}`
                    }
                    
                })
            if (!response.ok) {
                return await retryApiCall(response, payload, socket, (newToken) => getPerplexityResponse(socket, payload, newToken), messageId);
            }
             await streamPerplexityResponse(response, messageId, socket, payload.chatId);
        } catch (error) {
            console.error('Error processing payment:', error);
        }finally{
            setLoading(false);
            disabledInput.current = null;
            setShowHoverIcon(true);
        }
    }

    const generateSeoArticle = async (payload: SeoArticlePayloadType, socket: Socket, newToken?: string) => {
        try {
            setLoading(true);
            setShowHoverIcon(false);
            const { companyId, token } = await getCommonPythonPayload();
            const authToken = newToken || token;
            const response = await fetch(
                `${LINK.PYTHON_API_URL}${API_PREFIX}/agent/pro-agent/article-generation`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${TOKEN_PREFIX}${authToken}`,
                    },
                    body: JSON.stringify({
                        thread_id: payload.messageId,
                        company_id: companyId,
                        delay_chunk: 0.02,
                        pro_agent_code: ProAgentCode.SEO_OPTIMIZER,
                        agent_extra_info : {
                            topics : payload?.topicName
                        }
                    }),
                }
            );
            if (!response.ok) {
                return await retryApiCall(response, payload, socket, () => generateSeoArticle(payload, socket, newToken), payload.messageId);
            }
            
            await streamResponseHandler(response, socket, payload.chatId);
        } catch (error) {
            console.error('Error generating seo article', error);
            return null;
        } finally {
            setLoading(false);
            setShowHoverIcon(true);
            disabledInput.current = null;
            handleModelSelectionUrl(AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED);
        }
    }

    const getSalesCallResponse = async (payload: SalesCallPayloadType, socket: Socket) => {
        try {
            setLoading(true);
            setShowHoverIcon(false);
            const { companyId, token } = await getCommonPythonPayload();
            const response = await fetch(
                `${LINK.PYTHON_API_URL}${API_PREFIX}/agent/pro-agent/sales-call-analyzer`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${TOKEN_PREFIX}${token}`,
                    },
                    body: JSON.stringify({
                        thread_id: payload.messageId,
                        chat_session_id: payload.chatId,
                        query: payload.text,
                        company_id: companyId,
                        delay_chunk: 0.02,
                        pro_agent_code: ProAgentCode.SALES_CALL_ANALYZER,
                        service_code: payload.service_code,
                        product_summary_code: payload.product_summary_code,
                        msgCredit: payload.msgCredit,
                        agent_extra_info : {
                            url : payload.product_info,
                            ...(payload.prompt && { prompt : payload.prompt })
                        }
                    }),
                }
            );
            if (!response.ok) return customErrorResponse(response, { chatId: payload.chatId, messageId: payload.messageId }, socket);
            
            await streamResponseHandler(response, socket, payload.chatId);
        } catch (error) {
            console.error('Error generating sales call response', error);
        } finally {
            setLoading(false);
            setShowHoverIcon(true);
            disabledInput.current = null;
        }
    }

    const retryApiCall = async (response: Response, payload: any, socket: Socket, retryCallBack: (newToken?: string) => Promise<unknown>, messageId: string) => {
        if (response.status === STATUS_CODE.UNAUTHENTICATED) {
            const newToken = await pythonRefreshToken();
            return await retryCallBack(newToken);
        }
        return customErrorResponse(response, { chatId: payload.chatId, messageId }, socket);
    }

    
    return {
        enterNewPrompt,
        getAllConversation,
        conversations,
        answerMessage,
        setAnswerMessage,
        setConversations,
        getAINormatChatResponse,
        setChatTitleByAI,
        getAIDocResponse,
        getAICustomGPTResponse,
        loading,
        responseLoading,
        conversationPagination,
        generateImageOpenAI,
        showTimer,
        setShowTimer,
        disabledInput,
        setLoading,
        chatCanvasAiResponse,
        listLoader,
        socketAllConversation,
        getPerplexityResponse,
        getCommonPythonPayload,
        showHoverIcon,
        getAIProAgentChatResponse,
        isStreamingLoading,
        streamResponseHandler,
        customErrorResponse,
        generateSeoArticle,
        getSalesCallResponse,
    };
};

export default useConversation;