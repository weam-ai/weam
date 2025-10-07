export const LINK = {
    SOCKET_CONNECTION_URL: process.env.NEXT_PUBLIC_SOCKET_CONNECTION_URL,
    DOMAIN_URL: process.env.NEXT_PUBLIC_DOMAIN_URL,
    AWS_S3_URL: process.env.NEXT_PUBLIC_AWS_S3_URL,
    OPENAI_PLATFORM_URL: process.env.NEXT_PUBLIC_OPENAI_PLATFORM_URL,
    WEAM_PRICING_URL: process.env.NEXT_PUBLIC_WEAM_PRICING_URL || 'https://weam.ai/pricing',
    SERVER_NODE_API_URL: process.env.NEXT_PUBLIC_SERVER_NODE_API_URL,
    COMMON_NODE_API_URL: process.env.NEXT_PUBLIC_COMMON_NODE_API_URL,
    PYTHON_API_URL: "http://gateway_service:9089/pyapi"
};

export const FIREBASE = {
    APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
};

export const APP_ENVIRONMENT = process.env.NEXT_PUBLIC_APP_ENVIRONMENT;
export const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX;
export const STRIPE_PUBLISH_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISH_KEY;
export const STRIPE_SUBSCRIPTION_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID;
export const STRIPE_SUBSCRIPTION_PRICE_ID_IND = process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID_IND;
export const STRIPE_STORAGE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_STORAGE_PRICE_ID;
export const STRIPE_STORAGE_PRICE_ID_IND = process.env.NEXT_PUBLIC_STRIPE_STORAGE_PRICE_ID_IND;
export const STRIPE_TEST_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID;
export const NODE_API_PREFIX = process.env.NEXT_PUBLIC_NODE_API_PREFIX || '/v1';

export const AUTH = {
    COOKIE_NAME: process.env.NEXT_PUBLIC_COOKIE_NAME,
    COOKIE_PASSWORD: process.env.NEXT_PUBLIC_COOKIE_PASSWORD,
    CSRF_TOKEN_SECRET: process.env.CSRF_TOKEN_SECRET,
    CSRF_COOKIE_NAME: 'csrf_token',
    CSRF_COOKIE_RAW_NAME: 'weam_raw'
};

export const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_SECURITY_KEY;

export const RAZORPAY = {
    KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    KEY_SECRET: process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET
};

export const RECAPTCHA = {
    SITE_KEY_V3: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY_V3,
    SECRET_KEY_V3: process.env.NEXT_PUBLIC_RECAPTCHA_SECRET_KEY_V3,
    SITE_KEY_V2: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY_V2,
    SECRET_KEY_V2: process.env.NEXT_PUBLIC_RECAPTCHA_SECRET_KEY_V2
}

export const BASIC_AUTH = {
    USERNAME: process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME,
    PASSWORD: process.env.NEXT_PUBLIC_BASIC_AUTH_PASSWORD
}

export const SLACK = {
    CLIENT_ID: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    CLIENT_SECRET: process.env.NEXT_PUBLIC_SLACK_CLIENT_SECRET,
    REDIRECT_URI: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/api/auth/slack/callback`,
    AUTH_URL: 'https://slack.com/oauth/v2/authorize',
    TOKEN_URL: 'https://slack.com/api/oauth.v2.access',
    SCOPE: "channels:write.invites,channels:write.topic,chat:write,files:write,groups:write,groups:write.invites,im:write,im:write.topic,links.embed:write,links:write,mpim:write,mpim:write.topic,stars:write,users:write,channels:history,channels:read,users:read,groups:history,im:history,mpim:history,im:read,groups:read,mpim:read"
};

export const GOOGLE_OAUTH = {
    CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
    CLIENT_SECRET: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET,
    REDIRECT_URI: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/api/auth/google/callback`,
    AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN_URL: 'https://oauth2.googleapis.com/token',
    SCOPE: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/oauth2/v2/userinfo',
    USER_INFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo'
}

export const GITHUB = {
    CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    CLIENT_SECRET: process.env.NEXT_PUBLIC_GITHUB_CLIENT_SECRET,
    REDIRECT_URI: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/api/auth/github/callback`,
    AUTH_URL: 'https://github.com/login/oauth/authorize',
    TOKEN_URL: 'https://github.com/login/oauth/access_token',
    USER_INFO_URL: 'https://api.github.com/user',
    SCOPE: 'repo,user,read:org,write:org,admin:org,workflow'
}


export const ZOOM = {
    CLIENT_ID: process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID,
    CLIENT_SECRET: process.env.NEXT_PUBLIC_ZOOM_CLIENT_SECRET,
    REDIRECT_URI: `${process.env.NEXT_PUBLIC_DOMAIN_URL}/api/auth/zoom/callback`,
    AUTH_URL: 'https://zoom.us/oauth/authorize',
    TOKEN_URL: 'https://zoom.us/oauth/token',
    USER_INFO_URL: 'https://api.zoom.us/v2/users/me',
    SCOPE: 'webinar:read:list_webinars,webinar:read:list_past_polls,webinar:read:list_templates,webinar:read:list_registrants,webinar:read:list_polls,webinar:read:registrant,webinar:read:poll,webinar:read:list_panelists,user:read:user,user:read:email,meeting:read:participant,meeting:read:list_registrants,meeting:read:poll,meeting:read:list_meetings,meeting:read:meeting,meeting:write:poll,meeting:write:meeting,meeting:write:invite_links,calendar:read:event,calendar:read:calendar_list,meeting:update:meeting,meeting:delete:meeting'
}