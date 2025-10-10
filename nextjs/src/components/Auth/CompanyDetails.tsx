'use client';
import React, { useState, useEffect,useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { companyDetailSchema, CompanyDetailSchemaType } from '@/schema/company';
import ValidationError from '@/widgets/ValidationError';
import Label from '@/widgets/Label';
import CommonInput from '@/widgets/CommonInput';
import Link from 'next/link';
import routes from '@/utils/routes';
import useCountry from '@/hooks/common/useCountry';
import Select from 'react-select';
import Toast from '@/utils/toast';

import { useRouter } from 'next/navigation';

const BOT_CPS_THRESHOLD = 30; // Characters per second threshold for bot detection
import useServerAction from '@/hooks/common/useServerActions';
import { registerAction } from '@/actions/auth';
import { RESPONSE_STATUS } from '@/utils/constant';



const defaultValues = {
    firstName: undefined,
    lastName: undefined,
    companyNm: undefined,
    email: undefined,
    password: undefined,
    confirmPassword: undefined,
    country: null,
};

const CompanyDetails = () => {

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        control
    } = useForm<CompanyDetailSchemaType>({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: defaultValues,
        resolver: yupResolver(companyDetailSchema),
    });
    const { countries } = useCountry();

    const initialTypingMetrics = {
      firstName: { startTime: 0, charCount: 0, endTime: 0, isPotentiallyBot: false },
      lastName: { startTime: 0, charCount: 0, endTime: 0, isPotentiallyBot: false },
      companyNm: { startTime: 0, charCount: 0, endTime: 0, isPotentiallyBot: false },
      email: { startTime: 0, charCount: 0, endTime: 0, isPotentiallyBot: false },
    };
    const [typingMetrics, setTypingMetrics] = useState(initialTypingMetrics);
    const [registerCompany, loading] = useServerAction(registerAction);
    const router = useRouter();
    const countryOptions = useMemo(
      () =>
        (countries || []).map((country) => ({
          value: country.shortCode,
          label: country.nm,
        })),
      [countries]
    );

    const handleTypingStart = (fieldName: string) => {
      if (typingMetrics[fieldName].startTime === 0) {
        setTypingMetrics(prevMetrics => ({
          ...prevMetrics,
          [fieldName]: {
            ...prevMetrics[fieldName],
            startTime: Date.now(),
          }
        }));
      }
    };

    const handleTypingChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
      const charCount = event.target.value.length;
      const startTime = typingMetrics[fieldName].startTime;
      const endTime = Date.now();

      if (startTime === 0) { 
        return;
      }

      const elapsedTimeInSeconds = (endTime - startTime) / 1000;
      let isPotentiallyBotForThisField = false;

      if (elapsedTimeInSeconds > 0.05 && charCount > 3) {
        const cps = charCount / elapsedTimeInSeconds;
        if (cps > BOT_CPS_THRESHOLD) {
          isPotentiallyBotForThisField = true;
        }
      }

      setTypingMetrics(prevMetrics => ({
        ...prevMetrics,
        [fieldName]: {
          ...prevMetrics[fieldName],
          charCount: charCount,
          endTime: endTime,
          isPotentiallyBot: prevMetrics[fieldName].isPotentiallyBot || isPotentiallyBotForThisField,
        }
      }));
    };

    const handleTypingEnd = (fieldName: string) => {
      setTypingMetrics(prevMetrics => ({
        ...prevMetrics,
        [fieldName]: {
          ...prevMetrics[fieldName], // Retains isPotentiallyBot
          startTime: 0,
          charCount: 0,
          endTime: 0,
        }
      }));
    };

    /**
     * onSubmit is called by React Hook Form after successful validation.
     * We:
     *  1) Check if showReCaptchaV2 is true -> then user must solve v2.
     *  2) Otherwise (v3 path), we call grecaptcha.execute for a fresh token.
     *  3) If captcha is valid, call registerCompany with the form data.
     */
    const onSubmitWithCaptcha = async (formData) => {
        try {
           
            const response = await registerCompany(formData);
            if (response.status === RESPONSE_STATUS.CREATED) {
                Toast(response.message);
                router.push(routes.login);
            }
        } catch (err) {
            console.error("Error on form submit:", err);
        }
    };

    return (   
        <>
            <form
                className="w-full max-w-[730px] mx-auto flex flex-wrap"
                onSubmit={handleSubmit(onSubmitWithCaptcha)}
                autoComplete="off" 
            >
                <div className="relative mb-4 w-full md:w-1/2 px-2">
                    <Label title={'First Name'} htmlFor={'FirstName'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'}/>
                    <CommonInput
                            id={'FirstName'}
                            placeholder={'First Name'}
                            maxLength={30}
      
                            autoComplete="new-password" // Use non-standard value to trick browsers
                            autoFill="off"
                            onKeyDown={() => handleTypingStart('firstName')}
                            onChange={(e) => handleTypingChange(e, 'firstName')}
                            onBlur={() => handleTypingEnd('firstName')}
                            {...register('firstName')}
                    />
                    <ValidationError errors={errors} field={'firstName'} />
                </div>
                <div className="relative mb-4 w-full md:w-1/2 px-2">
                    <Label title={'Last Name'} htmlFor={'LastName'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'}/>
                    <CommonInput
                            id={'LastName'}
                            placeholder={'Last Name'}
                            maxLength={30}
                            autoComplete="new-password" // Use non-standard value to trick browsers
                            autoFill="off"
                            onKeyDown={() => handleTypingStart('lastName')}
                            onChange={(e) => handleTypingChange(e, 'lastName')}
                            onBlur={() => handleTypingEnd('lastName')}
                            {...register('lastName')}
                    />
                    <ValidationError errors={errors} field={'lastName'} />
                </div>
                <div className="relative mb-4 w-full md:w-1/2 px-2">
                    <Label title={'Company Name'} htmlFor={'CompanyName'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'}/>
                    <CommonInput
                        id={'CompanyName'}
                        placeholder={'Advance Care Inc.'}
                        autoComplete="new-password" // Use non-standard value to trick browsers
                        autoFill="off"
                        onKeyDown={() => handleTypingStart('companyNm')}
                        onChange={(e) => handleTypingChange(e, 'companyNm')}
                        onBlur={() => handleTypingEnd('companyNm')}
                        {...register('companyNm')}
                        maxLength={50}
                    />
                    <ValidationError errors={errors} field={'companyNm'} />
                </div>
                <div className="relative mb-4 w-full md:w-1/2 px-2">
                    <Label title={'Email address'} htmlFor={'email'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'}/>
                    <CommonInput
                        type={'email'}
                        id={'email'}
                        placeholder={'example@company.com'}
                        autoComplete="new-password" // Use non-standard value to trick browsers
                        autoFill="off"
                        onKeyDown={() => handleTypingStart('email')}
                        {...register('email')}
                        maxLength={320}
                        onChange={(e) => {
                            setValue('email', e.target.value.toLowerCase());
                            handleTypingChange(e, 'email');
                        }}
                        onBlur={() => handleTypingEnd('email')}
                    />
                    <ValidationError errors={errors} field={'email'} />
                </div>
                <div className="relative mb-4 w-full md:w-1/2 px-2">
                    <Label title={'Password'} htmlFor={'password'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'} />
                    <CommonInput
                        id={'password'}
                        type={'password'}
                        placeholder={'Type your password'}
                        autoComplete="new-password" // Use non-standard value to trick browsers
                        autoFill="off"
                        {...register('password')}
                        maxLength={30}
                    />
                    <ValidationError errors={errors} field={'password'} />
                </div>
                <div className="relative mb-4 w-full md:w-1/2 px-2">
                    <Label title={'Confirm Password'} htmlFor={'ConfirmPassword'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'} />
                    <CommonInput
                        id={'ConfirmPassword'}
                        type={'password'}
                        placeholder={'Confirm Password'}
                        autoComplete="new-password" // Use non-standard value to trick browsers
                        autoFill="off"
                        {...register('confirmPassword')}
                        maxLength={30}
                    />
                    <ValidationError
                        errors={errors}
                        field={'confirmPassword'}
                    />
                </div>
                {/* <div className="relative mb-4 w-full md:w-1/2 px-2">
                    <Label 
                        title={'Country'} 
                        htmlFor={'country'} 
                        className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'}
                    />
                    <Select
                        id="country"
                        options={countryOptions}
                        placeholder="Select Country"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        onChange={(option:any) => setValue('country', option ? { 
                            shortCode: option.value,
                            nm: option.label 
                        } : null, { shouldValidate: true } )}
                        isClearable
                        isSearchable
                        styles={{
                            control: (baseStyles, state) => ({
                                ...baseStyles,
                                minHeight: '46px',
                                borderColor: state.isFocused ? '#blue' : '#E5E7EB',
                                '&:hover': {
                                    borderColor: '#blue'
                                }
                            }),
                        }}
                    />
                    <ValidationError errors={errors} field={'country'} />
                </div> */}

                {/* Honeypot field */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                  <label htmlFor="website_url_honeypot">Do not fill this out</label>
                  <input type="text" id="website_url_honeypot" name="website_url" autoComplete="off" tabIndex={-1} />
                </div>

                <div className="submit-wrap flex items-center justify-center mt-2 md:mt-10 mx-auto w-full">
                    <button className="btn btn-black w-full max-w-[300px]" disabled={loading}>
                        Sign Up
                    </button>
                </div>
                <p className="mb-5 mt-3 md:mb-0 mx-auto text-font-14 w-full text-center text-b7">
                Already have an account? <Link className='hover:text-b5 underline text-b2 font-bold' href={routes.login}>Sign In</Link>
                </p>
            </form>
            </>
    );
};

export default CompanyDetails;