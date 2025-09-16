import CommonInput from '@/widgets/CommonInput';
import Label from '@/widgets/Label';
import ValidationError from '@/widgets/ValidationError';
import React from 'react';
import AuthFooter from '../AuthFooter';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import useLogin from '@/hooks/auth/useLogin';
import { onBoardLoginKeys } from '@/schema/auth';

const defaultValues:any = {
    fname: undefined,
    lname: undefined,
    password: undefined,
    email: undefined
}

const MagicInviteDetails = ({ email }) => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        mode: 'onSubmit',
        resolver: yupResolver(onBoardLoginKeys),
        defaultValues
    });
    const { loading, onBoardLogin } = useLogin();

    return (
        <form
            className="w-full max-w-[730px] mx-auto flex flex-wrap justify-center"
            onSubmit={handleSubmit(onBoardLogin)}
        >
            <div className="relative mb-4 w-full md:w-1/2 px-2">
                <Label
                    title={'First Name'}
                    htmlFor={'FirstName'}
                    className={
                        'text-font-14 font-semibold inline-block mb-2.5 text-b2'
                    }
                />
                <CommonInput
                    id={'FirstName'}
                    placeholder={'First Name'}
                    maxLength={30}
                    {...register('fname')}
                />
                <ValidationError errors={errors} field={'fname'} />
            </div>
            <div className="relative mb-4 w-full md:w-1/2 px-2">
                <Label
                    title={'Last Name'}
                    htmlFor={'LastName'}
                    className={
                        'text-font-14 font-semibold inline-block mb-2.5 text-b2'
                    }
                />
                <CommonInput
                    id={'LastName'}
                    placeholder={'Last Name'}
                    maxLength={30}
                    {...register('lname')}
                />
                <ValidationError errors={errors} field={'lname'} />
            </div>
            <div className="relative mb-4 w-full md:w-1/2 px-2">
                <Label
                    title={'Email address'}
                    htmlFor={'email'}
                    className={
                        'text-font-14 font-semibold inline-block mb-2.5 text-b2'
                    }
                />
                <CommonInput
                    id={'email'}
                    value={email}
                    readOnly
                    maxLength={320}
                    {...register('email')}
                />
                <ValidationError errors={errors} field={'email'} />
            </div>
            <div className="relative mb-4 w-full md:w-1/2 px-2">
                <Label
                    title={'Password'}
                    htmlFor={'password'}
                    className={
                        'text-font-14 font-semibold inline-block mb-2.5 text-b2'
                    }
                />
                <CommonInput
                    id={'password'}
                    type={'password'}
                    placeholder={'Type your password'}
                    {...register('password')}
                />
                <ValidationError errors={errors} field={'password'} />
            </div>

            <div className="submit-wrap flex items-center justify-center mt-2 md:mt-10 mx-auto w-full">
                <button
                    className="btn btn-black py-[12px] w-full max-w-[300px]"
                    disabled={loading}
                >
                    Login
                </button>
            </div>
            <div className='mt-5'>
            <AuthFooter/>
            </div>
        </form>
    );
};

export default MagicInviteDetails;
