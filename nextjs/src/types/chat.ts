import { FileType, FormatBotType, FormatBrainType, FormatCompanyType, FormatUserType, ObjectType, PaginatorType, ProAgentCode } from './common';
import { SALES_CALL_ANALYZER_API_CODE, WebProjectProposalExtraInfoType } from './proAgents';
import { CreditInfoType } from './user';

export type PersistTagType = {
    custom_gpt_id: undefined | string;
    responseModel: undefined | string;
    bot: undefined | ObjectType;
    provider? : string
};

export type GPTTypesOptions = 'Prompts' | 'CustomGPT' | 'Docs';

export type SelectedContextType = {
    type: GPTTypesOptions | null;
    prompt_id: undefined | string;
    custom_gpt_id: undefined | string;
    doc_id: undefined | string;
    textDisable: boolean;
    attachDisable: boolean;
    title: undefined | string;
    isRemove : boolean;
};

export interface UploadedFileType {
    _id: string;
    name: string;
    uri: string;
    type: string;
    mime_type?: string;
    isCustomGpt?: boolean;
    isDocument?: boolean;
    isPrompt?: boolean;
    gptname?: string;
    gptCoverImage?: string;
    embedding_api_key?: string;
    responseModel?: string;
    persistTag?: PersistTagType;
}

export type SelectedContextData = {
    brain?: FormatBrainType;
    brainId?: string;
    brandInfo?: ObjectType;
    companyInfo?: ObjectType;
    productInfo?: ObjectType;
    content?: string;
    createdAt?: string;
    defaultprompt?: boolean;
    isActive?: boolean;
    isCompleted?: boolean;
    tags?: string[];
    title?: string;
    updatedAt?: string;
    user?: FormatUserType;
    website?: string[];
    _id?: string;
    doc?: FileType;
    embedding_api_key?: string;
    userId?: FormatUserType;
    owner?: FormatUserType;
    slug?: string;
    systemPrompt?: string;
    responseModel?: {
        id?: string;
        name: string;
        bot: FormatBotType;
        company: FormatCompanyType;
        provider?: string;
    };
    itrTimeDuration?: string;
    maxItr?: number;
    coverImg?: FileType;
    charimg?: string;
    summaries?: ObjectType;
    fileId?: string;
    isremove?:boolean;
    isRemove?:boolean;
};

type ChatRecord = {
    _id: string;
    title: string;
    teams?: ObjectType[];
    user?: FormatUserType;
    createdAt: string;
    updatedAt: string;
}

export type ChatListType = {
    brain: FormatBrainType;
    chatId: ChatRecord;
    createdAt: string;
    updatedAt: string;
    isFavourite: boolean;
    isNewChat: boolean;
    title: string;
    user: FormatUserType;
    _id: string;
}

export type ConversationType = {
    answer_thread: {
        count: number;
        users: ObjectType[];
        last_time: string;
    },
    cloneMedia: ObjectType | undefined;
    converImage: string;
    customGptId: string | undefined | PopulateAgentType;
    id: string;
    media: UploadedFileType[];
    message: string;
    model: FormatBotType;
    promptId: string | undefined;
    question_thread: {
        count: number;
        users: ObjectType[];
        last_time: string;
    },
    response: string;
    responseAPI: string;
    responseModel: string;
    seq: string | number;
    user: FormatUserType;
    img_url?: string;
    ai?: string;
    proAgentData?: ProAgentDataType;
    responseAddKeywords?: any;
    openai_error?: {
        content: string;
        error_code: 'common_response';
    };
    _id?: string;
    customGptTitle?: string;
    coverImage?: string;
    citations?: CitationResponseType[],
    responseMetadata?: {
        search_results: any[];
        citations: any[];
        images: string[];
        videos: string[];
    };
}

export type ForkChatType = {
    closeModal: () => void;
    forkData: ConversationType[];
    selectedBrain: {
        user: FormatUserType;
        value: string;
        label: string;
        slug: string;
        id: string;
    };
    title: string;
}

export type PromptEnhancePayloadType = {
    query: string;
    apiKey: string;
}

export type NormalChatPayloadType = {
    text: string;
    modelId: string;
    chatId: string | string[];
    img_url?: string | undefined;
    custom_gpt_id?: string | undefined;
    prompt_id?: string | null;
    code: string;
    model_name: string;
    messageId: string;
    provider: string;
    media?: UploadedFileType[];
    // isregenerated: boolean;
    msgCredit: number;
    mcp_tools?: Record<string, string[]>;
}

export type DocumentChatPayloadType = NormalChatPayloadType & {
    file_id?: string[];
    tag?: string[];
}

export type AgentChatPayloadType = NormalChatPayloadType & {
    file_id?: string[];
    tag?: string[];
}

export type ChatCanvasPayloadType = {
    text: string;
    modelId: string;
    chatId: string | string[];
    custom_gpt_id: string | undefined;
    prompt_id: string | undefined;
    currentMessageId: string;
    startIndex: number;
    endIndex: number;
    code: string;
    model_name: string;
    messageId: string;
    provider: string;
}

export type ChatTitlePayloadType = {
    modelId: string;
    chatId: string | string[];
    code: string;
    messageId: string;
    provider: string;
    model_name: string;
    company_id: string;
}

export type PerplexityPayloadType = {
    messageId: string;
    text: string;
    prompt_id: string | undefined;
    modelId: string;
    chatId: string | string[];
    companyId: string;
    code: string;
    model_name: string;
    provider: string;
    // isregenerated: boolean;
    msgCredit: number;
    // is_paid_user: boolean;
}


export type PopulateAgentType = {
    _id: string;
    slug: string;
    title: string;
    systemPrompt: string;  
    coverImg: FileType;
}

export type ChatRefineActionPayloadType = {
    selectedMessageId: string;
    startIndex: number;
    endIndex: number;
    question: string;
}

export type SocketConversationType = {
    messageCount: boolean;
    data: ConversationType[];
    paginator: PaginatorType;
    creditInfo: CreditInfoType;
}

export type ProAgentPayloadType = {
    thread_id: string;
    query: string;
    chat_session_id: string;
    company_id: string;
    delay_chunk?: number;
    pro_agent_code: ProAgentCode;
    brain_id: string;
}

export type ProAgentDataPayloadType = {
    code: string;
    url: string;
}

export type ProAgentChatPayloadType = {
    thread_id: string;
    query: string;
    pro_agent_code: string;
    brain_id: string;
    agent_extra_info: WebProjectProposalExtraInfoType;
    chatId: string;
    msgCredit: number;
}

export type ProAgentDataType = WebProjectProposalExtraInfoType & {
    url?: string;
    code?: ProAgentCode;
    projectName?: string;
    keywords?: string[];
    language?: string;
    location?: string[];
    audience?: string;
    summary?: string;
    fileInfo?: string;
    prompt?: string;
    service_code?: SALES_CALL_ANALYZER_API_CODE.AUDIO | SALES_CALL_ANALYZER_API_CODE.TRANSCRIPT | SALES_CALL_ANALYZER_API_CODE.FATHOM;
    product_summary_code?: SALES_CALL_ANALYZER_API_CODE.URL | SALES_CALL_ANALYZER_API_CODE.DOC;
    product_info?: string;
    audio_url?: string;
    audio_file_metadata?: SalesAgentFileMetadataType[];
    document_file_metadata?: SalesAgentFileMetadataType[];
}

export type SEOAgentStep1Type = {
    business_summary: string;
    target_audience: string;
    target_keywords: string[];
    website: string;
    language: string;
    location: string[];
}

export type SEOAgentStep2Type = {
    targeted_volumes: EdVolume[];
    recommended_volumes: EdVolume[];
}

export type EdVolume = {
    id: string;
    keyword: string;
    search_volume: number;
    competition: Competition | null;
}

export enum Competition {
    Low = 'Low',
}

export type SEOAgentStep3Type = {
    topics: string;
    primary_keywords: string[];
    secondary_keywords: string[];
}

export type SEOAgentStep4Type = {
    status: 'completed';
}

export type SalesAgentFileMetadataType = {
    name: string;
    size: number;
    type: string;
    url: string;
}

export type EditResponseRequestType = {
    messageId: string;
    updatedResponse: string;
};

export type EditResponseResponseType = {
    success: boolean;
    message: string;
    data: {
        messageId: string;
        updatedResponse: string;
        [key: string]: any;
    };
};

export type CitationResponseType = {
    url: string;
    title: string;
    snippet: string;
    domain: string
}