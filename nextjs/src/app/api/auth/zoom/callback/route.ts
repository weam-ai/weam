import { encryptedData } from '@/utils/helper';
import { NextRequest, NextResponse } from 'next/server';
import { ZOOM, LINK } from '@/config/config';
import { updateMcpDataAction } from '@/actions/user';
import { MCP_CODES } from '@/components/Mcp/MCPAppList';
import routes from '@/utils/routes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        console.log('Zoom OAuth callback route');
        
        // Check if required environment variables are set
        if (!ZOOM.CLIENT_ID || !ZOOM.CLIENT_SECRET) {
            console.error('Missing Zoom environment variables');
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_failed&reason=missing_env_vars`
            );
        }
        
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_denied`
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_invalid`
            );
        }

        // Exchange code for access token using Basic Auth
        const credentials = Buffer.from(`${ZOOM.CLIENT_ID}:${ZOOM.CLIENT_SECRET}`).toString('base64');
        
        const tokenResponse = await fetch(ZOOM.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: ZOOM.REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            console.error('Zoom OAuth error:', tokenData);
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_failed&reason=${tokenData.error_description || 'unknown'}`
            );
        }

        // Get user information
        const userResponse = await fetch(ZOOM.USER_INFO_URL, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json',
            },
        });

        const userData = await userResponse.json();

        if (userResponse.status !== 200) {
            console.error('Zoom user info error:', userData);
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_failed&reason=user_info_error`
            );
        }

        const payload = {
            access_token: encryptedData(tokenData.access_token),
            refresh_token: tokenData.refresh_token ? encryptedData(tokenData.refresh_token) : null,
            token_type: tokenData.token_type,
            scope: tokenData.scope,
            expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
            user_id: userData.id,
            user_name: userData.display_name || userData.first_name + ' ' + userData.last_name,
            user_email: userData.email,
            account_id: userData.account_id,
            state: state,
            has_user_token: !!tokenData.access_token,
        }
        
        const mcpDataKey = 'mcpdata.' + MCP_CODES.ZOOM;
        updateMcpDataAction({ [mcpDataKey]: payload, isDeleted: false });

        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/${routes.mcp}?success=zoom_connected&access_token=${tokenData.access_token}`
        );

    } catch (error) {
        console.error('Zoom OAuth callback error:', error);
        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/${routes.mcp}?error=zoom_oauth_error`
        );
    }
}