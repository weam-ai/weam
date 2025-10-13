'use server';

import { DEFAULT_SORT, MODULE_ACTIONS, MODULES, REVALIDATE_TAG_NAME } from '@/utils/constant';
import { serverApi } from './serverApi';
import { getSessionUser } from '@/utils/handleAuth';
import { revalidateTag } from 'next/cache';

export const sharedLinksAction = async () => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.LIST,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.SHARE_CHAT,
        common: true,
        data: {
            options: {
                sort: { createdAt: DEFAULT_SORT },
                populate: [
                    {
                        path: 'chatId',
                    },
                ],
            },
            query: {
                shareBy: sessionUser._id,
            },
        },
        config: { next: { revalidate: 86400, tags: [`${REVALIDATE_TAG_NAME.SHARED_LINKS}-${sessionUser._id}`] } },
    });
    return response;
};

export const createSharedLinkAction = async (payload) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.CREATE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.SHARE_CHAT,
        common: true,
        data: payload
    });
    revalidateTag(`${REVALIDATE_TAG_NAME.SHARED_LINKS}-${sessionUser._id}`);
    return response;
};

export const deleteSharedLinkAction = async (payload) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.DELETE_SHARE_CHAT,
        data: payload,
    })
    revalidateTag(`${REVALIDATE_TAG_NAME.SHARED_LINKS}-${sessionUser._id}`);
    return response;
};
