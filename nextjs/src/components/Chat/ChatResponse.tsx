import { LINK } from '@/config/config';
import React, { useState, useRef, useEffect } from 'react';
import { MarkOutPut } from './MartOutput';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import StreamLoader from '../Loader/StreamLoader';
import { API_TYPE_OPTIONS, WEB_RESOURCES_DATA } from '@/utils/constant';
import DocumentProcessing from '../Loader/DocumentProcess';
import PreviewImage from '../ui/PreviewImage';
import AgentAnalyze from '../Loader/AgentAnalyze';
import PageSpeedResponse from './PageSpeedResponse';
import { PAGE_SPEED_RECORD_KEY } from '@/hooks/conversation/useConversation';
import { ProAgentCode } from '@/types/common';
import WebAgentLoader from '../Loader/WebAgentLoader';
import VideoCallAgentLoader from '../Loader/VideoCallAgentLoader';
import SalesCallLoader from '../Loader/SalesCallLoader';
import ShowResources from './ShowResources';
import TextAreaBox from '@/widgets/TextAreaBox';
import Lottie from "lottie-react";
import loaderAnimation from '../loader.json';
type ResponseLoaderProps = {
    code: string;
    loading: boolean;
    proAgentCode: string;
}

export const GeneratedImagePreview = ({ src }) => {
    return (
        <PreviewImage
            src={src}
            actualWidth={300}
            actualHeight={300}
            previewWidth={500}
            previewHeight={500}
            className='max-w-[300px]'
        />
    );
};

const DallEImagePreview = ({
    conversations,
    i,
    loading,
    answerMessage,
    response,
}) => {
    return (
        <div className=" flex flex-col items-start gap-4 break-words min-h-5">
            <div className="chat-content max-w-none w-full break-words text-font-16 leading-7 tracking-[0.16px]">
                {conversations.length - 1 == i ? (
                    <>
                        {loading ? (
                            <StreamLoader />
                        ) : answerMessage != '' ? (
                            <GeneratedImagePreview
                                src={`${LINK.AWS_S3_URL}/${answerMessage}`}
                            />
                        ) : (
                            <GeneratedImagePreview
                                src={`${LINK.AWS_S3_URL}/${response}`}
                            />
                        )}
                    </>
                ) : (
                    <GeneratedImagePreview
                        src={`${LINK.AWS_S3_URL}/${response}`}
                    />
                )}
            </div>
        </div>
    );
};

const StreamingChatLoaderOption = ({ code, loading, proAgentCode }: ResponseLoaderProps) => {
    const loadingComponents = {
        [API_TYPE_OPTIONS.OPEN_AI_WITH_DOC]: <DocumentProcessing />,
        [ProAgentCode.QA_SPECIALISTS]: <AgentAnalyze loading={loading} />,
        [ProAgentCode.WEB_PROJECT_PROPOSAL]: <WebAgentLoader loading={loading} />,
        [ProAgentCode.VIDEO_CALL_ANALYZER]: <VideoCallAgentLoader loading={loading} />,
        [ProAgentCode.SALES_CALL_ANALYZER]: <SalesCallLoader loading={loading} />,
    };
    return loadingComponents[code] || loadingComponents[proAgentCode] || <StreamLoader />;
};

const ChatResponse = ({ conversations, i, loading, answerMessage, m, handleSubmitPrompt, privateChat = true, isStreamingLoading, proAgentCode, onResponseUpdate, onResponseEdited }) => {

    // Inline editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const textareaRef = useRef(null);


    // Initialize edit content when response changes
    useEffect(() => {
        const currentResponse = conversations.length - 1 === i && answerMessage !== '' ? answerMessage : m?.response || '';
        setEditContent(currentResponse);
    }, [m?.response, answerMessage, conversations.length, i]);

    // Handle inline editing
    const handleInlineEdit = () => {
        if (!privateChat || loading) return;
        setIsEditing(true);
    };

    const handleInlineSave = async () => {
        try {
            if (onResponseUpdate && editContent !== m?.response) {
                await onResponseUpdate(m?.id, editContent);
                // Notify parent that response was edited
                if (onResponseEdited) {
                    onResponseEdited(m?.id);
                }
            }
            setIsEditing(false);
        } catch (error) {
            alert('Failed to save changes. Please try again.');
        }
    };

    const handleInlineCancel = () => {
        setIsEditing(false);
        setEditContent(m?.response || '');
    };

    const handleInlineKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleInlineCancel();
        }
    };

    // Handle click outside to close
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleInlineCancel();
        }
    };

    const handleInlineChange = (e) => {
        setEditContent(e.target.value);
    };
   
    return m?.response?.startsWith('images') ? (
        <DallEImagePreview
            conversations={conversations}
            i={i}
            loading={loading}
            answerMessage={answerMessage}
            response={m.response}
        />
    ) : (
        <div className="flex flex-col items-start gap-4 break-words min-h-5">
            <div 
                className={`chat-content relative ${
                    m?.responseAPI !== API_TYPE_OPTIONS.PRO_AGENT ? 'max-w-[calc(100vw-95px)] lg:max-w-none' : ''
                } w-full break-words text-font-14 md:text-font-16 leading-7 tracking-[0.16px]`}
            >
            {conversations.length - 1 === i ? (
                <>
                    {loading ? (
                        <StreamingChatLoaderOption code={m.responseAPI} loading={loading} proAgentCode={proAgentCode} />
                    ) : answerMessage !== '' ? (
                        isEditing ? (
                            <div className="inline-editable-response fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
                                <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">Edit Response</h3>
                                                <p className="text-sm text-gray-500">Modify your AI response below</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleInlineCancel}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                                            title="Close (Esc)"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    {/* Content Area */}
                                    <div className="flex-1 overflow-hidden bg-gray-50">
                                        <div className="h-full p-6">
                                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
                                                <TextAreaBox
                                                    message={editContent}
                                                    handleChange={handleInlineChange}
                                                    handleKeyDown={handleInlineKeyDown}
                                                    isDisable={false}
                                                    className="w-full h-full min-h-[500px] border-0 focus:ring-0 focus:outline-none rounded-lg p-6 text-sm leading-relaxed resize-none bg-transparent font-normal"
                                                    placeholder="Edit your response here..."
                                                    ref={textareaRef}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="px-6 py-4 border-t border-gray-200 bg-white">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Press Esc to cancel
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={handleInlineCancel}
                                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleInlineSave}
                                                    className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <div 
                                    onClick={handleInlineEdit}
                                    className="cursor-pointer rounded-lg p-3 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200"
                                >
                                    {MarkOutPut(answerMessage)}
                                </div>

                            </div>
                        )
                    ) : (
                        //when stream response give done we empty answerMessage and show m.response (so in DB )
                        <>
                            {isEditing ? (
                                <div className="inline-editable-response fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
                                    <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 rounded-lg overflow-hidden">
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">Edit Response</h3>
                                                    <p className="text-sm text-gray-500">Modify your AI response below</p>
                                                </div>
                                            </div>
                                                <button
                                                    onClick={handleInlineCancel}
                                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                                                    title="Close (Esc)"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                        </div>
                                        
                                        {/* Content Area */}
                                        <div className="flex-1 overflow-hidden bg-gray-50">
                                            <div className="h-full p-6">
                                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
                                                            <TextAreaBox
                                                                message={editContent}
                                                                handleChange={handleInlineChange}
                                                                handleKeyDown={handleInlineKeyDown}
                                                                isDisable={false}
                                                        className="w-full h-full min-h-[500px] border-0 focus:ring-0 focus:outline-none rounded-lg p-6 text-sm leading-relaxed resize-none bg-transparent font-normal"
                                                        placeholder="Edit your response here..."
                                                                ref={textareaRef}
                                                            />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Footer */}
                                        <div className="px-6 py-4 border-t border-gray-200 bg-white">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Press Esc to cancel
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={handleInlineCancel}
                                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleInlineSave}
                                                        className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <div 
                                        onClick={handleInlineEdit}
                                        className="cursor-pointer rounded-lg p-3 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200"
                                    >
                                        {MarkOutPut(m.response)}
                                    </div>

                                </div>
                            )}
                            {
                                m?.responseAddKeywords?.hasOwnProperty(PAGE_SPEED_RECORD_KEY) 
                                ? <PageSpeedResponse response={m?.responseAddKeywords} /> : m?.responseAddKeywords?.hasOwnProperty('file_url') 
                                ? <div className="mt-4">{MarkOutPut(m.responseAddKeywords.file_url)}</div> : ''
                            }
                            {
                                m?.responseAddKeywords?.hasOwnProperty(WEB_RESOURCES_DATA) && <ShowResources response={m?.responseAddKeywords as any} />
                            }
                        </>
                    )}
                    {
                        (m?.responseAPI === API_TYPE_OPTIONS.PRO_AGENT && isStreamingLoading && answerMessage.length > 0) && (
                            <div className="my-2 animate-pulse text-font-14 font-bold inline-block">
                                <p>Checking next step...</p>
                            </div>   
                        )
                    }
                </>
            ) : (
                <>
                                        {isEditing ? (
                        <div className="inline-editable-response fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
                            <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 rounded-lg overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Edit Response</h3>
                                            <p className="text-sm text-gray-500">Modify your AI response below</p>
                                        </div>
                                    </div>
                                        <button
                                            onClick={handleInlineCancel}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                                            title="Close (Esc)"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                </div>
                                
                                {/* Content Area */}
                                <div className="flex-1 overflow-hidden bg-gray-50">
                                    <div className="h-full p-6">
                                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
                                                    <TextAreaBox
                                                        message={editContent}
                                                        handleChange={handleInlineChange}
                                                        handleKeyDown={handleInlineKeyDown}
                                                        isDisable={false}
                                                className="w-full h-full min-h-[500px] border-0 focus:ring-0 focus:outline-none rounded-lg p-6 text-sm leading-relaxed resize-none bg-transparent font-normal"
                                                placeholder="Edit your response here..."
                                                        ref={textareaRef}
                                                    />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-gray-200 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Press Esc to cancel
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleInlineCancel}
                                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleInlineSave}
                                                className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative group">
                            <div 
                                onClick={handleInlineEdit}
                                className="cursor-pointer rounded-lg p-3 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200"
                            >
                                {MarkOutPut(m.response)}
                            </div>
                            

                        </div>
                    )}
                    {
                        m?.responseAddKeywords?.hasOwnProperty(PAGE_SPEED_RECORD_KEY) && <PageSpeedResponse response={m?.responseAddKeywords} />
                    }
                    {
                        m?.responseAddKeywords?.hasOwnProperty(WEB_RESOURCES_DATA) && <ShowResources response={m?.responseAddKeywords as any} />
                    }
                </>
            )}
        </div>
    </div>
    );
};

export default React.memo(ChatResponse);
