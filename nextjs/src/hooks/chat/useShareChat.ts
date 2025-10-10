import commonApi from '@/api';
import { DEFAULT_SORT, MODULES, MODULE_ACTIONS } from '@/utils/constant';
import { getCurrentUser } from '@/utils/handleAuth';
import Toast from '@/utils/toast';
import { createSharedLinkAction } from '@/actions/settings';
import React, { useState } from 'react'

const useShareChat = () => {
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [viewLoading, setViewLoading] = useState(true);
    const [viewChat, setViewChat] = useState(null);
    const [shareList, setShareList] = useState([]);

    const createShareChat = async (payload) => {
        try {
            setLoading(true);
            const response = await createSharedLinkAction(payload);
            Toast(response.message);
        } catch (error) {
            Toast('Failed to create shared link');
        } finally {
            setLoading(false);
        }
    }

    const getShareChatList = async () => {
        const userDetail = getCurrentUser();

        try {
            setListLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.SHARE_CHAT,
                common: true,
                data: {
                    options: {
                        sort: { createdAt: DEFAULT_SORT },
                        populate: [
                            {
                                path: 'chatId'
                            }
                        ]
                    },
                    query: {
                        shareBy: userDetail._id
                    }
                }
            })
            setShareList(response.data);
        } finally {
            setListLoading(false);
        }
    }

    const deleteShareChat = async (payload) => {
        try {
            setDeleteLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.DELETE_SHARE_CHAT,
                data: payload
            })
            Toast(response.message);
            await getShareChatList()
        } finally {
            setDeleteLoading(false);
        }
    }

    const viewShareChat = async (id) => {
        try {
            setViewLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.GET,
                module: MODULES.SHARE_CHAT,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                common: true,
                parameters: [id],
            })
            setViewChat(response.data)
        } finally {
            setViewLoading(false);
        }
    }

    return {
        loading,
        createShareChat,
        getShareChatList,
        shareList,
        listLoading,
        deleteLoading,
        deleteShareChat,
        viewChat,
        viewShareChat,
        viewLoading
    }
}

export default useShareChat