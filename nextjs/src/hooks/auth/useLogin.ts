import { loginAction } from '@/actions/auth';
import commonApi from '@/api';
import { AI_MODEL_CODE, MODULE_ACTIONS, RESPONSE_STATUS, RESPONSE_STATUS_CODE } from '@/utils/constant';
import { setSessionData, setUserData } from '@/utils/handleAuth';
import { encodedObjectId, encryptedPersist, generateObjectId } from '@/utils/helper';
import { BRAIN, FCM_TOKEN, LocalStorage, USER, WORKSPACE } from '@/utils/localstorage';
import routes from '@/utils/routes';
import Toast from '@/utils/toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useServerAction from '../common/useServerActions';
import { LoginPayload } from '@/types/user';

let tempAccessToken;

export const setLoginCookieData = async (response) => {
    await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(setSessionData(response.data))
    });
    removeLoginUserLocalStorage();
}

export const removeLoginUserLocalStorage = () => {
    const removeKeys = [USER, BRAIN, FCM_TOKEN, WORKSPACE];
    removeKeys.forEach((ele) => LocalStorage.remove(ele));
}

export const pushToMainChat = (response, router ) => {
    router.push(`${routes.main}`);
}

const useLogin = () => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [runLogin, pending] = useServerAction(loginAction);
    const objectId = generateObjectId();
    const fcmTokenSaveInDb = async () => {
        const fcmTokens = LocalStorage.get('fcm-token');
        if (fcmTokens) {
            await commonApi({
                action: MODULE_ACTIONS.SAVE_DEVICE_TOKEN,
                data: { fcmTokens }
            });
        }
    }

    useEffect(() => {
        router.prefetch(`${routes.chat}/${objectId}`);
        router.prefetch(routes.loginMfa);
    }, []);
    
    const handleLogin = async (payload: LoginPayload) => {
        try {
            const response = await runLogin(payload);
            // if (response.status === RESPONSE_STATUS.FORBIDDEN && response?.code === RESPONSE_STATUS_CODE.CSRF_TOKEN_MISSING) {
            //     Toast('Your request has been blocked for security reasons.', 'error');
            //     return;
            // }

            if (response?.data?.mfa) {
                tempAccessToken = response?.data?.access_token;
                router.push(routes.loginMfa);
            } else {
                await setLoginCookieData(response);
                await fcmTokenSaveInDb();
                const userInfo = setUserData(response.data);
                encryptedPersist(userInfo, USER);
                Toast(response.message);
                pushToMainChat(response, router);
            }
        } catch (error) {
            console.log('error: ', error);
        }
    };

    const handleMfaLogin = async (codes) => {
        setLoading(true);
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.MFALOGIN,
                module: MODULE_ACTIONS.AUTH,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                data: {
                    otp: codes
                },
                config: {
                    token: tempAccessToken
                },
                common: true
            });
            await setLoginCookieData(response);
            await fcmTokenSaveInDb();

            Toast(response.message);
            const userInfo = setUserData(response.data);
            encryptedPersist(userInfo, USER);
            pushToMainChat(response, router);
        } catch (error) {
            console.log('error: ', error);
        } finally {
            setLoading(false);
        }
    };

    const onBoardLogin = async (data) => {
        try {
            setLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.ON_BOARD_LOGIN,
                data: {
                    fname: data.fname,
                    lname: data.lname,
                    password: data.password,
                    email: data.email,
                }
            })
            const userInfo = setUserData(response.data);
            encryptedPersist(userInfo, USER);
            // persistBrainData(response.data.defaultBrain);
            Toast(response.message);
            pushToMainChat(response, router);
        } finally {
            setLoading(false);
        }
    }

    return { handleLogin, loading, handleMfaLogin, fcmTokenSaveInDb, onBoardLogin, pending };
};

export default useLogin;
