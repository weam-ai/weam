'use server';
import { RESPONSE_STATUS, RESPONSE_STATUS_CODE, MODULE_ACTIONS } from '@/utils/constant';
import { FETCH_ACTION_HANDLERS, getHeaders, setAPIConfig, ConfigOptions } from '../api';
import { revalidateTag } from 'next/cache';
import { getSession } from '@/config/withSession';
import { cookies } from 'next/headers';
import { decryptedData } from '@/utils/helper';
import { AUTH, LINK, NODE_API_PREFIX } from '@/config/config';
import { serverLogout } from '@/utils/serverAuth';

export async function getAccessToken() {
    const session = await getSession();
    return session?.user?.access_token;
}

async function fetchUrl({ type = 'GET', url, data = {}, config = {} }: any) {
    const actionType = type.toUpperCase();
    const handler = FETCH_ACTION_HANDLERS[actionType];

    const token = await getAccessToken();
    
    config.headers = await getHeaders({
        baseUrl: `${LINK.SERVER_NODE_API_URL}`,
        tokenPrefix: 'jwt',
        getToken: token,
    }, config);
    
    try {
        const response = await handler(url, data, config);
        return response;
    } catch (error) {
        const { status, config: reqConfig } = (error.response || {});
        const data = (error.data || {});
        const requestUrl = (reqConfig && reqConfig.url) || '';
        
        // Handle 403 Forbidden errors
        if (status === RESPONSE_STATUS.FORBIDDEN) {
            // Bypass auto-logout for Ollama endpoints to avoid disrupting configuration flow
            // if (requestUrl.includes('/ollama/')) {
            //     return { status: RESPONSE_STATUS.FORBIDDEN, code: RESPONSE_STATUS_CODE.SERVER_FORBIDDEN, message: data.message || 'Access forbidden' };
            // }

            // Check if it's a CSRF token issue first
            if (data.code === RESPONSE_STATUS_CODE.CSRF_TOKEN_MISSING) {
                return { status: RESPONSE_STATUS.FORBIDDEN, code: RESPONSE_STATUS_CODE.CSRF_TOKEN_MISSING }
            }
            
            // For other 403 errors (like token not found, unauthorized access, etc.), logout the user
            await serverLogout();
            return { status: RESPONSE_STATUS.FORBIDDEN, code: RESPONSE_STATUS_CODE.SERVER_FORBIDDEN, message: 'Access forbidden, user logged out' }
        }
        
        // Handle other error cases
        if (status === RESPONSE_STATUS.UNPROCESSABLE_CONTENT) {
            return { status: RESPONSE_STATUS.UNPROCESSABLE_CONTENT, code: data.code, message: data.message }
        } else if (status === RESPONSE_STATUS.UNAUTHENTICATED) {
            return { status: RESPONSE_STATUS.FORBIDDEN, code: RESPONSE_STATUS_CODE.CSRF_TOKEN_NOT_FOUND }
        }
        
        return { status: RESPONSE_STATUS.ERROR, code: RESPONSE_STATUS_CODE.ERROR, message: data.message }
    }
}

export const setServerAPIConfig = (conf: ConfigOptions) => {
    setAPIConfig(conf);
    return conf
};


export async function serverApi({
    parameters = [],
    action,
    module = '',
    prefix = '',
    data,
    config = {},
    common = false,    
}:any) {
    const apiList = (await import('../api/list')).default;
    const api = common
        ? apiList.commonUrl(prefix, module)[action]
        : apiList[`${action}`];

    if (!api) {
        return { code: 'ERROR', message: 'Invalid API action or URL.' };
    }

    const token = await getAccessToken();
    
    // If no access token is found, only logout for non-login actions
    // Login actions don't have tokens yet, so we shouldn't logout for them
    if (!token && action !== MODULE_ACTIONS.LOGIN && action !== MODULE_ACTIONS.SIGNUP && action !== MODULE_ACTIONS.FORGOT_PASSWORD && action !== MODULE_ACTIONS.RESET_PASSWORD && action !== MODULE_ACTIONS.REGISTER_COMPANY && action !== MODULE_ACTIONS.RESEND_VERIFICATION_EMAIL) {
        await serverLogout();
        return { status: RESPONSE_STATUS.FORBIDDEN, code: RESPONSE_STATUS_CODE.TOKEN_NOT_FOUND, message: 'No access token found' }
    }
    
    // Try to get existing CSRF tokens
    // const tokenCookieValue = cookies().get(AUTH.CSRF_COOKIE_NAME)?.value;
    // const tokenCookieRawValue = cookies().get(AUTH.CSRF_COOKIE_RAW_NAME)?.value;
    // const csrfToken = tokenCookieValue ? decryptedData(tokenCookieValue) : '';
    // const csrfTokenRaw = tokenCookieRawValue ? decryptedData(tokenCookieRawValue) : '';

    setServerAPIConfig({
        getToken: token,
        baseUrl: `${LINK.SERVER_NODE_API_URL}${NODE_API_PREFIX}`,
        tokenPrefix: 'jwt',
    });

    const response = await fetchUrl({
        type: api.method,
        url: api.url(...parameters),
        data,
        config,
    });
    
    return response;
}

export async function revalidateTagging(response: any, tag: string) {
    if ([RESPONSE_STATUS.SUCCESS, RESPONSE_STATUS.CREATED].includes(response.status)) {
        revalidateTag(tag);
    }
}