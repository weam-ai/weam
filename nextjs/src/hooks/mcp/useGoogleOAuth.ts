import { useState, useEffect } from 'react';
import { GOOGLE_OAUTH } from '@/config/config';
import Toast from '@/utils/toast';
import { useSearchParams } from 'next/navigation';

export const useGoogleOAuth = () => {
    const searchParams = useSearchParams();
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    const checkGoogleConnection = async () => {
        try {
            const googleToken = localStorage.getItem('google_access_token');
            const googleUser = localStorage.getItem('google_user_data');
            
            if (googleToken && googleUser) {
                setIsConnected(true);
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Error checking Google connection:', error);
            setIsConnected(false);
        }
    };

    // Handle OAuth callback from URL parameters
    useEffect(() => {
        const success = searchParams.get('success');
        const accessToken = searchParams.get('access_token');

        if (success === 'google_connected' && accessToken) {
            setIsConnected(true);
        }
    }, [searchParams]);

    const initiateGoogleOAuth = (service: string) => {
        const rawState = {
            service,
            nonce: Math.random().toString(36).substring(7),
        };
    
        const encodedState = btoa(JSON.stringify(rawState));
        const params = new URLSearchParams({
            client_id: GOOGLE_OAUTH.CLIENT_ID,
            scope: [
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/calendar.readonly",
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/drive.readonly",
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/gmail.compose",
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/gmail.labels"
            ].join(' '),
            redirect_uri: GOOGLE_OAUTH.REDIRECT_URI,
            state: encodedState,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent'
        });
        window.location.href = `${GOOGLE_OAUTH.AUTH_URL}?${params.toString()}`;
    };

    const disconnectGoogle = async () => {
        setLoading(true);
        try {            
            setIsConnected(false);
            Toast('Successfully disconnected from Google!');
        } catch (error) {
            console.error('Error disconnecting Google:', error);
            Toast('Failed to disconnect from Google. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Get user's Google Drive files
    const getDriveFiles = async () => {
        try {
            const response = await fetch('/api/google/drive/files');
            const data = await response.json();

            if (data.success) {
                return data.files;
            } else {
                Toast(data.message || 'Failed to fetch Drive files', 'error');
                return [];
            }
        } catch (error) {
            console.error('Error fetching Drive files:', error);
            Toast('Failed to fetch Drive files. Please try again.', 'error');
            return [];
        }
    };

    // Get user's calendar events
    const getCalendarEvents = async (timeMin?: string, timeMax?: string) => {
        try {
            const params = new URLSearchParams();
            if (timeMin) params.append('timeMin', timeMin);
            if (timeMax) params.append('timeMax', timeMax);

            const response = await fetch(`/api/google/calendar/events?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                return data.events;
            } else {
                Toast(data.message || 'Failed to fetch calendar events', 'error');
                return [];
            }
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            Toast('Failed to fetch calendar events. Please try again.', 'error');
            return [];
        }
    };

    // Refresh access token
    const refreshAccessToken = async () => {
        try {
            const refreshToken = localStorage.getItem('google_refresh_token');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch('/api/auth/google/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            const data = await response.json();

            if (data.success) {
                return data.accessToken;
            } else {
                throw new Error(data.message || 'Failed to refresh token');
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            // If refresh fails, user needs to reconnect
            disconnectGoogle();
            throw error;
        }
    };

    useEffect(() => {
        checkGoogleConnection();
    }, []);

    return {
        isConnected,
        loading,
        initiateGoogleOAuth,
        disconnectGoogle,
        getDriveFiles,
        getCalendarEvents,
        refreshAccessToken,
        checkGoogleConnection
    };
}; 