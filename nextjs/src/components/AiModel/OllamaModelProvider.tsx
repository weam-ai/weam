import React, { useState, useEffect } from 'react';
import useOllama from '@/hooks/aiModal/useOllama';
import Select from 'react-select';
import { getDisplayModelName } from '@/utils/helper';
import Toast from '@/utils/toast';
import commonApi from '@/api';
import { MODULE_ACTIONS } from '@/utils/constant';
import { LINK } from '@/config/config';

const OllamaModelProvider = ({ configs }) => {
    const { ollamaHealthCheck, pullSelectedModel, refreshOllamaTags, loading, pulling, MODEL_OPTIONS, selectedModel, setSelectedModel } = useOllama();
    const [installing, setInstalling] = useState(false);
    const [progressPct, setProgressPct] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('');
    

  const baseUrl = LINK.OLLAMA_API_URL;
  // Ensure we're using the correct URL for Docker compatibility
    
    // Check connection status on mount using commonApi
    useEffect(() => {
        let isMounted = true;
        
        const checkConnection = async () => {
            if (!isMounted) return;
            
            try {
                setConnectionStatus('checking');
                // Use commonApi to call the backend API instead of direct fetch
                const response:any = await commonApi({
                    action: MODULE_ACTIONS.OLLAMA_HEALTH,
                    data: {}
                });
                

                
                // The API might return success even if Ollama is not running
                // We need to check if the response contains the expected data
                if (response?.success) {
                    setConnectionStatus('connected');
                    Toast('Connected to Ollama successfully', 'success');
                    // Don't refresh tags here - only check health status
                } else {
                    setConnectionStatus('disconnected');
                    Toast('Failed to connect to Ollama', 'error');
                    throw new Error(`Failed to connect to Ollama: ${response?.status || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Ollama connection error:', error);
                if (!isMounted) return;
                
                // No retry - just show error and set status to disconnected
                Toast('Failed to connect to Ollama instance. Please ensure Ollama is installed and running on your machine.', 'error');
                setConnectionStatus('disconnected');
            }
        };

        // Start the connection check
        checkConnection();
        
        // Cleanup function to prevent memory leaks and state updates after unmount
        return () => {
            isMounted = false;
        };
    }, []); // Only run once on mount

    // Refresh available Ollama models on mount to populate size/context
    useEffect(() => {
        (async () => {
            try {
                await refreshOllamaTags(baseUrl);
            } catch (e) {
                console.warn('Failed to refresh Ollama tags on mount:', e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
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

            {/* Connection Status */}
            <div className="mb-3">
                <div className="flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        connectionStatus === 'connected' ? 'bg-green-500' : 
                        connectionStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-sm">
                        {connectionStatus === 'connected' ? 'Connected to Ollama' : 
                         connectionStatus === 'checking' ? 'Checking connection...' : 
                         'Ollama not detected. Please ensure Ollama is running and the Base URL is correct.'}
                    </span>
                </div>
                
                {/* Success Banner */}
                {connectionStatus === 'connected' && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span className="text-sm text-green-700">Ollama successfully configured and added to your model list</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Model Selection Dropdown (above Configure) */}
            <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Select Local Model</label>
                <Select
                    placeholder="Select Model"
                    options={MODEL_OPTIONS}
                    menuPlacement="auto"
                    className="react-select-container react-select-border-light"
                    classNamePrefix="react-select"
                    value={MODEL_OPTIONS.find(opt => opt.value === selectedModel)}
                    onChange={(opt) => setSelectedModel(opt?.value)}
                    isMulti={false}
                    formatOptionLabel={(option, { context }) => (
                        <div className="flex items-center justify-between w-full">
                            <span className="text-font-14 font-semibold text-b2">{getDisplayModelName(option.value)}</span>
                            <span className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-b12 text-font-12 text-b5 border border-b10">{option.size}</span>
                                <span className="px-2 py-0.5 rounded bg-b12 text-font-12 text-b5 border border-b10">{option.context}</span>
                            </span>
                        </div>
                    )}
                />
            </div>
            
            {/* Configure Button */}
            <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">
                    Ollama does not require an API key. Click Configure to test the connection.
                </p>
                <button 
                    className="btn btn-black inline-flex items-center gap-2" 
                    type="button" 
                    disabled={loading || pulling || installing || connectionStatus === 'checking'} 
                    onClick={async () => {
                         try {
                             setInstalling(true);
                             setProgressStatus('Initializing download...');
                             setProgressPct(0);
                             
                             // First check if Ollama is running
                             try {
                                 // Direct fetch to Ollama API to verify it's running
                                 const response:any = await commonApi({
                                     action:  MODULE_ACTIONS.OLLAMA_HEALTH,
                                     data: {}
                                 });
                                 

                                 if (!response?.success) {
                                     throw new Error(`Ollama API returned ${response?.status || 'Unknown error'}`);
                                 }
                                 // Set connection status to connected after successful health check
                                 setConnectionStatus('connected');
                                 
                                 // Start model download immediately
                                 setProgressStatus(`Downloading ${selectedModel}...`);
                                 
                                 try {
                                     // Use the pullSelectedModel function with progress callback
                                     const pullResponse:any = await pullSelectedModel({
                                         onProgress: (progress, status) => {
                                             // Update progress in real-time - show actual download progress
                                             setProgressPct(progress);
                                             setProgressStatus(status || `Downloading ${selectedModel}...`);
                                         }
                                     });
                                     

                                     
                                     // Continue even if pull fails - we'll just use the model if it's already downloaded
                                     if (!pullResponse?.success) {
                                         console.warn('Ollama pull warning: Model may not be fully downloaded');
                                     }
                                 } catch (pullError) {
                                     // Log the error but continue with configuration
                                     console.error('Ollama pull error:', pullError);
                                 }
                                 
                                 // Save the settings after download completes or fails
                                 setProgressStatus('Saving configuration...');
                                 
                                 // Save the settings
                                 const saveData = {
                                     model: selectedModel,
                                     baseUrl: baseUrl,
                                     provider: 'OLLAMA'
                                 };
                                 
                                 const saveResponse = await commonApi({
                                     action: MODULE_ACTIONS.SAVE_OLLAMA_SETTINGS,
                                     data: saveData
                                 });
                                 
                                 setProgressPct(100);
                                //  console.log("save response", saveResponse); return true;
                                 
                                 if (saveResponse?.success === true || saveResponse?.status === 204) {
                                     Toast('Ollama configured successfully!', 'success');
                                     setConnectionStatus('connected');
                                 } else {
                                     Toast('Failed to save Ollama settings. Please try again.', 'error');
                                     setConnectionStatus('disconnected');
                                 }
                             } catch (error) {
                                 console.error('Ollama connection error:', error);
                                 Toast('Error connecting to Ollama: Please ensure Ollama is running', 'error');
                                 setConnectionStatus('disconnected');
                             }
                         } catch (error) {
                             console.error('Error configuring Ollama:', error);
                             Toast('Error configuring Ollama. Please ensure Ollama is running.', 'error');
                             setConnectionStatus('disconnected');
                         } finally {
                             setTimeout(() => {
                                 setInstalling(false);
                                 setProgressStatus('');
                                 setProgressPct(0);
                             }, 2000);
                         }
                    }}
                >
                    {pulling || installing ? (
                        <>
                            <span className="inline-block w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
                            <span>Downloading {getDisplayModelName(selectedModel)}...</span>
                        </>
                    ) : loading ? 'Working...' : 'Configure'}
                </button>
                {installing && (
                    <div className="mt-3 w-full">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">{getDisplayModelName(selectedModel)}</span>
                            <span className="text-sm text-gray-700">{progressPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                            <div className="h-2 bg-black animate-pulse" style={{ width: `${progressPct}%` }} />
                        </div>
                        {progressStatus && (
                            <div className="text-xs text-gray-500 mt-2">{progressStatus}</div>
                        )}
                    </div>
                )}
            </div>
            
            {/* We removed the duplicate Model List section here */}
        </div>
    );
};

export default OllamaModelProvider;
