'use client';

import SearchIcon from '@/icons/Search';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTrigger,
    DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import useGlobalSearch from '@/hooks/search/useGlobalSearch';
import { encodedObjectId } from '@/utils/helper';
import { useRouter } from 'next/navigation';
import routes from '@/utils/routes';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSelector } from 'react-redux';
import { useSidebar } from '@/context/SidebarContext';

const GlobalSearch = () => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const { getGlobalSearch, searchResults, loading, setSearchResults, searchResultCache, setSearchResultCache } = useGlobalSearch();
    const router = useRouter();
    const dialogBodyRef = useRef(null);
    const selectedIndexRef = useRef(-1);
    const privateBrain = useSelector((store: any) => store?.brain?.privateList); 
    const combinedBrain = useSelector((store: any) => store?.brain?.combined);
    const { isCollapsed } = useSidebar();
    
    // Determine tooltip side based on sidebar collapse state
    const tooltipSide = isCollapsed ? "right" : "top"; 
    
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!searchResults.length) return;
    
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const newIndex = Math.min(prev + 1, searchResults.length - 1);
                selectedIndexRef.current = newIndex;
                scrollToItem(newIndex);
                return newIndex;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const newIndex = Math.max(prev - 1, 0);
                selectedIndexRef.current = newIndex;
                scrollToItem(newIndex);
                return newIndex;
            });
        } else if (e.key === 'Enter' && selectedIndexRef.current !== -1) {
            showChat(searchResults[selectedIndexRef.current]);
        }
    }, [searchResults]);
    
    const scrollToItem = (index: number) => {
        setTimeout(() => {
            const elements = dialogBodyRef.current?.querySelectorAll('.dialog-body > div');
            const container = dialogBodyRef.current;
    
            if (elements && container && elements[index]) {
                const element = elements[index];
                const { top, bottom, height } = element.getBoundingClientRect();
                const { top: containerTop, bottom: containerBottom } = container.getBoundingClientRect();
    
                if (bottom > containerBottom) {
                    // Scroll down only if the item is below the container
                    container.scrollTop += height;
                } else if (top < containerTop) {
                    // Scroll up only if the item is above the container
                    container.scrollTop -= height;
                }
            }
        }, 0);
    };
    
    // Search debouncing
    useEffect(() => {
        const fetchData = () => {
            if (searchValue.trim().length >= 3) {
                getGlobalSearch(searchValue, combinedBrain);
            } else {
                // if (searchResultCache.has(searchValue)) {
                //     setSearchResults(searchResultCache.get(searchValue));
                // }
            }
        };
        const timer = setTimeout(fetchData, 1000);
        return () => clearTimeout(timer);
    }, [searchValue]);

    // Redirect to chat page
    const showChat = useCallback((searchSelectedData) => {
        setOpen(false);
        setSearchResults([]);
        setSearchValue(''); 
        router.push(`${routes.chat}/${searchSelectedData?.chatId}?b=${encodedObjectId(searchSelectedData.brain?.id)}`);
    }, [router, setSearchResults, setSearchValue]);

    const handleChange = useCallback((e) => {
        setSearchValue(e.target.value);
    }, [setSearchValue]);

    const highlightText = (text, query, name) => {
        if (!query || !text) return text;
    
        // Escape the full query for exact matching, preserving all special characters
        const fullPhrase = query?.toLowerCase().trim()
            .split('').map(char => {
                // Escape all special regex characters
                return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }).join('');
        
        // Split into terms while preserving special characters
        const searchTerms = query?.toLowerCase().trim()
            .match(/\S+/g)?.map(term => 
                term.split('').map(char => 
                    char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                ).join('')
            ) || [];
    
        if (searchTerms.length === 0) return text;
    
        const lowerText = text?.toLowerCase();
        
        // Try exact match first
        let matchIndex = lowerText.indexOf(query?.toLowerCase().trim());
        if (matchIndex === -1) {
            // Fall back to term-by-term matching
            matchIndex = searchTerms.reduce((acc, term) => {
                const rawTerm = term.replace(/\\/g, '');
                const index = lowerText.indexOf(rawTerm);
                return index !== -1 && (acc === -1 || index < acc) ? index : acc;
            }, -1);
        }
    
        if (matchIndex === -1) return '';
    
        // Get a snippet of text around the first match (50 chars before and after)
        const snippetStart = Math.max(0, matchIndex - 50);
        const snippetEnd = Math.min(text.length, matchIndex + query.length + 50);
        let snippet = text.slice(snippetStart, snippetEnd);
    
        // Add ellipsis if we're not at the start/end of the text
        if (snippetStart > 0) snippet = '...' + snippet;
        if (snippetEnd < text.length) snippet += '...';
    
        // Create pattern for matching that includes all special characters
        const pattern = new RegExp(`(${[fullPhrase, ...searchTerms].join('|')})`, 'gi');
    
        return snippet.split(pattern).map((part, index) => {
            const isMatch = part?.toLowerCase() === query?.toLowerCase().trim() ||
                searchTerms.some(term => 
                    part?.toLowerCase() === term.replace(/\\/g, '')
                );
            return isMatch ? (
                <span key={index} className={`highlight text-[#6637EC]`}>{part}</span>
            ) : (
                <span key={index}>{part}</span>
            );
        });
    }; 
    
    const handleOpenChange = useCallback((isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setSearchResults([]);
            setSearchValue('');
            setSelectedIndex(0);
            setSearchResultCache(new Map()); 
        } else {
            getGlobalSearch('', combinedBrain);
        }
    }, [setSearchResults, setSearchValue, combinedBrain]);

    const getBrainType = (privateBrain, brainId) => {
        const brain = privateBrain.find((brain) => brain._id.toString() === brainId.toString());
        return brain ? 'Private Brain' : 'Shared Brain';
    }

    const renderedSearchResults = useMemo(() => (
        searchResults.map((result, index) => (
            result?.title && (
                <div
                    key={result.id}
                    className={`w-full px-4 py-2 my-1 rounded-md hover:bg-b12 cursor-pointer  ${
                        selectedIndex === index ? 'bg-b12' : ''
                    }`}
                    onClick={() => {
                        showChat(result);
                    }}
                >
                    <div className='text-font-14'>
                        <span className="font-medium">
                            {result.title}
                        </span> 
                        <span className="ml-1 text-b7 text-font-12">
                            {' '}
                            - {getBrainType(privateBrain, result?.brain?.id)} / {result?.brain?.title}
                        </span>                   
                    </div>
                    <p className="text-font-14 text-b5">
                        {highlightText(result.title, searchValue, 'red')}                                       
                    </p>
                    <p className="text-font-14">
                        {highlightText(result.message, searchValue, 'green')}
                    </p>
                    <p className="text-font-14">
                        {highlightText(result.ai, searchValue, 'yellow')}
                    </p>
                </div>
            )
        ))
    ), [searchResults, selectedIndex]);   

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="cursor-pointer [&>svg]:fill-b7 [&>svg]:hover:fill-b2 inline-block rounded-lg border py-2.5 px-3 g-search transition-all duration-200">
                                    <SearchIcon width={15} height={15} className={
                                        'w-[15px] h-[15px] object-cover inline-block'
                                    } />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side={tooltipSide} className="border-none">
                                <p className='text-font-14'>{`Search chats`}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </DialogTrigger>
            <DialogContent className="xl:max-w-[850px] max-w-[calc(100%-30px)] xl:min-h-[550px] md:min-h-[500px] block md:py-7 py-3 h-[calc(100vh-100px)] overflow-hidden">
                <DialogHeader className="rounded-t-10 md:px-[30px] px-4 pb-2 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <div className="search-docs relative flex-1">
                            <input
                                type="text"
                                className="w-full font-medium pl-11 py-2 pr-8 focus:border-none focus-visible:border-none border-none outline-none text-font-14"
                                placeholder={'Search Chats'}
                                onKeyDown={handleKeyDown}
                                onChange={handleChange}
                            />
                            <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                                <SearchIcon className="w-4 h-[17px] fill-b7" />
                            </span>
                            
                            {/* <RadioDropdown data={data} defaultValue={'Favorite'} /> */}
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body relative h-full w-full md:px-10 px-4 py-5 md:max-h-[calc(100vh-300px)] max-h-full overflow-y-auto" ref={dialogBodyRef}>
                    {loading && <ThreeDotLoader />}
                    {!loading && searchResults.length > 0 && renderedSearchResults}
                    {!loading && searchResults.length === 0 && (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-b7">No results found</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GlobalSearch;