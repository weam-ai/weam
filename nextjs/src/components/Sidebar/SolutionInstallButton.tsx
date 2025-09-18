"use client";
import { MODULE_ACTIONS } from '@/utils/constant';
import { useState, useRef } from 'react';
import { getAccessToken } from '@/actions/serverApi';
import { LINK, NODE_API_PREFIX } from '@/config/config';

interface ProgressEvent {
    type: 'connected' | 'progress' | 'output' | 'error_output' | 'success' | 'error';
    message: string;
    step?: number;
    totalSteps?: number;
    url?: string;
    error?: string;
    timestamp?: string;
}

interface SolutionInstallButtonProps {
    solutionType?: string;
    buttonText?: string;
}

const SolutionInstallButton = ({ solutionType, buttonText }: SolutionInstallButtonProps) => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<ProgressEvent | null>(null);
    const [showProgress, setShowProgress] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Ensure solutionType is valid, fallback to default if undefined
    console.log('SolutionInstallButton rendered with solutionType:', solutionType, 'type:', typeof solutionType, 'buttonText:', buttonText);
    const validSolutionType = (solutionType && typeof solutionType === 'string' && solutionType !== 'undefined' && solutionType !== 'null') ? solutionType : 'ai-doc-editor';
    console.log('Using validSolutionType:', validSolutionType);

    const handleInstall = async () => {
        try {
            setLoading(true);
            setShowProgress(true);
            setProgress(null);
            setLogs([]);

            console.log('Installing solution type:', validSolutionType); // Debug log
            const token = await getAccessToken();
            const baseUrl = `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`;
            const url = `${baseUrl}/web/solution-install-progress/progress?token=${encodeURIComponent(token)}&solutionType=${encodeURIComponent(validSolutionType)}`;
            console.log('Installation URL:', url); // Debug log
            console.log('Encoded solutionType:', encodeURIComponent(validSolutionType)); // Debug log

            // Create EventSource for SSE
            const eventSource = new EventSource(url);

            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('SSE connection opened');
            };

            eventSource.onmessage = (event) => {
                try {
                    const data: ProgressEvent = JSON.parse(event.data);
                    setProgress(data);
                    
                    // Add to logs for detailed view
                    if (data.type === 'output' || data.type === 'error_output') {
                        setLogs(prev => [...prev, data.message]);
                    }

                    // Handle completion
                    if (data.type === 'success') {
                        setLoading(false);
                        eventSource.close();
                        // Keep progress visible for a few seconds
                        setTimeout(() => {
                            setShowProgress(false);
                            setProgress(null);
                        }, 5000);
                    }

                    // Handle errors
                    if (data.type === 'error') {
                        setLoading(false);
                        eventSource.close();
                        setTimeout(() => {
                            setShowProgress(false);
                            setProgress(null);
                        }, 5000);
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE error:', error);
                setLoading(false);
                setProgress({
                    type: 'error',
                    message: 'Connection lost. Please try again.'
                });
                eventSource.close();
            };

        } catch (error) {
            console.error('solution-install error:', error);
            setLoading(false);
            setProgress({
                type: 'error',
                message: 'Failed to start installation. Please try again.'
            });
        }
    };

    const handleCloseProgress = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        setShowProgress(false);
        setLoading(false);
        setProgress(null);
        setLogs([]);
    };

    return (
        <div className="w-full mb-3">
            <button
                onClick={handleInstall}
                disabled={loading}
                className="w-full text-left px-2 py-2 rounded hover:bg-b5 hover:bg-opacity-[0.12] text-font-14 disabled:opacity-50"
            >
                {loading ? 'Installing…' : (buttonText || 'Install Solution')}
            </button>

            {showProgress && (
                <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm">Installation Progress</h4>
                        <button
                            onClick={handleCloseProgress}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                        >
                            ✕
                        </button>
                    </div>

                    {progress && (
                        <div className="mb-2">
                            {progress.step && progress.totalSteps && (
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>Step {progress.step} of {progress.totalSteps}</span>
                                        <span>{Math.round((progress.step / progress.totalSteps) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <div className={`text-sm ${
                                progress.type === 'error' ? 'text-red-600' : 
                                progress.type === 'success' ? 'text-green-600' : 
                                'text-gray-700'
                            }`}>
                                {progress.message}
                            </div>

                            {progress.url && (
                                <div className="mt-2">
                                    <a 
                                        href={progress.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                                    >
                                        Open Solution →
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {logs.length > 0 && (
                        <div className="mt-2">
                            <details className="text-xs">
                                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                    View Logs ({logs.length})
                                </summary>
                                <div className="mt-1 max-h-32 overflow-y-auto bg-gray-100 p-2 rounded text-xs font-mono">
                                    {logs.map((log, index) => (
                                        <div key={index} className="mb-1 text-gray-700">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SolutionInstallButton;