import Image from 'next/image';
import ForgotPasswordIcon from '@/../public/forgot-password.svg';
import Link from 'next/link';
import AuthFooter from '@/components/Auth/AuthFooter';
import ForgotPasswordForm from '@/components/Auth/ForgotPassword/ForgotPassword';

export default function ForgotPassword() {
    return (
        <>
            <div className="flex flex-col h-full w-full">
                <div className="flex flex-nowrap h-full">
                    <div className="px-[30px] pt-[30px] flex flex-col w-full">
                        <div className="forgot-password-form flex flex-col flex-1 items-center justify-center w-full max-w-[500px] mx-auto">
                            <Image
                                src={ForgotPasswordIcon}
                                width={60}
                                height={60}
                                className="w-[42px] sm:w-[52px] object-contain mb-5"
                                alt="Forgot Password"
                            />
                            <h2 className="text-[26px] sm:text-[30px] font-semibold leading-normal mb-4 text-b2">
                                Reset Your Password
                            </h2>
                            <p className="text-center text-font-16 text-b5 max-w-[450px] mx-auto">
                                Enter your email address and we will send you
                                instructions to reset your password.
                            </p>
                            <ForgotPasswordForm />
                            <div className="mt-6">
                                <Link
                                    href="/login"
                                    className="text-font-14 font-semibold inline-block mb-2.5 text-b2 hover:text-b5 underline"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                        <AuthFooter />
                    </div>
                </div>
            </div>
        </>
    );
}
