'use client';
import { useEffect, useState } from 'react';
import { Authentication } from '@/utils/handleAuth';
import OnboardingDialog from './OnboardingDialog';

const OnboardingWrapper = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            await Authentication();
            setIsAuthenticated(true);
        };
        checkAuth();
    }, []);

    if (!isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <>
            {children}
            <OnboardingDialog />
        </>
    );
};

export default OnboardingWrapper;
