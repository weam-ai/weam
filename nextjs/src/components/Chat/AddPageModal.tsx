import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AddPageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string) => Promise<void>;
    defaultTitle?: string;
}

const AddPageModal: React.FC<AddPageModalProps> = ({ isOpen, onClose, onSave, defaultTitle = '' }) => {
    const [title, setTitle] = useState(defaultTitle);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize title when modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle(defaultTitle);
            // Focus the input when modal opens
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, defaultTitle]);

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Please enter a page title');
            return;
        }

        setIsLoading(true);
        try {
            await onSave(title.trim());
            setTitle('');
            onClose();
        } catch (error) {
            console.error('Error saving page:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
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

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                <path d="M12,16H10V14H8V12H10V10H12V12H14V14H12V16Z" fill="white"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Add to Pages</h3>
                        </div>
                    </div>
                </div>
                
                {/* Content */}
                <div className="px-4 py-4">
                    <div>
                        <label htmlFor="page-title" className="block text-sm font-medium text-gray-700 mb-2">
                            Page Title
                        </label>
                        <input
                            id="page-title"
                            ref={inputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter page title..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm leading-relaxed"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="flex items-center justify-end">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading || !title.trim()}
                                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isLoading ? 'Creating...' : 'Create Page'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
};

export default AddPageModal;
