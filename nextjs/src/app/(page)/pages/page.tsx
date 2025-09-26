'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser, getCompanyId } from '@/utils/handleAuth';
import { decodedObjectId, encodedObjectId } from '@/utils/helper';
import { usePageOperations } from '@/hooks/chat/usePageOperations';
import routes from '@/utils/routes';
import DocumentIcon from '@/icons/DocumentIcon';
import SearchIcon from '@/icons/Search';
import GridIcon from '@/icons/GridIcon';
import BarIcon from '@/icons/BarIcon';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
// Using simple SVG icons instead of importing components
import { format } from 'date-fns';
import Toast from '@/utils/toast';
import  { useRouter } from 'next/navigation';

type Page = {
    _id: string;
    title: string;
    content: string;
    originalMessageId: string;
    chatId: string;
    user: any;
    brain: any;
    model: any;
    tokens?: any;
    responseModel?: string;
    responseAPI?: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
}

const PagesPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentUser = useMemo(() => getCurrentUser(), []);
    const companyId = useMemo(() => getCompanyId(currentUser), [currentUser]);
    const brainId = searchParams.get('b') ? decodedObjectId(searchParams.get('b')!) : null;
    
    // Get brain information from Redux store
    const brains = useSelector((store: RootState) => store.brain.combined);
    const currentBrain = useMemo(() => {
        if (brainId && brains.length > 0) {
            return brains.find(brain => brain._id === brainId);
        }
        return null;
    }, [brainId, brains]);
    
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPages, setFilteredPages] = useState<Page[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isGridView, setIsGridView] = useState(false);
    
    // Edit and Delete states
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [deletingPage, setDeletingPage] = useState<string | null>(null);

    const { getAllPages, updatePage, deletePage } = usePageOperations({
        onError: (error) => {
            setError(error);
        }
    });

    const handleGridViewClick = () => {
        setIsGridView(true);
    };

    const handleListViewClick = () => {
        setIsGridView(false);
    };



    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM dd, yyyy');
        } catch {
            return 'Unknown date';
        }
    };

    const truncateContent = (content: string, maxLength: number = 150) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    const loadMore = async () => {
        if (!companyId || !brainId || loadingMore || !hasMore) return;
        
        try {
            setLoadingMore(true);
            const nextPage = currentPage + 1;
            
            const query = {
                companyId: companyId,
                // Add brain filter to only show pages for the selected brain
                ...(brainId && { 'brain.id': brainId })
            };
            
            const result = await getAllPages({
                query: query,
                options: {
                    page: nextPage,
                    limit: 10,
                    sort: { createdAt: -1 }
                }
            });
            
            if (result?.data) {
                const newPages = Array.isArray(result.data) ? result.data : [];
                
                // Check for duplicates and only add new pages
                const existingIds = new Set(pages.map(page => page._id));
                const uniqueNewPages = newPages.filter(page => !existingIds.has(page._id));
                
                if (uniqueNewPages.length > 0) {
                    // Add new pages and maintain descending order by createdAt
                    setPages(prev => {
                        const combined = [...prev, ...uniqueNewPages];
                        return combined.sort((a, b) => 
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );
                    });
                    setCurrentPage(nextPage);
                    
                    // Check if there are more pages based on total count
                    const totalPages = Math.ceil((result.paginator?.itemCount || 0) / 10);
                    setHasMore(nextPage < totalPages);
                } else {
                    // No new pages, stop loading more
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more pages:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handlePageClick = (page: Page) => {
        // Try to get brain ID from the page's brain data
        let brainId = page.brain?.id || page.brain?._id || '';
        
        if (!brainId) {
            // Fallback: try to get brain ID from the current context
            const currentBrainId = searchParams.get('b');
            if (currentBrainId) {
                const chatUrl = `${routes.chat}/${page.chatId}?b=${currentBrainId}${page.originalMessageId ? `&mid=${page.originalMessageId}&edit=true` : ''}`;
                router.push(chatUrl, { scroll: false });
                return;
            }
            // If no brain ID available, set to null and continue
            brainId = null;
        }
        
        // Navigate to the chat with or without brain context, including message ID and edit mode if available
        let chatUrl;
        if (brainId) {
            chatUrl = `${routes.chat}/${page.chatId}?b=${encodedObjectId(brainId)}${page.originalMessageId ? `&mid=${page.originalMessageId}&edit=true` : ''}`;
        } else {
            chatUrl = `${routes.chat}/${page.chatId}${page.originalMessageId ? `?mid=${page.originalMessageId}&edit=true` : ''}`;
        }
        router.push(chatUrl, { scroll: false });
    };

    // Handle page edit
    const handleEditPage = (page: Page) => {
        setEditingPage(page);
        setEditTitle(page.title);
        setIsEditing(false); // Should be false initially
    };

    // Handle page update
    const handleUpdatePage = async () => {
        if (!editingPage || !editTitle.trim() || isEditing) return;
        
        try {
            setIsEditing(true);            
            await updatePage(editingPage._id, { title: editTitle.trim() });
            
            // Update local state
            setPages(prev => prev.map(p => 
                p._id === editingPage._id 
                    ? { ...p, title: editTitle.trim(), updatedAt: new Date().toISOString() }
                    : p
            ));
            
            // Close modal and reset state
            setEditingPage(null);
            setEditTitle('');
            setIsEditing(false);
            
            Toast('Page updated successfully!', 'success');
        } catch (error) {
            setIsEditing(false);
            // Show error to user
            Toast('Failed to update page. Please try again.', 'error');
        }
    };

    // Handle page delete
    const handleDeletePage = async (pageId: string) => {
        setDeletingPage(pageId);
    };
    
    // Confirm and execute delete
    const confirmDeletePage = async (pageId: string) => {
        try {
            await deletePage(pageId);
            
            // Remove from local state
            setPages(prev => prev.filter(p => p._id !== pageId));
            
            setDeletingPage(null);
            Toast('Page deleted successfully!', 'success');
        } catch (error) {
            setDeletingPage(null);
            Toast('Failed to delete page. Please try again.', 'error');
        }
    };

    useEffect(() => {
        const loadPages = async () => {
            if (!companyId) return;
            if (!brainId) {
                setPages([]);
                setHasMore(false);
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                setError(null);
                setCurrentPage(1);
                setHasMore(true);
                
                const query = {
                    companyId: companyId,
                    // Add brain filter to only show pages for the selected brain
                    ...(brainId && { 'brain.id': brainId })
                };
                
                const result = await getAllPages({
                    query: query,
                    options: {
                        page: 1,
                        limit: 10,
                        sort: { createdAt: -1 } // Descending order by creation date
                    }
                });
                
                if (result?.data) {
                    const pagesData = Array.isArray(result.data) ? result.data : [];
                    
                    // Ensure pages are sorted in descending order by createdAt
                    const sortedPages = pagesData.sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    
                    setPages(sortedPages);
                    // Check if there are more pages based on total count
                    const totalPages = Math.ceil((result.paginator?.itemCount || 0) / 10);
                    setHasMore(totalPages > 1);
                } else {
                    setPages([]);
                    setHasMore(false);
                }
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to load pages');
                setPages([]);
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        };

        loadPages();
    }, [companyId, brainId]);

    // Clear pages when brainId changes
    useEffect(() => {
        if (!brainId) {
            setPages([]);
            setFilteredPages([]);
            setCurrentPage(1);
            setHasMore(false);
            setSearchTerm(''); // Clear search term when brain changes
        }
    }, [brainId]);

    useEffect(() => {
        const filtered = pages.filter(page =>
            page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredPages(filtered);
    }, [pages, searchTerm]);



    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="h-[68px] min-h-[68px] flex items-center space-x-2 py-2 md:pl-[15px] md:pr-[15px] pl-[50px] pr-[15px] max-md:sticky max-md:top-0 z-10 bg-white border-b border-gray-200">
                <div className="size-[30px] flex items-center justify-center rounded-full p-1">
                    <DocumentIcon width={20} height={20} className="fill-b2 object-contain" />
                </div>
                <div className="flex items-center space-x-2">
                    <p className="text-font-16 font-bold">
                        Pages
                    </p>
                    <span className="text-font-16 text-gray-400">/</span>
                    <p className="text-font-16 font-medium text-gray-600">
                        {currentBrain ? currentBrain.title : 'Select a brain to view pages'}
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-col flex-1 relative h-full overflow-hidden">
                <div className="relative flex flex-col h-full overflow-hidden px-3">
                    {/* Pages Top Bar */}
                    <div className="flex items-center min-w-80 flex-wrap gap-2.5 max-w-[950px] w-full mx-auto my-5 px-5 flex-col md:flex-row">
                        {/* Search */}
                        <div className="search-docs relative flex-1 max-md:w-full">
                            {!brainId && (
                                <div className="absolute inset-0 bg-gray-100 rounded-md flex items-center justify-center z-10">
                                    <span className="text-gray-500 text-sm">Select a brain to search pages</span>
                                </div>
                            )}
                            <input
                                type="text"
                                className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-10"
                                id="searchDocs"
                                placeholder={brainId ? "Search Pages" : "Select a brain first"}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={!brainId}
                            />
                            <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                                <SearchIcon className="w-4 h-[17px] fill-b7" />
                            </span>
                        </div>

                        {/* List/Grid Toggle */}
                        <div className="md:inline-flex hidden justify-center md:justify-start relative" role="group">
                            {!brainId && (
                                <div className="absolute inset-0 bg-gray-100 rounded-md flex items-center justify-center z-10">
                                    <span className="text-gray-500 text-xs">Select brain</span>
                                </div>
                            )}
                            <button
                                type="button"
                                id="list-view"
                                onClick={handleListViewClick}
                                disabled={!brainId}
                                className={`inline-block rounded-s-custom rounded-e-none btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    !isGridView ? 'active' : ''
                                }`}
                            >
                                <BarIcon
                                    width={14}
                                    height={12}
                                    className="w-[14px] h-3 object-contain mx-auto fill-b6"
                                />
                            </button>
                            <button
                                type="button"
                                id="grid-view"
                                onClick={handleGridViewClick}
                                disabled={!brainId}
                                className={`-ms-px inline-block rounded-none btn border border-b10 bg-transparent w-10 h-10 p-2 hover:bg-b12 [&.active]:bg-b12 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isGridView ? 'active' : ''
                                }`}
                            >
                                <GridIcon
                                    width={14}
                                    height={14}
                                    className="w-[14px] h-[14px] object-contain mx-auto fill-b6"
                                />
                            </button>
                        </div>

                        {/* Page Count */}
                        <div className="text-sm text-gray-500">
                            {brainId ? `${filteredPages.length} page${filteredPages.length !== 1 ? 's' : ''}` : 'Select a brain to view pages'}
                        </div>
                    </div>

                    {/* Pages List Content */}
                    <div className='h-full overflow-y-auto w-full relative pb-[120px]'>
                        <div className='max-w-[950px] mx-auto px-5'>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                    <p className="text-red-800 text-sm">Error: {error}</p>
                                </div>
                            )}
                            
                            {!brainId ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                    <DocumentIcon width={48} height={48} className="fill-gray-300 mb-4" />
                                    <p className="text-lg font-medium mb-2">No brain selected</p>
                                    <p className="text-sm text-gray-400">
                                        Please select a brain from the sidebar to view its pages
                                    </p>
                                </div>
                            ) : loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : filteredPages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                    <DocumentIcon width={48} height={48} className="fill-gray-300 mb-4" />
                                    <p className="text-lg font-medium mb-2">
                                        {searchTerm ? 'No pages found' : 'No pages yet'}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        {searchTerm 
                                            ? 'Try adjusting your search terms' 
                                            : 'Pages created from chat responses will appear here'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className={`pages-items ${isGridView ? 'pages-items-grid grid lg:grid-cols-3 grid-cols-2 gap-2.5 lg:gap-5' : 'pages-items-list grid grid-cols-1 gap-2.5'} w-full`}>
                                    {filteredPages.map((page) => (
                                        <div
                                            key={page._id}
                                            className='group/item md:hover:bg-b5 bg-gray-100 border pages-item-detail rounded-lg py-3 px-5 gap-2.5 w-full transition duration-150 ease-in-out cursor-pointer hover:shadow-md hover:border-gray-300'
                                            onClick={() => handlePageClick(page)}
                                            title={`Click to open chat: ${page.title}`}
                                        >
                                            <div className='pages-item-heading relative flex gap-2.5 w-full'>
                                                {/* Page Title and Model */}
                                                <div className={`pages-item-title-tag relative flex flex-col gap-2.5`}>
                                                    <div className="flex items-center gap-2.5">
                                                                                                            <h5 className='text-font-14 font-semibold text-b2 transition duration-150 ease-in-out md:group-hover/item:text-b15 hover:text-blue-600'>
                                                        {page.title}
                                                    </h5>
                                                        {page.responseModel && (
                                                            <span className="inline-block whitespace-nowrap rounded-sm bg-b11 px-2 py-[4px] text-center align-baseline text-font-12 font-normal leading-none text-b5 md:group-hover/item:bg-b15/10 md:group-hover/item:text-b15 transition duration-150 ease-in-out">
                                                                {page.responseModel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-font-12 text-b5 transition duration-150 ease-in-out md:group-hover/item:text-b15 hover:text-blue-600">
                                                        {formatDate(page.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Action Icons */}
                                                <div className='ml-auto flex items-center gap-2.5'>
                                                    {/* Edit Icon */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditPage(page);
                                                        }}
                                                        className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 [&>svg]:w-[11] [&>svg]:h-[11] [&>svg]:fill-b5"
                                                        title="Edit page"
                                                    >
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="fill-current">
                                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                                        </svg>
                                                    </button>
                                                    
                                                    {/* Delete Icon */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeletePage(page._id);
                                                        }}
                                                        disabled={deletingPage === page._id}
                                                        className="group-hover/item:opacity-100 md:opacity-0 rounded bg-white flex items-center justify-center w-6 min-w-6 h-6 p-0.5 [&>svg]:w-[11] [&>svg]:h-[11] [&>svg]:fill-b5"
                                                        title="Delete page"
                                                    >
                                                        {deletingPage === page._id ? (
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                                        ) : (
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="fill-current">
                                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>


                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Load More Button */}
                            {brainId && hasMore && !searchTerm && pages.length >= 10 && (
                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="px-6 py-3 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        {loadingMore ? (
                                            <div className="flex items-center space-x-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                <span>Loading...</span>
                                            </div>
                                        ) : (
                                            'Load More Pages'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Page Modal */}
            {editingPage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => {
                        setEditingPage(null);
                        setEditTitle('');
                        setIsEditing(false);
                    }}
                >
                    <div 
                        className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4">
                            <label htmlFor="edit-page-title" className="block text-sm font-medium text-gray-700 mb-1">
                                Page Title
                            </label>
                            <input
                                id="edit-page-title"
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && editTitle.trim()) {
                                        handleUpdatePage();
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter page title..."
                                autoFocus
                            />
                        </div>
                        
                        {/* Buttons Container */}
                        <div className="flex justify-end space-x-3">
                            {/* Save Button */}
                            <button
                                onClick={handleUpdatePage}
                                disabled={isEditing || !editTitle.trim()}
                                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                                Save
                            </button>
                            
                            {/* Cancel Button */}
                            <button
                                onClick={() => {
                                    setEditingPage(null);
                                    setEditTitle('');
                                    setIsEditing(false);
                                }}
                                disabled={isEditing}
                                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingPage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => setDeletingPage(null)}
                >
                    <div 
                        className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Page</h3>
                            <p className="text-sm text-gray-600">
                                Are you sure you want to delete this page? This action cannot be undone.
                            </p>
                        </div>
                        
                        {/* Buttons Container - Same style as Edit Modal */}
                        <div className="flex justify-end space-x-3">
                            {/* Confirm Button - First (left side) */}
                            <button
                                onClick={() => confirmDeletePage(deletingPage)}
                                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Confirm Delete
                            </button>
                            
                            {/* Cancel Button - Second (right side) */}
                            <button
                                onClick={() => setDeletingPage(null)}
                                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagesPage;
