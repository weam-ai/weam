import { useState, useEffect } from 'react';
import { ASANA } from '@/config/config';
import Toast from '@/utils/toast';
import { useSearchParams } from 'next/navigation';

export const useAsanaOAuth = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [connectionData, setConnectionData] = useState(null);
    const searchParams = useSearchParams();

    const checkAsanaConnection = async () => {
        try {
            const asanaToken = localStorage.getItem('asana_access_token');
            const asanaUser = localStorage.getItem('asana_user_data');
            
            if (asanaToken && asanaUser) {
                setIsConnected(true);
                setConnectionData(JSON.parse(asanaUser));
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Error checking Asana connection:', error);
            setIsConnected(false);
        }
    };

    const initiateAsanaOAuth = () => {
        const state = Math.random().toString(36).substring(7);
        const params = new URLSearchParams({
            client_id: ASANA.CLIENT_ID,
            scope: ASANA.SCOPE,   
            redirect_uri: ASANA.REDIRECT_URI,
            state: state,
            response_type: 'code'
        });
        
        // Redirect to Asana OAuth
        window.location.href = `${ASANA.AUTH_URL}?${params.toString()}`;
    };

    const disconnectAsana = async () => {
        setLoading(true);
        try {
            // Clear local storage
            localStorage.removeItem('asana_access_token');
            localStorage.removeItem('asana_user_data');
            setIsConnected(false);
            setConnectionData(null);
            Toast('Successfully disconnected from Asana!', 'success');
        } catch (error) {
            console.error('Error disconnecting Asana:', error);
            Toast('Failed to disconnect from Asana. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAsanaConnection();
    }, []);

    return {
        isConnected,
        loading,
        connectionData,
        initiateAsanaOAuth,
        disconnectAsana,
        checkAsanaConnection
    };
}; 