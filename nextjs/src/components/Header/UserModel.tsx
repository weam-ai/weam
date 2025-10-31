'use client';

import { useEffect, useState, memo } from 'react';
import useAssignModalList from '@/hooks/aiModal/useAssignModalList';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedAIModal } from '@/lib/slices/aimodel/assignmodelslice';
import { isEmptyObject, modelNameConvert } from '@/utils/common';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { AiModalType } from '@/types/aimodels';
import { RootState } from '@/lib/store';
import ChatTitleBar from './ChatTitleBar';
import UserModalPopOver from './UserModalPopOver';
import { AI_MODEL_CODE } from '@/utils/constant';
import routes from '@/utils/routes';

const UserModel = () => {
    const [open, setOpen] = useState(false);
    const { userModals, fetchSocketModalList, loading } = useAssignModalList();
    const dispatch = useDispatch();
    const chatTitle = useSelector((store: RootState) => store.conversation.chatTitle);
    const lastConversationModal = useSelector((store: RootState) => store.conversation.lastConversation);
    const selectedAIModal = useSelector((store: RootState) => store.assignmodel.selectedModal);
    const queryParams = useSearchParams();
    const model = queryParams.get('model');
    const b = queryParams.get('b');
    const agent = queryParams.get('agent');
    const pathname = usePathname();
    const router = useRouter();
    
    useEffect(() => {
        if (!userModals || !userModals.length) return;
        if (lastConversationModal?.responseModel) {
            const selectedModal = userModals.find(el => el.name === lastConversationModal.responseModel);
             if(isEmptyObject(selectedAIModal)){
                const defaultModel = userModals.find(el => el.name === AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED);
                if (defaultModel) {
                    dispatch(setSelectedAIModal(defaultModel));
                }
            }else{
                dispatch(setSelectedAIModal(selectedModal));
            }
        }
    }, [lastConversationModal])

    useEffect(() => {
        fetchSocketModalList();
    }, [])

    const handleModelChange = (model: AiModalType) => {
        setOpen(false);
        if (agent) return;
        const modelName = modelNameConvert(model.bot.code, model.name);
        history.pushState(null, '', `${pathname}?b=${b}&model=${modelName}`);
        dispatch(setSelectedAIModal(model));
    };
    
    // Don't render anything while loading
    if (loading) {
        return null;
    }

    return (
        <>
            {userModals.length > 0 && model ? (
                <div className="header-left flex ml-0 items-center space-x-3">
                    <div className="relative">
                        <UserModalPopOver open={open} setOpen={setOpen} selectedAIModal={selectedAIModal} handleModelChange={handleModelChange} userModals={userModals} />
                    </div>
                    <ChatTitleBar chatTitle={chatTitle} />
                </div>
            ) : userModals.length === 0 ? (
                    <div className="top-header flex md:h-[68px] min-h-[68px] md:border-b-0 border-b border-b10 items-center justify-center lg:justify-between py-2 lg:pl-[15px] pl-[50px] pr-[15px]">
                      <button
                        // disabled={addChatLoading}
                        onClick={() => {
                          router.push(routes.Settingconfig);
                        }}
                        className="flex sm:justify-center sm:w-44 gap-x-2 text-font-14 font-medium border px-2 sm:px-3 py-2 group rounded-md hover:bg-black hover:text-white border-b-4 hover:border-b-b4 transition-all duration-200"
                      >
                        <span className="text-font-14 font-medium w-5 h-5 leading-4 rounded-full border border-b5 group-hover:border-b10 flex items-center justify-center">
                          +
                        </span>
                        <span className="hidden sm:inline">Add your API key</span>
                        <span className="sm:hidden">Add API key</span>
                      </button>
                      <ChatTitleBar chatTitle={chatTitle} />
                    </div>
                ) : null
            }
        </>
    );
};

export default memo(UserModel);