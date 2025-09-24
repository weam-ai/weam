'use client';
import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useQuickActions } from '@/hooks/chat/useQuickActions';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, FileText, List, RefreshCw, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import QuickActionResultModal from './QuickActionResultModal';

interface QuickActionsProps {
    chatId?: string;
    conversations?: any[];
    onActionComplete?: (result: string) => void;
}

interface QuickAction {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    action: string;
    requiresConversation?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: 'summarize',
        label: 'Summarize',
        description: 'Create a concise summary of this conversation',
        icon: <FileText className="w-4 h-4" />,
        action: 'summarize',
        requiresConversation: true,
    },
    {
        id: 'action_items',
        label: 'Action Items',
        description: 'Extract actionable tasks and next steps',
        icon: <List className="w-4 h-4" />,
        action: 'extract_action_items',
        requiresConversation: true,
    },
    {
        id: 'follow_up',
        label: 'Follow-up',
        description: 'Generate relevant follow-up questions',
        icon: <RefreshCw className="w-4 h-4" />,
        action: 'generate_follow_up',
        requiresConversation: true,
    },
    {
        id: 'format_email',
        label: 'Email Format',
        description: 'Convert to professional email format',
        icon: <Copy className="w-4 h-4" />,
        action: 'format_email',
        requiresConversation: false,
    },
    {
        id: 'export_notes',
        label: 'Export Notes',
        description: 'Download conversation as markdown',
        icon: <Download className="w-4 h-4" />,
        action: 'export_notes',
        requiresConversation: true,
    },
];

const QuickActions: React.FC<QuickActionsProps> = ({ 
    chatId, 
    conversations = [], 
    onActionComplete 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [resultModal, setResultModal] = useState<{
        isOpen: boolean;
        title: string;
        content: string;
        actionType: string;
    }>({
        isOpen: false,
        title: '',
        content: '',
        actionType: '',
    });
    
    const { executeQuickAction } = useQuickActions();
    
    const hasConversations = conversations && conversations.length > 0;
    const availableActions = QUICK_ACTIONS.filter(action => 
        !action.requiresConversation || hasConversations
    );

    const handleActionClick = useCallback(async (action: QuickAction) => {
        if (!hasConversations && action.requiresConversation) {
            toast.error('No conversation to process');
            return;
        }

        setLoadingAction(action.id);
        
        try {
            const result = await executeQuickAction({
                action: action.action,
                chatId,
                conversations,
                message: conversations[conversations.length - 1]?.message || '',
            });

            // Handle special case for export_notes
            if (action.action === 'export_notes') {
                // Create and download the file
                const blob = new Blob([result], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `conversation-export-${new Date().toISOString().split('T')[0]}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('Notes exported successfully');
            } else {
                if (onActionComplete) {
                    onActionComplete(result);
                }
                
                // Show result in modal for non-export actions
                setResultModal({
                    isOpen: true,
                    title: `${action.label} Result`,
                    content: result,
                    actionType: action.action,
                });
                
                toast.success(`${action.label} completed successfully`);
            }
        } catch (error) {
            console.error('Quick action failed:', error);
            toast.error(`Failed to ${action.label.toLowerCase()}`);
        } finally {
            setLoadingAction(null);
        }
    }, [hasConversations, executeQuickAction, chatId, conversations, onActionComplete]);

    if (!hasConversations && availableActions.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-20 right-4 z-50">
            <TooltipProvider>
                <div className="flex flex-col items-end gap-2">
                    {isExpanded && (
                        <Card className="w-64 shadow-lg border border-gray-200">
                            <CardContent className="p-3">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                        Quick Actions
                                    </div>
                                    {availableActions.map((action) => (
                                        <Tooltip key={action.id}>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start text-left h-auto p-2 hover:bg-gray-50"
                                                    onClick={() => handleActionClick(action)}
                                                    disabled={loadingAction === action.id}
                                                >
                                                    <div className="flex items-center gap-2 w-full">
                                                        {loadingAction === action.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            action.icon
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {action.label}
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate">
                                                                {action.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">
                                                <p>{action.description}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                <Zap className="w-5 h-5 text-white" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Quick Actions</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
            
            {/* Result Modal */}
            <QuickActionResultModal
                isOpen={resultModal.isOpen}
                onClose={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
                title={resultModal.title}
                content={resultModal.content}
                actionType={resultModal.actionType}
            />
        </div>
    );
};

export default QuickActions;
