import React from 'react';
import Image from 'next/image';
import CommonInput from '@/widgets/CommonInput';
import ValidationError from '@/widgets/ValidationError';
import useOllama from '@/hooks/aiModal/useOllama';

const OllamaModelProvider = ({ configs }) => {
    const { register, handleSubmit, ollamaHealthCheck, loading, errors } = useOllama();
    
    return (
        <div className={`relative mb-4`}>
            <label className="font-semibold mb-2 inline-block">
                <span className="w-7 h-7 rounded-full bg-orange-100 inline-flex items-center justify-center me-2.5 align-middle">
                    <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                </span>
                {`Configure Ollama Connection`}
            </label>
            
            {/* Base URL Input */}
            <div className="mb-3">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Ollama Base URL
                </label>
                <CommonInput 
                    {...register('baseUrl')}
                    placeholder={'http://localhost:11434'}
                    defaultValue={configs?.baseUrl || 'http://localhost:11434'}
                />
                <ValidationError errors={errors} field={'baseUrl'}/>
            </div>

            {/* API Key Input (Optional) */}
            <div className="mb-3">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                    API Key (Optional)
                </label>
                <div className="gap-2.5 flex">
                    <CommonInput 
                        {...register('key')}
                        type="password"
                        placeholder={'Enter API key if required'}
                        defaultValue={configs?.apikey ? '••••••••••••••••••••' : ''}
                    />
                    <button 
                        className="btn btn-black" 
                        type="button" 
                        disabled={loading} 
                        onClick={handleSubmit(ollamaHealthCheck)}
                    >
                        {loading ? 'Testing...' : 'Save'}
                    </button>
                </div>
                <ValidationError errors={errors} field={'key'}/>
                <p className="text-xs text-gray-500 mt-1">
                    Leave empty if your Ollama instance doesn't require authentication
                </p>
            </div>
        </div>
    );
};

export default OllamaModelProvider;
