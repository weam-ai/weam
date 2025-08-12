'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchemaKeys } from '@/schema/auth';
import useLogin from '@/hooks/auth/useLogin';
import Link from 'next/link';
import Label from '@/widgets/Label';
import CommonInput from '@/widgets/CommonInput';
import ValidationError from '@/widgets/ValidationError';
import routes from '@/utils/routes';
import { BASIC_AUTH } from '@/config/config';

const defaultValues:any = {
    email: undefined,
    password: undefined,
};

const LoginForm = () => {
    const { handleLogin, pending } = useLogin();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue
    } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: defaultValues,
        resolver: yupResolver(loginSchemaKeys),
    });

    // const [isAuthenticated, setIsAuthenticated] = useState(false);
    // const [username, setUsername] = useState('');
    // const [password, setPassword] = useState('');
    // const [showAuthPrompt, setShowAuthPrompt] = useState(true);
    // const router = useRouter();

    // useEffect(() => {
    //     // Show authentication prompt when component mounts
    //     if (showAuthPrompt) {
    //         const usernameInput = prompt('Please enter your username:');
    //         if (usernameInput== BASIC_AUTH.USERNAME) {
    //             setUsername(usernameInput);
    //             const passwordInput = prompt('Please enter your password:');
    //             if (passwordInput== BASIC_AUTH.PASSWORD) {
    //                 setPassword(passwordInput);
    //                 // Simple validation - you can replace this with your actual validation logic
    //                 if (usernameInput.length > 3 && passwordInput.length > 3) {
    //                     setIsAuthenticated(true);
    //                     setShowAuthPrompt(false);
    //                 } else {
    //                     alert('Invalid username or password');
    //                     router.push(routes.login);
    //                 }
    //             } else {
    //                 alert('Authentication required');
    //                 router.push(routes.login);
    //             }
    //         } else {
    //             alert('Authentication required');
    //             router.push(routes.login);
    //         }
    //     }
    // }, [showAuthPrompt, router]);

    return (
        <form className="w-full" onSubmit={handleSubmit(handleLogin)}>
            <div className="relative mb-4">
                <Label htmlFor={'email'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'} title={'Email address'}/>
                <CommonInput
                    type={'email'}
                    id={'email'}
                    placeholder={'example@companyname.com'}
                    {...register('email')}
                    maxLength={320}
                    onChange={(e) => setValue('email', e.target.value.toLowerCase())}
                />
                <ValidationError errors={errors} field={'email'}/>
            </div>
            <div className="relative mb-1">
                <Label htmlFor={'password'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'} title={'Password'}/>
                <CommonInput
                    type={'password'}
                    id={'password'}
                    placeholder={'password'}
                    {...register('password')}
                    maxLength={30}
                />
                <ValidationError errors={errors} field={'password'}/>
            </div>

            <div className="mb-7 flex items-center justify-end">
                <Link
                    href="/forgot-password"
                    className="text-font-14 font-semibold inline-block mb-2.5 text-b2 hover:text-blue"
                >
                    Forgot password?
                </Link>
            </div>

            <button
                type="submit"
                className="btn btn-black py-[14px] w-full"
                disabled={pending}
            >
                Sign In
            </button>
            <p className="mt-6 text-center text-14 font-normal text-b6">
                Don&apos;t have an account?
                <Link
                    href={routes.register}
                    className="font-bold ms-1 text-blue hover:text-b2"
                >
                    Sign Up
                </Link>
            </p>
        </form>
    );
};

export default LoginForm;
