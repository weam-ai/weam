'use client';

import useLogin from '@/hooks/auth/useLogin';
import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';

const defaultValues = {
    email: '',
    password: '',
};

const LoginMfaForm = () => {
    const [codes, setCodes] = useState(['', '', '', '', '', '']);
    const [isFormFilled, setIsFormFilled] = useState(false);
    const inputRefs = useRef([]);
    const { handleMfaLogin, loading } = useLogin();

    useEffect(() => {
        // Check if all codes are filled
        setIsFormFilled(codes.every((code) => code !== ''));
    }, [codes]);

    useEffect(() => {
        if (isFormFilled) {
            const otpcode = codes.join('');
            handleMfaLogin(otpcode);
            setCodes(['', '', '', '', '', '']);
        }
    }, [isFormFilled]);

    const handleChange = (index, event) => {
        const { value } = event.target;
        // Update the code at the specified index
        setCodes((prevCodes) => {
            const newCodes = [...prevCodes];
            newCodes[index] = value;
            return newCodes;
        });

        // If value is entered and it's not the last input field
        if (value && index < 5) {
            // Focus on the next input field
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, event) => {
        // Move focus to the previous input field if backspace is pressed and the field is empty
        if (event.key === 'Backspace' && !codes[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    return (
        <form className="w-full mt-11">
            <div className="relative mb-2">
                <label
                    htmlFor="two-factor-code"
                    className="text-font-14 font-semibold inline-block mb-2.5 text-b2"
                >
                    Enter The Code
                </label>
                <div>
                    <div className="flex items-center gap-7">
                        {codes.map((code, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength={1}
                                pattern="[0-9]"
                                inputMode="numeric"
                                value={code}
                                className="default-form-input text-center !py-[9px] !text-[30px] !leading-none"
                                onChange={(event) => handleChange(index, event)}
                                onKeyDown={(event) =>
                                    handleKeyDown(index, event)
                                }
                                ref={(input:any) =>
                                    (inputRefs.current[index] = input)
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>
        </form>
    );
};

export default LoginMfaForm;
