'use client';
import React, { useState, useEffect } from 'react';
import CommonInput from '@/widgets/CommonInput';
import Label from '@/widgets/Label';
import Select, { StylesConfig, MultiValue } from 'react-select';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { videoCallSchema } from '@/schema/proAgent';
import ValidationError from '@/widgets/ValidationError';
import { ProAgentCode } from '@/types/common';
import useVideoAnalyser from '@/hooks/conversation/useVideoAnalyser';

type VideoProps = {
    onBackHandler: () => void;
    setDialogOpen: (open: boolean) => void;
    handleSubmitPrompt: (proAgentData: { code: ProAgentCode, url: string, prompt: string, fileInfo: string }) => void;
};
const customStyles: StylesConfig = {
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isFocused ? '#f5f5f5' : '#ffffff', // Highlight option on hover or when selected
        color: '#000',
        cursor: 'pointer',
        fontSize: '14px',
        pointerEvents: 'auto',
    }),
    menu: (provided) => ({
        ...provided,
        zIndex: 9999,
    }),
    menuPortal: (base) => ({
        ...base,
        zIndex: 9999, // Ensure it's above other elements
    }),
    control: (provided) => ({
        ...provided,
        borderColor: '#888888',
        cursor: 'pointer',
    }),
};

const VideoCall = ({ onBackHandler, setDialogOpen, handleSubmitPrompt }: VideoProps) => {
    const [showPromptSection, setShowPromptSection] = useState(false);
    const [loomUrl, setLoomUrl] = useState('');
    const [urlError, setUrlError] = useState('');
    const [selectedPrompt, setSelectedPrompt] = useState('Default Prompt');
    const [promptText, setPromptText] = useState('');
    const [isReadOnly, setIsReadOnly] = useState(true);
    const [fileInfo, setFileInfo] = useState('');
    const loomRegex = /^https?:\/\/(www\.)?loom\.com\/share\/[a-zA-Z0-9]+(\?.*)?$/;
    const DEFAULT_PROMPT = "You are an intelligent assistant analyzing a video. Please provide: \n 1. Summary of main points \n 2. Key requirements or changes requested \n 3. Action items and priorities \n Format the response in clear sections with bullet points.";
    
    const SelectPrompts = [
        { value: 'default-prompt', label: 'Default Prompt' },
        { value: 'custom-prompt', label: 'Custom Prompt' },
    ];

    const { loomVideoAnalysis, isLoading } = useVideoAnalyser();
    
    const { register, handleSubmit, getValues, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(videoCallSchema),
        defaultValues: { url: '',prompt:'' },
        mode: 'onSubmit'
    });
    
    const handleUploadClick = async () => {        
        if (loomRegex.test(loomUrl)) {
            const response = await loomVideoAnalysis({loomUrl});
            
            if(response){
                setUrlError('');
                setShowPromptSection(true);
                setValue('prompt', DEFAULT_PROMPT);
                setFileInfo(response?.data?.name);
            }            
        } else {
            setUrlError('Please enter a valid Loom video URL.');
        }
    };

    const handleRunAgent = () => {
        handleSubmitPrompt({
            code: ProAgentCode.VIDEO_CALL_ANALYZER,
            url: getValues('url'),  
            prompt: getValues('prompt'),
            fileInfo: fileInfo
        });
        setDialogOpen(false);
    };  
    
    return (
        <div className="qa-form">            
            <div className="relative mb-4">
                <Label
                    title={'Loom Video URL'}
                    htmlFor={'client-name'}
                />
                <div className="flex items-center gap-2">
                    <CommonInput
                        type="url"
                        placeholder="Loom Video URL"
                        id="client-name"
                        {...register('url')}
                        onChange={(e) => {
                            setLoomUrl(e.target.value);
                        }}
                        readOnly={showPromptSection || isLoading}
                    />
                    <button
                        className="btn btn-black py-3 text-font-14"
                        onClick={handleUploadClick}
                        disabled={isLoading || showPromptSection}
                    >
                        Upload
                        
                    </button>
                </div>
                <ValidationError errors={errors} field='url' />
                <p className="text-font-13 font-medium mt-1 text-red">
                    {urlError}
                </p>
            </div>
            
            {isLoading && (
                <div className="w-full max-w-[99%] h-1 mb-2 bg-gray-300 rounded overflow-hidden">
                    <div className="h-full bg-black animate-progress"></div>
                </div>
            )}            
            
            {showPromptSection && (
                <div className="prompt">
                    <div className="relative mb-4">
                        <Label title={'Select Prompt'} htmlFor={'prompt'} />
                        <Select 
                            options={SelectPrompts} 
                            menuPlacement="auto"
                            defaultValue={SelectPrompts[0]}
                            styles={customStyles}
                            id="prompt" 
                            className="react-select-container" 
                            classNamePrefix="react-select"
                            onChange={(option: any) => {
                                if (!option) return;
                                const value = option.value;
                                setSelectedPrompt(value);

                                if (value === 'custom-prompt') {
                                    setValue('prompt', '');        
                                    setIsReadOnly(false);     
                                } else {
                                    setValue('prompt', DEFAULT_PROMPT);
                                    setIsReadOnly(true);      
                                }
                            }}
                        />
                    </div>
                    <div className="relative mb-4">
                        <Label title={'Prompt'} htmlFor={'prompt'} />
                        <textarea
                            placeholder="Your custom prompts"
                            onChange={(e) => setPromptText(e.target.value)}
                            className="default-form-input !min-h-32"
                            id="business-summary"
                            readOnly={isReadOnly}
                            {...register('prompt')}
                        />
                        <ValidationError errors={errors} field='prompt' />
                    </div>
                </div>
            )}
            <div className="relative mb-4 flex gap-2">
                {showPromptSection && (
                    <button className="btn btn-outline-black text-font-14" 
                        onClick={handleSubmit(handleRunAgent)}
                        disabled={isSubmitting || isLoading}
                    >
                        Run Agent
                    </button>
                )}
            </div>
        </div>
    );
};

export default VideoCall;
