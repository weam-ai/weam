'use client'

import SearchIcon from '@/icons/Search';
import React, { useState, useEffect } from 'react';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import CustomTemplateSetting from './CustomTemplateSetting';
import ViewPrompt from './ViewPrompt';
import CustomPromptTag from './CustomPromptTag';
import CustomPromptAction from '@/actions/CustomPromptAction';
import { truncateText } from '@/utils/common';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const CustomPromptList = ({ defaultprompts }) => {
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState();
    const [selectedTag, setSelectedTag] = useState();
    const [promptsrecords, setPromptsRecords] = useState(defaultprompts);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    useEffect(() => {
        if (search != undefined) {
            setLoading(true);
            const handler = setTimeout(() => {
                fetchPrompts();
            }, 500);

            return () => {
                clearTimeout(handler);
            };
        }
    }, [search]);

    useEffect(() => {
        if (selectedTag != undefined) {
            setLoading(true);
            fetchPrompts();           
        }                 
    }, [selectedTag]);

    const fetchPrompts = async () => {
        try {
            const res = await CustomPromptAction(search, selectedTag);
            setPromptsRecords(res);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching bots: ", err);
        }
    };

    return (
        <>
            <div className="relative flex-1 mb-3 px-2 lg:px-0">
                <input
                    type="text"
                    className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-10"
                    id="searchDocs"
                    placeholder={'Search Prompts'}
                    onChange={handleSearchChange}
                />
                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                    <SearchIcon className="w-4 h-[17px] fill-b7" />
                </span>
            </div>
            <CustomPromptTag setSelectedTag={setSelectedTag} selectedTag={selectedTag} />
            {loading ? <ThreeDotLoader /> : ''}
            {!loading &&
                <div className="mt-7 w-full px-2 overflow-y-auto pb-5 lg:pb-0 lg:h-[calc(100vh-290px)]">
                    <div className="grid lg:grid-cols-2 gap-4 ">
                        {promptsrecords?.map((prompt) => (
                            <div key={prompt?._id} className="border p-5 rounded-lg hover:bg-b12 transition duration-150 ease-in-out group">
                                <div className="flex justify-between">
                                    {
                                        prompt.tags.map((tag, index) => (
                                            <div
                                                key={index}
                                                className="inline-block whitespace-nowrap rounded-full bg-b11 text-b2 group-hover:bg-b10 group-hover:text-b2 mb-1 px-3 py-1.5 text-center text-font-12 font-normal leading-none mr-1"
                                            >
                                                {tag}
                                            </div>
                                        ))
                                    }
                                    <div className="ml-auto flex">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className='flex items-center'>
                                                    <CustomTemplateSetting prompt={prompt} type={'prompt'} DialogTitle="prompt" key={prompt?._id} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                <p className='text-font-14 border-none'>Move to Brain</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className='flex items-center'>
                                                    <ViewPrompt prompt={prompt} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                <p className='text-font-14 border-none'>View Prompt</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        
                                        
                                    </div>
                                </div>
                                <h4 className="text-font-15 font-medium mb-2">
                                    {prompt?.title}
                                </h4>
                                <p className="text-font-14 text-b6 font-normal">
                                    {truncateText(prompt?.content, 200)}
                                </p>
                            </div>
                        )) }                        
                    </div>
                </div>
            }
        </>
    );
};

export default CustomPromptList;
