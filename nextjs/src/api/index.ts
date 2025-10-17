import Toast from '@/utils/toast';
import apiList from './list';
import axios, { AxiosError, AxiosRequestHeaders, AxiosResponse } from 'axios';
import { LINK, NODE_API_PREFIX, AUTH } from '@/config/config';
import { getAccessToken } from '@/actions/serverApi';
import { handleLogout } from '@/utils/handleAuth';
import { RESPONSE_STATUS, RESPONSE_STATUS_CODE } from '@/utils/constant';
import { HAS_REFRESHED, SessionStorage } from '@/utils/localstorage';
import { APIResponseType } from '@/types/common';
import { decryptedData } from '@/utils/helper';

export type ConfigOptions = {
    baseUrl?: string;
    tokenPrefix?: string;
    getToken?: string;
    prefix?: string | ((config: ConfigOptions) => string);
    onError?: (error: Error) => void | string;
    handleCache?: boolean;
    csrfToken?: string;
    csrfTokenRaw?: string;
    'x-brain-id'?: string;
};

type FetchConfig = {
    hash?: string;
    authToken?: boolean;
    skipErrors?: boolean;
    headers?: AxiosRequestHeaders;
    next?: RequestInit['next'];
    'Content-Type'?: string;
    token?: string;
    csrfToken?: string;
    csrfTokenRaw?: string;
    'x-brain-id'?: string;
};

type FetchUrl<T = unknown, U = FetchConfig> = {
    type: ACTION_TYPES;
    url: string;
    data?: T;
    config?: U;
};

type ACTION_TYPES = 'GET' | 'POST' | 'PUT' | 'DELETE';

type ACTION<T = unknown, U = FetchConfig> = (
    url: string,
    data: T,
    fetchConfig: U
) => Promise<AxiosResponse>;

export type CommonApiType<T = unknown, U = FetchConfig> = {
    parameters?: string | string[],
    action: string,
    module?: string,
    prefix?: string,
    data?: T,
    config?: U,
    common?: boolean,
    errorToast?: boolean,
    handleCache?: boolean,
}

export let CONFIG: ConfigOptions = {
    baseUrl: `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`,
    tokenPrefix: 'jwt',
};

const makeResponse = (response: APIResponseType<any>) => {
    const code = response.code || '';
    if (code === 'ERROR') {
        Toast(response.message || 'Please try again, Something went wrong!', 'error');
    }
    return response;
};

const handleErrorToast = (errorToast: boolean) => (error: AxiosError) => { 
    if (Object.getPrototypeOf(error).toString() !== 'Cancel') {
        const { data = {}, status } = error.response as AxiosResponse || {};
        if (status === RESPONSE_STATUS.FORBIDDEN && [RESPONSE_STATUS_CODE.CSRF_TOKEN_NOT_FOUND, RESPONSE_STATUS_CODE.INVALID_CSRF_TOKEN].includes(data.code)) {
            Toast('Your request has been blocked for security reasons.', 'error');
            return;
        }
        if ([RESPONSE_STATUS.FORBIDDEN, RESPONSE_STATUS.UNAUTHENTICATED].includes(status) || data.code === RESPONSE_STATUS_CODE.TOKEN_NOT_FOUND ) {
            handleLogout();
        }
        // else if(status === RESPONSE_STATUS.UNAUTHENTICATED ){
        //     accessTokenViaRefresh();
        // } 
        else if (status === RESPONSE_STATUS.UNPROCESSABLE_CONTENT) {
            Toast(data.message, 'error');
        } else if (errorToast) {
            Toast(data.message || 'Oops, something went wrong !!!', 'error');
        }
    }
};

export const setAPIConfig = (conf: ConfigOptions) => {
    CONFIG = {
        ...CONFIG,
        ...conf,
    };
};

let cache = [];
const cancel = [];

const getUrl = (config: ConfigOptions, resourceUrl: string, query?: string) => {
    // Sanitizing BaseUrl to always ends with /
    let baseUrl = CONFIG.baseUrl.endsWith('/')
        ? CONFIG.baseUrl
        : `${config.baseUrl}/`;

    // Adding Prefix if specified
    if (CONFIG.prefix) {
        let prefix =
            typeof CONFIG.prefix === 'function'
                ? CONFIG.prefix(config)
                : CONFIG.prefix;
        if (prefix) {
            if (prefix.startsWith('/')) prefix = prefix.substring(1);
            if (!prefix.endsWith('/')) prefix = prefix + '/';
            baseUrl = baseUrl + prefix;
        }
    }

    // Sanitizing resourceUrl and removing / in front of it
    let appendUrl = streamlineUrl(resourceUrl);
    if (appendUrl.startsWith('/')) appendUrl = appendUrl.substring(1);

    // Building finalUrl
    let finalUrl = `${baseUrl}${appendUrl || ''}`;
    if (query) {
        // Support both raw query strings and ones already starting with '?'
        finalUrl = finalUrl + `?${query}`;
    }
    return finalUrl;
};

export const getHeaders = async (config: ConfigOptions, fetchConfig: FetchConfig) => {
    let headers = {};
    const token = config.getToken;
    // if token exits then set it to Authorization
    if (token) {
        // pass false to avoid any prefix
        const { tokenPrefix = 'Bearer' } = config;
        headers['Authorization'] = `${
            tokenPrefix ? `${tokenPrefix} ` : ''
        }${token}`;
    }
    // if (config?.csrfToken) {
    //     headers['x-csrf-token'] = config.csrfToken;
    //     headers['x-csrf-raw'] = config.csrfTokenRaw;
    // }
    if (config?.['x-brain-id']) {
        headers['x-brain-id'] = config['x-brain-id'];
    }
    if (fetchConfig?.headers) {
        headers = {
            ...headers,
            ...fetchConfig.headers,
        };
    }
    return headers;
};

export function serialize(obj: Record<string, any>) {
    const pairs: string[] = [];
    Object.keys(obj).forEach((k) => {
        const v = (obj as any)[k];
        if (v === undefined || v === null) return;
        let enc: string;
        if (typeof v === 'object') {
            try {
                enc = encodeURIComponent(JSON.stringify(v));
            } catch (_) {
                // Skip non-serializable values
                return;
            }
        } else {
            enc = encodeURIComponent(String(v));
        }
        pairs.push(`${k}=${enc}`);
    });
    // Return raw query string without leading '?'. Caller decides whether to prepend.
    return pairs.length ? pairs.join('&') : '';
}

const streamlineUrl = (url: string) => {
    return url.replace(/\/+/g, '/');
};

export const ACTION_HANDLERS: { [key in ACTION_TYPES]: ACTION } = {
    GET: (url, data, fetchConfig) => {
        const query = data ? serialize(data) : '';
        const finalUrl = getUrl(CONFIG, url, query);
        return axios.get(finalUrl, {
            headers: fetchConfig?.headers || {},
        });
    },
    DELETE: (url, data, fetchConfig) => {
        const finalUrl = getUrl(CONFIG, url);
        return axios.delete(finalUrl, {
            data,
            headers: fetchConfig.headers,
        });
    },
    POST: (url, data, fetchConfig) => {
        const finalUrl = getUrl(CONFIG, url);
        return axios.post(finalUrl, data, {
            headers: fetchConfig.headers,
        });
    },
    PUT: (url, data, fetchConfig) => {
        const finalUrl = getUrl(CONFIG, url);
        return axios.put(finalUrl, data, {
            headers: fetchConfig.headers,
        });
    },
};

function handleError(error: Error) {
    cache = [];
    CONFIG?.onError?.(error);
}

const cacheHandler = (url: string) => {
    if (CONFIG.handleCache) {
        if (cache.includes(url)) {
            const controller = cancel.filter((index) => index.url === url);
            controller.map((item) => item.cToken());
        } else {
            cache.push(url);
        }
    }
};

export const fetchUrl = ({ type = 'GET', url, data = {}, config = {} }: FetchUrl) => {
    return new Promise(async (resolve, reject) => {
        const actionType = type.toUpperCase();
        url = config.hash ? `${url}?hash=${config.hash}` : url;
        cacheHandler(url);
        const handler = ACTION_HANDLERS[actionType];
        config.headers = await getHeaders(CONFIG, config) as AxiosRequestHeaders;

        handler(url, data, config) 
            .then((response: AxiosResponse) => {
                SessionStorage.removeItem(HAS_REFRESHED)
                return resolve(response?.data);
            })
            .catch((error: Error) => {
                handleError(error);
                return reject(error);
            });
    });
};

const commonApi = async ({
    parameters = [],
    action,
    module = '',
    prefix = '',
    data,
    config,
    common = false,
    errorToast = true,
    handleCache = true,
}: CommonApiType) => {
    // try {
        const api = common
            ? apiList.commonUrl(prefix, module)[action]
            : apiList[`${action}`];

        const token = await getAccessToken();
        // const { decryptedCsrfToken, decryptedCsrfTokenRaw } = extractCsrfTokenData();
        if (api) {
            setAPIConfig({
                baseUrl: `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`,
                getToken: config?.token || token,
                onError: handleErrorToast(errorToast),
                handleCache,
                // csrfToken: decryptedCsrfToken,
                // csrfTokenRaw: decryptedCsrfTokenRaw,
                'x-brain-id': config?.['x-brain-id']
            });


            const response = await fetchUrl({
                type: api.method,
                url: api.url(...parameters as string[]),
                data: data,
                config
            })
            return makeResponse(response as APIResponseType<any>);
        }   
        Toast(`Oops ! i guess it's a wrong url`, 'error')
        return;
    // } catch (error) {
    //     console.error('error: commonApi ', error);
    //     if(returnError)
    //         return error
    // }
};

async function createError(response: Response) {
    let errorData: unknown;
    try {
        errorData = await response.json();
    } catch (error) {
        errorData = await response.text();
    }
    const error:any = new Error(`HTTP error ${response.status}`);
    error.response = response;
    error.data = errorData;
    return error;
}

export const FETCH_ACTION_HANDLERS: { [key in ACTION_TYPES]: ACTION } = {
    GET: async (url, data, fetchConfig) => {
        const query = data ? serialize(data) : '';
        const finalUrl = getUrl(CONFIG, url, query);
        const response = await fetchWithCaching(finalUrl, 'GET', data, fetchConfig);
        return response;
    },
    DELETE: async (url, data, fetchConfig) => {
        const finalUrl = getUrl(CONFIG, url);
        const response = await fetchWithCaching(finalUrl, 'DELETE', data, fetchConfig);
        return response;
    },
    POST: async (url, data, fetchConfig) => {
        const finalUrl = getUrl(CONFIG, url);
        const response = await fetchWithCaching(finalUrl, 'POST', data, fetchConfig);
        return response;
    },
    PUT: async (url, data, fetchConfig) => {
        const finalUrl = getUrl(CONFIG, url);
        const response = await fetchWithCaching(finalUrl, 'PUT', data, fetchConfig);
        return response;
    },
};

async function fetchWithCaching(url: string, method: ACTION_TYPES, data: unknown, fetchConfig: FetchConfig) {
    const { next, headers, ...restConfig } = fetchConfig || {};
    const fetchOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
        },
        body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
        ...(next ? { next } : { cache: 'no-store' }),
        ...restConfig,
    };

    const response = await fetch(url, fetchOptions as RequestInit);

    if (!response.ok) {
        throw await createError(response);
    }

    return response.json();
}

export function extractCsrfTokenData() {
    const tokenCookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${AUTH.CSRF_COOKIE_NAME}=`));
    const tokenCookieRawValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${AUTH.CSRF_COOKIE_RAW_NAME}=`));

    const csrfTokenEncoded = tokenCookieValue?.split('=')[1] ?? '';
    const csrfTokenRawEncoded = tokenCookieRawValue?.split('=')[1] ?? '';
    const csrfToken = decodeURIComponent(csrfTokenEncoded);
    const csrfTokenRaw = decodeURIComponent(csrfTokenRawEncoded);
    const decryptedCsrfToken = decryptedData(csrfToken);
    const decryptedCsrfTokenRaw = decryptedData(csrfTokenRaw);
    return {
        decryptedCsrfToken,
        decryptedCsrfTokenRaw
    }
}

export default commonApi;
