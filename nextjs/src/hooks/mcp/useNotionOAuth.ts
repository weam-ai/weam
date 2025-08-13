import { useState, useEffect } from 'react';
import { NOTION } from '@/config/config';
import Toast from '@/utils/toast';
import { useSearchParams } from 'next/navigation';

export const useNotionOAuth = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [connectionData, setConnectionData] = useState(null);
    const searchParams = useSearchParams();

    const checkNotionConnection = async () => {
        try {
            const notionToken = localStorage.getItem('notion_access_token');
            const notionUser = localStorage.getItem('notion_user_data');
            
            if (notionToken && notionUser) {
                setIsConnected(true);
                setConnectionData(JSON.parse(notionUser));
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Error checking Notion connection:', error);
            setIsConnected(false);
        }
    };

    const initiateNotionOAuth = () => {
        const state = Math.random().toString(36).substring(7);
        const params = new URLSearchParams({
            client_id: NOTION.CLIENT_ID,
            redirect_uri: NOTION.REDIRECT_URI,
            response_type: 'code',
            state: state
        });
        
        // Redirect to Notion OAuth
        window.location.href = `${NOTION.AUTH_URL}?${params.toString()}`;
    };

    const disconnectNotion = async () => {
        setLoading(true);
        try {
            // Clear local storage
            localStorage.removeItem('notion_access_token');
            localStorage.removeItem('notion_user_data');
            setIsConnected(false);
            setConnectionData(null);
            Toast('Successfully disconnected from Notion!', 'success');
        } catch (error) {
            console.error('Error disconnecting Notion:', error);
            Toast('Failed to disconnect from Notion. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle OAuth callback
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const accessToken = searchParams.get('access_token');

        if (success === 'notion_connected' && accessToken) {
            // Store the access token in localStorage
            localStorage.setItem('notion_access_token', accessToken);
            
            // Show success toast
            Toast('Successfully connected to Notion!');
            
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error && error.startsWith('notion_oauth_')) {
            // Show error toast
            Toast('Failed to connect to Notion. Please try again.', 'error');
            
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [searchParams]);

    useEffect(() => {
        checkNotionConnection();
    }, []);

    return {
        isConnected,
        loading,
        connectionData,
        initiateNotionOAuth,
        disconnectNotion,
        checkNotionConnection
    };
}; 