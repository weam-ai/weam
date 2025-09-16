'use server';

import { MODULE_ACTIONS, MODULES, RESPONSE_STATUS, REVALIDATE_TAG_NAME } from '@/utils/constant';
import { revalidateTagging, serverApi } from './serverApi';
import { getSessionUser } from '@/utils/handleAuth';

export const removeUserAction = async (userId: string) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.DELETE,
        prefix: MODULE_ACTIONS.ADMIN_PREFIX,
        module: MODULES.USER,
        parameters: [userId],
        common: true
    });
    
    await revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`);

    return response;
}

export const changeMemberRoleAction = async (userId: string, newRole: string) => {
    const sessionUser = await getSessionUser();
    
    // Check if current user is admin
    if (sessionUser.roleCode !== 'COMPANY') {
        return {
            status: 'ERROR',
            message: 'Only admins can change user roles',
            code: 'UNAUTHORIZED'
        };
    }
    
    // Prevent admin from changing their own role
    if (sessionUser._id === userId) {
        return {
            status: 'ERROR',
            message: 'You cannot change your own role',
            code: 'INVALID_OPERATION'
        };
    }
    
    const response = await serverApi({
        action: 'changeRole',
        prefix: MODULE_ACTIONS.ADMIN_PREFIX,
        module: MODULES.USER,
        data: {
            userId : userId,
            roleCode: newRole
        },
        common: true
    });
    
    return response;
}
