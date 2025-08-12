import commonApi from '@/api';
import { MODULE_ACTIONS } from '@/utils/constant';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import routes from '@/utils/routes';
import { COMPANY_EMAIL, LocalStorage, SessionStorage } from '@/utils/localstorage';
import Toast from '@/utils/toast';

const useSignup = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const registerCompany = async (details:any) => {
        try {
            setLoading(true)

            const registerdata = {
                fname: details.firstName,
                lname: details.lastName,
                email: details.email.toLowerCase(),
                password: details.password,
                confirmPassword: details.confirmPassword,
                companyNm: details.companyNm,
                countryName: details?.country?.nm,
                countryCode: details?.country?.shortCode,
            }
            await commonApi({
                action: MODULE_ACTIONS.REGISTER_COMPANY,
                data: registerdata
            })
            SessionStorage.setItem(COMPANY_EMAIL, details.email);
            router.push(routes.sendVerification);
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setLoading(false);
        }
    }

    const reSendVerificationEmail = async (individualEmail? :string) => {
        try {
            setLoading(true);
            const email = individualEmail ? individualEmail : SessionStorage.getItem(COMPANY_EMAIL)
            if (!email) return;
            const response = await commonApi({
                action: MODULE_ACTIONS.RESEND_VERIFICATION_EMAIL,
                data: { email, ...(individualEmail ? {minutes: 1440} : {}) }
            })
            Toast(response.message);
            LocalStorage.remove(COMPANY_EMAIL);
        } catch (error) {
            console.error('error: reSendVerificationEmail', error);
        } finally {
            setLoading(false);
        }
    }

    return { registerCompany, loading, reSendVerificationEmail, }
}

export default useSignup