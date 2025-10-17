export const USER = 'user';
export const BRAIN = 'brain';
export const FCM_TOKEN = 'fcm-token';
export const WORKSPACE = 'workspace';
export const CONFIG_API = 'config_api'
export const ACTIVE_PROMPTS='active_prompts'
export const COMPANY_EMAIL = 'email';
export const HAS_REFRESHED = 'hasRefreshed';
export const CACHED_PROMPTS = 'weam_cached_prompts';
export const CACHED_AGENTS = 'weam_cached_agents';

const LocalStorage = {
    get: (key) => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
        }

        return false;
    },

    getJSON: (key) => {
        if (typeof localStorage !== 'undefined') {
            const data = LocalStorage.get(key);

            return data && data !== 'undefined' ? data : '';
        }

        return false;
    },

    set: (...rest: [string, string]) => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.setItem(...rest);
        }

        return false;
    },

    setJSON: (key, data) => {
        if (typeof localStorage !== 'undefined') {
            return LocalStorage.set(key, data);
        }

        return false;
    },

    setToken: (key, token) => {
        return LocalStorage.set(key, token);
    },

    setUser: (user) => {
        LocalStorage.set(USER, JSON.stringify(user));
    },

    remove: (key) => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.removeItem(key);
        }

        return false;
    },

    clean: (key:any) => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.clear();
        }

        return false;
    }
};

const SessionStorage = {
    setItem: (key, data) => {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.setItem(key, data)
        }
        return false;
    },
    removeItem: (key) => {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.removeItem(key);
        }
        return false;
    },
    getItem: (key) => {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem(key);
        }
        return false;
    }
}

export { LocalStorage, SessionStorage };
