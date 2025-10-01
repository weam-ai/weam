import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ValidationError from '@/widgets/ValidationError';
import commonApi from '@/api';
import { MODULE_ACTIONS } from '@/utils/constant';

// Validation schema for Ollama settings
const ollamaSettingsSchema = yup.object({
    baseUrl: yup.string().url('Please enter a valid URL').required('Base URL is required'),
    apiKey: yup.string().optional(),
});

interface OllamaSettingsProps {
    configs?: {
        baseUrl?: string;
        apiKey?: string;
    };
    setApiKeyUpdated?: (updated: boolean) => void;
    setShowCancelAPI?: (show: boolean) => void;
}

const OllamaSettings: React.FC<OllamaSettingsProps> = ({
    configs,
    setApiKeyUpdated,
    setShowCancelAPI
}) => {
    const [loading, setLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        setValue
    } = useForm({
        mode: 'onSubmit',
        resolver: yupResolver(ollamaSettingsSchema),
        defaultValues: {
            baseUrl: configs?.baseUrl || 'http://localhost:11434',
            apiKey: configs?.apiKey || ''
        }
    });

    const baseUrl = watch('baseUrl');

    // Test connection to Ollama instance
    const testConnection = async (url: string, apiKey?: string) => {
        try {
            setConnectionStatus('testing');
            
            const response = await commonApi({
                action: MODULE_ACTIONS.TEST_OLLAMA_CONNECTION,
                data: {
                    baseUrl: url,
                    apiKey: apiKey || undefined
                }
            });

            if (response.success) {
                setConnectionStatus('success');
                setAvailableModels(response.availableModels || []);
                return true;
            } else {
                setConnectionStatus('error');
                return false;
            }
        } catch (error) {
            setConnectionStatus('error');
            console.error('Connection test failed:', error);
            return false;
        }
    };

    const handleSaveSettings = async (data: any) => {
        try {
            setLoading(true);

            // First test the connection
            const connectionSuccess = await testConnection(data.baseUrl, data.apiKey);
            
            if (!connectionSuccess) {
                throw new Error('Failed to connect to Ollama instance');
            }

            // Save the settings
            const response = await commonApi({
                action: MODULE_ACTIONS.SAVE_OLLAMA_SETTINGS,
                data: {
                    baseUrl: data.baseUrl,
                    apiKey: data.apiKey,
                    provider: 'ollama'
                }
            });

            if (response.success) {
                setApiKeyUpdated?.(true);
                setShowCancelAPI?.(true);
            }

        } catch (error) {
            console.error('Error saving Ollama settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = () => {
        const currentBaseUrl = baseUrl || 'http://localhost:11434';
        const currentApiKey = watch('apiKey');
        testConnection(currentBaseUrl, currentApiKey);
    };

    useEffect(() => {
        // Auto-test connection when component mounts if baseUrl is provided
        if (configs?.baseUrl) {
            testConnection(configs.baseUrl, configs.apiKey);
        }
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <svg 
                        className="w-6 h-6 text-orange-600" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Ollama Settings</h3>
                    <p className="text-sm text-gray-600">Configure your local or remote Ollama instance</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(handleSaveSettings)} className="space-y-4">
                {/* Base URL Input */}
                <div>
                    <label htmlFor="ollama-base-url" className="font-semibold mb-2 inline-block">
                        <span className="w-7 h-7 rounded-full bg-orange-100 inline-flex items-center justify-center me-2.5 align-middle">
                            <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            </svg>
                        </span>
                        Ollama Base URL
                    </label>
                    <div className="gap-2.5 flex">
                        <input
                            type="url"
                            className="default-form-input flex-1"
                            id="ollama-base-url"
                            placeholder="http://localhost:11434"
                            {...register('baseUrl')}
                        />
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={connectionStatus === 'testing'}
                            className="btn btn-outline px-4"
                        >
                            {connectionStatus === 'testing' ? 'Testing...' : 'Test'}
                        </button>
                    </div>
                    <ValidationError errors={errors} field={'baseUrl'} />
                    
                    {/* Connection Status */}
                    {connectionStatus === 'success' && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                            ✓ Connected successfully! Found {availableModels.length} models.
                        </div>
                    )}
                    {connectionStatus === 'error' && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            ✗ Connection failed. Please check the URL and ensure Ollama is running.
                        </div>
                    )}
                </div>

                {/* API Key Input (Optional) */}
                <div>
                    <label htmlFor="ollama-api-key" className="font-semibold mb-2 inline-block">
                        <span className="w-7 h-7 rounded-full bg-blue-100 inline-flex items-center justify-center me-2.5 align-middle">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                            </svg>
                        </span>
                        API Key (Optional)
                    </label>
                    <input
                        type="password"
                        className="default-form-input"
                        id="ollama-api-key"
                        placeholder="Enter API key if required by your Ollama instance"
                        {...register('apiKey')}
                    />
                    <ValidationError errors={errors} field={'apiKey'} />
                    <p className="text-xs text-gray-500 mt-1">
                        Leave empty if your Ollama instance doesn't require authentication
                    </p>
                </div>

                {/* Available Models Display */}
                {availableModels.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Available Models</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {availableModels.slice(0, 6).map((model, index) => (
                                <div key={index} className="px-3 py-2 bg-gray-100 rounded text-sm">
                                    {model}
                                </div>
                            ))}
                            {availableModels.length > 6 && (
                                <div className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-600">
                                    +{availableModels.length - 6} more
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex gap-2.5">
                    <button
                        type="submit"
                        className="btn btn-black"
                        disabled={loading || connectionStatus === 'testing'}
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>

            {/* Help Section */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Setup Instructions</h4>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Install Ollama from <a href="https://ollama.ai" target="_blank" className="text-blue-600 hover:underline">ollama.ai</a></li>
                    <li>Start Ollama: <code className="bg-gray-200 px-1 rounded">ollama serve</code></li>
                    <li>Pull a model: <code className="bg-gray-200 px-1 rounded">ollama pull llama3.1:8b</code></li>
                    <li>Enter your Ollama URL above (default: http://localhost:11434)</li>
                </ol>
            </div>
        </div>
    );
};

export default OllamaSettings;