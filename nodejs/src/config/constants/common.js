
const RESPONSE_CODE = {
    SUCCESS: 200,
    CREATE: 201,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    DEFAULT: 'SUCCESS',
    LOGIN: 'LOGIN',
    OTP: 'OTP_VERIFIED',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    ERROR: 'ERROR',
    ALERTS: 'ALERTS',
    UNAUTHENTICATED: 'UNAUTHORIZED',
    NOT_FOUND: 'NOT_FOUND',
    TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
    REDIRECT: 'REDIRECT',
    LINK_EXPIRED: 'LINK_EXPIRED',
    RESEND_LINK: 'RESEND_LINK',
    CSRF_TOKEN_MISSING: 'CSRF_TOKEN_MISSING',
    INVALID_CSRF_TOKEN: 'INVALID_CSRF_TOKEN'
};

const CUSTOM_PAGINATE_LABELS = {
    totalDocs: 'itemCount',
    docs: 'data',
    limit: 'perPage',
    page: 'currentPage',
    nextPage: 'next',
    prevPage: 'prev',
    totalPages: 'pageCount',
    pagingCounter: 'slNo',
    meta: 'paginator',
};

const JWT_STRING = 'jwt ';

const ROLE_TYPE = {
    ADMIN: 'ADMIN',
    COMPANY: 'COMPANY',
    USER: 'USER',
    SUPER_ADMIN: 'SUPER_ADMIN',
    COMPANY_MANAGER: 'MANAGER',
    // brain role type
    OWNER: 'OWNER',
    MEMBER: 'MEMBER',
}

const RANDOM_PASSWORD_CHAR =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz1234567890';

const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:,<>./\\'`~"])[A-Za-z\d@$!%*?&#^()\-_=+[\]{}|;:,<>./\\'`~"]{8,}$/;

const ATRATE = '@';

const QUEUE_NAME = {
    DEFAULT: 'defaultQueue',
    MAIL: 'mailQueue',
    NOTIFICATION: 'notificationQueue',
    IMPORT_CHAT: 'importChatQueue'
}

const JOB_TYPE = {
    SEND_MAIL: 'sendMail',
    SEND_NOTIFICATION: 'sendNotification',
    UPDATE_DBREF: 'updateRef',
    DELETE_DBREF: 'deleteRef',
    SEND_SUBSCRIPTION: 'sendSubscription',
    PROCESS_IMPORT_CHAT: 'processImportChat'

}

const EMAIL_TEMPLATE = {
    HEADER_CONTENT: 'HEADER_CONTENT',
    FOOTER_CONTENT: 'FOOTER_CONTENT',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    SIGNUP_OTP: 'SIGNUP_OTP',
    RESEND_OTP: 'RESEND_OTP',
    ONBOARD_USER: 'ONBOARD_USER',
    RAISE_TICKET: 'RAISE_TICKET',
    REGISTER_COMPANY: 'REGISTER_COMPANY',
    STORAGE_SIZE_REQUEST: 'STORAGE_SIZE_REQUEST',
    RESET_PASSWORD: 'RESET_PASSWORD',
    SIGNUP: 'SIGNUP',
    USER_INVITATION_REQUEST: 'USER_INVITATION_REQUEST',
    INVITATION_REQUEST_SUPPORT: 'INVITATION_REQUEST_SUPPORT',
    VERIFICATION_LINK: 'VERIFICATION_LINK',
    RESEND_VERIFICATION_LINK: 'RESEND_VERIFICATION_LINK',
    SUBSCRIPTION_UPDATE: 'SUBSCRIPTION_UPDATE',
    SUBSCRIPTION_PURCHASE: 'SUBSCRIPTION_PURCHASE',
    SUBSCRIPTION_PURCHASE_ADMIN: 'SUBSCRIPTION_PURCHASE_ADMIN',
    STORAGE_REQUEST_APPROVED: 'STORAGE_REQUEST_APPROVED',
    CANCEL_SUBSCRIPTION: 'CANCEL_SUBSCRIPTION',
    UN_CANCEL_SUBSCRIPTION: 'UN_CANCEL_SUBSCRIPTION',
    COMPANY_SIGNUP_INFO: 'COMPANY_SIGNUP_INFO',
    IMPORT_CHAT_SUCCESS: 'IMPORT_CHAT_SUCCESS'
}

const MAIL_CONTAIN_LANG = {
    EN: 'en'
}

const LOG_STATUS = {
    PENDING: 'PENDING',
    SENT: 'SENT',
    FAILED: 'FAILED',
    RETRY: 'RETRY',
    SUCCESS: 'SUCCESS'
};

const LOG_TYPE = {
    MAIL: 'MAIL',
    NOTIFICATIONS: 'NOTIFICATIONS',
};

const EMAIL_FORMAT_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;

const FIREBASE_PRIVATE_KEY = 'FIREBASE_PRIVATE_KEY';


const PAYMENT_TYPE = {
    PENDING: 1,
    ACTIVE: 2,
    EXPIRED: 3
}

const FILE = {
    SIZE: 5000000,
    INVALID_FILE_CODE: 'INVALID_FILE_TYPE',
    STORAGE_LIMIT_EXCEED: 'STORAGE_LIMIT_EXCEED',
    DEFAULT_SIZE: 21000000,
    USED_SIZE: 0,
    LIMIT_FILE_SIZE: 'LIMIT_FILE_SIZE'
}

const ACTIVITY_LOG = {
    SIGNUP: 'SIGNUP',
    LOGIN: 'LOGIN',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    CHANGE_PASSWORD: 'CHANGE_PASSWORD',
    PROFILE_UPDATE: 'PROFILE_UPDATE',
    INVITE: 'INVITE',
    RAISE_TICKET: 'RAISE_TICKET'
}

const THREAD_MESSAGE_TYPE = {
    QUESTION: 'QUESTION',
    ANSWER: 'ANSWER',
}

const USER_THEMES = {
    DEFAULT: 1,
    DARK: 2
}

const MOMENT_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const STRIPE = {
    SUBSCRIPTION_MODE: 'subscription',
    PAYMENT_VIA_CARD: 'card'
}

const FEEDBACK_TYPE = {
    SUGGESSTION: 1,
    COMMENTS: 2
}

const FEEDBACK_RATING = {
    TERRIBLE: 1,
    BAD: 2,
    GOOD: 3,
    OKAY: 4,
    AMAZING: 5
}

const AGENDA_CRON = {
    PROMPT_PER_DAY: 'reset prompt per day',
    PROMPT_PER_WEEK: 'reset prompt per week',
    PROMPT_PER_MONTH: 'reset prompt per month',
    INVITATION_MEMBER_STATUS: 'invitation member status'
}

const COST_AND_USAGE = {
    MB: 'MB',
    USD: '$',
    YEARLY: 'yearly',
    MONTHLY: 'monthly',
    WEEKLY: 'weekly'
}

const EXPORT_TYPE = {
    NAME: 'Sheet',
    EXCEL_TYPE: 1,
    CSV_TYPE: 2,
    EXCEL: '.xlsx',
    CSV: '.csv' 
}

const PROMPT_LIMIT = {
    PER_DAY: 10,
    PER_WEEK: 70,
    PER_MONTH: 300
}

const SHARE_CHAT_TYPE = {
    PUBLIC: 1,
    PRIVATE: 2,
    READ_ONLY: 'READ_ONLY'
}

const INVITATION_TYPE = {
    PENDING: 'PENDING',
    ACCEPT: 'ACCEPT',
    EXPIRED: 'EXPIRED',
    PENDING_REMOVAL: 'PENDING_REMOVAL'
}

const NOTIFICATION_TYPE = {
    WORKSPACE_INVITATION: 'WORKSPACE_INVITATION',
    BRAIN_INVITATION: 'BRAIN_INVITATION',
    CHAT_INVITATION: 'CHAT_INVITATION',
    THREAD_REPLY: 'THREAD_REPLY',
    THREAD_MENTIONE: 'THREAD_MENTIONE',
    PROMPT_SCRAPING: 'PROMPT_SCRAPING',
}

const DEFAULT_NAME = {
    BRAIN: 'Default Brain',
    GENERAL_BRAIN_TITLE: 'General Brain',
    GENERAL_BRAIN_SLUG: 'general-brain'
}

const KAFKA_TOPIC = {
    REPLY_THREAD: 'reply-thread'
}

const GLOBAL_ERROR_CODE = {
    LIMIT_FIELD_VALUE: 'LIMIT_FIELD_VALUE'
}

const STORAGE_REQUEST_STATUS = {
    PENDING: 'PENDING',
    ACCEPT: 'ACCEPT',
    DECLINE: 'DECLINE'
}

const MODAL_NAME_CONVERSION = {
    OPEN_AI: 'Open AI',
    HUGGING_FACE: 'Hugging Face',
    ANTHROPIC: 'Anthropic',
    GEMINI: 'Gemini',
    PERPLEXITY: 'Perplexity',
    DEEPSEEK: 'DeepSeek',
    LLAMA4: 'Llama4'
}

const MODEL_CODE = {
    OPEN_AI: 'OPEN_AI',
    HUGGING_FACE: 'HUGGING_FACE',
    ANTHROPIC: 'ANTHROPIC',
    GEMINI: 'GEMINI',
    PERPLEXITY: 'PERPLEXITY',
    DEEPSEEK: 'DEEPSEEK',
    LLAMA4: 'LLAMA4',
    GROK: 'GROK',
    QWEN: 'QWEN'
}

const EXCLUDE_COMPANY_FROM_SUBSCRIPTION = [
    '67519552339353e847d4dbce',
    '6732eb0ce79cdc8073e98f04',
    '66f3adacd15c34b84ee96afb'
]

const MODEL_CREDIT_INFO = [
    {
      "code": "OPENAI",
      "model": "gpt-4o-mini",
      "credit": 0.5
    },
    {
      "code": "OPENAI",
      "model": "gpt-4o",
      "credit": 5      
    },
    {
      "code": "OPENAI",
      "model": "o1-mini",
      "credit": 10      
    },
    {
      "code": "OPENAI",
      "model": "o1-preview",
      "credit": 50      
    },
    {
        "code": "OPEN_AI",
        "model": "o1",
        "credit": 50      
    },
    {
        "code": "OPEN_AI",
        "model": "o3-mini",
        "credit": 5      
    },
    {
        "code": "OPEN_AI",
        "model": "chatgpt-4o-latest",
        "credit": 10      
    },
    {
      "code": "GEMINI",
      "model": "gemini-1.5-flash-8b",
      "credit": 0.1      
    },
    {
      "code": "GEMINI",
      "model": "gemini-1.5-flash",
      "credit": 0.25      
    },
    {
      "code": "GEMINI",
      "model": "gemini-1.5-pro",
      "credit": 5      
    },
    {
      "code": "GEMINI",
      "model": "gemini-2.0-flash",
      "credit": 0.5      
    },
    {
      "code": "ANTHROPIC",
      "model": "claude-3-opus-latest",
      "credit": 50      
    },
    {
      "code": "ANTHROPIC",
      "model": "claude-3-5-sonnet-latest",
      "credit": 10      
    },
    {
      "code": "ANTHROPIC",
      "model": "claude-3-5-haiku-latest",
      "credit": 5      
    },
    {
        "code": "ANTHROPIC",
        "model": "claude-3-7-sonnet-latest",
        "credit": 10      
    },
    {
        "code": "PERPLEXITY",
        "model": "llama-3.1-sonar-large-128k-online",
        "credit": 5      
    },
    {
        "code": "PERPLEXITY",
        "model": "sonar",
        "credit": 5      
    },
    {
        "code": "PERPLEXITY",
        "model": "sonar-pro",
        "credit": 10      
    },
    {
        "code": "DEEPSEEK",
        "model": "deepseek/deepseek-r1:free",
        "credit": 1      
    },
    {
        "code": "DEEPSEEK",
        "model": "deepseek/deepseek-r1-distill-llama-70b",
        "credit": 1      
    },
    {
        code: 'LLAMA4',
        model: 'meta-llama/llama-4-scout',
        credit: 0.5,
    },
    {
        code: 'LLAMA4',
        model: 'meta-llama/llama-4-maverick',
        credit: 5,
    },
]

const RAZORPAY_PLAN_ID = [
    'plan_PdgECooJ2nFOxE',
    'plan_PdgGKNNwjAjAXB'
]

const GPT_TYPES = {
    DOCS:'Docs',
    CUSTOM_GPT:'CustomGPT',
    PROMPT:'Prompts'
}

const SETTING_CODE = {
    MOBILE_VERSION: 'MOBILE_VERSION'
}

const APPLICATION_ENVIRONMENT = {
    DEVELOPMENT: 'development',
    QUALITY: 'staging',
    PRODUCTION: 'production'
}
const ENV_VAR_VALUE = {
    SMTP : 'SMTP',
    SES : 'SES',
    AWS_S3 : 'AWS_S3',
    MINIO : 'MINIO'
}

const RAZORPAY_PLAN_AMOUNT = {
    LITE: {
        amount: 50,
        currency: 'INR',
        name: 'Lite',
        unit_amount: 5000
    },
    PRO: {
        amount: 100,
        currency: 'INR',
        name: 'Pro',
        unit_amount: 10000
    }
}
 
module.exports = {
    RESPONSE_CODE,
    CUSTOM_PAGINATE_LABELS,
    JWT_STRING,
    ROLE_TYPE,
    RANDOM_PASSWORD_CHAR,
    PASSWORD_REGEX,
    ATRATE,
    JOB_TYPE,
    QUEUE_NAME,
    EMAIL_TEMPLATE,
    MAIL_CONTAIN_LANG,
    LOG_STATUS,
    LOG_TYPE,
    EMAIL_FORMAT_REGEX,
    FIREBASE_PRIVATE_KEY,
    FILE,
    ACTIVITY_LOG,
    PAYMENT_TYPE,
    THREAD_MESSAGE_TYPE,
    USER_THEMES,
    MOMENT_FORMAT,
    STRIPE,
    FEEDBACK_RATING,
    FEEDBACK_TYPE,
    AGENDA_CRON,
    COST_AND_USAGE,
    EXPORT_TYPE,
    PROMPT_LIMIT,
    SHARE_CHAT_TYPE,
    INVITATION_TYPE,
    NOTIFICATION_TYPE,
    DEFAULT_NAME,
    KAFKA_TOPIC,
    GLOBAL_ERROR_CODE,
    STORAGE_REQUEST_STATUS,
    MODAL_NAME_CONVERSION,
    EXCLUDE_COMPANY_FROM_SUBSCRIPTION,
    MODEL_CREDIT_INFO,
    RAZORPAY_PLAN_ID,
    MODEL_CODE,
    GPT_TYPES,
    SETTING_CODE,
    APPLICATION_ENVIRONMENT,
    RAZORPAY_PLAN_AMOUNT,
    ENV_VAR_VALUE
};