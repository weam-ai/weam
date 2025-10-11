import { LINK } from '@/config/config';
import React, { useState, useRef, useEffect } from 'react';
import { MarkOutPut } from './MartOutput';
import StreamLoader from '../Loader/StreamLoader';
import { AI_MODAL_NAME, API_TYPE_OPTIONS, WEB_RESOURCES_DATA } from '@/utils/constant';
import DocumentProcessing from '../Loader/DocumentProcess';
import PreviewImage from '../ui/PreviewImage';
import PageSpeedResponse from './PageSpeedResponse';
import { PAGE_SPEED_RECORD_KEY } from '@/hooks/conversation/useConversation';
import ShowResources from './ShowResources';
import TextAreaBox from '@/widgets/TextAreaBox';
import { ConversationType } from '@/types/chat';
import PerplexityChatResponse from './PerplexityResponse';
type ResponseLoaderProps = {
    code: string;
    loading: boolean;
    proAgentCode: string;
}

type LLMResponseProps = {
    response: string;
    conversation: ConversationType;
    setConversations: (conversations: ConversationType[]) => void;
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

const LLMResponse = ({ response, conversation, setConversations }: LLMResponseProps) => {
    return (
        <>
            {
                [AI_MODAL_NAME.SONAR, AI_MODAL_NAME.SONAR_REASONING_PRO].includes(conversation?.responseModel) ? (
                    <PerplexityChatResponse conversations={conversation} response={response} setConversations={setConversations} />
                )
                    : (
                        <div className="relative group">
                            <div
                                className="rounded-lg p-3"
                            >
                                {MarkOutPut(response)}
                            </div>
                        </div>

                    )
            }
        </>
    )
}

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
    };
    return loadingComponents[code] || <StreamLoader />;
};

const ChatResponse = ({ conversations, i, loading, answerMessage, m, isStreamingLoading, proAgentCode, onResponseUpdate, onResponseEdited, setConversations }) => {

    // Inline editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [viewMode, setViewMode] = useState<'markdown' | 'plaintext'>('markdown');
    const textareaRef = useRef(null);

    const [originalMarkdown, setOriginalMarkdown] = useState('');

    // Convert markdown to formatted text that preserves some styling
    const markdownToPlainText = (markdown: string) => {
        if (!markdown) return '';

        // Convert markdown to HTML-like formatting that can be displayed
        let formattedText = markdown
            // Convert headers to plain text with line breaks
            .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n')
            // Keep bold formatting as <strong> tags
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Keep italic formatting as <em> tags
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Keep code formatting as <code> tags
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Convert links to just text
            .replace(/\[([^\]]*?)\]\([^)]*?\)/g, '$1')
            // Convert markdown lists to simple bullets
            .replace(/^[-*+]\s+(.+)$/gm, '• $1')
            // Convert numbered lists
            .replace(/^\d+\.\s+(.+)$/gm, '$1')
            // Remove blockquotes but keep content
            .replace(/^>\s+(.+)$/gm, '$1')
            // Remove horizontal rules
            .replace(/^[-*_]{3,}$/gm, '')
            // Convert ==text== to <u>text</u> for underline
            .replace(/==(.*?)==/g, '<u>$1</u>')
            // Clean up excessive whitespace
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();


        return formattedText;
    };



    // Handle view mode toggle
    const handleViewModeToggle = (mode: 'markdown' | 'plaintext') => {
        if (mode === viewMode) return;

        if (mode === 'plaintext') {
            // Switching to plain text mode - store current markdown content and show plain text preview
            if (viewMode === 'markdown') {
                // Store the current markdown content as the original
                setOriginalMarkdown(editContent);
            }
            // Plain text mode shows read-only preview, so we don't need to change editContent
        } else {
            // Switching to markdown mode - show markdown content for editing
            if (originalMarkdown) {
                setEditContent(originalMarkdown);
            } else {
                // Fallback: use current content
            }
        }

        setViewMode(mode);
    };

    // Initialize edit content when response changes
    useEffect(() => {
        const currentResponse = conversations.length - 1 === i && answerMessage !== '' ? answerMessage : m?.response || '';
        // Store original markdown
        setOriginalMarkdown(currentResponse);
        // Convert any existing <u> tags to ==text== syntax for cleaner editing
        const cleanedResponse = currentResponse.replace(/<u>(.*?)<\/u>/gi, '==$1==');
        
        // Always start in markdown mode and show markdown content
        setViewMode('markdown');
        setEditContent(cleanedResponse);
    }, [m?.response, answerMessage, conversations.length, i]);

    const handleInlineSave = async () => {
        try {

            // Always save in markdown format
            let finalContent = editContent.trim();

            // If we're in plain text view, save the original markdown (since plain text is read-only)
            if (viewMode === 'plaintext') {
                // In plain text mode, we save the original markdown content
                if (originalMarkdown) {
                    finalContent = originalMarkdown.trim();
                } else {
                    // Fallback: use current content
                    finalContent = editContent.trim();
                }
            } else {
                // If we're in markdown mode, use the edited content as is
                finalContent = editContent.trim();
            }

            // Convert ==text== back to <u>text</u> before saving
            finalContent = finalContent.replace(/==(.*?)==/g, '<u>$1</u>');

            if (onResponseUpdate && finalContent !== m?.response) {
                await onResponseUpdate(m?.id, finalContent);
                // Notify parent that response was edited
                if (onResponseEdited) {
                    onResponseEdited(m?.id);
                }
            } else {
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving response:', error);
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

    // Function to apply text formatting in markdown editor
    const applyFormatting = (type: 'bold' | 'italic' | 'underline' | 'code' | 'header') => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = editContent.substring(start, end);
        let newText = '';

        switch (type) {
            case 'bold':
                newText = `**${selectedText || 'bold text'}**`;
                break;
            case 'italic':
                newText = `*${selectedText || 'italic text'}*`;
                break;
            case 'underline':
                newText = `==${selectedText || 'underlined text'}==`;
                break;
            case 'code':
                newText = `\`${selectedText || 'code'}\``;
                break;
            case 'header':
                newText = `### ${selectedText || 'Header'}`;
                break;
            default:
                return;
        }

        const newContent = editContent.substring(0, start) + newText + editContent.substring(end);
        setEditContent(newContent);

        // Set cursor position after the inserted text
        setTimeout(() => {
            const newCursorPos = start + newText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
        }, 0);
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
                                                <p className="text-sm text-gray-500">Edit markdown directly - use toolbar for quick formatting</p>
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
                                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
                                                {/* Formatting Toolbar */}
                                                <div className="flex items-center gap-1 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                                    <button
                                                        onClick={() => applyFormatting('bold')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Bold"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M3 2v16h7.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.5C14.3 9.2 15 8 15 6.5 15 4 13 2 10.5 2H3zm3 2h4.5c1.4 0 2.5 1.1 2.5 2.5S11.9 9 10.5 9H6V4zm0 7h5.5c1.4 0 2.5 1.1 2.5 2.5S12.9 16 11.5 16H6v-5z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('italic')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Italic"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M7 2v2h2.5l-3 12H4v2h9v-2H10.5l3-12H16V2H7z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('underline')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Underline"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M6 2v8c0 2.2 1.8 4 4 4s4-1.8 4-4V2h-2v8c0 1.1-.9 2-2 2s-2-.9-2-2V2H6zm-2 16h12v2H4v-2z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('code')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Code"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('header')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Header"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M2 4v2h2v8H2v2h6v-2H6V10h4v4H8v2h6v-2h-2V6h2V4H8v2h2v2H6V6h2V4H2z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                                
                                                {/* Text Editor */}
                                                <div className="flex-1">
                                                <TextAreaBox
                                                    message={editContent}
                                                    handleChange={handleInlineChange}
                                                    handleKeyDown={handleInlineKeyDown}
                                                    isDisable={false}
                                                        className="w-full h-full min-h-[450px] border-0 focus:ring-0 focus:outline-none p-6 text-sm leading-relaxed resize-none bg-transparent font-normal"
                                                    placeholder="Edit your response here..."
                                                    ref={textareaRef}
                                                />
                                                </div>
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
                            <LLMResponse response={answerMessage} conversation={m} setConversations={setConversations}/>
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
                                            {/* View Toggle Button */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex bg-gray-100 rounded-lg p-1 shadow-sm border border-gray-200">
                                                    <button
                                                        onClick={() => handleViewModeToggle('plaintext')}
                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                            viewMode === 'plaintext'
                                                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                            </svg>
                                                            Plain Text
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewModeToggle('markdown')}
                                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                            viewMode === 'markdown'
                                                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                            </svg>
                                                            Edit Content
                                                        </div>
                                                    </button>
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
                                        </div>
                                        
                                        {/* Content Area */}
                                        <div className="flex-1 overflow-hidden bg-gray-50">
                                            <div className="h-full p-6">
                                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
                                                    {/* Formatting Toolbar - Only show in markdown mode */}
                                                    {viewMode === 'markdown' && (
                                                        <div className="flex items-center gap-1 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                                            <button
                                                                onClick={() => applyFormatting('bold')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Bold"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M3 2v16h7.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.5C14.3 9.2 15 8 15 6.5 15 4 13 2 10.5 2H3zm3 2h4.5c1.4 0 2.5 1.1 2.5 2.5S11.9 9 10.5 9H6V4zm0 7h5.5c1.4 0 2.5 1.1 2.5 2.5S12.9 16 11.5 16H6v-5z"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('italic')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Italic"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M7 2v2h2.5l-3 12H4v2h9v-2H10.5l3-12H16V2H7z"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('underline')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Underline"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M6 2v8c0 2.2 1.8 4 4 4s4-1.8 4-4V2h-2v8c0 1.1-.9 2-2 2s-2-.9-2-2V2H6zm-2 16h12v2H4v-2z"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('code')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Code"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                                </svg>
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => applyFormatting('header')}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                                title="Header"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M2 4v2h2v8H2v2h6v-2H6V10h4v4H8v2h6v-2h-2V6h2V4H8v2h2v2H6V6h2V4H2z"/>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Text Editor */}
                                                    <div className="flex-1 overflow-hidden">
                                                        {viewMode === 'markdown' ? (
                                                                    <TextAreaBox
                                                                        message={editContent}
                                                                        handleChange={handleInlineChange}
                                                                        handleKeyDown={handleInlineKeyDown}
                                                                        isDisable={false}
                                                                className="w-full h-full min-h-[450px] border-0 focus:ring-0 focus:outline-none p-6 text-sm leading-relaxed resize-none bg-transparent font-mono overflow-auto"
                                                                placeholder="Edit your markdown content here..."
                                                                        ref={textareaRef}
                                                                    />
                                                        ) : (
                                                            <div className="relative group">
                                                                <div 
                                                                    className="w-full h-full min-h-[450px] p-6 text-sm leading-relaxed bg-gray-50 border border-gray-200 rounded-md overflow-auto"
                                                                    style={{
                                                                        maxHeight: '450px',
                                                                        overflowY: 'scroll',
                                                                        overflowX: 'hidden'
                                                                    }}
                                                                >
                                                                    <div 
                                                                        className="whitespace-pre-wrap text-gray-800 font-normal"
                                                                        dangerouslySetInnerHTML={{ __html: markdownToPlainText(originalMarkdown || editContent) }}
                                                                    />
                                                                </div>
                                                                <div
                                                                    onClick={() => {
                                                                        // Copy actual plain text without HTML tags
                                                                        const plainText = markdownToPlainText(originalMarkdown || editContent)
                                                                            .replace(/<[^>]*>/g, '') // Remove HTML tags
                                                                            .replace(/&nbsp;/g, ' ') // Replace HTML entities
                                                                            .replace(/&amp;/g, '&')
                                                                            .replace(/&lt;/g, '<')
                                                                            .replace(/&gt;/g, '>');
                                                                        navigator.clipboard.writeText(plainText).then(() => {
                                                                            // Show a brief success indicator
                                                                            const icon = document.querySelector('[data-copy-icon]');
                                                                            if (icon) {
                                                                                const originalIcon = icon.innerHTML;
                                                                                icon.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                                                                                icon.classList.add('text-green-500');
                                                                                setTimeout(() => {
                                                                                    icon.innerHTML = originalIcon;
                                                                                    icon.classList.remove('text-green-500');
                                                                                }, 2000);
                                                                            }
                                                                        }).catch(err => {
                                                                            console.error('Failed to copy text: ', err);
                                                                            alert('Failed to copy text to clipboard');
                                                                        });
                                                                    }}
                                                                    data-copy-icon
                                                                    className="absolute top-3 right-3 cursor-pointer text-gray-400 hover:text-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                                    title="Copy plain text to clipboard"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
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
                                                    {viewMode === 'markdown' 
                                                        ? 'Editing in Markdown mode • Press Esc to cancel'
                                                        : 'Viewing in Plain Text mode (read-only) • Press Esc to cancel'
                                                    }
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
                                <LLMResponse response={m.response} conversation={m} setConversations={setConversations}/>
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
                                    {/* View Toggle Button */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex bg-gray-100 rounded-lg p-1 shadow-sm border border-gray-200">
                                            <button
                                                onClick={() => handleViewModeToggle('plaintext')}
                                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                    viewMode === 'plaintext'
                                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                    </svg>
                                                    Plain Text
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => handleViewModeToggle('markdown')}
                                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                                    viewMode === 'markdown'
                                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                    </svg>
                                                    Edit Content
                                                </div>
                                            </button>
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
                                </div>
                                
                                {/* Content Area */}
                                <div className="flex-1 overflow-hidden bg-gray-50">
                                    <div className="h-full p-6">
                                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
                                            {/* Formatting Toolbar - Only show in markdown mode */}
                                            {viewMode === 'markdown' && (
                                                <div className="flex items-center gap-1 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                                    <button
                                                        onClick={() => applyFormatting('bold')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Bold"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M3 2v16h7.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.8-3.5C14.3 9.2 15 8 15 6.5 15 4 13 2 10.5 2H3zm3 2h4.5c1.4 0 2.5 1.1 2.5 2.5S11.9 9 10.5 9H6V4zm0 7h5.5c1.4 0 2.5 1.1 2.5 2.5S12.9 16 11.5 16H6v-5z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('italic')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Italic"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M7 2v2h2.5l-3 12H4v2h9v-2H10.5l3-12H16V2H7z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('underline')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Underline"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M6 2v8c0 2.2 1.8 4 4 4s4-1.8 4-4V2h-2v8c0 1.1-.9 2-2 2s-2-.9-2-2V2H6zm-2 16h12v2H4v-2z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('code')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Code"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => applyFormatting('header')}
                                                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                                                        title="Header"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M2 4v2h2v8H2v2h6v-2H6V10h4v4H8v2h6v-2h-2V6h2V4H8v2h2v2H6V6h2V4H2z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Text Editor */}
                                            <div className="flex-1 overflow-hidden">
                                                {viewMode === 'markdown' ? (
                                                            <TextAreaBox
                                                                message={editContent}
                                                                handleChange={handleInlineChange}
                                                                handleKeyDown={handleInlineKeyDown}
                                                                isDisable={false}
                                                        className="w-full h-full min-h-[450px] border-0 focus:ring-0 focus:outline-none p-6 text-sm leading-relaxed resize-none bg-transparent font-mono overflow-auto"
                                                        placeholder="Edit your markdown content here..."
                                                                ref={textareaRef}
                                                            />
                                                ) : (
                                                    <div className="relative group">
                                                        <div 
                                                            className="w-full h-full min-h-[450px] p-6 text-sm leading-relaxed bg-gray-50 border border-gray-200 rounded-md overflow-auto"
                                                            style={{
                                                                maxHeight: '450px',
                                                                overflowY: 'scroll',
                                                                overflowX: 'hidden'
                                                            }}
                                                        >
                                                            <div 
                                                                className="whitespace-pre-wrap text-gray-800 font-normal"
                                                                dangerouslySetInnerHTML={{ __html: markdownToPlainText(originalMarkdown || editContent) }}
                                                            />
                                                        </div>
                                                        <div
                                                            onClick={() => {
                                                                // Copy actual plain text without HTML tags
                                                                const plainText = markdownToPlainText(originalMarkdown || editContent)
                                                                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                                                                    .replace(/&nbsp;/g, ' ') // Replace HTML entities
                                                                    .replace(/&amp;/g, '&')
                                                                    .replace(/&lt;/g, '<')
                                                                    .replace(/&gt;/g, '>');
                                                                navigator.clipboard.writeText(plainText).then(() => {
                                                                    // Show a brief success indicator
                                                                    const icon = document.querySelector('[data-copy-icon]');
                                                                    if (icon) {
                                                                        const originalIcon = icon.innerHTML;
                                                                        icon.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                                                                        icon.classList.add('text-green-500');
                                                                        setTimeout(() => {
                                                                            icon.innerHTML = originalIcon;
                                                                            icon.classList.remove('text-green-500');
                                                                        }, 2000);
                                                                    }
                                                                }).catch(err => {
                                                                    console.error('Failed to copy text: ', err);
                                                                    alert('Failed to copy text to clipboard');
                                                                });
                                                            }}
                                                            data-copy-icon
                                                            className="absolute top-3 right-3 cursor-pointer text-gray-400 hover:text-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                            title="Copy plain text to clipboard"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
                                            {viewMode === 'markdown' 
                                                ? 'Editing in Markdown mode • Press Esc to cancel'
                                                : 'Viewing in Plain Text mode (read-only) • Press Esc to cancel'
                                            }
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
                        <LLMResponse response={m.response} conversation={m} setConversations={setConversations}/>
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
