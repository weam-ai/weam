'use client';

import React, { useCallback } from 'react';
import Label from '@/widgets/Label';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import ValidationError from '@/widgets/ValidationError';
import useProfile from '@/hooks/profile/useProfile';
import { changePasswordKeys } from '@/schema/auth';
import CommonInput from '@/widgets/CommonInput';

const defaultValues:any = {
    oldpassword: undefined,
    password: undefined,
    confirmPassword: undefined
}

const PasswordChange = () => {
    const { loading, changePassword } = useProfile();
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: defaultValues,
        resolver: yupResolver(changePasswordKeys),
    });

    const formProcessHandler = useCallback(async (payload) => {
        await changePassword(payload, reset);
    }, [])

    return (
        <>
        <div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
        <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
            <div className="h-full overflow-y-auto w-full relative">
                <form className="w-full" onSubmit={handleSubmit(formProcessHandler)}>
                    <div className="mx-auto max-w-[600px]">
                        <div className="grid grid-cols-12 gap-x-5">
                            <div className="col-span-12 relative mb-3">
                                <p className="text-font-16 leading-snug font-semibold text-b2 uppercase">
                                    Change Password
                                </p>
                                <span className="text-font-12 font-normal text-b5 inline-block">
                                    This will be used to log into your account.
                                </span>
                            </div>
                            <div className="col-span-12 relative mt-2 mb-6">
                                <hr className="border-b11" />
                            </div>
                            <div className="col-span-12 lg:col-span-6 relative mb-4">
                                <Label
                                    title={'Old Password'}
                                    htmlFor={'OldPassword'}
                                />
                                <CommonInput
                                    type="password"
                                    className="default-form-input"
                                    {...register('oldpassword')}
                                />
                                <ValidationError
                                    errors={errors}
                                    field={'oldpassword'}
                                ></ValidationError>
                            </div>
                            <div className="col-span-12 lg:col-span-6 relative md:mb-4"></div>
                            <div className="col-span-12 lg:col-span-6 relative mb-4">
                                <Label
                                    title={'New Password'}
                                    htmlFor={'NewPassword'}
                                />
                                <CommonInput
                                    type="password"
                                    className="default-form-input"
                                    {...register('password')}
                                />
                                <ValidationError
                                    errors={errors}
                                    field={'password'}
                                ></ValidationError>
                            </div>
                            <div className="col-span-12 lg:col-span-6 relative mb-2">
                                <Label
                                    title={'Confirm Password'}
                                    htmlFor={'ConfirmPassword'}
                                />
                                <CommonInput
                                    type="password"
                                    className="default-form-input"
                                    {...register('confirmPassword')}
                                />
                                <ValidationError
                                    errors={errors}
                                    field={'confirmPassword'}
                                ></ValidationError>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 mt-4">
                            <button className="btn btn-black" disabled={loading}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
        </>
    );
};

export default PasswordChange;
