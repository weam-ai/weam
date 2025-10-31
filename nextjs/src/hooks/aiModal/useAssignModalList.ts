import { assignModelListAction } from '@/lib/slices/aimodel/assignmodelslice';
import { AI_MODAL_NAME, AI_MODEL_CODE, SEQUENCE_MODEL_LIST } from '@/utils/constant';
import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sortArrayByBotCodeWithDisabledLast } from '@/utils/helper';
import { RootState } from '@/lib/store';
import { fetchAiModal } from '@/actions/modals';
import { AiModalType } from '@/types/aimodels';
import { APIResponseType } from '@/types/common';
const disableModalsCodes = [] as const;


const useAssignModalList = () => {
    const userModals = useSelector((store:RootState) => store.assignmodel.list);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const userModalList = async () => {
        try {
            const response: APIResponseType<AiModalType[]> = await fetchAiModal();
            if (response.data.length) {
                const payload = response.data.map((m: AiModalType) => ( {
                    _id: m._id,
                    bot: m.bot,
                    company: m.company,
                    modelType: m.modelType,
                    name: m.name,
                    config: m.config,
                    isDisable: disableModalsCodes.includes(m.name as typeof disableModalsCodes[number]),
                    provider: m?.provider
                }))
                const orderedList = payload.reduce((acc: any, item: any) => {
                    const index = SEQUENCE_MODEL_LIST.indexOf(item.bot.code);
                    if (index !== -1) {
                        acc[index] = acc[index] || [];
                        acc[index].push(item);
                    }
                    return acc;
                }, []).flat();


                const modelNameMap = new Map<string, AiModalType>();
                orderedList.forEach((item: AiModalType) => {
                    modelNameMap.set(item.name, item);
                });

                // internal sequence
                const modelNames = Object.values(AI_MODAL_NAME)
                const filteredModelList = modelNames.reduce((acc: AiModalType[], current:string) => {
                    const findPushModel = modelNameMap.get(current)
                    if (findPushModel) {
                        acc.push(findPushModel)
                    }
                    return acc
                }, [])
                dispatch(assignModelListAction(filteredModelList));
            }
        } finally {
            setLoading(false);
        }
    }

    const fetchSocketModalList = async () => {
        try {
            const response: APIResponseType<AiModalType[]> = await fetchAiModal();
            if (response?.data?.length) {
                const payload = response.data.map((m: AiModalType) => ({
                    _id: m._id,
                    bot: m.bot,
                    company: m.company,
                    modelType: m.modelType,
                    name: m.name,
                    config: m.config,
                    provider: m?.provider,
                    isDisable: disableModalsCodes.includes(m.name as typeof disableModalsCodes[number])
                }));

                const orderedList = payload.reduce((acc: any, item: any) => {
                    const index = SEQUENCE_MODEL_LIST.indexOf(item.bot.code);
                    if (index !== -1) {
                        acc[index] = acc[index] || [];
                        acc[index].push(item);
                    }
                    return acc;
                }, []).flat();


                const modelNameMap = new Map<string, AiModalType>();
                orderedList.forEach((item: AiModalType) => {
                    modelNameMap.set(item.name, item);
                });

                // internal sequence
                const modelNames = Object.values(AI_MODAL_NAME);

                const filteredModelList = modelNames
                    .map((ModelValueCurr) => modelNameMap.get(ModelValueCurr))
                    .filter(model => model !== undefined);

                dispatch(assignModelListAction(filteredModelList));

            }
        } catch (error) {
            console.error('error: fetchSocketModalList', error);
        } finally {
            setLoading(false);
        }
    }

    const removeAssignModal = async (code) => {
        try {
            // const response= await commonApi({
            //    action: MODULE_ACTIONS.REMOVE,
            //    prefix: MODULE_ACTIONS.WEB_PREFIX,
            //    module: MODULES.USER_MODEL,
            //    common: true,
            //    data: {
            //        code: code
            //     }
            // }) 
            // const data = userModals.filter(value => value?.bot?.code !== selected?.code)    
            // dispatch(assignModelListAction(data));   
            // Toast(response.message); 
        } catch (error) {
            console.log('error: ', error);
        }
    }

    const restrictWithoutOpenAIKey = useCallback((showToast = true) => {
        // const openAIKey = userModals.some(el => el.bot.code === AI_MODEL_CODE.OPEN_AI);
        // if (!openAIKey) {
        //     if (showToast) {
        //         Toast('OpenAI API Key Required', 'error');
        //     }
        //     return true;
        // }
        return false;
    }, [userModals]);

    const assignServerActionModal = async (data: AiModalType[]) => {
        if (data.length) {
            const payload = data.map(m => ( {
                _id: m._id,
                bot: m.bot,
                company: m.company,
                modelType: m.modelType,
                name: m.name,
                config: m.config
            }))
            const groupedByCompany = sortArrayByBotCodeWithDisabledLast(payload);
            dispatch(assignModelListAction(groupedByCompany));
        }
    }

    return {
        userModals,
        userModalList,
        removeAssignModal,
        loading,
        fetchSocketModalList,
        restrictWithoutOpenAIKey,
        assignServerActionModal
    }
}

export default useAssignModalList