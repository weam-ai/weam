import { ProAgentCode } from "@/types/common";

export const API_RESPONSE_LOGIN = 'LOGIN';
export const DEFAULT_NEXT_API_HEADER = { 'Content-Type': 'application/json' };
export const API_SUCCESS_RESPONSE = 'SUCCESS';
export const NUMBER_OF_DIGITS_IN_OTP = 6;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_PAGE = 1;
export const EMAIL_DEFAULT_LIMIT = 100;
export const DEFAULT_SORT = -1;
export const DEFAULT_OFFSET = 0;
export const PAGE_LIMIT = [10, 20, 30, 40, 50];
export const EMAIL_PAGE_LIMIT = [50, 100, 200, 500];
export const DEFAULT_CURRENT_PAGE = 0;
export const INFINITY_LIMIT = 'Infinity';
export const SPACE_REMOVE_REGEX = / /g;
export const DEFAULT_FULL_DATE_FORMAT = 'YYYY/MM/DD hh:mm A';
export const DEFAULT_DATE_FORMAT = 'MM-DD-YYYY';
export const DEFAULT_TIME_FORMAT = 'hh:mm A';
export const ASCENDING_SORT = 1;
export const DECENDING_SORT = -1;
export const MAX_PAGE_RECORD = 20;

export const MODULES = {
    USER: 'user',
    MEMBERS: 'members',
    PERMISSION: 'permission',
    ROLE: 'role',
    COUNTRY: 'country',
    STATE: 'state',
    CITY: 'city',
    ZIPCODE: 'zipCode',
    COMPANY: 'company',
    EMAIL_NOTIFICATION: 'emailNotification',
    AUTH: 'auth',
    NOTIFICATION: 'notification',
    MODEL: 'bot',
    USER_MODEL: 'userbot',
    WORKSPACE: 'workspace',
    WORKSPACEUSER: 'workspaceuser',
    BRAINS: 'brain',
    BRAINSUSER: 'brainuser',
    CHAT: 'chat',
    CHAT_MEMBER: 'chat-member',
    PROMPT: 'prompt',
    MESSAGE: 'message',
    CHAT_DOCS: 'chat-doc',
    CUSTOM_GPT: 'customgpt',
    SHARE_CHAT: 'sharechat',
    REPLAY_THREAD: 'reply-thread',
    PROFILE: 'profile',
    BILLING: 'billing',
    TEAM:'team',
    TEAM_BRAIN:'teamBrain',
    TEAM_WORKSPACE:'teamWorkspace',
    STORAGE_REQUEST:'storagerequest',
    INVOICE: 'invoice',
    TAB_PROMPT_LIST: 'tabPromptList',
    TAB_AGENT_LIST: 'tabAgentList',
    TAB_DOCUMENT_LIST: 'tabDocumentList',
    CONFIGURATION_ENV: 'configurationEnv',
    IMPORT_CHAT: 'import-chat'
} as const;

export const MODULE_ACTIONS = {
    GET: 'get',
    LIST: 'list',
    CREATE: 'create',
    VIEW: 'view',
    UPDATE: 'update',
    PARTIAL: 'partial',
    RESTORE: 'restore',
    DELETE: 'delete',
    DELETEALL: 'deleteall',
    LOGIN: 'login',
    LOGOUT: 'logout',
    MFALOGIN: 'mfaLogin',
    ADMIN_PREFIX: 'admin',
    AUTH: 'auth',
    ACTIVE: 'active',
    COMMON_PREFIX: 'common',
    WEB_PREFIX: 'web',
    EXPORT: 'export',
    SIGNUP: 'register',
    SEND_MAIL: 'sendMail',
    FORGOT_PASSWORD: 'forgotPassword',
    RESET_PASSWORD: 'resetPassword',
    SEND_MAIL_NOTIFICATION: 'sendMailNotification',
    CHECKOUT_SESSION: 'checkoutSession',
    REGISTER_COMPANY: 'registerCompany',
    CREATE_CUSTOMER: 'createCustomer',
    INVITE_USER: 'inviteUsers',
    WORKSPACE_USER_COUNT: 'workspaceUserCount',
    SHARE_BRAINS: 'shareBrains',
    CHECK_API_KEY: 'checkApiKey',
    SEND_MESSAGE: 'sendMessage',
    REMOVE: 'remove',
    MEDIA_UPLOAD: 'fileUpload',
    ALL_MEDIA_UPLOAD: 'allMediaUpload',
    DELETE_S3_MEDIA : 'deleteS3Media',
    FORK_CHAT: 'forkChat',
    INVITE_LOGIN: 'inviteLogin',
    IMPORT_UPLOAD: 'upload',
    SHARE: 'share',
    SHARE_LIST: 'shareList',
    UNSHARE: 'unshare',
    DELETE_SHARE_CHAT: 'deleteShareChat',
    UPDATE_PROFILE: 'updateProfile',
    GET_PROFILE: 'getProfile',
    GENERATE_MFA_SECRET: 'generateMfaSecret',
    MFA_VERIFICATION: 'mfaVerifcation',
    SAVE_DEVICE_TOKEN: 'saveDeviceToken',
    DELETE_ALL_NOTIFICATION: 'deleteNotifications',
    MARK_ALL_NOTIFICATION: 'markReadNotifications',
    SAVE_RESPONSE_TIME: 'saveResponseTime',
    GET_STORAGE: 'getStorage',
    INCREASE_STORAGE: 'increaseStorage',
    UNREAD_NOTIFICATION_COUNT: 'unreadnoticount',
    CHECK_CHAT_ACCESS: 'checkChatAccess',
    REFRESH_TOKEN: 'refreshToken',
    ASSIGN_GPT: 'assigngpt',
    TOGGLE: 'toggle',
    CHAT_TEAM_DELETE:'chatTeamDelete',
    UPCOMING_INVOICE:'upcomingInvoice',
    UPGRADE_SUBSCRIPTION:'upgradeSubscription',
    UPDATE_PAYMENT_METHOD:'updatePaymentMethod',
    SHOW_DEFAULT_PAYMENT_METHOD:'showDefaultPaymentMethod',
    GET_INVOICE_LIST:'getInvoiceList',
    APPROVE_STORAGE_REQUEST:'approveStorageRequest',
    DECLINE_STORAGE_REQUEST:'declineStorageRequest',
    CHECK_COUPON_CODE:'checkCouponCode',
    RESEND_VERIFICATION_EMAIL: 'resendVerification',
    ON_BOARD_LOGIN: 'onBoardLogin',
    CHANGE_PASSWORD: 'changePassword',
    HUGGING_FACE_HEALTH: 'huggingFaceKeyCheck',
    ANTHROPIC_HEALTH: 'anthropicKeyCheck',
    CHECK_GEMINI_API_KEY: 'geminiKeyCheck',
    BRAIN_LIST_ALL: 'brainListAll',
    GET_MESSAGE_CREDITS: 'getMessageCredits',
    FAVORITE_LIST: 'userFavoriteList',
    FAVORITE: 'favorite',
    GLOBAL_SEARCH: 'globalSearch',
    GET_USAGE: 'getUsage',
    GET_USER_USAGE: 'getUserUsage',
    GENERATE_PRESIGNED_URL: 'generatePresignedUrl',
    GET_WEEKLY_USAGE: 'getWeeklyUsage',
    ADD_CREDIT: 'addCredit',    
    UPDATE_MCP_DATA: 'updateMcpData',
    GET_AI_ADOPTION: 'getAiAdoption',
    SUPER_SOLUTION: 'super-solution',
    ADD: 'add',
    ADD_MEMBERS_TO_SOLUTION_APP: 'addMembersToSolutionApp',
    GET_MEMBERS_TO_SOLUTION_APP: 'getMembersToSolutionApp',
    REMOVE_MEMBERS_FROM_SOLUTION_APP: 'removeMembersFromSolutionApp',
    ADD_TEAMS_TO_SOLUTION_APP: 'addTeamsToSolutionApp',
    GET_TEAMS_TO_SOLUTION_APP: 'getTeamsToSolutionApp',
    REMOVE_TEAMS_FROM_SOLUTION_APP: 'removeTeamsFromSolutionApp',
    GET_SOLUTION_APP_BY_USER_ID: 'getSolutionAppByUserId',
    UPDATE_MESSAGE: 'updateMessage',
    CREATE_FILE_RECORD: 'createFileRecord',
    PAGE_CREATE: 'createPage',
    PAGE_LIST: 'getAllPages',
    PAGE_VIEW: 'getPageById',
    PAGE_UPDATE: 'pageUpdate',
    PAGE_DELETE: 'deletePage',
    GET_ALL_PAGES: 'getAllPages',
    SOLUTION_INSTALL: 'solutionInstall',
    ENHANCE_PROMPT_BY_LLM: 'enhancePromptByLLM',
    GET_IMAGES: 'getImages',
} as const;

export const DATE_TIME_FORMAT = 'DD/MM/YYYY hh:mm A';

export const PASSWORD_REGEX_MESSAGE = 'Your password must contain at least one uppercase letter, one number, and one special character.';
export const EMAIL_REGEX_MESSAGE = 'Please enter your email address.';
export const ALREADY_PRESENT_EMAIL_MESSAGE = 'Email already exist';
export const STORAGE_INCREASE_REQUEST = 'Storage request received. Admin will contact you soon.'; 
export const BRAIN_MEMBER_ADDED = 'Member has been successfully added to the brain'; 
export const FILE_SIZE_MESSAGE = 'Please upload less than 5 MB file'; 
export const PROFILE_IMG_SIZE_MESSAGE = 'Please upload less than 500 KB file'; 
export const API_KEY_MESSAGE = 'API key is required'; 
export const SUBSCRIPTION_CREATED_SUCCESSFULLY = 'Subscription created successfully';
export const FREE_MESSAGE_LIMIT_REACHED_MESSAGE = `You've reached the message limit.`;
export const MESSAGE_CREDIT_LIMIT_REACHED = "You've reached your credit limit";
export const EXPIRED_SUBSCRIPTION_MESSAGE = `Your subscription has expired. Please upgrade your subscription to continue using the service.`
export const PASSWORD_MIN_LENGTH_MESSAGE = 'Password must contain at least 8 characters.';
export const PASSWORD_CONFIRM_MESSAGE = 'Password and confirm password does not match.';
export const NO_ACTIVE_SUBSCRIPTION_FOUND = 'No Active Subscription Found';
export const INVALID_EMAIL_MESSAGE = 'Please enter the valid email.';
export const COMPANY_ADMIN_SUBSCRIPTION_UPDATED = 'Your company admin subscription has been successfully updated';
export const IMAGE_AND_DOC_ERROR_MESSAGE = 'You cannot upload both images and documents at the same time';
export const IMPORT_IN_PROGRESS_MESSAGE = 'Your chats are being imported. Please wait, as this might take a moment. We will notify you via email once the import is successfully completed. Thank you for your patience!';
export const IMPORT_ERROR_MESSAGE = 'There was an error importing your chats. Please try again.';
export const AGENT_AND_DOCUMENT_ERROR_MESSAGE = 'You cannot upload both agent and document at the same time';
export const IMAGE_SELECTION_ERROR_MESSAGE = 'Image selection not allowed for this model';
export const ONLY_ONE_AGENT_ERROR_MESSAGE = 'You can only select one agent at a time';
export const FILE_ALREADY_SELECTED_ERROR_MESSAGE = 'This file is already selected';
export const AGENT_ALREADY_SELECTED_ERROR_MESSAGE = 'This agent is already selected';
export const IMAGE_AND_AGENT_ERROR_MESSAGE = 'You cannot choose both images and agent at the same time';
export const INVALID_DOMAIN_MESSAGE = 'Only company emails are allowed.';
export const PRO_AGENT_ERROR_MESSAGE = 'Start a new chat to use pro agents';
export const FREE_TIER_END_MESSAGE = 'You have reached the free tier limit. Please upgrade your subscription to continue using the service.';

export const REFRENCE_OPTIONS = [
    { value: 'Google Search', label: 'Google Search' },
    { value: 'Google ads', label: 'Google ads' },
    { value: 'Social media', label: 'Social media' },
    { value: 'Email', label: 'Email' },
    { value: 'Reference', label: 'Reference' },
    { value: 'Other', label: 'Other' },
]

export const OTHER_REFRENCE = 'Other';

export const ROLE_TYPE = {
    ADMIN: 'ADMIN',
    OWNER: 'OWNER',
    COMPANY: 'COMPANY',
    USER: 'USER',
    COMPANY_MANAGER: 'MANAGER'
}

export const SEARCH_AND_FILTER_OPTIONS = {
    EMAIL: 'email',
    USER_MODEL_NAME: 'name',
    USER_MODEL_TITLE: 'bot.title',
    USER_EMAIL: 'user.email',
    EMBEDDING_MODAL_TYPE: 1,
    CHAT_MODAL_TYPE: 2,
    IMAGE_MODAL_TYPE: 3,
    BRAIN_DOCS: 'doc.name',
    NORMAL_TITLE: 'title',
    NORMAL_SLUG: 'slug',
    FIRST_NAME: 'fname',
    LAST_NAME: 'lname',
}

export const IGNORE_API_DATAKEY = {
    select: `-__v -createdAt -updatedAt`
}

export const AI_MODEL_CODE = {
    OPEN_AI: 'OPEN_AI',
    LOCAL_LLM: 'LOCAL_LLM',
    GEMINI:'GEMINI',
    LLAMA:'LLAMA',
    HUGGING_FACE: 'HUGGING_FACE',
    ANYSCALE: 'ANYSCALE',
    ANTHROPIC: 'ANTHROPIC',
    AZURE_OPENAI_SERVICE: 'AZURE_OPENAI_SERVICE',
    // default modal selection
    DEFAULT_OPENAI_SELECTED: 'gpt-4.1',
    OPEN_AI_DALL_E_2: 'dall-e-2',
    OPEN_AI_DALL_E_3: 'dall-e-3',
    PERPLEXITY: 'PERPLEXITY',
    DEEPSEEK: 'DEEPSEEK',
    LLAMA4: 'LLAMA4',
    GROK: 'GROK',
    QWEN: 'QWEN',
    OPEN_ROUTER: 'OPEN_ROUTER',
    // error conversation response
    CONVERSATION_ERROR: `We encountered an issue and were unable to receive a response. This could be due to a variety of reasons including network issues, server problems, or unexpected errors.Please try your request again later. If the problem persists, check your network connection or [contact support](mailto:hello@weam.ai) for further assistance.`,
}

export const MESSAGE_TYPE = {
    HUMAN: 'human',
    AI: 'ai'
}

export const TOKEN_PREFIX = 'jwt ';

export const FILE = {
    SIZE: 5000000,
    INVALID_FILE_CODE: 'INVALID_FILE_TYPE',
    STORAGE_LIMIT_EXCEED: 'STORAGE_LIMIT_EXCEED',
    DEFAULT_SIZE: 21000000,
    USED_SIZE: 0,
    UPLOAD_LIMIT: 10,
    IMPORT_CHAT_SIZE: 536870912,
    ZOOM_AUDIO_SIZE: 1000000000
}

export const GPTTypes = {
    Docs:'Docs',
    CustomGPT:'CustomGPT',
    Prompts:'Prompts'
}

export const API_TYPE_OPTIONS = {
    OPEN_AI: 'OPEN_AI',
    OPEN_AI_WITH_DOC: 'OPEN_AI_WITH_DOC',
    OPEN_AI_CUSTOM_GPT_WITH_DOC: 'OPEN_AI_CUSTOM_GPT_WITH_DOC',
    OPEN_AI_DALL_E: 'OPEN_AI_DALL_E',
    NORMAL_CHAT: 1,
    CHAT_WITH_DOC: 2,
    CUSTOM_GPT_CHAT: 3,
    OPEN_AI_CHAT_CANVAS: 'OPEN_AI_CHAT_CANVAS',
    PERPLEXITY: 'PERPLEXITY',
    PRO_AGENT: 'PRO_AGENT'
}

export const SOCKET_ROOM_PREFIX = {
    CHAT:'chat-',
    THREAD:'thread-'
}


export const SOCKET_EVENTS = {
    THREAD:'thread',
    ON_TYPING_THREAD:'ontypingthread',
    JOIN_CHAT_ROOM:'joinchatroom',
    LEAVE_CHAT_ROOM:'leavechatroom',
    JOIN_THREAD_ROOM:'jointhreadroom',
    LEAVE_THREAD_ROOM:'leavethreadroom',
    USER_QUERY: 'userquery',
    START_STREAMING: 'streamingstart',
    STOP_STREAMING: 'streamingstop',
    ON_QUERY_TYPING: 'ontypingquery',
    DISABLE_QUERY_INPUT: 'disableinput',
    NEW_CHAT_MESSAGE: 'newmessage',
    JOIN_COMPANY_ROOM: 'joincompanyroom',
    //USER_MESSAGE_COUNT: 'messagecount',
    SUBSCRIPTION_STATUS: 'subscriptionstatus',
    AI_MODEL_KEY_REMOVE: 'aimodelkeyremove',
    //NOTIFY_MESSAGE_LIMIT: 'messageexceeded',
    API_KEY_REQUIRED:'apikeyrequired',
    LOAD_CONVERSATION: 'loadconversation',
    FETCH_MODAL_LIST: 'fetchmodal',
    CHAT_MEMBER_LIST: 'chatmembers',
    MESSAGE_LIST: 'messagelist',
    WORKSPACE_LIST: 'workspacelist',
    FETCH_CHAT_BY_ID: 'fetchchatbyid',
    INITIALIZE_CHAT: 'initializechat',
    SEND_MESSAGE: 'sendmessage',
    USER_SUBSCRIPTION_UPDATE: 'usersubscriptionupdate',
    PRIVATE_BRAIN_ON: 'privatebrainon',
    PRIVATE_BRAIN_OFF: 'privatebrainoff',
    FETCH_SUBSCRIPTION: 'fetchsubscription',
    LLM_RESPONSE_SEND: 'llmresponsesend',
    GENERATE_TITLE_BY_LLM: 'generatetitlebyllm',
    FORCE_STOP: 'forcestop',
}

export const THREAD_MESSAGE_TYPE = {
    QUESTION: 'QUESTION',
    ANSWER: 'ANSWER',
}

export const PAGINATION = {
    PER_PAGE_RECORD: 10,
    SORTING: 'desc'
}

export const PROMPT_SELECTION = {
    BRAND_PROFILE: 'BRAND_PROFILE',
    COMPANY_INFO: 'COMPANY_INFO',
    PRODUCT_INFO: 'PRODUCT_INFO',
}

export const STATUS_CODE = {
    SUCCESS: 200,
    MULTI_RESPONSE: 207,
    UNAUTHENTICATED: 401
}

export const MODEL_IMAGE_BY_CODE={
    OPEN_AI:'/Ai-icon.svg',
    LOCAL_LLM: 'LOCAL_LLM',
    GEMINI:'/gemini_1_5_flash.png',
    LLAMA4:'/llama3.png',
    HUGGING_FACE: '/hugging_face.svg',
    ANYSCALE: 'ANYSCALE',
    ANTHROPIC: '/anthropic_cover.png',
    AZURE_OPENAI_SERVICE: 'AZURE_OPENAI_SERVICE',
    PERPLEXITY: '/perplexity.png',
    DEEPSEEK: '/Deepseek.png',
    GROK: '/grok.png',
    QWEN: '/qwen.png'
}

export const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/x-png',
    'image/png',
    'image/gif',
    'image/bmp',
    'text/plain',
    'application/vnd.ms-excel',
    'application/wps-office.xlsx',
    'application/wps-office.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'message/rfc822',
    'text/php',
    'text/x-php',
    'application/x-httpd-php',
    'text/javascript',
    'text/css',
    'application/x-javascript',
    'application/javascript',
    'text/x-javascript',
    'application/x-php',
    'application/sql'
];

export const NOT_FORBIDDEN_FILE_EXTENSIONS = [
    'php',
    'javascript', 
    'js',
    'css',
    'html',
    'sql',
    'xls',
    'xlsx',
];

export const IMAGE_ALLOWED_TYPES = [
    'image/jpeg',
    'image/x-png',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/jpg'
] as const;

export const GPT_MODELS = [
    'OPEN_AI',
    'gpt-4o',
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "o3-mini",
    "o4-mini",
];

//Update this constant when add/remove any new modal and can set sequence of models using this constant
export const AI_MODAL_NAME = {
    // GPT-5 models (moved to first for priority in chat dropdown)
    GPT_5: 'gpt-5',
    GPT_5_MINI: 'gpt-5-mini',
    GPT_5_NANO: 'gpt-5-nano',
    GPT_5_CHAT: 'gpt-5-chat-latest',    
    
    // Open AI models
    GPT_4_1: 'gpt-4.1',
    GPT_4_O_LATEST: 'chatgpt-4o-latest',
    GPT_4_1_MINI: 'gpt-4.1-mini',
    GPT_4_1_NANO: 'gpt-4.1-nano',
    O4_MINI: 'o4-mini',
    GPT_O3: 'o3',
    GPT_4_1_SEARCH_MEDIUM: 'gpt-4.1-search-medium',

    // Gemini models
    GEMINI_2_5_PRO_PREVIEW_05_06: 'gemini-2.5-pro-preview-05-06',
    GEMINI_2_0_FLASH: 'gemini-2.0-flash',
    GEMINI_2_5_FLASH_PREVIEW_05_20: 'gemini-2.5-flash-preview-05-20',

    // Anthropic models
    //CLAUDE_3_7_SONNET_LATEST: 'claude-3-7-sonnet-latest',
    CLAUDE_3_5_HAIKU_LATEST: 'claude-3-5-haiku-latest',
    //CLAUDE_3_OPUS_LATEST: 'claude-3-opus-latest',
    CLAUDE_SONNET_4_20250514: 'claude-sonnet-4-20250514',
    CLAUDE_OPUS_4_20250514: 'claude-opus-4-20250514',

    // Perplexity models
    SONAR: 'sonar',
    SONAR_REASONING_PRO: 'sonar-reasoning-pro',

    // DeepSeek models
    DEEPSEEK_R1: 'deepseek/deepseek-r1:free',

    // Llama models
    LLAMA_4_MAVERICK: 'meta-llama/llama-4-maverick',
    LLAMA_4_SCOUT: 'meta-llama/llama-4-scout',
    
    // Grok models
    GROK_3_MINI_BETA: 'x-ai/grok-3-mini-beta',

    // Qwen models
    QWEN_3_30B_A3B: 'qwen/qwen3-30b-a3b:free',    
}

export const USER_STATUS = {
    PENDING : 'PENDING',
    ACCEPT : 'ACCEPT',
    EXPIRED : 'EXPIRED',
};

export const STORAGE_REQUEST_STATUS = {
    PENDING: 'PENDING',
    ACCEPT: 'ACCEPT',
    DECLINE: 'DECLINE'
}

export const RESPONSE_STATUS = {
    UNAUTHENTICATED: 401,
    UNPROCESSABLE_CONTENT: 422,
    SUCCESS: 200,
    BAD_REQUEST: 400,
    CREATED: 201,
    ERROR: 500,
    FORBIDDEN: 403,
    GONE: 410
}

export const RESPONSE_STATUS_CODE = {
    TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
    UNAUTHORIZED:'UNAUTHORIZED',
    REFRESH_TOKEN: 'REFRESH_TOKEN',
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS',
    RESEND_LINK: 'RESEND_LINK',
    CSRF_TOKEN_NOT_FOUND: 'CSRF_TOKEN_NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN',
    CSRF_TOKEN_MISSING: 'CSRF_TOKEN_MISSING',
    INVALID_CSRF_TOKEN: 'INVALID_CSRF_TOKEN',
    SERVER_FORBIDDEN: 'SERVER_FORBIDDEN'
}

export const SUBSCRIPTION_STATUS = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    PENDING_CANCELLATION: 'PENDING_CANCELLATION',
    CANCELED: 'CANCELED'   
}

// export const RAZORPAY_SUBSCRIPTION_STATUS = {
//     ACTIVE: 'ACTIVE',
//     EXPIRED: 'EXPIRED',
//     CANCELED: 'CANCELLED',
//     PENDING_CANCELLATION: 'PENDING_CANCELLATION'   
// }

export const APPLICATION_ENVIRONMENT = {
    DEVELOPMENT: 'development',
    QUALITY: 'staging',
    PRODUCTION: 'production'
}

export const PROD_COMPANYID = [
    
];

export const DEFAULT_CHAT_SLUG="default-brain-"
  
export const CURRENCY = {
    INR: 'inr',
    USD: 'usd'
}

export const MODAL_NAME_CONVERSION = {
    OPEN_AI: 'Open AI',
    HUGGING_FACE: 'Hugging Face',
    ANTHROPIC: 'Anthropic',
    GEMINI: 'Gemini',
    PERPLEXITY: 'Perplexity',
    DEEPSEEK: 'DeepSeek',
    LLAMA4: 'Llama4',
    GROK: 'Grok',
    QWEN: 'Qwen',
    OPEN_ROUTER: 'Open Router'
}

export const MODEL_CREDIT_INFO = [
    // GPT-5 models (moved to first for priority in chat dropdown)
    {
        code: 'OPEN_AI',
        model: 'gpt-5',
        credit: 10,
        displayName: 'GPT-5',
        snippet: 'Complex coding and analysis with advanced reasoning capabilities.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: true,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-5-mini',
        credit: 2,
        displayName: 'GPT-5 Mini',
        snippet: 'Fast responses, summaries, and general tasks with good reasoning.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: true,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-5-nano',
        credit: 5,
        displayName: 'GPT-5 Nano',
        snippet: 'Instant Q&A and classification tasks.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: true,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-5-chat-latest',
        credit: 10,
        displayName: 'GPT-5 Chat',
        snippet: 'Model used in ChatGPT with latest capabilities.',
        doc: true,
        websearch: false,
        vision: true,
        image: false,
        reasoning: false,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-4o-mini',
        credit: 0.5,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-4o',
        credit: 5,
        displayName: 'GPT 4o'
    },
    {
        code: 'OPEN_AI',
        model: 'o1-mini',
        credit: 10,
    },
    {
        code: 'OPEN_AI',
        model: 'o1-preview',
        credit: 50,
    },
    {
        code: 'OPEN_AI',
        model: 'o1',
        credit: 50,
        displayName: 'o1'
    },
    {
        code: 'OPEN_AI',
        model: 'o3-mini',
        credit: 5,
    },
    {
        code: 'OPEN_AI',
        model: 'o3',
        credit: 10,
        displayName: 'o3',
        snippet: 'Good for content generation tasks and coding tasks.',
        doc: true,
        websearch: true,
        vision: true, // chat with images
        image: true, // image generation
        reasoning: true,
    },
    {
        code: 'OPEN_AI',
        model: 'chatgpt-4o-latest',
        credit: 10,
        displayName: 'GPT 4o Latest',
        snippet: 'Model used in ChatGPT',
        doc: true,
        websearch: false,
        vision: true, // chat with images
        image: false, // image generation
        reasoning: false,
    },
    {
        code: 'OPEN_AI',
        model: 'o1',
        credit: 50,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-4.1',
        credit: 5,
        displayName: 'GPT 4.1',
        snippet: 'Best for complex problems and advanced coding.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: false,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-4.1-mini',
        credit: 2,
        displayName: 'GPT 4.1 Mini',
        snippet: 'Balanced for general tasks and moderate coding with speed.',
        doc: true,
        websearch: false,
        vision: true,
        image: true,
        reasoning: false,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-4.1-nano',
        credit: 0.5,
        displayName: 'GPT 4.1 Nano',
        snippet: 'Optimized for simple tasks and basic coding.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: false,
    },
    {
        code: 'OPEN_AI',
        model: 'gpt-4.1-search-medium',
        credit: 10,
        displayName: 'GPT 4.1 Search',
        snippet: 'Best for real-time, smart, fast, and reliable AI responses.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: false,
    },
    {
        code: 'OPEN_AI',
        model: 'o4-mini',
        credit: 5,
        displayName: 'o4 Mini',
        snippet: 'Powerful for deep understanding and complex problem-solving.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: true,
    },
    {
        code: 'GEMINI',
        model: 'gemini-1.5-flash-8b',
        credit: 0.1,
    },
    {
        code: 'GEMINI',
        model: 'gemini-1.5-flash',
        credit: 0.25,
    },
    {
        code: 'GEMINI',
        model: 'gemini-1.5-flash',
        credit: 5,
    },
    {
        code: 'GEMINI',
        model: 'gemini-2.0-flash',
        credit: 0.5,
        displayName: 'Gemini 2.0 Flash',
        snippet: 'Fast, multimodal, ideal for content generation.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: false,
    },
    {
        code: 'GEMINI',
        model: 'gemini-2.5-flash-preview-05-20',
        credit: 5,
        displayName: 'Gemini 2.5 Flash Preview',
        snippet: 'Fast with enhanced reasoning, great for content and mid-level coding.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: true,
    },
    {
        code: 'GEMINI',
        model: 'gemini-2.5-pro-preview-05-06',
        credit: 10,
        displayName: 'Gemini 2.5 Pro Preview',
        snippet: 'Powerful for complex reasoning and advanced coding.',
        doc: true,
        websearch: true,
        vision: true,
        image: true,
        reasoning: true,
    },
    {
        code: 'ANTHROPIC',
        model: 'claude-3-opus-latest',
        credit: 50,
        displayName: 'Claude 3 Opus Latest',
        snippet: 'Perfect for in-depth analysis and research.',
        doc: true,
        websearch: false,
        vision: true,
        image: false,
        reasoning: false,
    },
    {
        code: 'ANTHROPIC',
        model: 'claude-3-5-sonnet-latest',
        credit: 10,
        displayName: 'Claude 3.5 Sonnet Latest',
        snippet: 'Ideal for complex coding and long-form content.',
        doc: true,
        websearch: true,
        vision: true,
        image: false,
        reasoning: true,
    },
    {
        code: 'ANTHROPIC',
        model: 'claude-3-5-haiku-latest',
        credit: 5,
        displayName: 'Claude 3.5 Haiku Latest',
        snippet: 'Great for real-time tasks like chatbots.',
        doc: true,
        websearch: true,
        vision: true,
        image: false,
        reasoning: false,
    },
    {
        code: 'ANTHROPIC',
        model: 'claude-3-7-sonnet-latest',
        credit: 10,
        displayName: 'Claude 3.7 Sonnet Latest',
        snippet: 'Ideal for complex coding and long-form content.',
        doc: true,
        websearch: true,
        vision: true,
        image: false,
        reasoning: true,
    },
    {
        code: 'PERPLEXITY',
        model: 'llama-3.1-sonar-large-128k-online',
        credit: 5,
    },
    {
        code: 'PERPLEXITY',
        model: 'sonar',
        credit: 5,
        displayName: 'Sonar',
        snippet: 'Fast, ideal for real-time search with citations.',
        doc: false,
        websearch: true,
        vision: false,
        image: false,
        reasoning: false,
    },
    {
        code: 'PERPLEXITY',
        model: 'sonar-pro',
        credit: 10,
    },
    {
        code: 'PERPLEXITY',
        model: 'sonar-reasoning-pro',
        credit: 10,
        displayName: 'Sonar Reasoning Pro',
        snippet: 'Advanced reasoning, great for complex enterprise queries.',
        doc: false,
        websearch: true,
        vision: false,
        image: false,
        reasoning: true,
    },
    {
        code: 'DEEPSEEK',
        model: 'deepseek/deepseek-r1:free',
        credit: 5,
        displayName: 'DeepSeek R1',
        snippet: 'Perfect for advanced reasoning and multi-step problem-solving.',
        doc: true,
        websearch: false,
        vision: false,
        image: false,
        reasoning: true,
    },
    {
        code: 'DEEPSEEK',
        model: 'deepseek/deepseek-r1-distill-llama-70b',
        credit: 1,
    },
    {
        code: 'LLAMA4',
        model: 'meta-llama/llama-4-scout',
        credit: 0.5,
        displayName: 'Llama4 Scout',
        snippet: 'Perfect for summarizing and multilingual chats.',
        doc: true,
        websearch: false,
        vision: true,
        image: false,
        reasoning: false,
    },
    {
        code: 'LLAMA4',
        model: 'meta-llama/llama-4-maverick',
        credit: 1,
        displayName: 'Llama4 Maverick',
        snippet: 'Ideal for complex tasks and coding.',
        doc: true,
        websearch: false,
        vision: true,
        image: false,
        reasoning: true,
    },
    {
        code: 'GROK',
        model: 'x-ai/grok-3-mini-beta',
        credit: 5,
        displayName: 'Grok 3 Mini Beta',
        snippet: 'Great for math and solving challenging puzzles.',
        doc: true,
        websearch: false,
        vision: false, // chat with images
        image: false, // image generation
        reasoning: false,
    },
    {
        code: 'QWEN',
        model: 'qwen/qwen3-30b-a3b:free',
        credit: 5,
        displayName: 'Qwen 3',
        snippet: 'Great for content creation and coding.',
        doc: true,
        websearch: false,
        vision: false, // chat with images
        image: false, // image generation
        reasoning: false,
    },
    {
        code: 'ANTHROPIC',
        model: 'claude-sonnet-4-20250514',
        credit: 10,
        displayName: 'Claude Sonnet 4',
        snippet: 'Lightweight for quick, creative content and short-form text.',
        doc: true,
        websearch: false,
        vision: true,
        image: false,
        reasoning: true,
    },
    {
        code: 'ANTHROPIC',
        model: 'claude-opus-4-20250514',
        credit: 50,
        displayName: 'Claude Opus 4',
        snippet: 'High-capacity for deep reasoning and large-scale code or logic tasks',
        doc: true,
        websearch: false,
        vision: true,
        image: false,
        reasoning: true,
    },
    {
        code: 'PRO_AGENT',
        model: ProAgentCode.QA_SPECIALISTS,
        credit: 30,
    },
    {
        code: 'PRO_AGENT',
        model: ProAgentCode.SEO_OPTIMISED_ARTICLES,
        credit: 30,
    },
    {
        code: 'PRO_AGENT',
        model: ProAgentCode.SALES_CALL_ANALYZER,
        credit: 5,
    },
    {
        code: 'PRO_AGENT',
        model: ProAgentCode.WEB_PROJECT_PROPOSAL,
        credit: 5,
    },
    {
        code: 'PRO_AGENT',
        model: ProAgentCode.VIDEO_CALL_ANALYZER,
        credit: 5,
    }
]

export const REVALIDATE_TAG_NAME = {
    AI_MODAL: 'aiModal',
    WORKSPACE: 'workspace',
    BRAIN: 'brain',
    SHARED_LINKS: 'sharedLinks',
    CHAT: 'chat',
    TEAM: 'team',
    USER: 'user'
} as const;

export const CUSTOM_DOMAIN_BLOCK_LIST = [
    'belgianairways.com',
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'outlook.com',
    'mail.com',
    'bitflirt.com',
    'yahoo.fr',
    'hotmail.com',
    'baldur.edu.kg',
    'aigorithm.space',
    'linux.do',
    'edu.xinjueqio.cn',
    'sdxdlgz.edu.kg',
    'intelligence-technical.xyz',
    'msecth.com',
    'castaneda6985@aiera.pro',
    'burton2212@intelligence-technical.xyz',
    'cortez0609@aigorithm.space',
    'costa6847@aiera.pro',
    'rodgers1848@aigorithm.space'
] as const;

export const SUB_MODEL_TYPE = [ 
    'OPEN_AI',
    'HUGGING_FACE',
    'ANTHROPIC',
    'GEMINI',
    'PERPLEXITY',
    'DEEPSEEK',
    'LLAMA4'
] as const;

// 500 Credits
export const AI_CREDITS = [
    // {
    //     modelName: 'OpenAI GPT-4o mini',
    //     creditCount: '0.5',
    //     MessageNo: '1000',
    // },
    // {
    //     modelName: 'OpenAI GPT-4o',
    //     creditCount: '5',
    //     MessageNo: '100',
    // },
    // {
    //     modelName: 'OpenAI o3-mini',
    //     creditCount: '5',
    //     MessageNo: '100',
    // },
    {
        modelName: 'OpenAI gpt-4.1',
        creditCount: '5',
        MessageNo: '100',
    },
    {
        modelName: 'OpenAI gpt-4.1-mini',
        creditCount: '2',
        MessageNo: '250',
    },
    {
        modelName: 'OpenAI gpt-4.1-nano',
        creditCount: '0.5',
        MessageNo: '1000',
    },
    {
        modelName: 'OpenAI gpt-4.1-search-medium',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'OpenAI o4-mini',
        creditCount: '5',
        MessageNo: '100',
    },
    {
        modelName: 'OpenAI o3',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'OpenAI chatgpt-4o-latest',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'OpenAI gpt-5',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'OpenAI gpt-5-mini',
        creditCount: '2',
        MessageNo: '250',
    },
    {
        modelName: 'OpenAI gpt-5-nano',
        creditCount: '5',
        MessageNo: '100',
    },
    {
        modelName: 'OpenAI gpt-5-chat-latest',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'Gemini 2.0 Flash',
        creditCount: '0.5',
        MessageNo: '1000',
    },
    {
        modelName: 'Gemini 2.5 Flash Preview',
        creditCount: '5',
        MessageNo: '100',
    },
    {
        modelName: 'Gemini 2.5 Pro Preview',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'Claude 3 Opus',
        creditCount: '50',
        MessageNo: '10',
    },
    // {
    //     modelName: 'Claude 3.5 Sonnet',
    //     creditCount: '10',
    //     MessageNo: '50',
    // },
    {
        modelName: 'Claude 3.5 Haiku',
        creditCount: '5',
        MessageNo: '100',
    },
    {
        modelName: 'Claude 3.7 Sonnet',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'Sonar (Medium)',
        creditCount: '5',
        MessageNo: '100',
    },
    {
        modelName: 'Sonar Reasoning Pro (Medium)',
        creditCount: '10',
        MessageNo: '50',
    },
    // {
    //     modelName: 'Perplexity sonar pro',
    //     creditCount: '10',
    //     MessageNo: '50',
    // },
    {
        modelName: 'DeepSeek R1',
        creditCount: '5',
        MessageNo: '100',
    },
    // {
    //     modelName: 'DeepSeek R1 Distill Llama 70B',
    //     creditCount: '1',
    //     MessageNo: '500',
    // },
    {
        modelName: 'Llama4 Scout',
        creditCount: '0.5',
        MessageNo: '1000',
    },
    {
        modelName: 'Llama4 Maverick',
        creditCount: '1',
        MessageNo: '500',
    },
    {
        modelName: 'Grok 3 Mini Beta',
        creditCount: '1',
        MessageNo: '500',
    },
    {
        modelName: 'Qwen 3.30B A3B',
        creditCount: '5',
        MessageNo: '100',
    },
    {
        modelName: 'Claude Sonnet 4',
        creditCount: '10',
        MessageNo: '50',
    },
    {
        modelName: 'Claude Opus 4',
        creditCount: '50',
        MessageNo: '10',
    },
]

// 200 Credits for free tier
export const FREE_TIER_AI_CREDITS = [
    // {
    //     modelName: 'OpenAI GPT-4o mini',
    //     creditCount: '0.5',
    //     MessageNo: '400',
    // },
    {
        modelName: 'OpenAI GPT-4o',
        creditCount: '5',
        MessageNo: '40',
    },
    // {
    //     modelName: 'OpenAI o3-mini',
    //     creditCount: '5',
    //     MessageNo: '40',
    // },
    {
        modelName: 'OpenAI gpt-4.1',
        creditCount: '5',
        MessageNo: '40',
    },
    {
        modelName: 'OpenAI gpt-4.1-mini',
        creditCount: '2',
        MessageNo: '100',
    },
    {
        modelName: 'OpenAI gpt-4.1-nano',
        creditCount: '0.5',
        MessageNo: '400',
    },
    {
        modelName: 'OpenAI gpt-4.1-search-medium',
        creditCount: '10',
        MessageNo: '20',
    },
    {
        modelName: 'OpenAI o4-mini',
        creditCount: '5',
        MessageNo: '40',
    },
    {
        modelName: 'OpenAI o3',
        creditCount: '10',
        MessageNo: '20',
    },
    {
        modelName: 'OpenAI chatgpt-4o-latest',
        creditCount: '10',
        MessageNo: '20',
    },
    {
        modelName: 'OpenAI gpt-5',
        creditCount: '10',
        MessageNo: '20',
    },
    {
        modelName: 'OpenAI gpt-5-mini',
        creditCount: '2',
        MessageNo: '100',
    },
    {
        modelName: 'OpenAI gpt-5-nano',
        creditCount: '5',
        MessageNo: '40',
    },
    {
        modelName: 'OpenAI gpt-5-chat-latest',
        creditCount: '10',
        MessageNo: '20',
    },
    {
        modelName: 'Gemini 2.0 Flash',
        creditCount: '0.5',
        MessageNo: '400',
    },
    {
        modelName: 'Gemini 2.5 Flash',
        creditCount: '5',
        MessageNo: '40',
    },
    {
        modelName: 'Gemini 2.5 Pro',
        creditCount: '10',
        MessageNo: '20',
    },
    {
        modelName: 'Claude 3 Opus',
        creditCount: '50',
        MessageNo: '40',
    },
    // {
    //     modelName: 'Claude 3.5 Sonnet',
    //     creditCount: '10',
    //     MessageNo: '20',
    // },
    {
        modelName: 'Claude 3.5 Haiku',
        creditCount: '5',
        MessageNo: '40',
    },
    {
        modelName: 'Claude 3.7 Sonnet',
        creditCount: '10',
        MessageNo: '20',
    },
    {
        modelName: 'Sonar (Medium)',
        creditCount: '5',
        MessageNo: '40',
    },
    {
        modelName: 'Sonar Reasoning Pro (Medium)',
        creditCount: '10',
        MessageNo: '20',
    },
    // {
    //     modelName: 'Perplexity sonar pro',
    //     creditCount: '10',
    //     MessageNo: '20',
    // },
    {
        modelName: 'DeepSeek R1',
        creditCount: '5',
        MessageNo: '40',
    },
    // {
    //     modelName: 'DeepSeek R1 Distill Llama 70B',
    //     creditCount: '1',
    //     MessageNo: '200',
    // },
    {
        modelName: 'Llama4 Scout',
        creditCount: '0.5',
        MessageNo: '400',
    },
    {
        modelName: 'Llama4 Maverick',
        creditCount: '1',
        MessageNo: '200',
    },
    {
        modelName: 'Grok 3 Mini Beta',
        creditCount: '1',
        MessageNo: '200',
    },
    {
        modelName: 'Qwen 3.30B A3B',
        creditCount: '5',
        MessageNo: '40',
    },
    {
        modelName: 'Claude Sonnet 4',
        creditCount: 10,
        MessageNo: 20,
    },
    {
        modelName: 'Claude Opus 4',
        creditCount: 50,
        MessageNo: 4,
    },
]
export const GENERAL_BRAIN_TITLE = "General Brain";

export const DEFAULT_BRAIN_TITLE = "Default Brain";

export const GENERAL_BRAIN_SLUG = 'general-brain';

export const VALID_PLATFORMS = {
   "OPENAI":'Open AI',
   "ANTHROPIC":'Anthropic'
}


export const FEATURES_WEAM = [
    {
        title: 'Access to benchmark AI models',
        description: 'Use ChatGPT, Gemini, Claude, etc.',
    },
    {
        title: 'AI Message Credits',
        description:
            'Total credits every user gets to interact with AI models.',
    },
    {
        title: 'Unlimited Brains',
        description:
            'Enable teams to use and share chats, agents, docs easily.',
    },
    {
        title: 'Threads',
        description: 'Collaborate with teammates using mentions.',
    },
    {
        title: 'Refine',
        description:
        'Modify specific parts of generated content using prompts.',
    },
    {
        title: 'Unlimited Prompts',
        description: 'Create prompt libraries and share with teams.',
    },
    {
        title: 'Unlimited Agents',
        description: 'Create custom agents for repetitive tasks.',
    },
];

export const MODEL_NAME_BY_CODE = {
    // OpenAI models
    'gpt-4o-mini': 'OPEN_AI',
    'gpt-4o': 'OPEN_AI',
    'o3-mini': 'OPEN_AI',
    'gpt-4.1': 'OPEN_AI',
    'gpt-4.1-mini': 'OPEN_AI',
    'gpt-4.1-nano': 'OPEN_AI',
    'o4-mini': 'OPEN_AI',
    'o3': 'OPEN_AI',
    'chatgpt-4o-latest': 'OPEN_AI',
    'o1-mini': 'OPEN_AI',
    'gpt-4o-canmore': 'OPEN_AI',
    'text-davinci-002-render-sha': 'OPEN_AI',
    'gpt-4': 'OPEN_AI',
    'o1-preview': 'OPEN_AI',
    'gpt-4-plugins': 'OPEN_AI',
    'o1': 'OPEN_AI',
    'o3-mini-high': 'OPEN_AI',
    'gpt-4-turbo': 'OPEN_AI',
    'gpt-4-gizmo': 'OPEN_AI',
    'gpt-3.5-turbo': 'OPEN_AI',
    'gpt-4.1-search-medium': 'OPEN_AI',
    'gpt-5': 'OPEN_AI',
    'gpt-5-mini': 'OPEN_AI',
    'gpt-5-nano': 'OPEN_AI',
    'gpt-5-chat-latest': 'OPEN_AI',
    
    // Gemini models
    'gemini-2.5-pro-preview-05-06': 'GEMINI',
    'gemini-2.0-flash': 'GEMINI',
    'gemini-1.5-flash-8b': 'GEMINI',
    'gemini-1.5-pro': 'GEMINI',
    'gemini-1.5-flash': 'GEMINI',
    'gemini-2.5-pro-preview-03-25': 'GEMINI',
    'gemini-2.5-flash-preview-05-20': 'GEMINI',
    
    // Anthropic models
    'claude-3-opus-latest': 'ANTHROPIC',
    'claude-3-5-sonnet-latest': 'ANTHROPIC',
    'claude-3-5-haiku-latest': 'ANTHROPIC',
    'claude-3-7-sonnet-latest': 'ANTHROPIC',
    'claude-3-sonnet-20240229': 'ANTHROPIC',
    'claude-3-haiku-20240307': 'ANTHROPIC',
    'claude-sonnet-4-20250514': 'ANTHROPIC',
    'claude-opus-4-20250514': 'ANTHROPIC',
    
    // Perplexity models
    'llama-3.1-sonar-large-128k-online': 'PERPLEXITY',
    'sonar': 'PERPLEXITY',
    'sonar-pro': 'PERPLEXITY',
    'sonar-reasoning-pro': 'PERPLEXITY',
    
    // DeepSeek models
    'deepseek-r1': 'DEEPSEEK',
    'deepseek-r1-distill-llama-70b': 'DEEPSEEK',
    'deepseek/deepseek-r1:free': 'DEEPSEEK',
    'deepseek/deepseek-r1-distill-llama-70b': 'DEEPSEEK',
    'deepseek/deepseek-r1-distill-qwen-32b': 'DEEPSEEK',
    'deepseek/deepseek-r1': 'DEEPSEEK',
    
    // Llama models
    'llama-4-scout': 'LLAMA4',
    'llama-4-maverick': 'LLAMA4',
    'meta-llama/llama-4-scout': 'LLAMA4',
    'meta-llama/llama-4-maverick': 'LLAMA4',
    'llama-3-2-3b-instruct-ctq': 'LLAMA',
    
    // Grok models
    'x-ai/grok-3-mini-beta': 'GROK',
    
    // Qwen models
    'qwen/qwen3-30b-a3b:free': 'QWEN',
    
    // Stability AI models
    'sdxl-flash-lgh': 'HUGGING_FACE',
}

export const getModelImageByName = (name: string) => {
    const code = MODEL_NAME_BY_CODE[name];
    if (code) {
        return MODEL_IMAGE_BY_CODE[code];
    }
    return null;
}

export const SUBSCRIPTION_PLAN_CREDITS = {
    FREE_TIER: 200, // 200 credits for per company
    PAID_TIER: 500 // 500 credits for per user
}


export const SEQUENCE_MODEL_LIST = [AI_MODEL_CODE.OPEN_AI, AI_MODEL_CODE.GEMINI, AI_MODEL_CODE.ANTHROPIC, AI_MODEL_CODE.PERPLEXITY, AI_MODEL_CODE.DEEPSEEK, AI_MODEL_CODE.LLAMA4, AI_MODEL_CODE.QWEN, AI_MODEL_CODE.GROK] as const;

export const FILE_UPLOAD_FOLDER = {
    SALES_CALL_AGENT: 'sales-call',
} as const;

export const WEEKLY_REPORT_CAN_ACCESS = [
    
]

export const WEB_RESOURCES_DATA = 'web_resources_data';

// MCP Tool States Cookie Persistence
export const MCP_TOOLS_COOKIE_NAME = 'mcp_tool_cookie';


export const STREAMING_RESPONSE_STATUS = {
    DONE: '[DONE]',
    CITATION: '[CITATION]',
    WEB_SEARCH: '[WEB_SEARCH]',
    IMAGE_GENERATION_START: '[IMAGE_GENERATION_TOOL]',
    CONVERSATION_ERROR: '[CONVERSATION_ERROR]'
}