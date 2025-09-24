'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface QuickActionRequest {
    action: string;
    chatId?: string;
    conversations?: any[];
    message?: string;
}

interface QuickActionResponse {
    result: string;
    success: boolean;
    error?: string;
}

export const useQuickActions = () => {
    const router = useRouter();

    const executeQuickAction = useCallback(async (request: QuickActionRequest): Promise<string> => {
        const { action, chatId, conversations, message } = request;

        try {
            const response = await fetch('/api/quick-actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    chatId,
                    conversations,
                    message,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Action failed');
            }

            return data.result;
        } catch (error) {
            console.error('Quick action execution failed:', error);
            throw error;
        }
    }, []);

    return {
        executeQuickAction,
    };
};
