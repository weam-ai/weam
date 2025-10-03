'use client';
import useSignup from '@/hooks/auth/useSignup';
import React from 'react';

const VerificationLink = () => {
    const { reSendVerificationEmail, loading } = useSignup();

    return (
        <>
            <p>{`Didn't receive the link?`}</p>
            <button className="btn btn-black max-w-[300px] mt-5" disabled={loading} onClick={()=>reSendVerificationEmail()}>
                Resend Verification Link
            </button>
        </>
    );
};

export default VerificationLink;
