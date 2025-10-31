'use client';
import React, { useState, useMemo } from 'react';
import {
    isEmptyObject
} from '@/utils/common';
import {
    AI_MODEL_CODE,
    ROLE_TYPE,
} from '@/utils/constant';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedAIModal } from '@/lib/slices/aimodel/assignmodelslice';
import { RootState } from '@/lib/store';
import { useSearchParams, useRouter } from 'next/navigation';
import { modelNameConvert } from '@/utils/common';
import { AiModalType } from '@/types/aimodels';
import { usePathname } from 'next/navigation';
import UserModalPopOver from './UserModalPopOver';
import routes from '@/utils/routes';
import { getCurrentUser } from '@/utils/handleAuth';

export const useDefaultModel = (aiModals) => {
    const selectedAIModal = useSelector(
        (store: RootState) => store.assignmodel.selectedModal
    );
    const findModel = aiModals.find(
        (el) => el.name === AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED
    );
    const selectedModel = isEmptyObject(selectedAIModal)
        ? findModel
            ? findModel
            : aiModals[0]
        : selectedAIModal;
    const selectedModelName = selectedModel.name;
    const selectedModelCode = selectedModel.bot.code;
    return { selectedModelName, selectedModelCode, selectedModel };
};

const HomeAiModel = ({ aiModals }) => {
    const [open, setOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const dispatch = useDispatch();
    const queryParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const agent = queryParams.get('agent');
    const b = queryParams.get('b');
    const model = queryParams.get('model');
    const user = getCurrentUser();
    
    const selectedAIModal = useSelector(
        (store: RootState) => store.assignmodel.selectedModal
    );
    
    // Set hydrated state after component mounts
    React.useEffect(() => {
        setIsHydrated(true);
    }, []);
    
    const handleModelChange = (model: AiModalType) => {
        setOpen(false);
        if (agent) return;
        const modelName = modelNameConvert(model.bot.code, model.name);
        history.pushState(null, '', `${pathname}?b=${b}&model=${modelName}`);
        dispatch(setSelectedAIModal(model));
    };

    // Don't render anything until hydrated and aiModals is ready
    if (!isHydrated || aiModals === undefined) {
        return null;
    }

    return (
      <>
        {aiModals?.length > 0 && model ? (
          <div className="top-header md:h-[68px] min-h-[68px] flex md:border-b-0 border-b border-b10  items-center md:justify-between py-2 lg:pl-[15px] pl-[50px] pr-[15px]">
            <div className="flex items-center">
              <UserModalPopOver
                open={open}
                setOpen={setOpen}
                selectedAIModal={selectedAIModal}
                handleModelChange={handleModelChange}
                userModals={aiModals}
              />
            </div>
          </div>
        ) : aiModals?.length === 0 && user?.roleCode !== ROLE_TYPE.USER ? (
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
            </div>
          ) : null
        }
      </>
    );
};

export default HomeAiModel;
