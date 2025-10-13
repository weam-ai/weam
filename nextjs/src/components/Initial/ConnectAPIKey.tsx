'use client';

import { useDispatch } from 'react-redux';
import Link from 'next/link';
import { setAddAiModalAction } from '@/lib/slices/modalSlice';
import MessagingIcon from '@/icons/MessagingIcon';
import { useSelector } from 'react-redux';
import React, { useEffect, useState } from 'react';
import {
    DEFAULT_SORT,
    MODULE_ACTIONS,
    MODULES,
    ROLE_TYPE,
    SEARCH_AND_FILTER_OPTIONS,
} from '@/utils/constant';
import { getCurrentUser } from '@/utils/handleAuth';
import commonApi from '@/api';
import { assignModelListAction } from '@/lib/slices/aimodel/assignmodelslice';
import LockIcon from '@/icons/Lock';
import { decryptedPersist, encryptedPersist } from '@/utils/helper';
import { CONFIG_API } from '@/utils/localstorage';

const ConnectButton = () => {
    const dispatch = useDispatch();

    const [showConfigAPICard, setShowConfigAPICard] = useState(false);
    const [isLoadingConfigAPICard, setIsLoadingConfigAPICard] = useState();

    const addedAPIKey=decryptedPersist(CONFIG_API)

    const handleClick = () => {
        dispatch(setAddAiModalAction(true));
    };

    const user = getCurrentUser();
    useEffect(() => {
        
        if(!addedAPIKey){
            const companyId =
            user.roleCode === ROLE_TYPE.COMPANY
                ? user.company.id
                : user.invitedBy;

        const fetchData = async () => {
            setIsLoadingConfigAPICard(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.USER_MODEL,
                common: true,
                data: {
                    options: {
                        pagination: false,
                        sort: { createdAt: DEFAULT_SORT },
                        select: 'bot company name modelType createdAt config',
                    },
                    query: {
                        'company.id': companyId,
                        modelType: {
                            $ne: SEARCH_AND_FILTER_OPTIONS.EMBEDDING_MODAL_TYPE,
                        },
                        searchColumns: [
                            SEARCH_AND_FILTER_OPTIONS.USER_MODEL_NAME,
                            SEARCH_AND_FILTER_OPTIONS.USER_MODEL_TITLE,
                        ],
                    },
                },
            });
            const payload = response.data.map((m) => ({
                _id: m._id,
                bot: m.bot,
                company: m.company,
                modelType: m.modelType,
                name: m.name,
                config: m.config,
            }));

            setIsLoadingConfigAPICard(false);

            if (payload.length == 0) {
                setShowConfigAPICard(true);
            }else{
                encryptedPersist(true,CONFIG_API)
            }
            dispatch(assignModelListAction(payload));
        }

        fetchData();
        };

    }, []);

    return (user.roleCode === ROLE_TYPE.COMPANY || user.roleCode === ROLE_TYPE.COMPANY_MANAGER) && !addedAPIKey && (isLoadingConfigAPICard ? (
        <div className="relative rounded-10 bg-b12 p-5 animate-pulse">
        <div className="bg-gray-300 rounded-full h-8 w-14 mb-4"></div> {/* Placeholder for icon */}
        <div className="bg-gray-300 h-5 w-48 rounded mb-2"></div>  {/* Placeholder for h5 title */}
        <div className="bg-gray-300 h-4 w-full rounded mb-4"></div> {/* Placeholder for paragraph */}
        <div className="bg-gray-300 h-10 w-32 rounded ml-auto"></div> {/* Placeholder for button */}
      </div>
    ) : showConfigAPICard && (
        <div className="relative rounded-10 bg-b12 p-5">
            {
                <LockIcon
                    width={60}
                    height={30}
                    className="size-[30px] object-contain fill-b2 mb-2.5"
                />
            }
            <h5 className="text-font-16 font-semibold text-b2 mb-1.5">
                {'Configure Your API Key'}
            </h5>
            <p className="text-font-16 text-b5">
                {
                    'To use the chat features, please connect your OpenAI API Key. This will ensure smooth access to OpenAI’s models.'
                }
            </p>
            <div className="flex justify-end mt-6">
                <Link href="/settings/general?openAccordion=true">
                    <div
                        onClick={handleClick}
                        className="p-3 bg-black text-white font-bold rounded inline-block"
                    >
                        Connect API Key
                    </div>
                </Link>
            </div>
        </div>
    ))
};

export default ConnectButton;
