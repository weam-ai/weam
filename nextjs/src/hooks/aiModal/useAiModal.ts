import commonApi from '@/api';
import { cacheModalList } from '@/lib/slices/aimodel/aimodel';
import { defaultModalKeys } from '@/schema/usermodal';
import { IGNORE_API_DATAKEY, MODULES, MODULE_ACTIONS, SEARCH_AND_FILTER_OPTIONS } from '@/utils/constant';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

const useAiModal = () => {
    const dispatch = useDispatch();
    const cacheModal = useSelector((store:any) => store.aiModal.list);
    const [loading, setLoading] = useState(false);

    const { register, setValue, handleSubmit, formState: { errors }, watch } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        resolver: yupResolver(defaultModalKeys)
    })

    const modalList = async () => {
        try {
            // if (cacheModal.length) return cacheModal;
            const response = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.ADMIN_PREFIX,
                module: MODULES.MODEL,
                common: true,
                data: {
                    options: {
                        ...IGNORE_API_DATAKEY,
                        sort: { seq: 1 }
                    }
                }
            });
            const sequence = ['OPEN_AI', 'GEMINI', 'ANTHROPIC', 'PERPLEXITY', 'DEEPSEEK', 'OLLAMA', 'LLAMA4'];
            
            const orderedList = response.data.reduce((acc:any, item:any) => {
                const index = sequence.indexOf(item.bot.code);
                if (index !== -1) {
                    acc[index] = acc[index] || [];
                    acc[index].push(item);
                }
                return acc;
            }, []).flat();
            dispatch(cacheModalList(orderedList));
            
        } catch (error) {
            console.log('error: ', error);
        } finally {
            setLoading(false);
        }
    };

    return {
        modalList,
        register,
        setValue,
        handleSubmit,
        errors,
        watch,
        cacheModal,
        loading
    };
};

export default useAiModal;
