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
                    className="text-font-14 font-semibold inline-block mb-2.5 text-b2 hover:text-b5 underline"
                >
                    Forgot password?
                </Link>
            </div>

            <button
                type="submit"
                className="btn btn-black w-full"
                disabled={pending}
            >
                Sign In
            </button>
            <p className="mt-6 text-center text-14 font-normal text-b6">
                Don&apos;t have an account?
                <Link
                    href={routes.register}
                    className="font-bold ms-1 text-b2 hover:text-b5 underline"
                >
                    Sign Up
                </Link>
            </p>
        </form>
    );
};

export default LoginForm;
