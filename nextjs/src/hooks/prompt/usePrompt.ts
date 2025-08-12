import commonApi from '@/api';
import { setPromptModalAction } from '@/lib/slices/modalSlice';
import { setPromptlistAction, setPromptPaginator } from '@/lib/slices/prompt/promptSlice';
import { MODULES, MODULE_ACTIONS, SEARCH_AND_FILTER_OPTIONS, DEFAULT_SORT, MAX_PAGE_RECORD, DEFAULT_OFFSET } from '@/utils/constant';
import { decodedObjectId } from '@/utils/helper';
import Toast from '@/utils/toast';
import { useState, useMemo } from 'react';
import { useDispatch, useSelector, } from 'react-redux';
import { useRouter } from 'next/navigation';
import { APIResponseType, DefaultPaginationType, ObjectType, PaginatorType } from '@/types/common';
import { RootState } from '@/lib/store';
import { BrainPromptType } from '@/types/brain';
import { getCurrentUser } from '@/utils/handleAuth';

const usePrompt = (b?: string) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [showFavorites, setShowFavorites] = useState(false);
    const [addPromptLoading, setAddPromptLoading] = useState(false);
    const [paginator, setPaginator] = useState<PaginatorType>({});
    const [promptList, setPromptList] = useState<BrainPromptType[]>([]);
    const brainId = useMemo(() => decodedObjectId(b), [b]);

    const prompts = useSelector((store: RootState) => store.prompt.list);
    const currentUser = useMemo(() => getCurrentUser(), []);
    const selectedWorkSpace = useSelector((store: RootState) => store.workspacelist.selected);
    
    const createPrompt = async (data, closeModal) => {
        try {
            setAddPromptLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.CREATE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.PROMPT,
                data,
                common: true
            })
            Toast(response.message);
            await getList('',{});
        } catch (error) {
            console.log('error: ', error);
        } finally {
            dispatch(setPromptModalAction(false));
            setAddPromptLoading(false);
            closeModal();
        }
    }

    const getList = async (searchValue = '', filterOptions = {}, pagination: DefaultPaginationType = { offset: 0, limit: 10 }) => {
        if (!b) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            
            const finalFilterOptions = showFavorites 
                ? { ...filterOptions, favoriteByUsers: { $in: [currentUser._id] } }
                : filterOptions;
            
            const response: APIResponseType<BrainPromptType[]> = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.PROMPT,
                common: true,
                data: {
                    options: {
                        sort: {
                            createdAt: DEFAULT_SORT
                        },
                        // ...pagination
                        pagination: false,
                    },
                    query: {
                        searchColumns: [SEARCH_AND_FILTER_OPTIONS.NORMAL_TITLE],
                        search: searchValue,
                        'brain.id': brainId,
                        ...finalFilterOptions
                    },
                },
            });

            dispatch(setPromptlistAction(response.data));
            
            if(showFavorites && pagination.offset === 0){
                setPromptList(response.data);
            } else if(pagination.offset === 0){
                setPromptList(response.data);                
            } else {
                setPromptList((prev: BrainPromptType[]) => [...prev, ...response.data]);
            }
            setPaginator(response.paginator as PaginatorType);
            dispatch(setPromptPaginator(response.paginator));
        } catch (error) {
            if(error?.response?.status===302){
                router.push('/')
            }
            console.log('error: ', error);
        } finally {
            setLoading(false);
        }
    };

    const archivePrompt = async (id) => {
        try {
            const response = await commonApi({
                parameters: [id],
                action: MODULE_ACTIONS.DELETE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.PROMPT,
                common: true
            })
            Toast(response.message);
            dispatch(setPromptlistAction(prompts.filter(pt => pt._id !== id)))
            setPromptList((prev) => prev.filter(pt => pt._id !== id));
        } catch (error) {
            console.error('error: ', error);
        }
    }

    const updatePromptContain = async (payload, closeModal, id) => {
        try {
            const response = await commonApi({
                parameters: [id],
                action: MODULE_ACTIONS.UPDATE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.PROMPT,
                common: true,
                data: payload
            })
            Toast(response.message);
            await getList('',{});
        } catch (error) {
            console.error('error: ', error);
        } finally {
            closeModal();
        }
    }

    const getTabPromptList = async (searchValue: string, pagination: DefaultPaginationType = { offset: 0, limit: 10 }): Promise<BrainPromptType[]> => {
        try {
            if (!selectedWorkSpace) return [];
            setLoading(true);
            const response: APIResponseType<BrainPromptType[]> = await commonApi({
                action: MODULES.TAB_PROMPT_LIST,
                data: {
                    options: {
                        sort: {
                            createdAt: DEFAULT_SORT
                        },
                        limit: MAX_PAGE_RECORD,
                        offset: DEFAULT_OFFSET,
                        ...pagination
                    },
                    query: {
                        searchColumns: [SEARCH_AND_FILTER_OPTIONS.NORMAL_TITLE],
                        search: searchValue,
                        isCompleted: true,
                        workspaceId: selectedWorkSpace._id
                    },
                },
            })
            if (pagination.offset === 0) {
                setPromptList(response.data);
            } else {
                setPromptList((prev: BrainPromptType[]) => [...prev, ...response.data]);
            }
            setPaginator(response.paginator as PaginatorType);
            return response.data;
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setLoading(false);
        }
    }

    const favouritePrompt = async (payload, promptId) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.FAVORITE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.PROMPT,
                common: true,
                data: payload,
                parameters: [promptId]
            });
            if (!payload.favorite && showFavorites) {
                setPromptList((prevList) => prevList.filter(prompt => prompt._id !== promptId));
            }
            Toast(response.message);
        } catch (error) {
            console.log('error: ', error);
        }
    }

    return {
        createPrompt,
        getList,
        loading,
        prompts,
        addPromptLoading,
        archivePrompt,
        updatePromptContain,
        setAddPromptLoading,
        getTabPromptList,
        setLoading,
        paginator,
        favouritePrompt,
        showFavorites,
        setShowFavorites,
        promptList,
        setPromptList
    };
};

export default usePrompt;
