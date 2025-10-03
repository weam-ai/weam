'use client';
import React, { useEffect, useState } from 'react';
import Overview from '@/components/CustomGpt/Overview';
import { MODULES, MODULE_ACTIONS } from '@/utils/constant';
import commonApi from '@/api';
import { useParams } from 'next/navigation';
import Loader from '@/components/ui/Loader';
import { LINK } from '@/config/config';
import { getDisplayModelName } from '@/utils/helper';

const EditGptForm = () => {
    const params = useParams();
    const [loadingApi, setLoadingApi] = useState(false);

    const [customGptData, setCustomGptData] = useState({
        id: null,
        coverImg: null,
        previewCoverImg: null,
        title: '',
        systemPrompt: '',
        type: 'agent',
        description: '',
        Agents: [],
        // mcpTools: [],
        responseModel: null,
        maxItr: 0,
        itrTimeDuration: undefined,
        doc: [],
        imageEnable: false,
        charimg: ''
    });

    const fetchCustomGptDetailsById = async () => {
        setLoadingApi(true);
        const response = await commonApi({
            action: MODULE_ACTIONS.GET,
            prefix: MODULE_ACTIONS.WEB_PREFIX,
            module: MODULES.CUSTOM_GPT,
            common: true,
            parameters: [params.id as string]
        });
        const data = response.data;
        const alldoc = data.doc.map((item: any) => {
            return {
                ...item,
                type: item.mime_type
            };
        });
        
        setCustomGptData({
            id: data._id,
            coverImg: data?.coverImg?.uri ? {} : (data?.charimg ? {
                isCharacter: true,
                characterImage: data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`,
                characterId: data.charimg.split('/').pop()?.split('.')[0] || 'character',
                uri: data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`,
                name: `character-${data.charimg.split('/').pop()?.split('.')[0] || 'character'}.jpg`,
                mime_type: 'image/jpeg',
                file_size: 0
            } : null),
            previewCoverImg: data?.coverImg?.uri ? `${LINK.AWS_S3_URL}${data.coverImg.uri}` : (data?.charimg ? (data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`) : null),
            title: data.title,
            systemPrompt: data.systemPrompt,
            type: data.type || 'agent',
            description: data.description || '',
            Agents: data.Agents || [],
            // mcpTools: data.mcpTools || [],
            responseModel: {
                ...data.responseModel,
                value: getDisplayModelName(data.responseModel.name),
                label: getDisplayModelName(data.responseModel.name),
            },
            maxItr: data.maxItr,
            itrTimeDuration: data.itrTimeDuration,
            doc: alldoc,
            imageEnable: data?.imageEnable || false,
            charimg: data?.charimg ? (data.charimg.startsWith('/') ? data.charimg : `/${data.charimg}`) : ''
        })
        setLoadingApi(false);
    }

    useEffect(() => {
        fetchCustomGptDetailsById();
    }, [])


    return (
        <div className="flex flex-col h-full w-full md:py-[10px] px-2 overflow-y-auto">
            <div className='flex w-full md:flex-row flex-col max-w-[950px] mx-auto md:px-5 px-2'>
                <div className='gpt-detail flex-1 md:ml-0 md:p-5 md:border md:rounded-lg'>
                    {loadingApi ?
                        <Loader /> :
                        <Overview customGptData={customGptData} setCustomGptData={setCustomGptData} />
                    }
                </div>
            </div>
        </div>
    );
};

export default EditGptForm;
