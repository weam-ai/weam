'use client';

import React, { useState } from 'react';
import useForgotPassword from '@/hooks/auth/useForgotPassword';
import ValidationError from '@/widgets/ValidationError';
import Label from '@/widgets/Label';
import CommonInput from '@/widgets/CommonInput';

const ForgotPasswordForm = () => {
    const [email, setEmail] = useState();
    const [showMessage, setShowMessage] = useState(false);

    const { register, handleSubmit, errors, forgotPassword } =
        useForgotPassword();
    return (
        <>
            <form
                className="w-full mt-6"
                onSubmit={handleSubmit(() =>
                    forgotPassword(email, setShowMessage)
                )}
            >
                <div className="relative">
                    <Label htmlFor={'email-address'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'} title={'Email Address'}/>
                    <CommonInput
                        type={'email'}
                        {...register('email')}
                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    />
                </div>
                <ValidationError errors={errors} field={'email'} />
                <button
                    type="submit"
                    className="btn btn-black mt-5 w-full"
                >
                    Reset Password
                </button>
            </form>
            {showMessage && (
                <p className="text-center text-font-14 text-emerald-600 max-w-[450px] mx-auto mt-2">
                    A password reset link has been sent to your email. Please check your inbox
                </p>
            )}
        </>
    );
};

export default ForgotPasswordForm;
