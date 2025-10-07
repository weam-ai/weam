'use client';
import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MODULE_ACTIONS, RESPONSE_STATUS, RESPONSE_STATUS_CODE } from '@/utils/constant';
import commonApi from '@/api';
import { encryptedPersist } from '@/utils/helper';
import { setUserData, setSessionData } from '@/utils/handleAuth';
import { COMPANY_EMAIL, LocalStorage, USER } from '@/utils/localstorage';
import routes from '@/utils/routes';
import useSignup from '@/hooks/auth/useSignup';
import Toast from '@/utils/toast';

const LinkExpiredPage = () => {
    const { reSendVerificationEmail, loading } = useSignup();
    const handleResendLink = useCallback(() => {
        const alreadySent = LocalStorage.get(COMPANY_EMAIL);
        if (!alreadySent) {
            Toast('Verification link already sent please check your email.', 'error');
            return
        }
        reSendVerificationEmail(alreadySent);
    }, []);
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center p-5 w-full">
            <div className="w-full mx-auto max-w-[400px] text-center">
                <h2 className="text-center text-font-24 font-bold text-b2">
                    Link Expired
                </h2>
                <p className="mt-2 text-center text-font-16 text-b2">
                    The requested action couldn’t be completed as the link has expired. Please click below to resend for verification.
                </p>
                <button className='btn btn-black mt-5' onClick={handleResendLink} disabled={loading}>Resend Link</button>
            </div>
        </div>
    );
};

const LinkSubscriptionPage = () => {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center p-5 w-full">
            <div className="w-full mx-auto max-w-[400px] text-center">
                <h2 className="text-center text-font-24 font-bold text-b2">
                    User Limit Reached
                </h2>
                <p className="mt-2 text-center text-font-16 text-b2">
                    The link you are trying to access has expired.
                </p>
                <p>
                    The user limit of your plan has been reached, please contact your administrator.
                </p>
            </div>
        </div>
    );
};

const InviteViaMagicLink = () => {
    const searchParam = useSearchParams();
    const token = searchParam.get('token');
    const hash = searchParam.get('hash');
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [linkExpire, setLinkExpire] = useState(false);
    const [linkSubscription,setLinkSubscription]=useState(false);

    useEffect(() => {
        router.prefetch(routes.onboard);
        if (token && hash) {
            inviteMemberLogin2(token, hash);  
        }     
    }, [token, hash]);
    
    const inviteMemberLogin2 = async (token: string, hash: string) => {
        try {
            setLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.INVITE_LOGIN,
                data: {
                    inviteLink: `invite?token=${token}&hash=${hash}`,
                },
            });
            // TODO: resolve typescript error
            // if(response?.response?.status==410){
            //     setLinkSubscription(true)
            //     return;
            // }
            
            await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(setSessionData(response.data))
            });
            const userInfo = setUserData(response.data);
            
            encryptedPersist(userInfo, USER);
            router.push(routes.onboard)
        } catch (error) {
            console.log('error: ', error);
            const { data, status } = error?.response || {}; 
            if (status === RESPONSE_STATUS.GONE && data?.code === RESPONSE_STATUS_CODE.RESEND_LINK) {
                LocalStorage.set(COMPANY_EMAIL, data?.data);
            }
            setLinkExpire(true);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <>
            {loading && (
                <div className="flex justify-center items-center h-screen w-full">
                    <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-gray-900"></div>
                </div>
            )}
            {linkExpire && <LinkExpiredPage />}
            {linkSubscription && <LinkSubscriptionPage />}
        </>
    );
};

const InvitePageWrapper = () => {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-full mt-5">
                <div className="dot-flashing"></div>
            </div>
        }>
            <InviteViaMagicLink />
        </Suspense>
    );
};

export default InvitePageWrapper;
