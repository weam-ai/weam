'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import GridIcon from '@/icons/GridIcon';
import BarIcon from '@/icons/BarIcon';
import SearchIcon from '@/icons/Search';
import AddNewPromptModal from '@/components/Prompts/AddNewPromptModal';
import PromptList from '@/components/Prompts/PromptList';
import usePrompt from '@/hooks/prompt/usePrompt';
import useSearch from '@/hooks/common/useSearch';
import { useSearchParams } from 'next/navigation';
import useModal from '@/hooks/common/useModal';
import BookMarkIcon, { ActiveBookMark } from '@/icons/Bookmark';
import ActionSuggestion from '../Shared/ActionSuggestion';
import NoResultFound from '../NoResult/NoResultFound';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Home() {
    const [isGridView, setIsGridView] = useState(false);
    const [promptState, setPromptState] = useState(0);
    const handleGridViewClick = () => {
        setIsGridView(true);
    };
    const handleListViewClick = () => {
        setIsGridView(false);
    };

    const searchParams = useSearchParams();
    const brainId = searchParams.get('b');

    const { isOpen, openModal, closeModal } = useModal();
    const { getList, loading, promptList, setPromptList, paginator, archivePrompt, favouritePrompt, setShowFavorites, showFavorites } = usePrompt(brainId);
    const { searchValue, setSearchValue } = useSearch({
        func: getList,
        delay: 500,
        dependency: [brainId],
        resetState: () => setPromptList([])
    });

    const handlePagination = useCallback(() => {
        if(paginator?.hasNextPage) {
            getList(searchValue, {}, { offset: paginator.offset + paginator.perPage, limit: paginator.perPage });
        }
    }, [paginator]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value);

    const showFavoriteRecords = (flag) => {
        setShowFavorites(flag);        
    };

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        getList(searchValue);
    }, [showFavorites]);

    useEffect(() => {
        if(promptState > 0) {
            getList();
        }
    }, [promptState]);

    return (
        <>
            <div className="flex flex-col flex-1 h-full">
                {/*Prompt page Start  */}
                <div className="flex flex-col flex-1 relative h-full overflow-hidden">
                    <div className="relative flex flex-col h-full overflow-hidden px-3">
                        {/* Prompt Top Bar Start */}
                        <div className="flex items-center min-w-80 flex-wrap gap-2.5 max-w-[950px] w-full mx-auto my-5 px-5 flex-col md:flex-row">
                            {/* Search Start */}
                            <div className="search-docs relative flex-1 max-md:w-full">
                                <input
                                    type="text"
                                    className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-10"
                                    id="searchDocs"
                                    placeholder="Search Prompts"
                                    onChange={handleChange}
                                    value={searchValue}
                                />
                                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                                    <SearchIcon className="w-4 h-[17px] fill-b7" />
                                </span>
                            </div>
                            {/* Search Start */}

                            {/* List/Grid Toggle start */}
                            <div className="md:inline-flex hidden justify-center md:justify-start" role="group">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                id="list-view"
                                                onClick={handleListViewClick}
                                                className={`inline-block rounded-s-custom rounded-e-none btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 ${
                                                    !isGridView ? 'active' : ''
                                                }`}
                                            >
                                                <BarIcon
                                                    width={14}
                                                    height={12}
                                                    className="w-[14px] h-3 object-contain mx-auto fill-b6"
                                                />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="border-none">
                                            <p className="text-font-14">List view</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                id="grid-view"
                                                onClick={handleGridViewClick}
                                                className={`-ms-px inline-block rounded-none btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 ${
                                                    isGridView ? 'active' : ''
                                                }`}
                                            >
                                                <GridIcon
                                                    width={14}
                                                    height={14}
                                                    className="w-[14px] h-[14px] object-contain mx-auto fill-b6"
                                                />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="border-none">
                                            <p className="text-font-14">Grid view</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => showFavoriteRecords(showFavorites ? false : true)}
                                                className={`-ms-px inline-block rounded-e-custom rounded-s-none btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 ${
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
                                            <p className="text-font-14">Favourite prompts</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {/* List/Grid Toggle End */}

                            {/* Add Prompt Start */}
                            <button
                                className="btn btn-outline-gray font-medium"
                                onClick={openModal}
                            >
                                <span className='mr-1'>+</span> 
                                Add a New Prompt
                            </button>
                            {isOpen && (
                                <AddNewPromptModal
                                    open={openModal}
                                    closeModal={closeModal}
                                    setPromptState={setPromptState}
                                />
                            )}
                            {/* Add Prompt End */}
                        </div>
                        {/* Prompt Top Bar End */}
                        <div className='h-full overflow-y-auto w-full relative pb-[120px]'>
                            <div className='max-w-[950px] mx-auto px-5'>
                                <PromptList 
                                    isGridView={isGridView} 
                                    loading={loading} 
                                    promptList={promptList} 
                                    paginator={paginator} 
                                    handlePagination={handlePagination} 
                                    archivePrompt={archivePrompt}
                                    favouritePrompt={favouritePrompt}
                                    getList={getList}
                                    setPromptState={setPromptState}
                                />
                                {
                                    !loading && promptList.length === 0 && !showFavorites && !searchValue &&(
                                        <div className='block col-span-3'>
                                            <ActionSuggestion
                                            title="Let's build your first Prompt!"
                                            description="Anything can be a prompt in Weam. Client brief, brand description, product description, anything. You can also add the website URL of your company or client and Weam will create a short summary of the company. Check out the video to learn more."
                                            subtitle="" 
                                            note={`Need inspiration? Here's our <a href="custom-templates" class="text-b2 underline hover:text-b5 font-bold" rel="noreferrer">pre-made Prompt Library</a>.`}
                                            videourl="https://www.youtube.com/embed/fS6x7AduVuQ?si=GSY9cnYxrzkdzaMN"
                                            />
                                        </div>
                                    )
                                }
                                {
                                    searchValue && promptList.length === 0 && !loading && !showFavorites && (
                                        <NoResultFound message="Search results not found." />
                                    )
                                }
                                {
                                    showFavorites && promptList.length === 0 && !loading &&
                                    (
                                        <NoResultFound message="You haven't added any prompt to your Favorites yet." />
                                    )
                                }
                            </div>
                        </div>
                    </div>
                </div>
                {/*Prompt page End  */}
            </div>
        </>
    );
}
