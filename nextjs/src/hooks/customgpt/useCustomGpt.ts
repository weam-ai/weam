import commonApi from '@/api';
import { APIResponseType, DefaultPaginationType, ObjectType, PaginatorType } from '@/types/common';
import { BrainAgentType } from '@/types/brain';
import { DEFAULT_SORT, MODULES, MODULE_ACTIONS, SEARCH_AND_FILTER_OPTIONS } from '@/utils/constant';
import { decodedObjectId } from '@/utils/helper';
import Toast from '@/utils/toast';
import { useRouter } from 'next/navigation';
import React, { useState, useMemo } from 'react'
import { getCurrentUser } from '@/utils/handleAuth';
import { RootState } from '@/lib/store';
import { useSelector } from 'react-redux';

const useCustomGpt = (b?: string) => {
    const [customgptList, setCustomGptList] = useState<BrainAgentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFavorites, setShowFavorites] = useState(false);
    const router=useRouter()
    const [paginator, setPaginator] = useState<PaginatorType>({});
    const brainId = useMemo(() => decodedObjectId(b), [b]);
    const currentUser = useMemo(() => getCurrentUser(), []);
    const selectedWorkSpace = useSelector((store: RootState) => store.workspacelist.selected);

    const getAllCustomGpt = async (searchValue = '', pagination: DefaultPaginationType = { offset: 0, limit: 10 }) => {
        if (!b) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);

            const finalFilterOptions = showFavorites 
                ? { favoriteByUsers: { $in: [currentUser._id] } }
                : '';

            const response: APIResponseType<BrainAgentType[]> = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CUSTOM_GPT,
                common: true,
                data: {
                    options: {
                        sort: { createdAt: DEFAULT_SORT },
                        // ...pagination
                        pagination: false
                    },
                    query: {
                        searchColumns: [SEARCH_AND_FILTER_OPTIONS.NORMAL_TITLE, SEARCH_AND_FILTER_OPTIONS.NORMAL_SLUG],
                        search: searchValue,
                        'brain.id': brainId,
                        ...finalFilterOptions
                    }
                }
            })
            if(showFavorites && pagination.offset === 0){
                setCustomGptList(response.data);
            } else if(pagination.offset === 0){
                setCustomGptList(response.data);
            } else {
                setCustomGptList((prev: BrainAgentType[]) => [...prev, ...response.data]);
            }
            
            setPaginator(response.paginator as PaginatorType);
            setLoading(false);
        } catch (error) {
            if(error?.response?.status===302){
                router.push('/')
            }
            console.error('error: ', error);
        } finally {
            // setLoading(false);
        }
    }

    const deleteCustomGpt = async (id) => {
        try {
            const response = await commonApi({
                parameters: [id],
                action: MODULE_ACTIONS.DELETE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CUSTOM_GPT,
                common: true
            })
            // Only show success toast and update list if deletion was successful
            if (response.code === 'SUCCESS') {
                Toast(response.message);
                setCustomGptList(customgptList.filter(custom => custom._id !== id))
            }
        } catch (error) {
            console.error('error: ', error);
        }
    }

    const getTabAgentList = async (searchValue: string, pagination: DefaultPaginationType = { offset: 0, limit: 10 }): Promise<BrainAgentType[]> => {
        try {
            if (!selectedWorkSpace) return [];
            setLoading(true);
            const response: APIResponseType<BrainAgentType[]> = await commonApi({
                action: MODULES.TAB_AGENT_LIST,
                data: {
                    options: {
                        sort: { createdAt: DEFAULT_SORT },
                        ...pagination
                    },
                    query: {
                        searchColumns: [SEARCH_AND_FILTER_OPTIONS.NORMAL_TITLE, SEARCH_AND_FILTER_OPTIONS.NORMAL_SLUG],
                        search: searchValue,
                        workspaceId: selectedWorkSpace._id
                    }
                },
            })
            setCustomGptList((prev: BrainAgentType[]) => [...prev, ...response.data]);
            setPaginator(response.paginator as PaginatorType);
            return response.data;
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setLoading(false);
        }
    }

    const favouriteCustomGpt = async (payload, gptId) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.FAVORITE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.CUSTOM_GPT,
                common: true,
                data: payload,
                parameters: [gptId]
            });
            if (!payload.favorite && showFavorites) {
                setCustomGptList((prevList) => prevList.filter(gpt => gpt._id !== gptId));
            }
            Toast(response.message);
        } catch (error) {
            console.log('error: ', error);
        }
    }

    return {
        loading,
        customgptList,
        getAllCustomGpt,
        deleteCustomGpt,
        setLoading,
        paginator,
        getTabAgentList,
        favouriteCustomGpt,
        showFavorites,
        setShowFavorites,
        setCustomGptList
    }
}

export default useCustomGpt