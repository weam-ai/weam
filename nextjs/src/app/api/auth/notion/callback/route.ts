import { encryptedData } from '@/utils/helper';
import { NextRequest, NextResponse } from 'next/server';
import { LINK, NOTION } from '@/config/config';
import { updateMcpDataAction } from '@/actions/user';
import { MCP_CODES } from '@/components/Mcp/MCPAppList';
import routes from '@/utils/routes';
import { RESPONSE_STATUS } from '@/utils/constant';

export async function GET(request: NextRequest) {
    try {        
        if (!NOTION.CLIENT_ID || !NOTION.CLIENT_SECRET) {
            console.error('Missing Notion OAuth environment variables');
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=notion_oauth_failed&reason=missing_env_vars`
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=notion_oauth_denied`
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=notion_oauth_invalid`
            );
        }

        const tokenRequestBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: NOTION.REDIRECT_URI,
        });
        
        const basicAuth = Buffer.from(`${NOTION.CLIENT_ID}:${NOTION.CLIENT_SECRET}`).toString('base64');
        
        const tokenResponse = await fetch(NOTION.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Notion-Version': '2022-06-28',
            },
            body: tokenRequestBody,
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=notion_oauth_failed&reason=${tokenData.error_description || tokenData.error || 'unknown'}`
            );
        }        
        const userResponse = await fetch(NOTION.USER_INFO_URL, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json',
                'Notion-Version': '2022-06-28',
            },
        });

        const userData = await userResponse.json();

        if (userResponse.status !== RESPONSE_STATUS.SUCCESS) {
            return NextResponse.redirect(
                `${LINK.DOMAIN_URL}/${routes.mcp}?error=notion_oauth_failed&reason=user_info_error`
            );
        }

        const payload = {
            access_token: encryptedData(tokenData.access_token),
            token_type: tokenData.token_type,
            scope: tokenData.scope,
            user_id: userData.id,
            user_name: userData.name,
            user_email: userData.person?.email,
            state: state,
            has_user_token: !!tokenData.access_token,
        }
        
        const mcpDataKey = 'mcpdata.' + MCP_CODES.NOTION;
        updateMcpDataAction({ [mcpDataKey]: payload, isDeleted: false });

        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/${routes.mcp}?success=notion_connected&access_token=${tokenData.access_token}`
        );

    } catch (error) {
        console.error('Notion OAuth callback error:', error);
        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/${routes.mcp}?error=notion_oauth_error`
        );
    }
} 