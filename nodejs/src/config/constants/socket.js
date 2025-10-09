
const SOCKET_ROOM_PREFIX = {
    CHAT:'chat-',
    THREAD:'thread-',
    COMPANY: 'company-'
}

const SOCKET_EVENTS = {
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
    USER_MESSAGE_COUNT: 'messagecount',
    SUBSCRIPTION_STATUS: 'subscriptionstatus',
    AI_MODEL_KEY_REMOVE: 'aimodelkeyremove',
    NOTIFY_MESSAGE_LIMIT: 'messageexceeded',
    API_KEY_REQUIRED: 'apikeyrequired',
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
    FETCH_SUBSCRIPTION: 'fetchsubscription',
    LLM_RESPONSE_SEND: 'llmresponsesend',
    FILE_UPLOAD_PROGRESS: 'fileuploadprogress',
    FILE_EMBED_PROGRESS: 'fileembedprogress',
    GENERATE_TITLE_BY_LLM: 'generatetitlebyllm',
    FORCE_STOP: 'forcestop',
}

module.exports = {
    SOCKET_ROOM_PREFIX,
    SOCKET_EVENTS
}
