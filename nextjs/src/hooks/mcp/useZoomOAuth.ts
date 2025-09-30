import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { updateMcpDataAction } from '@/actions/user';

interface ZoomUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    account_id: string;
}

interface ZoomOAuthData {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
    user_info: ZoomUser;
    connected_at: string;
}

export const useZoomOAuth = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [zoomData, setZoomData] = useState<ZoomOAuthData | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Check for OAuth callback parameters
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const accessToken = searchParams.get('access_token');

        if (success === 'zoom_connected') {
            setIsConnected(true);
            toast.success('Zoom connected successfully!');
            
            // Store access token temporarily if provided
            if (accessToken) {
                localStorage.setItem('zoom_temp_token', accessToken);
            }
            
            // Clean up URL parameters
            const url = new URL(window.location.href);
            url.searchParams.delete('success');
            url.searchParams.delete('access_token');
            url.searchParams.delete('error');
            router.replace(url.pathname + url.search);
        }

        if (error) {
            let errorMessage = 'Failed to connect Zoom';
            switch (error) {
                case 'access_denied':
                    errorMessage = 'Access denied by user';
                    break;
                case 'no_code':
                    errorMessage = 'No authorization code received';
                    break;
                case 'token_exchange_failed':
                    errorMessage = 'Failed to exchange authorization code';
                    break;
                case 'user_info_failed':
                    errorMessage = 'Failed to fetch user information';
                    break;
                case 'update_failed':
                    errorMessage = 'Failed to save connection data';
                    break;
                default:
                    errorMessage = `Connection failed: ${error}`;
            }
            
            toast.error(errorMessage);
            
            // Clean up URL parameters
            const url = new URL(window.location.href);
            url.searchParams.delete('error');
            router.replace(url.pathname + url.search);
        }
    }, [searchParams, router]);

    // Load Zoom data from localStorage on component mount
    useEffect(() => {
        const storedZoomData = localStorage.getItem('zoom_oauth_data');
        if (storedZoomData) {
            try {
                const parsedData = JSON.parse(storedZoomData);
                setZoomData(parsedData);
                setIsConnected(true);
            } catch (error) {
                console.error('Error parsing stored Zoom data:', error);
                localStorage.removeItem('zoom_oauth_data');
            }
        }
    }, []);

    const connectZoom = async () => {
        setIsLoading(true);
        try {
            // Redirect to Zoom OAuth initiation endpoint
            window.location.href = '/api/auth/zoom';
        } catch (error) {
            console.error('Error initiating Zoom OAuth:', error);
            toast.error('Failed to initiate Zoom connection');
            setIsLoading(false);
        }
    };

    const disconnectZoom = async () => {
        setIsLoading(true);
        try {
            // Update backend to remove Zoom data
            await updateMcpDataAction({ 'mcpdata.ZOOM': '', isDeleted: true });
            
            // Clear local storage
            localStorage.removeItem('zoom_oauth_data');
            localStorage.removeItem('zoom_temp_token');
            
            // Reset state
            setZoomData(null);
            setIsConnected(false);
            
            toast.success('Zoom disconnected successfully');
        } catch (error) {
            console.error('Error disconnecting Zoom:', error);
            toast.error('Failed to disconnect Zoom');
        } finally {
            setIsLoading(false);
        }
    };

    const refreshZoomToken = async () => {
        if (!zoomData?.refresh_token) {
            throw new Error('No refresh token available');
        }

        try {
            // This would typically call your backend to refresh the token
            // For now, we'll just return the existing data
            return zoomData;
        } catch (error) {
            console.error('Error refreshing Zoom token:', error);
            throw error;
        }
    };

    return {
        isConnected,
        isLoading,
        zoomData,
        connectZoom,
        disconnectZoom,
        refreshZoomToken
    };
};