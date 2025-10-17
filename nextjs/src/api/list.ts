import { MODULE_ACTIONS } from "@/utils/constant";

const ADMIN = 'admin';
const WEB = 'web';

const apiList = {
    fileUpload: {
        url: () => `upload/file-via-streams`,
        method: 'POST',
    },
    allMediaUpload: {
        url: () => `upload/allmedia`,
        method: 'POST',
    },
    deleteS3Media: {
        url: () => `upload/delete/s3media`,
        method: 'DELETE',
    },
    generatePresignedUrl: {
        url: () => `upload/generate-presigned-url`,
        method: 'POST',
    },
    permissionByRole: {
        url: (id) => `${ADMIN}/permissions/by-role/${id}`,
        method: 'POST',
    },
    createcustomgpt: {
        url: () => `${ADMIN}/customgpt/create`,
        method: 'POST' 
    },
    checkoutSession: {
        url: () => `${WEB}/payment/checkout-session`,
        method: 'POST'
    },
    registerCompany: {
        url: () => `${WEB}/company/weam/register`,
        method: 'POST' 
    },
        workspaceUserCount: {
        url: () => `${WEB}/workspace/user/list`,
        method: 'POST'
    },
    shareBrains: {
        url: () => `${WEB}/brain/share/list`,
        method: 'POST',
    },
    checkApiKey: {
        url: () => `${WEB}/company/check/apikey`,
        method: 'POST'
    },
    sendMessage: {
        url: () => `${WEB}/message/send`,
        method: 'POST'
    },
    createFileRecord: {
        url: () => `upload/create-file-record`,
        method: 'POST',
    },
    editResponse: {
        url: () => `chat/update-response`,
        method: 'PUT'
    },
    updateMessage: {
        url: (id: string) => `${WEB}/message/update/${id}`,
        method: 'PUT'
    },
    forkChat: {
        url: () => `${WEB}/chat/fork`,
        method: 'POST'
    },
    inviteLogin: {
        url: () => `${WEB}/auth/invite-login`,
        method: 'POST'
    },
    unshare:{
        url: (id) => `${ADMIN}/brain/unshare/${id}`,
        method: 'DELETE'
    },
    shareList:{
        url: () => `${ADMIN}/brain/share/list`,
        method: 'POST'
    },
    deleteShareChat:{
        url: () => `${WEB}/sharechat/delete`,
        method: 'DELETE'
    },
    updateProfile:{
        url: (id) => `${WEB}/auth/update-profile/${id}`,
        method: 'PUT'
    },
    getProfile:{
        url: (id) => `${WEB}/auth/profile/${id}`,
        method: 'GET'
    },
    generateMfaSecret:{ 
        url: () => `${MODULE_ACTIONS.WEB_PREFIX}/${MODULE_ACTIONS.AUTH}/generate-mfa-secret`,
        method: 'POST'
    },
    mfaVerifcation:{ 
        url: () => `${MODULE_ACTIONS.WEB_PREFIX}/${MODULE_ACTIONS.AUTH}/verify-mfa-otp`,
        method: 'POST'
    },
    saveDeviceToken:{ 
        url: () => `${WEB}/notification/save-device/token`,
        method: 'POST'
    },
    deleteNotifications:{ 
        url: () => `${WEB}/notification/delete`,
        method: 'DELETE'
    },
    markReadNotifications:{ 
        url: () => `${WEB}/notification/read`,
        method: 'PUT'
    },
    saveResponseTime: {
        url: () => `${WEB}/message/save-time`,
        method: 'POST'
    },
    getStorage:{
        url: () => `${WEB}/user/storage/details`,
        method: 'GET'
    },
    increaseStorage:{
        url: () => `${WEB}/user/storage/increase`,
        method: 'POST'
    },
    unreadnoticount:{
        url: () => `${WEB}/notification/count`,
        method: 'GET'
    },
    checkChatAccess: {
        url: () => `${WEB}/chat/check-access`,
        method: 'POST'
    },
    assigngpt: {
        url: () => `${WEB}/customgpt/assigngpt`,
        method: 'POST'
    },
    agents: {
        url: (brainId: string) => `${WEB}/customgpt/agents/${brainId}`,
        method: 'GET'
    },
    chatTeamDelete:{
        url: (id: string)=>  `${WEB}/teamBrain/chat/delete/${id}`,
        method:'DELETE'  
    },
    approveStorageRequest: {
        url: () => `${ADMIN}/storagerequest/approve`,
        method: 'POST'
    },
    declineStorageRequest: {
        url: () => `${ADMIN}/storagerequest/decline`,
        method: 'POST'
    },
    resendVerification: {
        url: () => `${WEB}/company/resend-verification`,
        method: 'POST'
    },
    onBoardLogin: {
        url: () => `${WEB}/auth/onboard-profile`,
        method: 'POST'
    },
    huggingFaceKeyCheck: {
        url: () => `${WEB}/company/huggingface/apikey`,
        method: 'POST'
    },
    anthropicKeyCheck: {
        url: () => `${WEB}/company/anthropic/apikey`,
        method: 'POST'
    },
    geminiKeyCheck: {
        url: () => `${WEB}/company/gemini/apikey`,
        method: 'POST'
    },
    // For Ollama, no API key is required. Use a health/test endpoint.
    ollamaKeyCheck: {
        url: () => `ollama/health`,
        method: 'GET'
    },
    // Ollama model management (download removed by request)
    ollamaPullModel: {
        url: () => `ollama/pull`,
        method: 'POST'
    },
    ollamaListTags: {
        url: () => `ollama/tags`,
        method: 'GET'
    },
    // Save Ollama settings (baseUrl, apiKey, selected model) via Node API
    saveOllamaSettings: {
        // This hits the Node backend route: /napi/v1/ollama/save-settings
        // The commonApi builds base as LINK.COMMON_NODE_API_URL + NODE_API_PREFIX
        url: () => `ollama/save-settings`,
        method: 'POST'
    },
    brainListAll: {
        url: () => `${WEB}/brain/list-all`,
        method: 'POST'
    },
    getMessageCredits: {
        url: () => `${WEB}/message/credit`,
        method: 'GET'
    },
    resendInvitation: {
        url: () => `${ADMIN}/user/verification/resend-invitation`,
        method: 'POST'
    },
    tabPromptList: {
        url: () => `${WEB}/prompt/user/getAll`,
        method: 'POST'
    },
    tabAgentList: {
        url: () => `${WEB}/customgpt/user/getAll`,
        method: 'POST'
    },
    tabDocumentList: {
        url: () => `${WEB}/chat-doc/user/getAll`,
        method: 'POST'
    },
    userFavoriteList: {
        url: ()=> `${WEB}/user/favorite-list`,
        method: 'POST'
    },
    solutionInstall: {
        url: () => `${WEB}/solution-install`,
        method: 'POST'
    },
    globalSearch: {
        url: () => `${WEB}/message/global-search`,
        method: 'POST'
    },
    getUsage: {
        url: () => `${ADMIN}/report/company-usage`,
        method: 'POST'
    },
    getUserUsage: {
        url: () => `${ADMIN}/report/user-usage`,
        method: 'POST'
    },
    getWeeklyUsage: {
        url: () => `${ADMIN}/report/weekly-usage`,
        method: 'POST'
    },
    addCredit: {
        url: () => `${ADMIN}/credit-control/add-credit`,
        method: 'POST'
    },
    updateMcpData: {
        url: () => `common/update-mcp-data`,
        method: 'PUT'
    },
    getMembersToSolutionApp: {
        url: () => `${ADMIN}/super-solution/members/list`,
        method: 'POST'
    },
    addMembersToSolutionApp: {
        url: () => `${ADMIN}/super-solution/members/add`,
        method: 'POST'
    },
    removeMembersFromSolutionApp: {
        url: () => `${ADMIN}/super-solution/members/remove`,
        method: 'POST'
    },
    getTeamsToSolutionApp: {
        url: () => `${ADMIN}/super-solution/teams/list`,
        method: 'POST'
    },
    addTeamsToSolutionApp: {
        url: () => `${ADMIN}/super-solution/teams/add`,
        method: 'POST'
    },
    removeTeamsFromSolutionApp: {
        url: () => `${ADMIN}/super-solution/teams/remove`,
        method: 'POST'
    },
    getSolutionAppByUserId: {
        url: (id: string) => `${ADMIN}/super-solution/get-by-user-id/${id}`,
        method: 'GET'
    },
    getAiAdoption: {
        url: () => `${ADMIN}/report/ai-adoption`,
        method: 'POST'
    },
        // Page operations
    createPage: {
        url: () => `${WEB}/page/create`,
        method: 'POST'
    },
    getAllPages: {
        url: () => `${WEB}/page/list`,
        method: 'POST'
    },
    getPageById: {
        url: (id: string) => `${WEB}/page/${id}`,
        method: 'GET'
    },
    pageUpdate: {
        url: (id: string) => `${WEB}/page/${id}`,
        method: 'PUT'
    },
    deletePage: {
        url: (id: string) => `${WEB}/page/${id}`,
        method: 'DELETE'
    },
    enhancePromptByLLM: {
        url: () => `${WEB}/chat/enhance-prompt`,
        method: 'POST'
    },
    getImages: {
        url: () => `${WEB}/chat/get/search-metadata`,
        method: 'POST'
    },
    commonUrl: (prefix: string, module: string) => ({
        list: {
            url: () => `${prefix}/${module}/list`,
            method: 'POST'
        },
        create: {
            url: () => `${prefix}/${module}/create`,
            method: 'POST',
        },
        get: {
            url: (id: string) => `${prefix}/${module}/${id}`,
            method: 'GET',
        },
        update: {
            url: (id: string) => `${prefix}/${module}/update/${id}`,
            method: 'PUT',
        },
        partial: {
            url: (id: string) => `${prefix}/${module}/partial/${id}`,
            method: 'PUT',
        },
        delete: {
            url: (id: string) => `${prefix}/${module}/delete/${id}`,
            method: 'DELETE'
        },
        deleteall: {
            url: () => `${prefix}/${module}/deleteall`,
            method: 'DELETE'
        },
        logout: {
            url: () => `${prefix}/${module}/logout`,
            method: 'POST'
        },
        login: {
            url: () => `${prefix}/${module}/signin`,
            method: 'POST'
        },
        mfaLogin: {
            url: () => `${prefix}/${module}/mfa-login`,
            method: 'POST'
        },
        changePassword: {
            url: () => `${prefix}/${module}/change-password`,
            method: 'POST'
        },
        register: {
            url: () => `${prefix}/${module}/weam/register`,
            method: 'POST'
        },
        forgotPassword: {
            url: () => `${prefix}/${module}/forgot-password`,
            method: 'POST'
        },
        resetPassword: {
            url: () => `${prefix}/${module}/reset-password`,
            method: 'POST'
        },
        inviteUsers: {
            url: () => `${prefix}/${module}/invite`,
            method: 'POST'
        },
        remove: {
            url: () => `${prefix}/${module}/remove`,
            method: 'DELETE'
        },
        restore: {
            url: (slug: string) => `${prefix}/${module}/restore/${slug}`,
            method: 'POST'
        },
        toggle: {
            url: () => `${prefix}/${module}/toggle`,
            method: 'POST'
        },
        favorite: {
            url: (id: string) => `${prefix}/${module}/favorite/${id}`,
            method: 'PUT'
        },
        changeRole: {
            url: () => `${prefix}/${module}/change-role`,
            method: 'POST'
        },
        upload: {
            url: () => `${prefix}/${module}/upload`,
            method: 'POST'
        }
    })
}

export default apiList;