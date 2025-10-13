'use client';

import React, { useMemo, useState } from 'react';
import FileUploadCustom from '@/components/FileUploadCustom';
import Label from '@/widgets/Label';
import UserPlaceholder from '@/../public/UserPlaceholder.svg';
import CommonInput from '@/widgets/CommonInput';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { profileSchema } from '@/schema/profile';
import ValidationError from '@/widgets/ValidationError';
import useProfile from '@/hooks/profile/useProfile';
import { LINK } from '@/config/config';
import { getCurrentUser } from '@/utils/handleAuth';

const ProfileSetting = () => {
    const { updateProfile, loading } = useProfile();
    const userDetail = getCurrentUser();

    const defaultProfileData = {
        coverImg: null,
        previewCoverImg: null
    }
    const [isProfileUpdated, setIsProfileUpdated] = useState(userDetail?.isProfileUpdated);
    const [profileData, setProfileData] = useState(defaultProfileData);
    const memoizedSchema = useMemo(() => profileSchema(), [isProfileUpdated]);
    
    const defaultValues:any = {
        fname: userDetail?.fname || '',
        lname: userDetail?.lname || '',
        mobNo: userDetail?.phone || '',
        currentpassword: '',
        password: '',
        confirmpassword: ''
    }
    
    const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: defaultValues,
        resolver: yupResolver(memoizedSchema)
    });

    const processForm = async (payload) => {
        const formData = new FormData();
        const { confirmpassword, ...updatedPayload } = payload;
        
        if (!userDetail?.isProfileUpdated) {
            delete updatedPayload.currentpassword;
        }
        
        for (const key in updatedPayload) {
            if (updatedPayload.hasOwnProperty(key)) {
                formData.append(key, updatedPayload[key]);
            }
        }

        updateProfile(formData, userDetail?._id);
        reset({ currentpassword: '', password: '', confirmpassword: '' });
        setIsProfileUpdated(true);
    };

    return (
        <>
        <div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
        <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
            <div className="h-full overflow-y-auto w-full relative">
                <form className="w-full" onSubmit={handleSubmit(processForm)}>
                    <div className="mx-auto max-w-[600px]">
                    <FileUploadCustom
                            inputId={"UserProfile"}
                            showDescription={true}
                            placeholder={UserPlaceholder}
                            placeholderClass="h-full w-full cursor-pointer"
                            className="mb-4"
                            page="profile"
                            prevImg={
                                userDetail?.profileImg
                                    ? `${LINK.AWS_S3_URL}${userDetail.profileImg}`
                                    : UserPlaceholder
                            }
                            onLoad={(file) => {
                                if (file) {
                                    setValue('coverImg', file);
                                } else {
                                    setValue('coverImg', null);
                                }
                            }}
                            onLoadPreview={(file) => {
                                if (file) {
                                    setValue('previewCoverImg', file);
                                } else {
                                    setValue('previewCoverImg', null);
                                }
                            }}
                            setData={setProfileData}
                        />
                        <div className="col-span-12 relative my-8">
                            <hr className='border-b11' />
                        </div>
                        <div className="grid grid-cols-12 gap-x-5">
                            <div className="col-span-12 lg:col-span-6 relative mb-4">
                                <Label title={"First Name"} htmlFor={"fname"} />
                                <input
                                    type="text"
                                    className="default-form-input"
                                    id="fname" maxLength={50}
                                    {...register('fname')}
                                    value={watch('fname')}
                                />
                                <ValidationError errors={errors} field={'fname'}></ValidationError>
                            </div>
                            <div className="col-span-12 lg:col-span-6 relative mb-4">
                                <Label title={"Last Name"} htmlFor={"lname"} />
                                <input
                                    type="text"
                                    className="default-form-input"
                                    id="lname" maxLength={50}
                                    {...register('lname')}
                                    value={watch('lname')}
                                />
                                <ValidationError errors={errors} field={'lname'}></ValidationError>
                            </div>

                            <div className="col-span-12 relative mb-4">
                                <Label title={"Email"} htmlFor={"email"} />
                                <CommonInput type={'email'} id={'email'} defaultValue={userDetail?.email} disabled={true} />
                            </div>

                        </div>
                        <div className="flex items-center gap-2.5 mt-4">
                            <button className='btn btn-black' disabled={loading}>Save Changes</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
        </>
    );
}

export default ProfileSetting;
