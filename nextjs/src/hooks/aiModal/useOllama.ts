import commonApi from '@/api';
import { assignModelListAction } from '@/lib/slices/aimodel/assignmodelslice';
import { ollamaKeys } from '@/schema/usermodal'
import { MODULE_ACTIONS } from '@/utils/constant';
import Toast from '@/utils/toast';
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react';
import { useForm } from 'react-hook-form'
import { useSelector, useDispatch } from 'react-redux';

const defaultValues: any = {
    baseUrl: 'http://localhost:11434',
    key: undefined,
};

const useOllama = () => {
    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        mode: 'onSubmit',
        resolver: yupResolver(ollamaKeys),
        defaultValues
    })
    const [loading, setLoading] = useState(false);
    const botinfo = useSelector((store: any) => store.aiModal.selectedValue);
    const assignmodalList = useSelector((store: any) => store.assignmodel.list);
    const dispatch = useDispatch();

    const ollamaHealthCheck = async (payload) => {
        try {
            setLoading(true);
            const data = {
                baseUrl: payload?.baseUrl || 'http://localhost:11434',
                apiKey: payload?.key,
                bot: {
                    title: botinfo.value,
                    code: botinfo.code,
                    id: botinfo.id,
                },
            }
            const response = await commonApi({
                action: MODULE_ACTIONS.OLLAMA_HEALTH,
                data
            })
            
            Toast(response.message);
            if (response.data === true) return;
            else dispatch(assignModelListAction([...assignmodalList, ...response.data]))
        } finally {
            setLoading(false);
        }
    }

    return {
        register,
        handleSubmit,
        errors,
        setValue,
        ollamaHealthCheck,
        loading,
    } 
}

export default useOllama;
