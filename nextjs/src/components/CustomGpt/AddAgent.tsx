'use client';
import React, { useState } from 'react';
import Overview from '@/components/CustomGpt/Overview';

const AddGptForm = () => {
    const [customGptData, setCustomGptData] = useState({
        coverImg: null,
        previewCoverImg: null,
        title: '',
        systemPrompt: '',
        responseModel:null,
        maxItr: 0,
        itrTimeDuration: '',
        doc: [],
        removeCoverImg: false,
        charimg: ''
    });

    return (
        <div className="flex flex-col h-full w-full md:py-[10px] px-2 overflow-y-auto">
            <div className='flex w-full flex-col xl:flex-row max-w-[950px] mx-auto md:px-5 px-2'>
                <div className='gpt-detail flex-1 xl:ml-0 ml-0 mr-0 md:p-5 md:border md:rounded-lg'>
                    <Overview customGptData={customGptData} setCustomGptData={setCustomGptData} />
                </div>
            </div>
        </div>
    );
};

export default AddGptForm;
