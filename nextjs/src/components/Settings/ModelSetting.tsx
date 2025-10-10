'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Select from 'react-select';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AddModal from '@/icons/AddModal';
import Label from '@/widgets/Label';
import PlusRound from '@/icons/PlusRound';
import SuccessAlert from '@/components/AlertMessages/SuccessAlert';
import WarningAlert from '@/components/AlertMessages/WarningAlert';
import AzureOpenAIModelProvider from '@/components/AiModel/AzureOpenAIModelProvider';
import GetApiKey from '@/components/AiModel/GetApiKey';
import AnthropicModelProvider from '@/components/AiModel/AnthropicModelProvider';
import OpenAiAPIKeysModelProvider from '@/components/AiModel/OpenAiAPIKeysModelProvider';
import AnyscaleModelProvider from '@/components/AiModel/AnyscaleModelProvider';
import HuggingFaceModelProvider from '@/components/AiModel/HuggingFaceModelProvider';
import GooglePalmAPIkeyModelProvider from '@/components/AiModel/GooglePalmAPIkeyModelProvider';
import OllamaModelProvider from '@/components/AiModel/OllamaModelProvider';
import SearchIcon from '@/icons/Search';
import useAiModal from '@/hooks/aiModal/useAiModal';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import {
    setAddTitle,
    setInputStatus,
    setUpdateTitle,
    setSelectedValue,
    setClearTitle,
    setVisibleAction,
    setMessageAction,
} from '@/lib/slices/aimodel/aimodel';
import { customSelectStyles } from '@/utils/customStyles';
import useAssignModalList from '@/hooks/aiModal/useAssignModalList';
import { AI_MODEL_CODE, SUB_MODEL_TYPE } from '@/utils/constant';
import { setAddAiModalAction } from '@/lib/slices/modalSlice';
import Close from '@/icons/Close';
import { getModelImageByCode } from '@/utils/common';
import { CONFIG_API, LocalStorage } from '@/utils/localstorage';
import { TabsContent } from '@radix-ui/react-tabs';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import { RootState } from '@/lib/store';
const AIModalList = ({ search }) => {
    const { userModalList, userModals, loading } = useAssignModalList();
    useEffect(() => {
        const fetchModal = () => {
            userModalList();
        };
        const timer = setTimeout(fetchModal, 1000);
        return () => clearTimeout(timer);
    }, [search]);
    return (
        <div className="mt-4 overflow-y-auto max-h-[500px] md:grid-cols-3 md:grid">
            {/* Item start */}
            {loading ? <ThreeDotLoader/> : userModals?.length > 0 ? (
                userModals?.reduce((acc, um) => {
                    if (!um?.isDisable) {
                        acc.push(
                            <div
                                className="group/item relative flex items-center py-4 px-5 border gap-2 m-1 rounded-md"
                                key={um?._id}
                            >
                                <Image
                                    src={getModelImageByCode(um?.bot?.code)}
                                    alt={um?.bot?.code}
                                    width={36}
                                    height={36}
                                    className="w-9 h-9 rounded-full object-cover "
                                />
                                <div className="flex-1 ms-1">
                                    <h5 className="text-font-14 font-semibold text-b2">
                                        {um?.name}
                                    </h5>
                                    <p className="text-font-12 font-normal text-b5">
                                        {um?.bot?.title}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return acc;
                }, [])
            ) : (
                <p className="flex justify-center mb-10 mt-10">
                    No Model Found
                </p>
            )}
        </div>
    );
};

export const AddNewModel = ({ isAddAiModel }) => {
    const { cacheModal, modalList } = useAiModal();
    const { removeAssignModal, userModals } = useAssignModalList();
    const [selected, setSelected] = useState('');
    const [apiKeyUpdated, setApiKeyUpdated] = useState(false);
    const [configs, setConfigs] = useState({});
    const [showCancelAPI,setShowCancelAPI]=useState(false)
    const keystatus = useSelector((store:any) => store.aiModal.inputKey);
    const updatetitle = useSelector((store:any) => store.aiModal.updatetitle);
    const cleartitle = useSelector((store:any) => store.aiModal.cleartitle);
    const message = useSelector((store:any) => store.aiModal.message);

    // TODO: remove unnecessary useSelector like clear title ,update title
    const dispatch = useDispatch();

    const handleClose = useCallback(() => {
        setSelected('');
        dispatch(setAddTitle(true));
        dispatch(setUpdateTitle(false));
        dispatch(setVisibleAction(true));
        dispatch(setInputStatus(false));
        dispatch(setClearTitle(false));
        dispatch(setMessageAction(false));
        dispatch(setAddAiModalAction(false));
    }, [dispatch]);

    const handleUpdate = 
        (e) => {
            if (e.target.innerText == 'Ok') {
                handleClose();
                removeAssignModal(selected?.code);
            } else {
                dispatch(setVisibleAction(true));
                dispatch(setUpdateTitle(true));
                dispatch(setInputStatus(false));
                dispatch(setMessageAction(false));
            }
    }

    const handleClear = useCallback(
        (e) => {
            if (e.target.innerText == 'Cancel') {
                dispatch(setUpdateTitle(true));
                dispatch(setMessageAction(false));
                dispatch(setClearTitle(false));
            } else {
                dispatch(setClearTitle(true));
                dispatch(setMessageAction(true));
            }
            LocalStorage.remove(CONFIG_API)
        },
        [dispatch]
    );

    const selectOption = useMemo(
        () =>
            cacheModal.map((m) => ({
                value: m.title,
                label:
                    SUB_MODEL_TYPE.includes(m.code) ? (
                        <p>{m.title}</p>
                    ) : (
                        <>
                        <div style={{display:"flex", justifyContent:"space-between"}}>
                            <span>{m.title}</span>
                            <span className="text-b2">
                                {' '}
                                Coming soon
                            </span>
                        </div>
                        </>
                    ),
                code: m.code,
                id: m._id,
                isDisabled: SUB_MODEL_TYPE.includes(m.code) ? false : true, 
            })),
        [cacheModal]
    );

    const handleSelected = useCallback(
        (e) => {
            setSelected(e);
            dispatch(setSelectedValue(e));
        },
        [dispatch]
    );

    useEffect(() => {
        modalList();
    }, []);

    useEffect(() => {
        const selectedUserModels = userModals
        .find(record => record.bot.code === selected.code);

        const configs=selectedUserModels?.config
        if(selected.code != ''){        
            setConfigs(configs);
            dispatch(setInputStatus(true));
        }

        setShowCancelAPI(!!(selectedUserModels && selectedUserModels?.bot?.code === selected?.code));

    }, [selected, apiKeyUpdated]);

    return (
        <Dialog open={isAddAiModel} onOpenChange={handleClose}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7">
                <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        {!updatetitle && !message && (
                            <>
                                <AddModal
                                    width={'24'}
                                    height={'24'}
                                    className={
                                        'w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top'
                                    }
                                />
                                {'Add New Model'}
                            </>
                        )}
                        {updatetitle && !message && 'Update API Key'}
                        {cleartitle && message && 'Clear API Keys?'}
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body h-full p-[30px] max-h-[70vh] min-h-[270px] overflow-y-auto">
                    {!cleartitle && (
                        <div className="relative mb-4">
                            <Label
                                title={'Model Provider'}
                                htmlFor={'modelProvider'}
                            />
                            <Select
                                options={selectOption}
                                styles={customSelectStyles}
                                menuPlacement="auto"
                                id="modelProvider"
                                className="react-select-container"
                                classNamePrefix="react-select"
                                onChange={handleSelected}
                                isOptionDisabled={(option:any)=>option.isDisabled}
                                isSearchable={false}
                            />
                        </div>
                    )}
                    {/* Alert Message start */}
                    {keystatus && !message && apiKeyUpdated && (
                        <SuccessAlert
                            className="my-4"
                            description={'API key is successfully configured!'}
                        />
                    )}
                    {cleartitle && (
                        <WarningAlert
                            className="my-4"
                            description={
                                "Are you sure you want to remove your API key? Without it, you won't be able to use the AI models."
                            }
                        />
                    )}
                    {/* Alert Message start */}
                    {!cleartitle && (
                        <>
                            {selected.code === AI_MODEL_CODE.OPEN_AI && (
                                <OpenAiAPIKeysModelProvider configs={configs} setApiKeyUpdated={setApiKeyUpdated} setShowCancelAPI={setShowCancelAPI} />
                            )}
                            {selected.code ===
                                AI_MODEL_CODE.AZURE_OPENAI_SERVICE && (
                                <AzureOpenAIModelProvider />
                            )}
                            {selected.code === AI_MODEL_CODE.ANTHROPIC && (
                                <AnthropicModelProvider configs={configs} />
                            )}
                            {selected.code === AI_MODEL_CODE.ANYSCALE && (
                                <AnyscaleModelProvider />
                            )}
                            {selected.code === AI_MODEL_CODE.HUGGING_FACE && (
                                <HuggingFaceModelProvider configs={configs} />
                            )}
                            {selected.code === AI_MODEL_CODE.GEMINI && (
                                <GooglePalmAPIkeyModelProvider configs={configs} />
                            )}
                            {selected.code === AI_MODEL_CODE.OLLAMA && (
                                <OllamaModelProvider configs={configs} />
                            )}
                            {selected && (
                                <GetApiKey
                                    name={`${selected.value} dashboard`}
                                    code={selected.code}
                                />
                            )}
                        </>
                    )}
                </div>
                <DialogFooter className="flex items-center justify-end gap-2.5 py-[30px] px-[30px]">
                    {cleartitle && (
                        <button
                            className="btn btn-outline-gray"
                            onClick={handleUpdate}                            
                        >
                            {cleartitle ? 'Ok' : 'Update API Key'}
                        </button>
                    )}
                    {keystatus && showCancelAPI && (
                        <button className="btn btn-black" onClick={handleClear}>
                            {cleartitle ? 'Cancel' : 'Clear API key'}
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ModelSetting = () => {
    const [searchValue, setSearchValue] = useState('');
    const dispatch = useDispatch();
    const handleOpen = () => dispatch(setAddAiModalAction(true));
    const isAddAiModel = useSelector((store:any) => store.modalSlice.addAiModel);

    const handleClose=()=>{
        setSearchValue("")
    }
    return (
        <TabsContent value="model-settings">
            <div className="relative mb-5 mt-5 w-auto">
                <input
                    type="text"
                    className="default-form-input !pl-10 !border-b10"
                    id="addMember"
                    placeholder="Search Models"
                    onChange={(e) => setSearchValue(e.target.value)}
                    value={searchValue}
                />
                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                    <SearchIcon className="w-4 h-[17px] fill-b7" />
                </span>
                <button className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2" onClick={handleClose}>
                    <Close className={"fill-gray-600 size-2"} />
                </button>
                
            </div>
             {/* Model List start */}
             <AIModalList search={searchValue} />
            {/* Model List End */}
            {/* <AddNewModel /> */}
            {/* <div className="p-5 flex items-center justify-center">
                <button
                    onClick={handleOpen}
                    className="btn btn-outline-gray cursor-pointer"
                >                    
                    + Add New Model
                </button>
            </div> */}
            {isAddAiModel && <AddNewModel isAddAiModel={isAddAiModel} />}
            {/* Add New Model End */}
        </TabsContent>
    );
};

export default ModelSetting;
