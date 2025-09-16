'use client';
import React, { useState } from 'react';
import FileUpload from '../FileUploadDropZone';
import ArrowBack from '@/icons/ArrowBack';
import { useFormik } from "formik";
import FormikError from '@/widgets/FormikError';
import commonApi from '@/api';
import { API_TYPE_OPTIONS, MODULES, MODULE_ACTIONS, FILE } from '@/utils/constant';
import Toast from '@/utils/toast';
import { useRouter, useSearchParams } from 'next/navigation';
import routes from '@/utils/routes';
import { retrieveBrainData } from '@/utils/helper';
import { docsSelectionSchema } from '@/schema/customgpt';

const Docs = ({ onPrev, customGptData, setCustomGptData }) => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const sanitizedInstructions = customGptData.instructions.filter(instruction => instruction.trim() !== '');
    const [filesRemove, setFilesRemove] = useState([]);
    const b = useSearchParams().get('b');

    const formik = useFormik({
        initialValues: customGptData,
        validationSchema: docsSelectionSchema,
        onSubmit: async ({ doc }) => {

            const brainData = retrieveBrainData();

            const formData = new FormData();
            formData.append('title', customGptData.title);
            formData.append('systemPrompt', customGptData.systemPrompt);
            if (customGptData.charimg) {
                formData.append('charimg', customGptData.charimg);
            }
            formData.append('responseModel[name]', customGptData.responseModel.name);
            formData.append('responseModel[id]', customGptData.responseModel.id);
            formData.append('responseModel[company][name]', customGptData.responseModel.company.name);
            formData.append('responseModel[company][slug]', customGptData.responseModel.company.slug);
            formData.append('responseModel[company][id]', customGptData.responseModel.company.id);
            formData.append('responseModel[bot][id]', customGptData.responseModel.bot.id);
            formData.append('responseModel[bot][title]', customGptData.responseModel.bot.title);
            formData.append('responseModel[bot][code]', customGptData.responseModel.bot.code);
            formData.append('responseModel[provider]', customGptData.responseModel.provider);
            formData.append('maxItr', customGptData.maxItr);
            formData.append('itrTimeDuration', customGptData.itrTimeDuration);
            formData.append('goals', JSON.stringify(customGptData.goals));
            if(sanitizedInstructions.length){
                formData.append('instructions', JSON.stringify(sanitizedInstructions));
            }

            if(customGptData.coverImg instanceof File || customGptData.removeCoverImg){
                formData.append('coverImg', customGptData.coverImg instanceof File ? customGptData.coverImg : null);
            }

            if(Array.isArray(customGptData.doc)){
                customGptData.doc.forEach((file:any) => {
                    if(!file.id){
                        formData.append('doc', file);
                    }
                });
            } 

            if(filesRemove.length){
                formData.append('removeDoc', JSON.stringify(filesRemove));
            }

            formData.append('brain[id]', brainData?._id);
            formData.append('brain[title]', brainData?.title);
            formData.append('brain[slug]', brainData?.slug);
            formData.append('imageEnable', customGptData.responseModel.bot.code === API_TYPE_OPTIONS.OPEN_AI ? customGptData?.imageEnable || false : false);
       
            try {
                setLoading(true);
                const reqObject = {
                    action: MODULE_ACTIONS.CREATE,
                    prefix: MODULE_ACTIONS.WEB_PREFIX,
                    module: MODULES.CUSTOM_GPT,
                    common: true,
                    data: formData,
                    config: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
                if(customGptData.id){
                    Object.assign(reqObject,{action: MODULE_ACTIONS.UPDATE, parameters:[customGptData.id]})
                }
                const response = await commonApi(reqObject);
                Toast(response.message);
                router.push(`${routes.customGPT}?b=${b}`);
            } finally {
                setLoading(false);
            }
        },
    });

    const {
        errors,
        touched,
        handleSubmit,
        setFieldValue,
    } = formik;

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className="relative mb-5">
                    <FileUpload
                    fileFormat="file"
                    className='border border-b-4 rounded-lg text-center cursor-pointer p-[30px]' 
                        onLoad={(files: File[]) => {
                            if (files) {
                                setFieldValue('doc', files);
                                setCustomGptData({ ...customGptData, doc: files });
                            } else {
                                setFieldValue('doc', null);
                            }
                        }}
                        multiple
                        maxFiles={10}
                        setFilesRemove={setFilesRemove}
                        filesRemove={filesRemove}
                        existingFiles={customGptData.doc}
                        maxFileSize={FILE.SIZE}
                    />
                    {customGptData.doc.length > 0 ?
                        <>{
                            customGptData.doc.map((item, index) => (
                                <FormikError key={index} errors={errors} index={index} field={'doc'} />
                            ))
                        }
                        </> : <FormikError errors={errors} field={'doc'} />}
                </div>
                <div className="flex justify-between mt-5">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="btn btn-outline-gray"
                        disabled={loading}
                    >
                        <ArrowBack
                            className="me-2.5 inline-block align-middle -mt-0.5 fill-b15"
                            width="14"
                            height="12"
                        />
                        Previous
                    </button>
                    <button type="submit" className="btn btn-blue" disabled={loading}>
                        Save Agent
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Docs;
