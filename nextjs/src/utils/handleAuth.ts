import { getSession } from '@/config/withSession';
import routes from './routes';
import { redirect } from 'next/navigation';
import { BRAIN, LocalStorage, USER, FCM_TOKEN, WORKSPACE, SessionStorage, HAS_REFRESHED } from './localstorage';
import commonApi from '@/api';
import { MODULES, MODULE_ACTIONS, ROLE_TYPE } from './constant';
import { decryptedPersist, encryptedPersist } from './helper';
import { LINK, NODE_API_PREFIX } from '@/config/config';
import { SessionUserType, SetIronSessionData, SetUserData } from '@/types/user';

export const Authentication = async () => {
    const session = await getSession();
    if (!session?.user?.access_token) {
        redirect(routes.login);
    }
};

export const redirectToRoot = async () => {
    const session = await getSession();
    if (session?.user?.access_token) {  
        redirect(routes.main);
    }
}

export const setSessionData = (data: SetIronSessionData) => {
    return {
        email: data?.email?.toLowerCase(),
        access_token: data?.access_token,
        refresh_token: data?.refresh_token,
        _id: data?._id,
        isProfileUpdated: data?.isProfile,
        roleCode: data?.roleCode,
        companyId: getCompanyId(data),
    };
};


export const handleLogout = () => {
    
    fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    }).then(async response => {
        if (response.ok && typeof window !== 'undefined' && window.location.pathname !== routes.login) {
            const userInfo = getCurrentUser();
            await commonApi({
                action: MODULE_ACTIONS.LOGOUT,
                module: MODULES.AUTH,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                common: true,
                data: {
                    fcmToken: LocalStorage.get(FCM_TOKEN),
                    userId: userInfo._id
                }
            })
            window.location.href = routes.login;
            const removeKeys = [USER, BRAIN, FCM_TOKEN, WORKSPACE];
            removeKeys.forEach((ele) => LocalStorage.remove(ele));
        } else {
            return false
        }
    })
}

export const getCurrentUser = () => {
    return decryptedPersist(USER)
}

export const setUserData = (data: SetUserData) => { 
    return {
        _id: data._id,
        email: data.email?.toLowerCase(),
        roleId: data.roleId,
        roleCode: data.roleCode,
        company: data.company,
        invitedBy: data?.invitedBy,
        fname: data?.fname,
        lname: data?.lname,
        phone: data?.mobNo,
        mfa: data?.mfa,
        isProfileUpdated: data?.isProfile,
        profileImg: data?.profile?.uri,
        profile: data?.profile,
        isPrivateBrainVisible:data?.isPrivateBrainVisible,
        countryName: data?.countryName,
        countryCode: data?.countryCode,
        defaultBrain: data?.defaultBrain,
        access_token: data?.access_token,
        inviteSts: data?.inviteSts,
        isFreeTrial: data?.isFreeTrial,
        onboard: data?.onboard,
    }
}

export const getCompanyId = (user: SetUserData) => {
    if (!user) return;
    return user.roleCode === ROLE_TYPE.COMPANY ? user.company.id : user.invitedBy;
}

export const accessTokenViaRefresh = () => {
    if (SessionStorage.getItem(HAS_REFRESHED)) {
        return;
    }
    SessionStorage.setItem(HAS_REFRESHED, 'true');
    getSession().then(async (session) => {
        const refresh_token = session?.user?.refresh_token;
        const response = await fetch(`${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}/web/auth/refresh-token`, {
            method: 'POST',
            headers: {
                authorization: `jwt ${refresh_token}`,
                'Content-Type': 'application/json'
            },

        });
        if (!response.ok) return handleLogout();
        const jsondata = await response.json();
        await fetch(`/api/refreshtoken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: jsondata.data
            })
        })
        const currentUser = getCurrentUser();
        const updatedUser = {
            ...currentUser,
            access_token: jsondata.data
        }
        encryptedPersist(updatedUser, USER);
    }).finally(() => window.location.reload());
}

export const getSessionUser = async (): Promise<SessionUserType> => {
    const session = await getSession();
    return session?.user;
}

export const pythonRefreshToken = async () => {
    const session = await getSession();
    const refresh_token = session?.user?.refresh_token;
    const response = await fetch(`${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}/web/auth/refresh-token`, {
        method: 'POST',
        headers: {
            authorization: `jwt ${refresh_token}`,
            'Content-Type': 'application/json'
        },
    })
    if (!response.ok) return handleLogout();
    const jsondata = await response.json();
    return jsondata.data;
}