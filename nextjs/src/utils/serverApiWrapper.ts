'use server';

import { serverApi } from '@/actions/serverApi';
import { RESPONSE_STATUS, RESPONSE_STATUS_CODE } from './constant';

/**
 * Wrapper for server-side API calls that handles 403 errors gracefully
 * This is useful for components that need to handle authentication errors without crashing
 */
export async function safeServerApi<T = any>(apiCall: () => Promise<T>): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    shouldLogout?: boolean;
}> {
    try {
        const result = await apiCall();
        return { success: true, data: result };
    } catch (error: any) {
        // Check if it's a 403 error that should trigger logout
        if (error?.status === RESPONSE_STATUS.FORBIDDEN) {
            // Don't handle CSRF token missing errors here as they're handled differently
            if (error?.code === RESPONSE_STATUS_CODE.CSRF_TOKEN_MISSING) {
                return { 
                    success: false, 
                    error: 'CSRF token missing', 
                    shouldLogout: false 
                };
            }
            
            // For other 403 errors, indicate that logout should happen
            return { 
                success: false, 
                error: 'Access forbidden', 
                shouldLogout: true 
            };
        }
        
        // For other errors, return the error without logout
        return { 
            success: false, 
            error: error?.message || 'An error occurred' 
        };
    }
}

/**
 * Safe wrapper for serverApi calls
 */
export async function safeApiCall<T = any>(apiParams: Parameters<typeof serverApi>[0]): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    shouldLogout?: boolean;
}> {
    return safeServerApi(() => serverApi(apiParams));
}
