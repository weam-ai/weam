'use server';

import { getSession } from '@/config/withSession';
import { redirect } from 'next/navigation';
import routes from './routes';

/**
 * Server-side logout function that destroys the session and redirects to login
 * This is used when 403 errors occur in server-side API calls
 */
export async function serverLogout() {
    try {
        const session = await getSession();
        if (session) {
            session.destroy();
        }
        // Redirect to login page
        redirect(routes.login);
    } catch (error) {
        // Fallback redirect
        redirect(routes.login);
    }
}

/**
 * Check if user is authenticated on server-side
 * Returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        const session = await getSession();
        return !!session?.user?.access_token;
    } catch (error) {
        return false;
    }
}
