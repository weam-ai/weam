'use client'

import SearchIcon from '@/icons/Search';
import React, { useState, useEffect } from 'react';
import CustomBotAction from '@/actions/CustomTemplateAction';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import CustomTemplateSetting from './CustomTemplateSetting';
import ViewCustomBot from './ViewCustomBot';
import { truncateText } from '@/utils/common';
import defaultCustomGptImage from '../../../public/defaultgpt.jpg';
import Image from 'next/image';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const CustomBotList = ({ defaultbots }) => {
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState();
    const [botrecords, setBotRecords] = useState(defaultbots);
    let imageSrc = '';

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    useEffect(() => {
        if (search != undefined) {
            setLoading(true);
            const handler = setTimeout(() => {
                fetchBots();
            }, 500);

            return () => {
                clearTimeout(handler);
            };
        }
    }, [search]);

    const fetchBots = async () => {
        try {
            const res = await CustomBotAction(search);
            setBotRecords(res);
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
                    placeholder={'Search Agents'}
                    onChange={handleSearchChange}
                />
                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                    <SearchIcon className="w-4 h-[17px] fill-b7" />
                </span>
            </div>
            {loading ? <ThreeDotLoader /> : ''}
            {!loading &&
                <div className="mt-7 w-full px-2 overflow-y-auto pb-5 lg:pb-0 lg:h-[calc(100vh-240px)]">
                    <div className="grid lg:grid-cols-2 gap-4" >
                           { botrecords?.map((bot) => {
                                imageSrc = bot?.charimg ? bot.charimg : defaultCustomGptImage;
                                //console.log('Bot _id:', bot?._id, 'charimg:', bot?.charimg, 'imageSrc:', imageSrc);
                                return (
                                <div key={bot?._id} className="border px-5 py-3 rounded-lg hover:bg-b12 transition duration-150 ease-in-out group">
                                    <div className="flex">
                                        <div className="w-12 h-12 mr-3">
                                            <Image
                                                src={imageSrc}
                                                width={48}
                                                height={48}
                                                className="w-12 object-contain rounded-md"
                                                alt={bot?.charimg ? "Bot Image" : "Default GPT"}
                                            />
                                        </div>
                                        <div className="ml-auto flex items-center">
                                            <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className='flex items-center'>
                                                    <CustomTemplateSetting bot={bot} type={'bot'} DialogTitle="agent" mykey={bot?._id} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                <p className='text-font-14 border-none'>Move to Brain</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className='flex items-center'>
                                                    <ViewCustomBot bot={bot} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                <p className='text-font-14 border-none'>View Agent</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            </TooltipProvider>
                                            
                                        </div>
                                    </div>
                                    <h4 className="text-font-15 font-semibold mb-1 mt-2">
                                        {bot?.title}
                                    </h4>
                                    <p className="text-font-14 text-b6 ">
                                        {truncateText(bot?.systemPrompt, 200)}
                                    </p>
                                </div>
                                );
                            }) }
                        
                    </div>
                </div>
            }
        </>
    );
};

export default CustomBotList;
