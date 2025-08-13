import { encryptedData } from '@/utils/helper';
import { NextRequest, NextResponse } from 'next/server';
import { ASANA, LINK } from '@/config/config';
import { updateMcpDataAction } from '@/actions/user';
import { MCP_CODES } from '@/components/Mcp/MCPAppList';
import routes from '@/utils/routes';

export async function GET(request: NextRequest) {
    try {
        console.log('Asana OAuth callback route');
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=asana_oauth_denied`
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=asana_oauth_invalid`
            );
        }

        // Exchange code for access token
        const tokenResponse = await fetch(ASANA.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: ASANA.CLIENT_ID,
                client_secret: ASANA.CLIENT_SECRET,
                code: code,
                redirect_uri: ASANA.REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            console.error('Asana OAuth error:', tokenData);
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=asana_oauth_failed&reason=${tokenData.error_description || 'unknown'}`
            );
        }

        // Get user information
        const userResponse = await fetch(ASANA.USER_INFO_URL, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json',
            },
        });

        const userData = await userResponse.json();

        if (userResponse.status !== 200) {
            console.error('Asana user info error:', userData);
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=asana_oauth_failed&reason=user_info_error`
            );
        }

        const payload = {
            access_token: encryptedData(tokenData.access_token),
            token_type: tokenData.token_type,
            scope: tokenData.scope,
            user_id: userData.data.id,
            user_name: userData.data.name,
            user_email: userData.data.email,
            state: state,
            has_user_token: !!tokenData.access_token,
        }
        
        const mcpDataKey = 'mcpdata.' + MCP_CODES.ASANA;
        updateMcpDataAction({ [mcpDataKey]: payload, isDeleted: false });

        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/${routes.mcp}?success=asana_connected&access_token=${tokenData.access_token}`
        );

    } catch (error) {
        console.error('Asana OAuth callback error:', error);
        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/${routes.mcp}?error=asana_oauth_error`
        );
    }
} 