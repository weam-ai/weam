'use client';
import React, { useState } from 'react';
import Steps from 'rc-steps';
import 'rc-steps/assets/index.css';
import Overview from '@/components/CustomGpt/Overview';
import Model from '@/components/CustomGpt/Model';
import Docs from '@/components/CustomGpt/Docs';
import GptNavigation from '@/components/CustomGpt/GptNavigation';

const AddGptForm = () => {
    const [currentStep, setCurrentStep] = useState(0);

    const [customGptData, setCustomGptData] = useState({
        coverImg: null,
        previewCoverImg: null,
        title: '',
        systemPrompt: '',
        goals: [''],
        instructions: [''],
        responseModel:null,
        maxItr: 0,
        itrTimeDuration: '',
        doc: [],
        removeCoverImg: false,
        charimg: ''
    });

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
        <div className="flex flex-col h-full w-full py-[30px] xl:pr-2 px-3 xl:px-0 overflow-y-auto">
            <div className='flex-1'>
                <div className='flex w-full max-w-[988px] mx-auto flex-col xl:flex-row'>
                    <div className='gpt-sidebar xl:w-[200px]'>
                        <GptNavigation currentStep={currentStep} onStepClick={navigateToStep}/>
                    </div>
                    <div className='gpt-detail flex-1 xl:ml-[58px] ml-0 mr-0 border border-gray-300 rounded-10 p-5'>
                        <Steps current={currentStep}>
                            <Steps.Step title="Overview" />
                            <Steps.Step title="Model" />
                            <Steps.Step title="Docs" />
                        </Steps>
                        {currentStep === 0 && <Overview onNext={next} customGptData={customGptData} setCustomGptData={setCustomGptData} />}
                        {currentStep === 1 && (
                            <Model onNext={next} onPrev={prev} customGptData={customGptData} setCustomGptData={setCustomGptData} />
                        )}
                        {currentStep === 2 && <Docs onPrev={prev} customGptData={customGptData} setCustomGptData={setCustomGptData} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddGptForm;
