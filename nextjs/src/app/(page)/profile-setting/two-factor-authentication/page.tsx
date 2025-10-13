'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import useTwofactor from '@/hooks/profile/useTwofactor';
import ValidationError from '@/widgets/ValidationError';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { twoFactorAuthSchema } from '@/schema/profile';
import useProfile from '@/hooks/profile/useProfile';
import { getCurrentUser } from '@/utils/handleAuth';

const TwoFactorAuthentication = () => {
    const { generateMfaSecret, QrCode, mfaVerification, setTwomfa, twomfa } =
        useTwofactor();
    const [loading, setLoading] = useState(true);
    const userDetail = getCurrentUser();
    const { updateProfile } = useProfile();

    const defaultValues:any = {
        verifycode: '',
    };
    const {
        register,
        reset,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: defaultValues,
        resolver: yupResolver(twoFactorAuthSchema),
    });

    const processForm = async (payload) => {
        const data = {
            otp: payload?.verifycode,
            email: userDetail?.email,
        };
        mfaVerification(data, userDetail);
        reset(defaultValues);
    };

    const handleMfaSwitch = (e) => {
        const data = { mfa: false };
        updateProfile(data, userDetail?._id);
        setTwomfa(false);
    };

    const fetchData = async () => {
        try {
            const postData = { mfa: true };
            await generateMfaSecret(postData);
            setLoading(false);
        } catch (error) {
            console.error('Error in generateMfaSecret:', error);
        }
    };

    useEffect(() => {
        !twomfa ? fetchData() : '';
    }, [twomfa]);

    return (
        <>
        <div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
        <div className="w-full relative h-full overflow-y-auto py-3 lg:py-10 px-2">            
            <div className="mx-auto max-w-[450px] h-full flex flex-col items-center justify-center">
                {twomfa && (
                    <>
                        <div className="py-8 px-8 text-center rounded-10 border border-b11 mb-2">
                            <h5 className="text-font-18 font-semibold text-b2 mb-2">
                                Multi-factor authentication
                            </h5>
                            <p className='text-font-14 mb-5'>
                                You can turn off two factor authentication
                                by click on off at below switch.
                            </p>
                            <div className="flex items-center justify-center">
                                <label
                                    className="inline-block ps-2.5 hover:cursor-pointer text-font-16 text-b2 font-normal"
                                    htmlFor="choosePlanSwitch"
                                >
                                    On
                                </label>
                                <input
                                    className="me-2.5 ms-2.5 mt-[0.3rem] h-[34px] w-[67px] appearance-none rounded-[100px] bg-black after:absolute after:z-[2] after:mt-1 after:ms-1 after:h-[26px] after:w-[26px] after:rounded-full after:border-none after:bg-white after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] checked:bg-primary checked:after:absolute checked:after:z-[2] checked:after:mt-[4px] checked:after:ms-9 checked:after:h-[26px] checked:after:w-[26px] checked:after:rounded-full checked:after:border-none checked:after:bg-b15 checked:after:transition-[background-color_0.2s,transform_0.2s] checked:after:content-[''] hover:cursor-pointer focus:outline-none focus:after:absolute focus:after:z-[1] focus:after:block focus:after:h-[26px] focus:after:w-[26px] focus:after:rounded-full focus:after:content-[''] checked:focus:border-primary checked:focus:bg-primary"
                                    type="checkbox"
                                    role="switch"
                                    id="choosePlanSwitch"
                                    checked={!twomfa}
                                    onChange={handleMfaSwitch}
                                />
                                <label
                                    className="inline-block ps-2.5 hover:cursor-pointer text-font-16 text-b2 font-normal"
                                    htmlFor="choosePlanSwitch"
                                >
                                    Off
                                </label>
                            </div>
                        </div>
                        <div className="col-span-12 relative mt-2 mb-6">
                            <hr className="border-b11" />
                        </div>
                    </>
                )}
                <div className="mx-auto text-center text-font-14">
                    <p className="leading-[1.8]">
                        Add an extra layer of security to your account.
                        Enter a code from an app on your phone during sign
                        in.
                    </p>
                    <p className="leading-[1.8] mt-1">
                        First, download a two-factor authentication app onto
                        your phone or tablet, such as{' '}
                        <Link
                            href="https://authy.com/"
                            className="text-b2 underline hover:text-b5"
                        >
                            Authy
                        </Link>{' '}
                        or{' '}
                        <Link
                            href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en_IN&pli=1"
                            className="text-black underline hover:text-b5"
                        >
                            Authenticator.
                        </Link>
                    </p>
                </div>
                {!twomfa && (
                    <form onSubmit={handleSubmit(processForm)}>
                        <div className="mx-auto text-center mt-5">
                            <h5 className="text-font-16 font-bold text-b5 mb-4">
                                Step 1: Scan the barcode
                            </h5>
                            {loading ? <div className="flex justify-center items-center h-full mt-5 mb-3">
                                    <div className="dot-flashing"></div>
                                </div> : QrCode ? (
                                <Image
                                    src={QrCode}
                                    width={156}
                                    height={156}
                                    className="object-contain mx-auto mb-4"
                                    alt="QR Code"
                                />
                            ) : (
                                <p>No QR Code available.</p>
                            )}
                            
                            <h5 className="text-font-16 font-bold text-b5 mb-4">
                                Step 2: Enter the 6-digit code from your app
                            </h5>
                            <div className="relative mb-5 mt-7">
                            <input
                                type="text"
                                placeholder="XXXXXX"
                                id="verifycode"
                                className="default-form-input text-center !text-font-24 leading-none placeholder:text-b7 tracking-[2px]"
                                {...register("verifycode", {
                                    required: true,
                                    pattern: /^[0-9]{6}$/, 
                                    maxLength: 6, 
                                })}
                                value={watch("verifycode")}
                                onInput={(e) => {
                                    const input = e.target as HTMLInputElement; 
                                    input.value = input.value.replace(/\D/g, "").slice(0, 6); 
                                }}
                                />
                                <ValidationError
                                    errors={errors}
                                    field={'verifycode'}
                                ></ValidationError>
                            </div>
                            <div className="flex items-center justify-center space-x-5">
                                <button className="btn btn-black btn-lg flex-1">
                                    Set Up Two-Factor Now
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
        </>
    );
};

export default TwoFactorAuthentication;
