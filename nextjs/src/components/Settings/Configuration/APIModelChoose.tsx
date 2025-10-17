'use client';
import { checkApiKeyAction, deleteAiModal } from '@/actions/modals';
import AlertDialogConfirmation from '@/components/AlertDialogConfirmation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import useModal from '@/hooks/common/useModal';
import useServerAction from '@/hooks/common/useServerActions';
import RemoveIcon from '@/icons/RemoveIcon';
import { ModelKeysSchemaType, setModalAPIKeys } from '@/schema/usermodal';
import { AI_MODEL_CODE, MODAL_NAME_CONVERSION } from '@/utils/constant';
import Toast from '@/utils/toast';
import CommonInput from '@/widgets/CommonInput';
import Label from '@/widgets/Label';
import ValidationError from '@/widgets/ValidationError';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo, useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import OllamaModelProvider from '@/components/AiModel/OllamaModelProvider';

type APIModelChooseProps = {
    modelCode: string;
}

const APIModelChoose = () => {
    const modelOptions = useMemo(() => {
        const options = [
            {
                value: AI_MODEL_CODE.OPEN_AI,
                label: MODAL_NAME_CONVERSION.OPEN_AI,
            },
            {
                value: AI_MODEL_CODE.ANTHROPIC,
                label: MODAL_NAME_CONVERSION.ANTHROPIC,
            },
            {
                value: AI_MODEL_CODE.GEMINI,
                label: MODAL_NAME_CONVERSION.GEMINI,
            },
            {
                value: AI_MODEL_CODE.PERPLEXITY,
                label: MODAL_NAME_CONVERSION.PERPLEXITY,
            },
            {
                value: AI_MODEL_CODE.OPEN_ROUTER,
                label: MODAL_NAME_CONVERSION.OPEN_ROUTER,
            },
            {
                value: AI_MODEL_CODE.OLLAMA,
                label: MODAL_NAME_CONVERSION.OLLAMA || 'Ollama',
            },
        ];
        return options;
    }, []);
    const { register, handleSubmit, formState: { errors }, setValue, control, watch } = useForm<ModelKeysSchemaType>({
        resolver: yupResolver(setModalAPIKeys),
        defaultValues: { key: '', model: null },
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
    });

    const [checkApiKey, pending] = useServerAction(checkApiKeyAction);
    const selectedModel = watch('model');
    
    // Debug: Log when selectedModel changes
    // useEffect(() => {
    //     console.log('Selected model changed:', selectedModel);
    //     console.log('Is Ollama selected?', selectedModel?.value === AI_MODEL_CODE.OLLAMA);
    // }, [selectedModel]);

    const handleSave = useCallback(async (data: ModelKeysSchemaType) => {
        const response = await checkApiKey(data.model.value, data.key);
        Toast(response.message);
        setValue('model', null);
        setValue('key', '');
    }, []);

    useEffect(() => {
        setValue('key', '');
    }, [selectedModel?.value]);

    return (
        <>
            <div className="relative mb-4">
                <Label title={'Add Model'} htmlFor={'selectModel'} />
                <Controller
                    control={control}
                    name="model"
                    render={({ field }) => (
                        <Select
                            {...field}
                            options={modelOptions}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            id="selectModel"
                            menuPlacement="auto"
                        />
                    )}
                />
            </div>
            {selectedModel && selectedModel.value !== AI_MODEL_CODE.OLLAMA && (
                <div className="relative mb-4 api-key-input">
                    <Label title={'API Key'} htmlFor={'api-input'} />
                    <CommonInput
                        type="password"
                        className="default-form-input"
                        id="api-input"
                        placeholder="Enter your API key"
                        {...register('key')}
                    />
                    <ValidationError errors={errors} field={'key'} />
                    <button className="btn btn-black mt-4" onClick={handleSubmit(handleSave)} disabled={pending}>
                        Save
                    </button>
                </div>
            )}

            {selectedModel && selectedModel.value === AI_MODEL_CODE.OLLAMA && (
                <div className="relative mb-4">
                    {/* Ollama does not require API key; just configure connection */}
                    {/* <p>Debug: Rendering OllamaModelProvider</p> */}
                    <OllamaModelProvider configs={{}} />
                </div>
            )}
        </>
    )
}

export const ModelDeleteButton = ({ modelCode }: APIModelChooseProps) => {
    const { isOpen, openModal, closeModal } = useModal();
    const [deleteModel, pending] = useServerAction(deleteAiModal);
    const handleDeleteModel = useCallback(async () => {
        const response = await deleteModel(modelCode);
        Toast(response.message);
        closeModal();
    }, [modelCode]);

    const handleTriggerTrash = useCallback(() => {
        openModal();
    }, [openModal]);
    return (
        <>
            <TooltipProvider
                delayDuration={0}
                skipDelayDuration={0}
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <RemoveIcon
                            width={18}
                            height={18}
                            className={
                                'w-[15px] cursor-pointer ml-auto h-[18px] object-contain fill-b7 hover:fill-b2'
                            }
                            onClick={handleTriggerTrash}
                        />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" >
                        <p>Delete Model</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <AlertDialogConfirmation
                open={isOpen}
                closeModal={closeModal}
                description={'Are you sure you want to delete?'}
                btntext={'Delete'}
                btnclassName={'btn-red'}
                handleDelete={handleDeleteModel}
                loading={pending}
            />
        </>
    )
}

export default APIModelChoose