import commonApi from '@/api';
import { LINK } from '@/config/config';
import { assignModelListAction } from '@/lib/slices/aimodel/assignmodelslice';
import { ollamaKeys } from '@/schema/usermodal'
import { MODULE_ACTIONS } from '@/utils/constant';
import Toast from '@/utils/toast';
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react';
import { useForm } from 'react-hook-form'
import { useSelector, useDispatch } from 'react-redux';

const defaultValues: any = {
    baseUrl: LINK.OLLAMA_API_URL,
};

// Structured local model metadata for better option rendering
const MODEL_OPTIONS = [
    { value: 'llama3.1:8b', label: 'Llama 3.1 8B (Local)', size: '4.9GB', context: '128K' },
    { value: 'llama3.2:1b', label: 'Llama 3.2 1B (Local)', size: '1.3GB', context: '128K' },
    { value: 'mistral:7b', label: 'Mistral 7B (Local)', size: '4.4GB', context: '32K' },
];

const useOllama = () => {
    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        mode: 'onSubmit',
        resolver: yupResolver(ollamaKeys),
        defaultValues
    })
    const [loading, setLoading] = useState(false);
    const [pulling, setPulling] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[0].value);
    const [modelOptions, setModelOptions] = useState(MODEL_OPTIONS);
    const botinfo = useSelector((store: any) => store.aiModal.selectedValue);
    const assignmodalList = useSelector((store: any) => store.assignmodel.list);
    const dispatch = useDispatch();

    const ollamaHealthCheck = async (payload) => {
        try {
            setLoading(true);
            const baseUrl = payload?.baseUrl || 'http://host.docker.internal:11434';

            const response = await commonApi({
                action: 'ollamaKeyCheck',
                data: { baseUrl },
            });

            if (response?.code === 'SUCCESS' && response?.data?.status === 'healthy') {
                Toast('Ollama connection successful');
                return response;
            } else {
                throw new Error(response?.message || 'Ollama health check failed');
            }
        } catch (error: any) {
            const message = error?.message || 'Unable to reach Ollama at the provided URL.';
            Toast(`${message} Please ensure Ollama is running and the Base URL is correct.`, 'error');
        } finally {
            setLoading(false);
        }
    }

    const refreshOllamaTags = async (baseUrl?: string) => {
        try {
            setLoading(true);
            const ollamaBaseUrl = baseUrl || LINK.OLLAMA_API_URL;

            const response = await commonApi({
                action: 'ollamaListTags',
                data: { baseUrl: ollamaBaseUrl },
            });


            // Safely extract models array with proper fallbacks
            let modelList = [];

            // Handle different response formats safely
             if (response && typeof response === 'object') {
                // New tags API shape: { success, models: [...], count, ollamaUrl }
                if (Array.isArray((response as any).models)) {
                    modelList = (response as any).models;
                } else if (response.data) {
                    // Fallbacks for older shapes
                    if (Array.isArray(response.data)) {
                        modelList = response.data;
                    } else if (typeof response.data === 'object' && Array.isArray((response.data as any).models)) {
                        modelList = (response.data as any).models;
                    }
                }
            }


            // Only process if we have a valid array
            if (Array.isArray(modelList) && modelList.length) {
                const opts = modelList.map((m: any) => ({
                    value: m.name,
                    label: m.name,
                    size: m.size ? `${Math.round((m.size / (1024*1024*1024)) * 10) / 10}GB` : undefined,
                    context: m.details?.parameter_size || undefined,
                }));
                console.log('Fetched Ollama models:', opts);
                setModelOptions(opts);
                if (!opts.find(o => o.value === selectedModel)) {
                    setSelectedModel(opts[0]?.value ?? selectedModel);
                }
            } else {
                console.log('No Ollama models found in response:', response);
                setModelOptions(MODEL_OPTIONS);
                Toast('No Ollama models found. Using default options.', 'error');
            }
            return response;
        } catch (error: any) {
            console.error('Error fetching Ollama models:', error);

            // Handle specific error cases
            if (error?.response?.status === 503 || error?.status === 503) {
                Toast('Ollama service unavailable (503). Please ensure Ollama is running.', 'error');
            } else if (error?.message?.includes('response.data is not iterable')) {
                Toast('Invalid response from Ollama. Please check your connection.', 'error');
            } else {
                const message = error?.message || 'Failed to fetch Ollama models';
                Toast(message, 'error');
            }

            // Keep using default options on error
            setModelOptions(MODEL_OPTIONS);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const pullSelectedModel = async (payload: { baseUrl?: string, onProgress?: (progress: number, status: string) => void }) => {
        try {
            setLoading(true);
            setPulling(true);
            const baseUrl = 'http://host.docker.internal:11434';
            const onProgress = payload?.onProgress;
            // console.log('[Ollama] Model pull started', { model: selectedModel, baseUrl });

            // Initialize progress at 0%
            if (onProgress && typeof onProgress === 'function') {
                onProgress(0, `Starting download of ${selectedModel}...`);
            }

            try {
                // Call the streaming API endpoint
                const response = await fetch('/api/ollama/pull', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        baseUrl: baseUrl,
                        stream: true
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('Failed to get reader from response');
                }

                let lastProgressUpdate = 0;
                let receivedLength = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        // Ensure we show 100% at the end
                        if (onProgress && typeof onProgress === 'function') {
                            onProgress(100, `Downloaded ${selectedModel} successfully`);
                        }
                        break;
                    }

                    // Process the received chunk
                    receivedLength += value.length;
                    const text = new TextDecoder().decode(value);
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            
                            if (data.status && onProgress && typeof onProgress === 'function') {
                                let progressPct = 0;
                                
                                // Calculate progress percentage if we have the data
                                if (data.completed && data.total && data.total > 0) {
                                    progressPct = Math.floor((data.completed / data.total) * 100);
                                } else if (data.downloadedSize && data.totalSize && data.totalSize > 0) {
                                    progressPct = Math.floor((data.downloadedSize / data.totalSize) * 100);
                                } else if (data.progress) {
                                    progressPct = data.progress;
                                }
                                
                                // Only update if progress has changed significantly (avoid too many updates)
                                if (progressPct > lastProgressUpdate + 1 || progressPct === 100) {
                                    lastProgressUpdate = progressPct;
                                    onProgress(progressPct, data.status || `Downloading ${selectedModel}...`);
                                    console.log(`[Ollama] Download progress: ${progressPct}%`);
                                }
                            }
                        } catch (e) {
                            // Not JSON or other parsing error, ignore this line
                            console.log('Non-JSON line:', line);
                        }
                    }
                }
                
                console.log('[Ollama] Download completed successfully');
                Toast(`Successfully pulled ${selectedModel}`);
                
                return { success: true };
            } catch (streamError) {
                console.error('[Ollama] Streaming pull error:', streamError);
                
                // Fall back to non-streaming API if streaming fails
                console.log('[Ollama] Falling back to non-streaming pull');
                const response = await commonApi({
                    action: MODULE_ACTIONS.OLLAMA_PULL_MODEL,
                    data: {
                        model: selectedModel,
                        baseUrl: baseUrl
                    }
                });
                
                console.log('[Ollama] Non-streaming pull response:', response);
                
                // Show 100% at the end for fallback method
                if (onProgress && typeof onProgress === 'function') {
                    onProgress(100, `Downloaded ${selectedModel} successfully`);
                }
                
                // Check if the response indicates success (typed shape + fallback)
                const success = response?.code === 'SUCCESS' ||
                               response?.status === 200 ||
                               (response as any)?.success === true;
                
                if (success) {
                    Toast(`Successfully pulled ${selectedModel}`);
                } else {
                    Toast(`Failed to pull ${selectedModel}`, 'error');
                }
                
                return { 
                    success: success, 
                    data: response?.data || response 
                };
            }
        } catch (error: any) {
            console.error('[Ollama] Pull error:', error);
            const message = error?.message || `Failed to pull ${selectedModel}`;
            Toast(message, 'error');
            
            return { 
                success: false, 
                error 
            };
        } finally {
            setLoading(false);
            setPulling(false);
        }
    };

    // Note: Download functionality removed as per requirements.

    return {
        register,
        handleSubmit,
        errors,
        setValue,
        ollamaHealthCheck,
        refreshOllamaTags,
        pullSelectedModel,
        loading,
        selectedModel,
        setSelectedModel,
        MODEL_OPTIONS: modelOptions,
        pulling,
    } 
}

export default useOllama;