'use client';
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import GridIcon from '@/icons/GridIcon';
import BarIcon from '@/icons/BarIcon';
import SearchIcon from '@/icons/Search';
import RemoveIcon from '@/icons/RemoveIcon';
import DocumentIcon from '@/icons/DocumentIcon';
import useSearch from '@/hooks/common/useSearch';
import useBrainDocs from '@/hooks/brains/useBrainDocs';
import { dateDisplay, displayName, getFileIconClassName } from '@/utils/common';
import PdfIcon from '@/icons/PdfIcon';
import DocIcon from '@/icons/Docs';
import useModal from '@/hooks/common/useModal';
import AlertDialogConfirmation from '@/components/AlertDialogConfirmation';
import { getCurrentUser } from '@/utils/handleAuth';
import { ROLE_TYPE } from '@/utils/constant';
import ProfileImage from '@/components/Profile/ProfileImage';
import useMediaUpload from '@/hooks/common/useMediaUpload';
import { LINK } from '@/config/config';
import DocImgIcon from '@/../public/doc-file-icon.png';
import PdfImgIcon from '@/../public/pdf-file-icon.png';
import TxtImgIcon from '@/../public/text-file-icon.png';
import ExcelImgIcon from '@/../public/xls.png';
import { useSearchParams } from 'next/navigation';
import { DocRecordType } from '@/types/doc';
import { LoadMorePagination } from '@/components/Shared/PaginationControl';
import Link from 'next/link';
import BookMarkIcon, { ActiveBookMark } from '@/icons/Bookmark';
import DocListSkeleton from '@/components/Loader/DocList';
import DocGridSkeleton from '../Loader/DocGrid';
import ExcelFileIcon from '@/icons/ExcelFileIcon';
import TxtFileIcon from '@/icons/TXTFILEIcon';
import NoResultFound from '../NoResult/NoResultFound';
import CommonFileIcon from '@/icons/CommonFileIcon';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const FileTypeIcons = {
    pdf: PdfIcon,
    doc: DocIcon,
    docx: DocIcon,
    csv: ExcelFileIcon,
    xlsx: ExcelFileIcon,
    xls: ExcelFileIcon,
    txt: TxtFileIcon,
    eml: CommonFileIcon,
    html: CommonFileIcon,
    php: CommonFileIcon,
    js: CommonFileIcon,
    css: CommonFileIcon,
    sql: CommonFileIcon,
};
const FileItem = ({ brdoc, isGridView, openDeleteModal, setDeleteItem, favouriteBrainDoc, setBookmarkStates, bookmarkStates }:any) => {
    const { doc, userId } = brdoc;
    const filedata = doc.name.split('.');
    const fileName = filedata[0];
    const fileType = filedata[1];    

    const FileTypeIcon = FileTypeIcons[fileType] || null;
    const currentUser = getCurrentUser();

    const containerClasses = useMemo(
        () =>
            `group/item bg-gray-100 border md:hover:bg-b5 chat-item-detail rounded-lg grid grid-cols-1 py-4 gap-2.5 w-full transition duration-150 ease-in-out ${isGridView ? 'px-5' : 'pl-5 pr-2.5'
            }`,
        [isGridView]
    );

    const contentClasses = useMemo(
        () =>
            `relative justify-between gap-2.5 w-full ${isGridView ? 'block' : 'lg:flex'
            }`,
        [isGridView]
    );

    const fileDetailsClasses = useMemo(
        () =>
            `w-full flex  ${!isGridView ? 'lg:w-3/5 pr-4 max-md:mb-2' : 'max-w-[calc(100%-35px)]'
            }`,
        [isGridView]
    );

    const userInfoClasses = useMemo(
        () =>
            `w-full flex items-center  ${!isGridView ? 'lg:w-2/5 mt-0' : 'mt-3'
            }`,
        [isGridView]
    );

    const getDocImgIcon = (mimeType) => {
        if (mimeType === 'application/pdf' || mimeType == 'pdf') {
            return PdfImgIcon;
        } else if (mimeType === 'application/msword' || mimeType == 'doc' || mimeType == 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return DocImgIcon;
        } else if (mimeType === 'text/plain' || mimeType == 'txt') {
            return TxtImgIcon;
        } else if (mimeType === 'application/vnd.ms-excel' || mimeType == 'xls' || mimeType === 'xlsx' || mimeType === 'csv') {
            return ExcelImgIcon;
        } else {
            return '';
        }
    };

    const fileImgIcon = getDocImgIcon(fileType);
    const [favourite, setFavourite] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const handleBookmark = async (brdoc, isFavourite) => {
        setFavLoading(true);
        // Optimistically update UI
        setBookmarkStates(prev => ({
            ...prev,
            [brdoc]: isFavourite
        }));
        
        const payload = {
            isFavorite: isFavourite
        }
        await favouriteBrainDoc(payload, brdoc);
        setFavLoading(false);
    };
    
    return (
        <div className={containerClasses}>
            {isGridView && (
                <div className="rounded-custom overflow-hidden mb-0.5">
                    { FileTypeIcon ? (
                            <Image
                                src={fileImgIcon}
                                alt={doc?.name}
                                width={75}
                                height={75}
                                className={`h-[75px] w-auto ${getFileIconClassName(fileType)}`}
                            />
                        ) : <Image
                            src={`${LINK.AWS_S3_URL}${doc?.uri}`}
                            alt={doc?.name}
                            width={50}
                            height={50}
                            priority
                            className="w-full h-[75px] rounded-custom object-cover object-top"
                        />
                    }
                </div>
            )}
            <div className={contentClasses}>
                <div className={fileDetailsClasses}>
                    { FileTypeIcon ? (
                        <FileTypeIcon
                            width={16}
                            height={16}
                            className={`min-w-6 h-6 object-contain rounded-custom inline-block me-[9px] ${getFileIconClassName(fileType)}`}
                        />
                    ) : <Image
                            src={`${LINK.AWS_S3_URL}${doc?.uri}`}
                            alt="Image"
                            loading="lazy"
                            width="24"
                            height="24"
                            className="min-w-6 h-6 object-cover rounded-custom inline-block me-[9px]"
                        />
                    }
                    <p className="text-font-14 font-normal text-b2 md:group-hover/item:text-b15 break-all">
                        {fileName+"."+fileType}
                    </p>
                </div>
                <div className={userInfoClasses}>
                    <ProfileImage user={userId} w={10} h={10}
                        classname={'user-img size-5 rounded-full mr-1 object-cover'}
                        spanclass={'bg-[#C2185B] text-b15 text-font-12 uppercase font-normal rounded-full w-5 h-5 min-w-5 flex items-center justify-center'}
                    />
                    <ul className="flex flex-wrap *:px-2.5">
                        <li className="text-font-12 text-b5 relative md:group-hover/item:text-b15 after:content-[''] after:absolute after:top-2 after:w-[3px] after:h-[3px] after:rounded-full after:bg-b7 after:right-0 group-hover/item:after:bg-b15 last:after:hidden">
                            {displayName(userId)}
                        </li>
                        <li className="text-font-12 text-b5 relative md:group-hover/item:text-b15 after:content-[''] after:absolute after:w-[3px] after:h-[3px] after:rounded-full after:bg-b7 after:top-1/2 after:right-0 after:-translate-y-1/2 group-hover/item:after:bg-b15 last:after:hidden">
                            {dateDisplay(doc.createdAt)}
                        </li>
                    </ul>
                    <div className='group-hover/item:opacity-100 md:opacity-0 flex gap-2 ml-auto'>
                    {(
                        (currentUser.roleCode === ROLE_TYPE.USER && brdoc.userId.id === currentUser._id) ||
                        (currentUser.roleCode !== ROLE_TYPE.USER)
                    ) && (
                        <span className='cursor-pointer rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 [&>svg]:w-[11] [&>svg]:h-[11] [&>svg]:fill-b5' onClick={() => {
                            openDeleteModal();
                            setDeleteItem({
                                id: brdoc._id,
                                name: fileName
                            });
                        }}>
                            <RemoveIcon
                                width={14}
                                height={14}
                                className={` fill-red ${isGridView ? '' : ''
                                }`}                            
                            />
                        </span>
                    )}
                    
                    <Link
                        href={'#'}
                        onClick={() => !favLoading && handleBookmark(brdoc._id, bookmarkStates[brdoc?._id] ?? brdoc?.favoriteByUsers?.includes(currentUser._id) ? false : true)}
                        className="rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 cursor-pointer hidden123"
                        >
                        {bookmarkStates[brdoc?._id] ?? brdoc?.favoriteByUsers?.includes(currentUser._id) ? (
                            <ActiveBookMark width={15} height={14} className="fill-orange" />
                        ) : (
                            <BookMarkIcon width={15} height={14} className="fill-b5" />
                        )}
                    </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
    const [isGridView, setIsGridView] = useState(false);
    const [bookmarkStates, setBookmarkStates] = useState({});
    const handleGridViewClick = () => {
        setIsGridView(true);
    };
    const handleListViewClick = () => {
        setIsGridView(false);
    };
    const searchParams = useSearchParams();
    const brainId = searchParams.get('b');
    const { getAllBrainDocs, brainDocs, loading, deleteBrainDoc, paginator, setBrainDocs, favouriteBrainDoc, showFavorites, setShowFavorites } = useBrainDocs(brainId);
    const { searchValue, setSearchValue } = useSearch({
        func: getAllBrainDocs,
        delay: 1000,
        dependency: [brainId],
        resetState: () => setBrainDocs([])
    });
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };
    const { isOpen: isDeleteOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
    const [deleteItem, setDeleteItem] = useState({});
    const handleDeleteDoc = () => {
        deleteBrainDoc(deleteItem?.id);
        setDeleteItem({});
        closeDeleteModal();
    }

    const { handleFileChange, fileLoader, fileInputRef, disableCall, uploadFiles } = useMediaUpload({ selectedAIModal: {
        vectorApiCall: true
    } });

    const handlePagination = useCallback(() => {
        if (paginator?.hasNextPage) {
            getAllBrainDocs(searchValue, { offset: paginator.offset + paginator.perPage, limit: paginator.perPage });
        }
    }, [paginator]);

    useEffect(() => {
        if(!fileLoader && disableCall) {
            setBrainDocs([]);
            getAllBrainDocs('');
        }
    }, [fileLoader]);

    const handleClick = () => {
        // Reset the file input value before opening file dialog
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
        }
        fileInputRef.current.click();
    };

    const showFavoriteRecords = (flag) => {
        setShowFavorites(flag);        
    };
    
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        getAllBrainDocs(searchValue);
    }, [showFavorites]);

    return (
        <div className="flex flex-col flex-1 relative h-full overflow-hidden">
            <div className="relative flex flex-col h-full overflow-hidden px-3">
                {/* Docs Top Bar Start */}
                <div className="flex flex-col md:flex-row md:items-center flex-wrap gap-2.5 max-w-[950px] w-full mx-auto my-5 px-5">
                    {/* Search Start */}
                    <div className="search-docs md:min-w-80 max-md:w-full relative flex-1">
                        <input
                            type="text"
                            className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-10"
                            id="searchDocs"
                            placeholder="Search Docs"
                            onChange={handleInputChange}
                            value={searchValue}
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
                                    <p className="text-font-14">Favourite docs</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {/* List/Grid Toggle End */}

                    {/* Add Prompt Start */}
                    <div className='md:max-w-48 relative text-center'>
                        <div className='btn btn-outline-gray font-medium' onClick={handleClick}>
                            <span className='mr-1'>+ </span>
                            Add a New Doc
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={uploadFiles}
                            disabled={fileLoader ? true : false}
                            multiple
                        />
                    </div>
                    {/* Add Prompt End */}
                </div>
                {/* Docs Top Bar End */}
                {/* Head start */}
                {!isGridView && brainDocs.length != 0 && (
                    <div className="relative lg:flex hidden justify-between gap-2.5 w-full max-w-[950px] mx-auto px-5 mb-2">
                        <div className="w-full lg:w-3/5 pr-4">
                            <p className="text-font-16 font-semibold text-b2">
                                Name
                            </p>
                        </div>
                        <div className="w-full lg:w-2/5 flex items-center ">
                            <p className="text-font-16 font-semibold text-b2">
                                Owner
                            </p>
                        </div>
                    </div>
                )}
                {/* Head End */}
                <div className="h-full overflow-y-auto w-full relative pb-16 *:transition-all *:duration-150 *:ease-in-out">
                    <div
                        className={`chat-items ${isGridView
                            ? 'grid xl:grid-cols-3 lg:grid-cols-2 grid-cols-1 xl:gap-5 lg:gap-2'
                            : 'grid grid-cols-1 gap-2.5'
                            } max-w-[950px] mx-auto px-5`}
                    >
                        {/* Docs Items Start */}
                        { brainDocs.length > 0 &&
                                brainDocs.map((brdoc: DocRecordType) => (
                                    <FileItem
                                        key={brdoc._id}
                                        brdoc={brdoc}
                                        isGridView={isGridView}
                                        openDeleteModal={openDeleteModal}
                                        setDeleteItem={setDeleteItem}
                                        isDeleteOpen={isDeleteOpen}
                                        favouriteBrainDoc={favouriteBrainDoc}
                                        setBookmarkStates={setBookmarkStates}
                                        bookmarkStates={bookmarkStates}
                                    />
                                ))
                        }
                        {
                            (loading || fileLoader) && (isGridView ? <DocGridSkeleton items={6} /> : <DocListSkeleton items={10}/>) 
                        }
                        {
                            brainDocs.length === 0 && !loading && !fileLoader && !showFavorites && !searchValue &&(
                                <div className="w-full text-center mx-auto py-8 text-b2 border-[2px] rounded-lg border-b-[5px] px-3 mt-5 col-span-3">
                                    <DocumentIcon
                                        width={35}
                                        height={35}
                                        className={'inline-block [&>path]:fill-black'} 
                                    />
                                        <h4 className="text-font-20 font-bold">Let&apos;s add your first doc!</h4>
                                        <p className="text-font-14 text-b5">You can interact with <strong>pdfs and doc</strong> files in chats.</p>
                                        <p className="text-font-14 text-b5">Click on “Add a New Doc” to upload your first document. You can upload up to 5 MB of file.</p>
                                </div>
                            )
                        }
                        {
                            searchValue && brainDocs.length === 0 && !loading && !fileLoader && !showFavorites && (
                                <NoResultFound message="Search results not found." />
                            )
                        }
                        {
                            showFavorites && brainDocs.length === 0 && (
                                <NoResultFound message="You haven't added any docs to your Favorites yet." />
                            )
                        }
                            {isDeleteOpen && (
                                <AlertDialogConfirmation
                                    description={
                                        `Are you sure you want to delete ${deleteItem?.name} ?`
                                    }
                                    btntext={'Sure'}
                                    btnclassName={'btn-red'}
                                    open={openDeleteModal}
                                    closeModal={closeDeleteModal}
                                    handleDelete={handleDeleteDoc}
                                    id={deleteItem?.id}
                                />
                            )}
                        {/* Docs Items End */}
                    </div>
                    <LoadMorePagination isLoading={loading} handlePagination={handlePagination} paginator={paginator} />
                    {/* If no data found */}
                </div>
            </div>
        </div>
    );
}
