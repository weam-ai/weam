// 1 for embedding 2 for chat 3 for image

/**
 * Note:
 * don't remove embedding model from the list because it is used in file vectorization
 */
const OPENAI_MODAL = [
    //{ name: 'gpt-4o', type: 2 },
    { name: 'text-embedding-3-small', type: 1 },
    { name: 'text-embedding-3-large', type: 1 },
    { name: 'text-embedding-ada-002', type: 1 },
    //{ name: 'o3-mini', type: 2 },
    { name: 'o3', type: 2 },
    { name: 'gpt-4.1', type: 2},
    { name: 'gpt-4.1-mini', type: 2},
    { name: 'gpt-4.1-nano', type: 2},
    { name: 'o4-mini', type: 2},
    { name: 'gpt-4.1-search-medium', type: 2},
    { name: 'chatgpt-4o-latest', type: 2},
    { name: 'gpt-5', type: 2},
    { name: 'gpt-5-mini', type: 2},
    { name: 'gpt-5-nano', type: 2},
    { name: 'gpt-5-chat-latest', type: 2},
]

const ANTHROPIC_MODAL = [
    { name: 'claude-3-5-haiku-latest', type: 2 },
    //{ name: 'claude-3-opus-latest', type: 2 },
    //{ name: 'claude-3-sonnet-20240229', type: 2 },
    //{ name: 'claude-3-haiku-20240307', type: 2 },
    //{ name: 'claude-3-7-sonnet-latest', type: 2 },
    { name: 'claude-sonnet-4-20250514', type: 2 },
    { name: 'claude-opus-4-20250514', type: 2 },
]
const ANTHROPIC_MAX_TOKENS = {
    // Claude 3.5 Haiku
    'claude-3-5-haiku-latest': 8192,
    'claude-3-haiku-20240307': 4096,

    // Claude 3 Opus
    'claude-3-opus-latest': 4096,

    // Claude 3 Sonnet
    'claude-3-sonnet-20240229': 4096,
    'claude-3-7-sonnet-latest': 64000, // Claude Sonnet 3.7

    // Claude 4 models
    'claude-sonnet-4-20250514': 64000,  // Claude Sonnet 4
    'claude-opus-4-20250514': 32000,    // Claude Opus 4

    // Default fallback for any new models
    'default': 4096
}
const GEMINI_MODAL = [
    { name: 'gemini-2.0-flash', type: 2 },
    { name: 'gemini-2.5-flash-preview-05-20', type: 2 },
    { name: 'gemini-2.5-pro-preview-05-06', type: 2 },
]

const PERPLEXITY_MODAL = [
    { name: 'sonar', type: 2 },
    { name: 'sonar-reasoning-pro', type: 2 },
    //{ name: 'sonar-pro', type: 2 },
]

const DEEPSEEK_MODAL = [
    { name: 'deepseek/deepseek-r1:free', type: 2 },
    //{ name: 'deepseek/deepseek-r1-distill-llama-70b', type: 2 },
]

const LLAMA4_MODAL = [
    { name: 'meta-llama/llama-4-maverick', type: 2 },
    { name: 'meta-llama/llama-4-scout', type: 2 },
]

const GROK_MODAL = [
    { name: 'x-ai/grok-3-mini-beta', type: 2 },
]

const QWEN_MODAL = [
    { name: 'qwen/qwen3-30b-a3b:free', type: 2 },
]

const MESSAGE_TYPE = {
    HUMAN: 'human',
    AI: 'ai'
}

const CONVERSATION_ERROR = `We encountered an issue and were unable to receive a response. This could be due to a variety of reasons including network issues, server problems, or unexpected errors.Please try your request again later. If the problem persists, check your network connection or [contact support](mailto:hello@weam.ai) for further assistance.`

const INVITE_SUBSCRIPTION_ERROR=`The user limit of your plan has been reached, please contact your administrator.`

const AI_MODAL_PROVIDER = {
    AZURE_OPENAI_SERVICE: 'AZURE_OPENAI_SERVICE',
    ANTHROPIC: 'ANTHROPIC',
    ANYSCALE: 'ANYSCALE',
    HUGGING_FACE: 'HUGGING_FACE',
    GEMINI: 'GEMINI',
    LLAMA: 'LLAMA',
    LOCAL_LLM: 'LOCAL_LLM',
    OPEN_AI: 'OPEN_AI',
    PERPLEXITY: 'PERPLEXITY',
    DEEPSEEK: 'DEEPSEEK', 
    LLAMA4: 'LLAMA4',
    GROK: 'GROK',
    QWEN: 'QWEN',
    OPEN_ROUTER: 'OPEN_ROUTER',
}

const OPENROUTER_PROVIDER = {
    DEEPSEEK: 'WEAM',
    LLAMA4: 'WEAM',
    GROK: 'WEAM',
    QWEN: 'WEAM',
}

const PINECORN_STATIC_KEY = 'm3NwQE4/JIHLt7GZfQQSWEamMdA1JtSLvi41oG1fHsA6Qox26eVt76elBxrbd5c0'

const MODAL_NAME = {
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_4: 'gpt-4',
    GPT_4O_MINI: 'gpt-4o-mini',
    CHATGPT_4O_LATEST: 'chatgpt-4o-latest',
    OPEN_AI_EMBEDDING_SMALL: 'text-embedding-3-small',
    OPEN_AI_EMBEDDING_LARGE: 'text-embedding-3-large',
    OPEN_AI_EMBEDDING_ADA: 'text-embedding-ada-002',
    CLAUDE_3_5_HAIKU_LATEST: 'claude-3-5-haiku-latest',
    CLAUDE_3_OPUS_LATEST: 'claude-3-opus-latest',
    CLAUDE_3_SONNET_20240229: 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU_20240307: 'claude-3-haiku-20240307',
    DEEPSEEK_R1: 'deepseek/deepseek-r1:free',
    GPT_O1: 'o1',
    GPT_O1_MINI: 'o1-mini',
    GPT_O1_PREVIEW: 'o1-preview',
    LLAMA4_MAVERICK: 'meta-llama/llama-4-maverick',
    LLAMA4_SCOUT: 'meta-llama/llama-4-scout',
    GPT_4_1: 'gpt-4.1',
    GPT_4_1_MINI: 'gpt-4.1-mini',
    GPT_4_1_NANO: 'gpt-4.1-nano',
    O4_MINI: 'o4-mini',
    GEMINI_2_5_FLASH_PREVIEW_05_20: 'gemini-2.5-flash-preview-05-20',
    GEMINI_2_5_PRO_PREVIEW_05_06: 'gemini-2.5-pro-preview-05-06',
    O3: 'o3',
    GROK_3_MINI_BETA: 'x-ai/grok-3-mini-beta',
    QWEN_3_30B_A3B: 'qwen/qwen3-30b-a3b:free',
    GPT_4_1_SEARCH_MEDIUM: 'gpt-4.1-search-medium',
    CLAUDE_SONNET_4_20250514: 'claude-sonnet-4-20250514',
    CLAUDE_OPUS_4_20250514: 'claude-opus-4-20250514',
    GPT_5: 'gpt-5',
    GPT_5_MINI: 'gpt-5-mini',
    GPT_5_NANO: 'gpt-5-nano',
    GPT_5_CHAT_LATEST: 'gpt-5-chat-latest',
}
const PINECONE_APIKEY_CODE = "PINECONE_APIKEY"
module.exports = {
    OPENAI_MODAL,
    MESSAGE_TYPE,
    CONVERSATION_ERROR,
    AI_MODAL_PROVIDER,
    PINECORN_STATIC_KEY,
    MODAL_NAME,
    ANTHROPIC_MODAL,
    ANTHROPIC_MAX_TOKENS,
    INVITE_SUBSCRIPTION_ERROR,
    GEMINI_MODAL,
    PERPLEXITY_MODAL,
    DEEPSEEK_MODAL,
    OPENROUTER_PROVIDER,
    LLAMA4_MODAL,
    GROK_MODAL,
    QWEN_MODAL,
    PINECONE_APIKEY_CODE,
}