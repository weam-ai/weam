'use client';
import SearchIcon from '@/icons/Search';
import React, { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookMarkIcon, { ActiveBookMark } from '@/icons/Bookmark';
import ImportIcon from '@/icons/ImportIcon';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { BrainListType } from '@/types/brain';
import { decodedObjectId, encodedObjectId, generateObjectId } from '@/utils/helper';
import routes from '@/utils/routes';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import ImportChat from '@/components/Chat/ImportChat';
import { AI_MODEL_CODE } from '@/utils/constant';
import { setLastConversationDataAction } from '@/lib/slices/aimodel/conversation';
import { chatMemberListAction } from '@/lib/slices/chat/chatSlice';


const SearchBar = ({ placeholder, btnname, searchValue, setSearchValue, setShowFavorites, showFavorites }) => {
    const searchParams = useSearchParams();

    const b = searchParams.get('b');
    const router = useRouter();
    const dispatch = useDispatch();
    const brainData = useSelector((store: RootState) => store.brain.combined);
    const [showImportChat, setShowImportChat] = useState(false);

    const handleButtonClick = useCallback(() => {
        setShowImportChat(true);
    }, [showImportChat]);
   
    useEffect(() => {
        setSearchValue('');
    }, [b]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value);

    const showFavoriteRecords = (flag) => {
        setShowFavorites(flag);        
    };

    const handleNewChatClick = () => {
        const brain = brainData.find((brain: BrainListType) => brain._id === decodedObjectId(b));
        const encodedId = encodedObjectId(brain?._id);
        const objectId = generateObjectId();
        dispatch(setLastConversationDataAction({}));
        dispatch(chatMemberListAction([]));
        router.prefetch(`${routes.chat}/${objectId}?b=${encodedId}`);
        router.push(`/?b=${encodedId}&model=${AI_MODEL_CODE.DEFAULT_OPENAI_SELECTED}`);
    };

    return (
        <div className="flex flex-wrap items-center gap-2.5 max-w-[950px] w-full mx-auto my-5 px-5">
            <div className="search-docs relative md:flex-1 max-md:w-full">
                <input
                    type="text"
                    className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-10"
                    placeholder={placeholder}
                    onChange={handleChange}
                    value={searchValue}
                />
                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                    <SearchIcon className="w-4 h-[17px] fill-b7" />
                </span>
            </div>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => showFavoriteRecords(showFavorites ? false : true)}
                            className={`-ms-px inline-block rounded-custom btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 ${
                                showFavorites ? 'active' : ''
                            }`}
                        >
                            {showFavorites ? (
                                <ActiveBookMark width={14} height={14} className="w-[15px] h-auto fill-orange object-contain mx-auto" />
                            ) : (
                                <BookMarkIcon width={14} height={14} className="w-[15px] h-auto fill-b6 object-contain mx-auto" />
                            )}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="border-none">
                        <p className="text-font-14">Favourite chats</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <button
                className="btn btn-outline-gray font-medium"
                onClick={handleNewChatClick}
            >
                <span className='mr-1'>+</span> 
                {btnname}
            </button>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="btn btn-outline-gray font-medium flex items-center"
                            onClick={handleButtonClick}
                        >
                            <ImportIcon
                                width={18}
                                height={18}
                                className={'w-4 h-auto mr-2 fill-white'}
                            />
                            <span>Import Chats</span>
                        </button>                        
                    </TooltipTrigger>
                    <TooltipContent className="border-none">
                        <p className="text-font-14">{`Import your chats from ChatGPT/Anthropic`}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {showImportChat && (
                <ImportChat
                    onClose={() => setShowImportChat(false)}
                    showImportChat={showImportChat}
                    setShowImportChat={setShowImportChat}
                />
            )}
        </div>
    );
};

export default SearchBar;
