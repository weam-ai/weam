'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import GridIcon from '@/icons/GridIcon';
import BarIcon from '@/icons/BarIcon';
import SearchIcon from '@/icons/Search';
import useCustomGpt from '@/hooks/customgpt/useCustomGpt';
import useSearch from '@/hooks/common/useSearch';
import { LINK } from '@/config/config';
import { useSearchParams } from 'next/navigation';
import RemoveIcon from '@/icons/RemoveIcon';
import useModal from '@/hooks/common/useModal';
import AlertDialogConfirmation from '@/components/AlertDialogConfirmation';
import { getCurrentUser } from '@/utils/handleAuth';
import { ROLE_TYPE } from '@/utils/constant';
import defaultCustomGptImage from '@/../public/defaultgpt.jpg';
import { truncateText } from '@/utils/common';
import ActionSuggestion from '@/components/Shared/ActionSuggestion';
import PencilIcon from '@/icons/PencilIcon';
import { AgentRecordType } from '@/types/agent';
import BookMarkIcon, { ActiveBookMark } from '@/icons/Bookmark';
import { LoadMorePagination } from '@/components/Shared/PaginationControl';
import AgentListSkeleton from '@/components/Loader/AgentList';
import AgentGridSkeleton from '../Loader/AgentGrid';
import NoResultFound from '../NoResult/NoResultFound';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export default function AgentList() {
    const searchParams = useSearchParams();
    const brainId = searchParams.get('b');
    const [isGridView, setIsGridView] = useState(false);
    const { loading, getAllCustomGpt, customgptList, deleteCustomGpt, paginator, setCustomGptList, favouriteCustomGpt, showFavorites, setShowFavorites } = useCustomGpt(brainId);

    const { searchValue, setSearchValue } = useSearch({
        func: getAllCustomGpt,
        delay: 1000,
        dependency: [brainId],
        resetState: () => setCustomGptList([])
    });


    const currentUser = getCurrentUser();

    const handleGridViewClick = () => {
        setIsGridView(true);
    };
    const handleListViewClick = () => {
        setIsGridView(false);
    };

    const { isOpen: isDeleteOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
    const [deleteItem, setDeleteItem] = useState({});
    const handleDeleteItem = () => {
        deleteCustomGpt(deleteItem.id);
        setDeleteItem({});
        closeDeleteModal();
    }
    const [favourite, setFavourite] = useState(false);
    const [bookmarkStates, setBookmarkStates] = useState({});
    const [favLoading, setFavLoading] = useState(false);

    const handleBookmark = async (gptId: string, isFavourite: boolean) => {
        setFavLoading(true);
        setBookmarkStates(prev => ({
            ...prev,
            [gptId]: isFavourite
        }));

        const payload = {
            isFavorite: isFavourite
        };
        await favouriteCustomGpt(payload, gptId);        
        setFavLoading(false);
    };

    const handlePagination = useCallback(() => {
        if (paginator?.hasNextPage) {
            getAllCustomGpt(searchValue, { offset: paginator.offset + paginator.perPage, limit: paginator.perPage });
        }
    }, [paginator]);

    const showFavoriteRecords = (flag) => {
        setShowFavorites(flag);        
    };

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        getAllCustomGpt(searchValue);
    }, [showFavorites]);

    return (
      
            <div className="flex flex-col flex-1 h-full">
                {/*Custom GPT’s page Start  */}
                <div className="flex flex-col flex-1 relative h-full overflow-hidden">
                    <div className="relative flex flex-col h-full overflow-hidden md:px-3">
                        {/* Prompt Top Bar Start */}
                        <div className="flex flex-col md:flex-row items-center flex-wrap gap-2.5 max-w-[950px] w-full mx-auto my-5 px-5">
                            {/* Search Start */}
                            <div className="search-docs md:min-w-80 max-md:w-full relative flex-1">
                                <input
                                    type="text"
                                    className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-10"
                                    id="searchDocs"
                                    placeholder="Search Agents"
                                    value={searchValue}
                                    onChange={(e) =>
                                        setSearchValue(e.target.value)
                                    }
                                />
                                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                                    <SearchIcon className="w-4 h-[17px] fill-b7" />
                                </span>
                            </div>
                            {/* Search Start */}

                            {/* List/Grid Toggle start */}
                            <div className="md:inline-flex hidden" role="group">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                id="list-view"
                                                onClick={handleListViewClick}
                                                className={`inline-block rounded-s-custom rounded-e-none btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 ${!isGridView ? 'active' : ''
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
                                                className={`-ms-px inline-block rounded-none btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 ${isGridView ? 'active' : ''
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
                                            <p className="text-font-14">Favourite agents</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {/* List/Grid Toggle End */}

                            {/* Add Prompt Start */}
                            <Link
                                href={`custom-gpt/add?b=${brainId}`}
                                className="btn btn-outline-gray font-medium"
                            >
                                <span className='mr-1'>+</span> 
                                Add a New Agent
                            </Link>
                            {/* Add Prompt End */}
                        </div>
                        {/* Prompt Top Bar End */}
                        <div className="h-full overflow-y-auto w-full pb-24 *:transition-all *:duration-150 *:ease-in-out">
                            <div
                                className={`prompts-items ${isGridView
                                        ? 'prompts-items-grid grid lg:grid-cols-3 grid-cols-2 gap-5'
                                        : 'prompts-items-list grid grid-cols-1 gap-2.5'
                                    } max-w-[950px] mx-auto px-5`}
                            >
                                {/* Items Start */}
                                {customgptList.length > 0 &&
                                    customgptList.map((gpt: AgentRecordType) => (
                                        <div
                                            key={gpt._id}
                                            className={`group/item relative bg-gray-100 border md:hover:bg-b5 flex flex-wrap md:flex-nowrap rounded-lg w-full transition duration-150 ease-in-out ${isGridView
                                                    ? 'flex-col pt-5 pb-4 px-5'
                                                    : 'items-center'
                                                } ${!isGridView
                                                    ? 'flex-row py-4 px-5'
                                                    : ''
                                                }`}
                                        >
                                            <div
                                                className={`min-w-[60px] ${isGridView ? 'mb-2.5' : ''
                                                    } ${!isGridView
                                                        ? 'mr-[15px]'
                                                        : ''
                                                    }`}
                                            >
                                                <Image
                                                    src={
                                                        gpt?.coverImg?.uri
                                                        ? `${LINK.AWS_S3_URL}${gpt.coverImg.uri}`
                                                        : gpt?.charimg
                                                        ? gpt.charimg
                                                        : defaultCustomGptImage.src
                                                    }
                                                    alt={
                                                        gpt?.coverImg?.uri
                                                        ? `${gpt.coverImg.uri}`
                                                        : gpt?.charimg
                                                        ? `${gpt.charimg}`
                                                        : 'default'
                                                    }
                                                    width={60}
                                                    height={60}
                                                    className="w-[60px] h-[60px] object-contain"
                                                />
                                            </div>
                                            <div className="prompts-item-heading relative flex justify-between gap-2.5 w-full md:-order-none order-3 mt-2 md:mt-0">
                                                {/* Prompt Title End */}
                                                <div className="title-content w-full">
                                                    <h5
                                                        className={`text-font-14 font-semibold text-b2 md:group-hover/item:text-b15 transition duration-150 ease-in-out  ${isGridView
                                                                ? 'mb-1.5'
                                                                : ''
                                                            } ${!isGridView
                                                                ? 'w-[calc(100%-35px)] mb-0.5'
                                                                : ''
                                                            }`}
                                                    >
                                                        {gpt.title}
                                                    </h5>
                                                    <p className="text-font-12 text-b5 md:group-hover/item:text-b15 mt-0.5 transition duration-150 ease-in-out">
                                                        {truncateText(gpt.systemPrompt,850)}
                                                    </p>
                                                </div>
                                                {/* Prompt Title End */}                                               
                                            </div>
                                            <>
                                                    <div className={`ml-auto flex gap-2 md:-order-none order-2 ${isGridView ? 'absolute top-5 right-5' : ''
                                                    } ${!isGridView
                                                        ? 'relative'
                                                        : ''
                                                    }`}
                                                    >
                                                        {                                                
                                                        ((currentUser.roleCode === ROLE_TYPE.USER && gpt?.owner?.id === currentUser._id) ||
                                                        currentUser.roleCode !== ROLE_TYPE.USER) && (
                                                        <>
                                                           <Link
                                                                href={'#'}
                                                                onClick={() => {
                                                                    openDeleteModal();
                                                                    setDeleteItem({
                                                                        id: gpt._id,
                                                                        name: gpt.title
                                                                    });
                                                                }}
                                                                className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 [&>svg]:w-[11] [&>svg]:h-[11] [&>svg]:fill-b5"
                                                            >
                                                                <RemoveIcon width={14} height={14} className="w-[14] h-4 object-contain fill-b4 me-2.5" />
                                                            </Link>
                                                            <Link
                                                                href={`custom-gpt/edit/${gpt._id}?b=${brainId}`}
                                                                className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 [&>svg]:w-[11] [&>svg]:h-[11] [&>svg]:fill-b5"
                                                            >
                                                                <PencilIcon width={11} height={11}/>
                                                            </Link>                                            
                                                        </>
                                                        )}
                                                        <Link
                                                            href={'#'}
                                                            onClick={() => !favLoading && handleBookmark(gpt?._id, bookmarkStates[gpt?._id] ?? gpt?.favoriteByUsers?.includes(currentUser._id) ? false : true)}
                                                            className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 cursor-pointer"
                                                        >
                                                            {(bookmarkStates[gpt?._id] ?? gpt?.favoriteByUsers?.includes(currentUser._id)) ? (
                                                                <ActiveBookMark width={15} height={14} className="fill-orange" />
                                                            ) : (
                                                                <BookMarkIcon width={15} height={14} className="fill-b5" />
                                                            )}
                                                        </Link>
                                                    </div>
                                                </>
                                        </div>
                                    ))
                                }
                                {
                                    loading && (isGridView ? <AgentGridSkeleton items={6} /> : <AgentListSkeleton items={10} />)
                                }
                                {
                                    customgptList.length === 0 && !loading && !showFavorites && !searchValue && (
                                        <div className='block col-span-3'>
                                            <ActionSuggestion
                                                title="Let's build your first Agent!"
                                                description="Custom Agents can save hours of work for your team. You can easily turn repetitive tasks and workflows into an Agent. Check out the video to learn more."
                                                subtitle="" 
                                                note={`Need inspiration? Here's our <a href="custom-templates" class="text-b2 font-bold" rel="noreferrer">pre-made Agent Library</a>.`}
                                                videourl="https://www.youtube.com/embed/87QdKNMp1_4?si=HOm4hPcE84Ex-rhF"
                                            />
                                        </div>
                                    )
                                }
                                {
                                    searchValue && customgptList.length === 0 && !loading && !showFavorites && (
                                        <NoResultFound message="Search results not found." />
                                    )
                                }
                                {
                                    showFavorites && customgptList.length === 0 && !loading && (
                                        <NoResultFound message="You haven't added any agent to your Favorites yet." />
                                    )
                                }
                            </div>
                            <LoadMorePagination isLoading={loading} handlePagination={handlePagination} paginator={paginator} />
                        </div>
                    </div>
                </div>
                
                {isDeleteOpen && (
                    <AlertDialogConfirmation
                        description={
                            `Are you sure you want to delete ${deleteItem?.name} ?`
                        }
                        btntext={'Sure'}
                        btnclassName={'btn-red'}
                        open={openDeleteModal}
                        closeModal={closeDeleteModal}
                        handleDelete={handleDeleteItem}
                        id={deleteItem?.id}
                    />
                )}
                {/*Custom GPT’s page End  */}
            </div>
       
    );
}
