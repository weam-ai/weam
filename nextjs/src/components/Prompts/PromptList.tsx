'use Client'
import React, { useState, useMemo, useEffect } from 'react';
import AddNewPromptModal from './AddNewPromptModal';
import useModal from '@/hooks/common/useModal';
import AlertDialogConfirmation from '../AlertDialogConfirmation';
import { getCurrentUser } from '@/utils/handleAuth';
import { ROLE_TYPE } from '@/utils/constant';
import Link from 'next/link';
import RemoveIcon from '@/icons/RemoveIcon';
import PencilIcon from '@/icons/PencilIcon';
import { PromptRecordType } from '@/types/prompt';
import { LoadMorePagination } from '../Shared/PaginationControl';
import BookMarkIcon, { ActiveBookMark } from '@/icons/Bookmark';
import { BrainPromptType } from '@/types/brain';
import { PaginatorType } from '@/types/common';
import PromptListSkeleton from '../Loader/PromptList';
import PromptGridSkeleton from '../Loader/PromptGrid';

type PromptListProps = {
    isGridView: boolean;
    loading: boolean;
    promptList: BrainPromptType[];
    paginator: PaginatorType;
    handlePagination: () => void;
    archivePrompt: (id: string) => void;
    favouritePrompt: (payload: { isFavorite: boolean }, id: string) => void;
}

const PromptList: React.FC<PromptListProps> = ({ isGridView, loading, promptList, paginator, handlePagination, archivePrompt, favouritePrompt, setPromptState }) => {
    const { isOpen: isEdit, openModal, closeModal } = useModal();
    const { isOpen: isDeleteOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
    const [activePromptIndex, setActivePromptIndex] = React.useState(null);
    const [bookmarkStates, setBookmarkStates] = useState({});
    const [favLoading, setFavLoading] = useState(false);
    const handleOpenPromptModal = (index) => {
        setActivePromptIndex(index);
        openModal();
    };
    const [deleteItem, setDeleteItem] = useState({});
    const handleDeletePrompt = () => {
        archivePrompt(deleteItem?._id);
        setDeleteItem({});
        closeDeleteModal();
    }

    const currentUser = useMemo(() => getCurrentUser(), []);

    const [favourites, setFavourites] = useState();
    const handleBookmark = async (promptId, isFavourite) => {
        // Optimistically update UI
        setFavLoading(true);
        setBookmarkStates(prev => ({
            ...prev,
            [promptId]: isFavourite
        }));

        const payload = {
            isFavorite: isFavourite
        }
        await favouritePrompt(payload, promptId);
        setFavLoading(false);
    };

    return <>
        <div className={`prompts-items ${isGridView ? 'prompts-items-grid grid lg:grid-cols-3 grid-cols-2 gap-2.5 lg:gap-5' : 'prompts-items-list grid grid-cols-1 gap-2.5'} w-full`}>
            {promptList.length > 0 && promptList.map((item: PromptRecordType, index: number) => (
                <div key={item._id} className='group/item md:hover:bg-b5 bg-gray-100 border prompts-item-detail rounded-lg py-3 px-5 gap-2.5 w-full transition duration-150 ease-in-out'>
                    <div className='prompts-item-heading relative flex gap-2.5 w-full'>
                        {/* Prompt Title End */}
                        <div className={`prompts-item-title-tag relative flex flex-wrap gap-2.5 ${isGridView ? 'flex-col' : ''} ${!isGridView ? 'items-center' : ''}`}>
                            <h5 className='text-font-14 font-semibold text-b2 transition duration-150 ease-in-out md:group-hover/item:text-b15'>
                                {item.title}
                            </h5>
                            <div className={`flex flex-wrap items-center ${isGridView ? 'gap-[5px]' : ''} ${!isGridView ? 'gap-2.5' : ''}`}>
                                {
                                    item?.tags?.map((tag, index) => (
                                        <span key={index} className="inline-block whitespace-nowrap rounded-sm bg-b11 px-2 py-[4px] text-center align-baseline text-font-12 font-normal leading-none text-b5 md:group-hover/item:bg-b15/10 md:group-hover/item:text-b15 transition duration-150 ease-in-out">
                                            {tag}
                                        </span>
                                    ))
                                }
                            </div>
                        </div>
                        {/* Prompt Title End */}
                        {/* Dropdown start */}
                            <>
                            <div className='ml-auto flex items-center gap-2.5'>
                                {((currentUser.roleCode == ROLE_TYPE.USER && item.user.id == currentUser._id) ||
                                (currentUser.roleCode != ROLE_TYPE.USER)) && (
                                    <>
                                        <Link
                                            href={'#'}
                                            onClick={() => {
                                                openDeleteModal();
                                                setDeleteItem(item);
                                            }}
                                            className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 [&>svg]:w-[11] [&>svg]:h-[11] [&>svg]:fill-b5"
                                        >
                                            <RemoveIcon width={14} height={14} className="" />
                                        </Link>
                                        <Link
                                            href={'#'}
                                            onClick={() => {
                                                handleOpenPromptModal(index)
                                            }}
                                            className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 [&>svg]:w-[11] [&>svg]:h-[11] [&>svg]:fill-b5"
                                        >
                                            <PencilIcon width={11} height={11}/>
                                        </Link>
                                    </>
                                )}
                                
                                <Link
                                    href={'#'}
                                    onClick={() => !favLoading && handleBookmark(item._id, bookmarkStates[item?._id] ?? item?.favoriteByUsers?.includes(currentUser._id) ? false : true)}
                                    // onClick={() => handleBookmark(item._id, bookmarkStates[item?._id] ?? item?.favoriteByUsers?.includes(currentUser._id) ? false : true)}
                                    className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 cursor-pointer hidden12"
                                >
                            {bookmarkStates[item?._id] ?? item?.favoriteByUsers?.includes(currentUser._id) ? (
                                <ActiveBookMark width={15} height={14} className="fill-orange" />
                            ) : (
                                <BookMarkIcon width={15} height={14} className="fill-b5" />
                                    )}
                                </Link>                                                                        
                            </div>
                            </>                                
                        {isEdit && index === activePromptIndex && <AddNewPromptModal open={openModal} closeModal={closeModal} edit={item} flag={isEdit} setPromptState={setPromptState}  />}
                        {/* Dropdown End */}
                    </div>
                    {/* Prompt Detail start */}
                    <div className='overflow-y-auto max-h-80'>
                        { !item.isCompleted && <span className='text-font-12 px-[10px] py-[3px] inline-block mt-[3px] bg-white border text-b5 rounded-md'>{`We're preparing your prompt.`}</span> }
                        <p className='text-font-12 text-b5 mt-2.5 md:group-hover/item:text-b15 transition duration-150 ease-in-out'>
                            {item.content}
                        </p>
                    </div>
                    {/* Prompt Detail End */}
                </div>
            ))}
            
            {
                loading && (isGridView ? <PromptGridSkeleton items={6} /> : <PromptListSkeleton items={10} />)
            }
            
            
            
            {isDeleteOpen && (
                <AlertDialogConfirmation
                    description={
                        `Are you sure you want to delete ${deleteItem?.title} ?`
                    }
                    btntext={'Sure'}
                    btnclassName={'btn-red'}
                    open={openDeleteModal}
                    closeModal={closeDeleteModal}
                    handleDelete={handleDeletePrompt}
                    id={deleteItem?._id}
                />
            )}
            {/* Prompts Items End */}
        </div>
        <LoadMorePagination isLoading={loading} handlePagination={handlePagination} paginator={paginator} />
    </>
}

export default PromptList;


