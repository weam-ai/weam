import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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


    if (!isOpen) return null;

    const modalContent = (
        <Dialog 
            open={isOpen} 
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-w-[470px] max-h-[80vh] overflow-y-auto p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 font-bold text-font-18 text-b2">Add to Pages</DialogTitle>
                    <DialogDescription>
                        Create a new page from this content
                    </DialogDescription>
                </DialogHeader>
                
                <div className="dialog-body flex flex-col flex-1 relative h-full mt-5">
                    <div className="mb-4">
                        <label htmlFor="page-title" className="block text-gray-700 text-font-14 font-bold mb-2">
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
                            className="default-form-input default-form-input-border-light default-form-input-md"
                            disabled={isLoading}
                        />
                    </div>
                    
                    {/* Buttons Container */}
                    <div className="flex justify-end space-x-3">
                        {/* Cancel Button */}
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="btn btn-outline-gray"
                        >
                            Cancel
                        </button>
                        
                        {/* Create Page Button */}
                        <button
                            onClick={handleSave}
                            disabled={isLoading || !title.trim()}
                            className="btn btn-black flex items-center gap-2"
                        >
                            {isLoading ? 'Creating...' : 'Create Page'}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
};

export default AddPageModal;
