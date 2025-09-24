'use client';
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface QuickActionResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    actionType: string;
}

const QuickActionResultModal: React.FC<QuickActionResultModalProps> = ({
    isOpen,
    onClose,
    title,
    content,
    actionType,
}) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        toast.success('Content copied to clipboard');
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${actionType}-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('File downloaded successfully');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {title}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex gap-2 mb-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="flex items-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            Copy
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            className="flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </Button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-gray-50">
                        <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                            {content}
                        </pre>
                    </div>
                </div>
                
                <div className="flex justify-end mt-4">
                    <Button onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuickActionResultModal;
