import React, { useState, useRef, useEffect } from 'react';
import TextAreaBox from '@/widgets/TextAreaBox';

interface EditResponseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (content: string) => void;
    defaultContent?: string;
    title?: string;
    description?: string;
}

const EditResponseModal: React.FC<EditResponseModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    defaultContent = '',
    title = 'Edit Response',
    description = 'Modify your content below'
}) => {
    const [content, setContent] = useState(defaultContent);
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initialize content when modal opens
    useEffect(() => {
        if (isOpen) {
            setContent(defaultContent);
        }
    }, [isOpen, defaultContent]);

    const handleSave = async () => {
        if (!content.trim()) {
            alert('Please enter some content');
            return;
        }

        setIsLoading(true);
        try {
            await onSave(content.trim());
            onClose();
        } catch (error) {
            console.error('Error saving content:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
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
                            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                            <p className="text-sm text-gray-500">{description}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
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
                                message={content}
                                handleChange={(e) => setContent(e.target.value)}
                                handleKeyDown={handleKeyDown}
                                isDisable={false}
                                className="w-full h-full min-h-[500px] border-0 focus:ring-0 focus:outline-none rounded-lg p-6 text-sm leading-relaxed resize-none bg-transparent font-normal"
                                placeholder="Enter your content here..."
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
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading || !content.trim()}
                                className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditResponseModal;
