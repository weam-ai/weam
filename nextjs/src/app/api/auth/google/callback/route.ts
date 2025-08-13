import { updateMcpDataAction } from '@/actions/user';
import { GOOGLE_OAUTH, LINK } from '@/config/config';
import { encryptedData, formatToCodeFormat, toIsoDate } from '@/utils/helper';
import { NextRequest, NextResponse } from 'next/server';

type UserInfo = {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    hd: string;
}

type TokenData = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token: string;
    token_type: string;
    error?: string;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const decodedState = atob(state);

    try {
        const tokenRes = await fetch(GOOGLE_OAUTH.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                client_id: GOOGLE_OAUTH.CLIENT_ID,
                client_secret: GOOGLE_OAUTH.CLIENT_SECRET,
                redirect_uri: GOOGLE_OAUTH.REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData: TokenData = await tokenRes.json();

        if (tokenData.error) {
            return NextResponse.redirect(`${LINK.DOMAIN_URL}/mcp?error=google_oauth_error`)
        }

        const userInfoRes = await fetch(GOOGLE_OAUTH.USER_INFO_URL, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const userInfo: UserInfo = await userInfoRes.json();
        const parsedState = JSON.parse(decodedState);
        if (Object.keys(parsedState).length) {
            const codeTitle = formatToCodeFormat(parsedState.service);
            const updatedKey = `mcpdata.${codeTitle}`;
            const now = Date.now();
            const oneHourLater = now + 3600 * 1000;
            const expiresAt = toIsoDate(oneHourLater);
            const updatedPayload = {
                access_token:  encryptedData(tokenData.access_token),
                refresh_token: encryptedData(tokenData.refresh_token),
                scope: tokenData.scope,
                name: userInfo.name,
                email: userInfo.email,
                expiry: expiresAt,
            }
            await updateMcpDataAction({ [updatedKey]: updatedPayload, isDeleted: false })
        }
        
        // Encode user data for URL parameters
        const userData = {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
        };
        const encodedUserData = encodeURIComponent(JSON.stringify(userData));
        
        return NextResponse.redirect(
            `${LINK.DOMAIN_URL}/mcp?success=google_connected&access_token=${tokenData.access_token}&user_data=${encodedUserData}`
        );
    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(`${LINK.DOMAIN_URL}/mcp?error=google_oauth_error`)
    }
} 