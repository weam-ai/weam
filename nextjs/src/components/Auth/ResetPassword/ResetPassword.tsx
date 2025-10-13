'use client';

import useResetPassword from '@/hooks/auth/useResetPassword';
import CommonInput from '@/widgets/CommonInput';
import Label from '@/widgets/Label';
import ValidationError from '@/widgets/ValidationError';

const ResetPasswordForm = () => {
    const { register, handleSubmit, errors, setPassword } =
        useResetPassword();
    return (
        <form className="w-full" onSubmit={handleSubmit(setPassword)}>
            <div className="relative mb-4">
                <Label htmlFor={'password'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'} title={'New Password'}/>
                <CommonInput
                    type={'password'}
                    {...register('password')}
                />
                <ValidationError errors={errors} field={'password'} />
            </div>
            <div className="relative mb-4">
                <Label htmlFor={'password'} className={'text-font-14 font-semibold inline-block mb-2.5 text-b2'} title={'Confirm Password'}/>
                <CommonInput
                    type={'password'}
                    {...register('confirmPassword')}
                />
                <ValidationError errors={errors} field={'confirmPassword'} />
            </div>
            <button type="submit" className="btn btn-black btn-lg mt-5 w-full">
                Update
            </button>
        </form>
    );
};

export default ResetPasswordForm;
