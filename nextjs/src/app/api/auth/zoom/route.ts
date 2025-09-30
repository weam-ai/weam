import { NextRequest, NextResponse } from 'next/server';
import { ZOOM, LINK } from '@/config/config';
import routes from '@/utils/routes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        console.log('Zoom OAuth start route');
        
        // Check if required environment variables are set
        if (!ZOOM.CLIENT_ID || !ZOOM.CLIENT_SECRET || !ZOOM.REDIRECT_URI) {
            console.error('Missing Zoom environment variables');
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_failed&reason=missing_env_vars`
            );
        }

        // Generate state parameter for security
        const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Build authorization URL
        const authUrl = new URL(ZOOM.AUTH_URL);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', ZOOM.CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', ZOOM.REDIRECT_URI);
        authUrl.searchParams.append('scope', ZOOM.SCOPE);
        authUrl.searchParams.append('state', state);

        
        return NextResponse.redirect(authUrl.toString());

    } catch (error) {
        console.error('Zoom OAuth start error:', error);
        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_error`
        );
    }
}

export async function POST(request: NextRequest) {
    return GET(request);
}