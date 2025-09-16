'use client';
import React, { useEffect, useState } from 'react';
import Steps from 'rc-steps';
import 'rc-steps/assets/index.css';
import Overview from '@/components/CustomGpt/Overview';
import Model from '@/components/CustomGpt/Model';
import Docs from '@/components/CustomGpt/Docs';
import GptNavigation from '@/components/CustomGpt/GptNavigation';
import { MODULES, MODULE_ACTIONS } from '@/utils/constant';
import commonApi from '@/api';
import { useParams } from 'next/navigation';
import Loader from '@/components/ui/Loader';
import { LINK } from '@/config/config';
import { getDisplayModelName } from '@/utils/helper';

const EditGptForm = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const params = useParams();
    const [loadingApi, setLoadingApi] = useState(false);

    const [customGptData, setCustomGptData] = useState({
        id: null,
        coverImg: null,
        previewCoverImg: null,
        title: '',
        systemPrompt: '',
        goals: [''],
        instructions: [''],
        responseModel: null,
        maxItr: 0,
        itrTimeDuration: undefined,
        doc: [],
        imageEnable: false,
        charimg: ''
    });

    const fetchCustomGptDetailsById = async () => {
        setLoadingApi(true);
        const response = await commonApi({
            action: MODULE_ACTIONS.GET,
            prefix: MODULE_ACTIONS.WEB_PREFIX,
            module: MODULES.CUSTOM_GPT,
            common: true,
            parameters: [params.id as string]
        });
        const data = response.data;
        const alldoc = data.doc.map((item: any) => {
            return {
                ...item,
                type: item.mime_type
            };
        });
        
        setCustomGptData({
            id: data._id,
            coverImg: data?.coverImg?.uri ? {} : (data?.charimg ? {
                isCharacter: true,
                characterImage: data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`,
                characterId: data.charimg.split('/').pop()?.split('.')[0] || 'character',
                uri: data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`,
                name: `character-${data.charimg.split('/').pop()?.split('.')[0] || 'character'}.jpg`,
                mime_type: 'image/jpeg',
                file_size: 0
            } : null),
            previewCoverImg: data?.coverImg?.uri ? `${LINK.AWS_S3_URL}${data.coverImg.uri}` : (data?.charimg ? (data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`) : null),
            title: data.title,
            systemPrompt: data.systemPrompt,
            goals: data.goals,
            instructions: data.instructions,
            responseModel: {
                ...data.responseModel,
                value: getDisplayModelName(data.responseModel.name),
                label: getDisplayModelName(data.responseModel.name),
            },
            maxItr: data.maxItr,
            itrTimeDuration: data.itrTimeDuration,
            doc: alldoc,
            imageEnable: data?.imageEnable || false,
            charimg: data?.charimg ? (data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`) : ''
        })
        setLoadingApi(false);
    }

    useEffect(() => {
        fetchCustomGptDetailsById();
    }, [])

    const next = () => {
        setCurrentStep(currentStep + 1);
    };

    const prev = () => {
        setCurrentStep(currentStep - 1);
    };

    const navigateToStep = (stepIndex) => {
        setCurrentStep(stepIndex);
    };

    return (
        <div className="flex flex-col h-full w-full md:py-[30px] max-md:pt-14 md:pr-2 md:pl-0 pl-2 pr-2">
            <div className='flex-1 overflow-y-auto'>
                <div className='flex w-full md:flex-row flex-col max-w-[988px] mx-auto'>
                    <div className='gpt-sidebar md:w-[170px]'>
                        <GptNavigation currentStep={currentStep} onStepClick={navigateToStep} />
                    </div>
                    <div className='gpt-detail flex-1 md:ml-[58px] border border-gray-300 rounded-10 p-5'>
                        <Steps current={currentStep}>
                            <Steps.Step title="Overview" />
                            <Steps.Step title="Model" />
                            <Steps.Step title="Docs" />
                        </Steps>
                        {loadingApi ?
                            <Loader /> :
                            <>
                                {currentStep === 0 && <Overview onNext={next} customGptData={customGptData} setCustomGptData={setCustomGptData} />}
                                {currentStep === 1 && (
                                    <Model onNext={next} onPrev={prev} customGptData={customGptData} setCustomGptData={setCustomGptData} />
                                )}
                                {currentStep === 2 && <Docs onPrev={prev} customGptData={customGptData} setCustomGptData={setCustomGptData} />}
                            </>}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditGptForm;
