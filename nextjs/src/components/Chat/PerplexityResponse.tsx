import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import StreamLoader from '../Loader/StreamLoader';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { ConversationType } from '@/types/chat';
import commonApi from '@/api';
import { MODULE_ACTIONS } from '@/utils/constant';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type SearchResult = {
    title: string;
    url: string;
    date: string;
    last_updated: string;
    snippet: string;
    source: string;
    image_url?: string;
    video_url?: string;
};

type PerplexityChatResponseProps = {
    conversations: ConversationType;
    response: string;
    setConversations: React.Dispatch<React.SetStateAction<ConversationType[]>>;
};

type Video = {
    url: string;
    title: string;
    thumbnail: string;
};

type Image = {
    url: string;
    title: string;
    thumbnail_src: string;
    img_src: string;
};

type VideoModalProps = {
    videos: Video[];
    selectedIndex: number | null;
    isPlaying: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
};

type ImageModalProps = {
    images: Image[];
    selectedIndex: number | null;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
};

type AnswerTabProps = {
    response: string;
    loading: boolean;
    searchResults: SearchResult[];
};

type ImagesTabProps = {
    images: Image[];
    onImageClick: (index: number) => void;
    isLoading: boolean;
};

type VideosTabProps = {
    videos: Video[];
    onVideoClick: (index: number) => void;
    isLoading: boolean;
};

type SourcesTabProps = {
    searchResults: SearchResult[];
    loading: boolean;
};

const TABS_OPTIONS = {
    ANSWER: 'answer',
    IMAGES: 'images',
    VIDEOS: 'videos',
    SOURCES: 'sources'
} as const;

// Sub-components for better performance
// Top Sources Display Component - Shows first 8 search results horizontally
const TopSourcesDisplay = React.memo(({ searchResults }: { searchResults: SearchResult[] }) => {
    const displayResults = (searchResults || []).slice(0, 4);

    if (!displayResults.length) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-1 mb-3">
            {displayResults.map((result, index) => {
                const domain = getDomain(result.url);
                return (
                    <a
                        key={`${result.url}-${index}`}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                            rounded-lg inline-block bg-purple/10 border border-purple/20
                            p-2
                            hover:border-gray-300 hover:shadow-sm transition-all
                        "
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={getSearchResultImages(result.url, '16')}
                                        alt={`${domain} favicon`}
                                        className="w-3 h-3"
                                        onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            img.style.display = 'none';
                                            const fallback = img.nextElementSibling as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                    <div className="hidden w-full h-full items-center justify-center text-[8px] font-semibold text-gray-600">
                                        {getSourceInitials(result.title)}
                                    </div>
                                </div>
                                <div className="text-[11px] text-gray-500 truncate">
                                    {domain}
                                </div>
                            </div>

                            <div className="text-[10px] font-normal text-gray-900 leading-4 line-clamp-2">
                                {result.snippet}
                            </div>
                        </div>
                    </a>
                );
            })}
        </div>
    );
});

const AnswerTab = React.memo(({ response, loading, searchResults }: AnswerTabProps) => {
    if (loading && !response) {
        return <StreamLoader />;
    }

    if (response) {
        // Process response to replace [1][2] citations with domain tags
        const processResponseWithCitations = (text: string) => {
            // Create a map for quick lookup of domain and count
            const domainCounts: { [key: string]: number } = {};
            const domainMap: { [key: number]: string } = {};

            searchResults.forEach((result, index) => {
                const domain = getDomain(result.url);
                if (!domainCounts[domain]) {
                    domainCounts[domain] = 0;
                }
                domainCounts[domain]++;
                domainMap[index + 1] = domain;
            });

            let processedText = text;

            // Replace [1], [2], etc. with domain tags (NO brackets)
            for (let i = 1; i <= searchResults.length; i++) {
                const domain = domainMap[i];
                if (domain) {
                    const count = domainCounts[domain];
                    const citationTag = `${domain}${count > 1 ? ` +${count}` : ''}`;
                    const regex = new RegExp(`\\[${i}\\]`, 'g');
                    processedText = processedText.replace(regex, citationTag);
                }
            }
            return processedText;
        };

        const processedResponse = processResponseWithCitations(response);
        return (
            <div>
                {/* Top Sources Display - First 4 search results */}
                <TopSourcesDisplay searchResults={searchResults} />

                {/* Main Content */}
                <div className="prose prose-sm max-w-none">
                    <Markdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                            p: ({ children }) => <p className="mb-4">{children}</p>,
                            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-4">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-4">{children}</ol>,
                            li: ({ children }) => <li className="mb-2">{children}</li>,
                            code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
                            pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4">{children}</blockquote>,
                            a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {children}
                                </a>
                            ),
                            // Custom component for inline citation tags
                            text: ({ children }) => {
                                return <>{children}</>;
                            },
                        }}
                    >
                        {processedResponse}
                    </Markdown>
                </div>
            </div>
        );
    }

    return <ThreeDotLoader />;
});

const ImagesTab = React.memo(({ images, onImageClick, isLoading }: ImagesTabProps) => {
    if (isLoading) {
        return <ImagesSkeletonGrid />;
    }

    if (images.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No images available
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
                <div
                    key={index}
                    className="relative aspect-square cursor-pointer group"
                    onClick={() => {
                        onImageClick(index);
                    }}
                >
                    <img
                        src={getImageSrc(image)}
                        alt={getImageAlt(image, index)}
                        className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
                    />
                </div>
            ))}
        </div>
    );
});

const VideosTab = React.memo(({ videos, onVideoClick, isLoading }: VideosTabProps) => {
    if (isLoading) {
        return <VideosSkeletonGrid />;
    }

    if (videos.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No videos available
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((video, index) => (
                <div
                    key={index}
                    className="relative aspect-video cursor-pointer group"
                    onClick={() => onVideoClick(index)}
                >
                    <img
                        src={video.thumbnail}
                        alt={video.title || `Video ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white bg-opacity-90 rounded-full p-3">
                                <Play className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

const SourcesTab = React.memo(({ searchResults, loading }: SourcesTabProps) => {
    if (searchResults.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-10 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No sources available</h3>
                <p className="text-xs text-gray-500">Sources will appear here when available</p>
            </div>
        );
    }

    const displayResults = searchResults;

    return (
        <div className="space-y-3">
            {displayResults.map((result, index) => (
                <a
                    key={`${result.url}-${index}`}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 border group"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 border rounded flex items-center justify-center">
                                <img
                                    src={getSearchResultImages(result.url, '16')}
                                    alt={`${getDomain(result.url)} favicon`}
                                    className="w-5 h-5"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                    }}
                                />
                                <div className="w-5 h-5 bg-gray-300 rounded text-xs flex items-center justify-center text-gray-600 font-bold" style={{ display: 'none' }}>
                                    {getSourceInitials(result.source).charAt(0)}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Domain and Source */}
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-font-12 text-gray-500 font-medium uppercase tracking-wide">
                                    {getDomain(result.url)}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-font-14 font-medium text-gray-900 leading-tight line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                                {result.title}
                            </h3>

                            {/* Snippet */}
                            <p className="text-font-12 text-gray-600 leading-relaxed line-clamp-2 mb-2">
                                {result.snippet}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-font-12 text-gray-500">
                                    {result.date && (
                                        <span>{new Date(result.date).toLocaleDateString()}</span>
                                    )}
                                    {result.last_updated && (
                                        <span>Updated {new Date(result.last_updated).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            ))}
            {loading && (
                <div className="text-center py-6">
                    <div className="inline-flex items-center gap-2 text-gray-500 text-xs">
                        <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        Loading sources...
                    </div>
                </div>
            )}
        </div>
    );
});

function toYouTubeEmbed(url: string, { autoplay = false, mute = false } = {}) {
    const id =
        url.match(/youtu\.be\/([^?&#/]+)/)?.[1] ||
        url.match(/[?&]v=([^?&#]+)/)?.[1] ||
        url.match(/youtube\.com\/shorts\/([^?&#/]+)/)?.[1];

    if (!id) return null;

    const base = `https://www.youtube-nocookie.com/embed/${id}`;
    const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        mute: autoplay ? '1' : (mute ? '1' : '0'),
        rel: '0',
        modestbranding: '1',
        playsinline: '1',
    });
    return `${base}?${params.toString()}`;
}

const getImageSrc = (item: Image) =>
    typeof item === 'string'
        ? item
        : item.img_src || item.thumbnail_src || '';

const getImageAlt = (item: Image, i: number) =>
    typeof item === 'string' ? `Image ${i + 1}` : item.title || `Image ${i + 1}`;

function getDomainName(url: string) {
    url = url.replace(/^https?:\/\//, '').split('/')[0];
    url = url.split(':')[0];
    const parts = url.split('.').filter(Boolean);
    const multiTLDs = new Set(['co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'co.in', 'com.au', 'net.au', 'org.au']);
    const lastTwo = parts.slice(-2).join('.');
    const domainPart = multiTLDs.has(lastTwo) ? parts[parts.length - 3] : parts[parts.length - 2];
    return domainPart ? domainPart.toUpperCase() : '';
}

const ImageModal = React.memo(({
    images,
    selectedIndex,
    onClose,
    onNext,
    onPrev
}: ImageModalProps) => {

    const [loaded, setLoaded] = useState(false);
    const isOpen = selectedIndex !== null;

    useEffect(() => {
        setLoaded(false);
    }, [selectedIndex]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onPrev, onNext, onClose]);

    if (!isOpen) return null;

    const src = getImageSrc(images[selectedIndex!]);
    const alt = getImageAlt(images[selectedIndex!], selectedIndex!);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[95%] max-h-[90vh] p-0 border-none">
                <div className="relative max-w-4xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
                    {images.length > 1 && loaded && (
                        <>
                            <button
                                onClick={onPrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white rounded-full p-0.5 shadow-md border border-gray-500 size-10 text-gray-500 hover:text-gray-800 z-10 disabled:opacity-40"
                                disabled={selectedIndex === 0}
                                aria-label="Previous image"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={onNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white rounded-full p-0.5 shadow-md border border-gray-500 size-10 text-gray-500 hover:text-gray-800 z-10 disabled:opacity-40"
                                disabled={selectedIndex === images.length - 1}
                                aria-label="Next image"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    {!loaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                        </div>
                    )}

                    <img
                        src={src}
                        alt={alt}
                        loading="eager"
                        decoding="async"
                        className={`max-w-full max-h-[87vh] w-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        onLoad={() => setLoaded(true)}
                        onError={() => setLoaded(true)}
                    />

                    {images.length > 1 && loaded && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                            {selectedIndex! + 1} of {images.length}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
});

const VideoModal = React.memo(({ 
    videos, 
    selectedIndex, 
    isPlaying = false, 
    onClose, 
    onNext, 
    onPrev 
}: VideoModalProps) => {
    if (selectedIndex === null) return null;

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') onPrev();
        if (e.key === 'ArrowRight') onNext();
        if (e.key === 'Escape') onClose();
    }, [onPrev, onNext, onClose]);

    const url = videos[selectedIndex]?.url;
    const embed = toYouTubeEmbed(url, { autoplay: isPlaying, mute: isPlaying });

    return (
        <Dialog open={selectedIndex !== null} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90 border-none">
                <div className="relative max-w-4xl max-h-full p-4" onKeyDown={handleKeyDown}>
                    {videos.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPrev();
                                }}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                                disabled={selectedIndex === 0}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNext();
                                }}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                                disabled={selectedIndex === videos.length - 1}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}
                    <iframe
                        src={embed}
                        title={videos[selectedIndex]?.title || 'YouTube video'}
                        className="rounded-lg aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                    {videos.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
                            {selectedIndex + 1} of {videos.length}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
});

// Skeleton Components
const ImageSkeleton = () => (
    <div className="relative aspect-square bg-gray-200 rounded-lg animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg"></div>
    </div>
);

const VideoSkeleton = () => (
    <div className="relative aspect-video bg-gray-200 rounded-lg animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-600" />
            </div>
        </div>
    </div>
);

const ImagesSkeletonGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
            <ImageSkeleton key={index} />
        ))}
    </div>
);

const VideosSkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
            <VideoSkeleton key={index} />
        ))}
    </div>
);

const getDomain = (url: string) => {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

const getSourceInitials = (source: string) => {
    return source
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 3);
}

const getSearchResultImages = (url: string, imageSize: string) => {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?sz=${imageSize}&domain=${domain}`;
        return faviconUrl;
    } catch (error) {
        console.error('Error generating favicon URL:', error);
        return '';
    }
}

const PerplexityChatResponse = ({
    conversations,
    response,
    setConversations
}: PerplexityChatResponseProps) => {
    const [activeTab, setActiveTab] = useState<keyof typeof TABS_OPTIONS>(TABS_OPTIONS.ANSWER);
    const [metadata, setMetadata] = useState({
        search_results: conversations?.responseMetadata?.search_results || [],
        citations: conversations?.responseMetadata?.citations || [],
        images: conversations?.responseMetadata?.images || [],
        videos: conversations?.responseMetadata?.videos || [],
    });
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);

    // Update metadata when conversations change (for streaming updates)
    useEffect(() => {
        if (conversations?.responseMetadata) {
            setMetadata({
                search_results: conversations.responseMetadata.search_results || [],
                citations: conversations.responseMetadata.citations || [],
                images: conversations.responseMetadata.images || [],
                videos: conversations.responseMetadata.videos || [],
            });
        }
    }, [conversations?.responseMetadata]);


    const getImages = async (data: { query: string, messageId: string }) => {
        const response = await commonApi({
            action: MODULE_ACTIONS.GET_IMAGES,
            data: {
                query: data.query,
                messageId: data.messageId
            }
        })
        return response.data
    }

    // Optimized event handlers with useCallback
    const handleImageClick = async (index: number) => {
        setSelectedImageIndex(index);
    };

    const handleVideoClick = useCallback((index: number) => {
        setSelectedVideoIndex(index);
        setIsVideoPlaying(true);
    }, []);

    const closeImageModal = useCallback(() => {
        setSelectedImageIndex(null);
    }, []);

    const closeVideoModal = useCallback(() => {
        setSelectedVideoIndex(null);
        setIsVideoPlaying(false);
    }, []);

    const nextImage = useCallback(() => {
        setSelectedImageIndex(prev => 
            prev !== null && prev < metadata.images.length - 1 ? prev + 1 : prev
        );
    }, [metadata.images.length]);

    const prevImage = useCallback(() => {
        setSelectedImageIndex(prev => 
            prev !== null && prev > 0 ? prev - 1 : prev
        );
    }, []);

    const nextVideo = useCallback(() => {
        setSelectedVideoIndex(prev => 
            prev !== null && prev < metadata.videos.length - 1 ? prev + 1 : prev
        );
    }, [metadata.videos.length]);

    const prevVideo = useCallback(() => {
        setSelectedVideoIndex(prev => 
            prev !== null && prev > 0 ? prev - 1 : prev
        );
    }, []);

    const handleTabClick = async(tab: string) => {
        setActiveTab(tab as any);
        if ([TABS_OPTIONS.IMAGES, TABS_OPTIONS.VIDEOS].includes(tab as typeof TABS_OPTIONS.IMAGES | typeof TABS_OPTIONS.VIDEOS)) {
            const existingImages = conversations?.responseMetadata?.images || [];
            const existingVideos = conversations?.responseMetadata?.videos || [];

            if (existingImages.length === 0 || existingVideos.length === 0) {
                setIsLoadingImages(true);
                setIsLoadingVideos(true);

                try {
                    const response = await getImages({ query: conversations.message, messageId: conversations.id });

                    // Update local metadata
                    setMetadata(prev => ({
                        ...prev,
                        images: response.images || [],
                        videos: response.videos || []
                    }));

                    // Update the conversation's responseMetadata
                    setConversations(prevConversations => 
                        prevConversations.map(conv => 
                            conv.id === conversations.id 
                                ? {
                                    ...conv,
                                    responseMetadata: {
                                        ...conv.responseMetadata,
                                        images: existingImages.length === 0 ? response.images || [] : existingImages,
                                        videos: existingVideos.length === 0 ? response.videos || [] : existingVideos,
                                    }
                                }
                                : conv
                        )
                    );
                } catch (error) {
                    console.error('Error fetching images:', error);
                } finally {
                    setIsLoadingImages(false);
                    setIsLoadingVideos(false);
                }
            }
        }
    };

    // Memoized tab configuration
    const tabs = useMemo(() => [
        { key: 'answer', label: 'Answer' },
        { key: 'images', label: 'Images' },
        { key: 'videos', label: 'Videos' },
        { key: 'sources', label: 'Sources' }
    ], []);

    // Determine if we're in loading state
    const isLoading = !response || response.trim() === '';

    return (
        <div className="flex flex-col items-start gap-4 break-words min-h-5">
            <div className="w-full max-w-[calc(100vw-95px)] lg:max-w-none break-words">
                <style jsx>{`
                    .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabClick(tab.key)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[200px]">
                    {activeTab === TABS_OPTIONS.ANSWER && <AnswerTab response={response} loading={isLoading} searchResults={metadata.search_results} />}
                    {activeTab === TABS_OPTIONS.IMAGES && <ImagesTab images={metadata.images} onImageClick={handleImageClick} isLoading={isLoadingImages} />}
                    {activeTab === TABS_OPTIONS.VIDEOS && <VideosTab videos={metadata.videos} onVideoClick={handleVideoClick} isLoading={isLoadingVideos} />}
                    {activeTab === TABS_OPTIONS.SOURCES && <SourcesTab searchResults={metadata.search_results} loading={isLoading} />}
                </div>
            </div>

            {/* Image Modal */}
            <ImageModal
                images={metadata.images}
                selectedIndex={selectedImageIndex}
                onClose={closeImageModal}
                onNext={nextImage}
                onPrev={prevImage}
            />

            {/* Video Modal */}
            <VideoModal
                videos={metadata.videos}
                selectedIndex={selectedVideoIndex}
                isPlaying={isVideoPlaying}
                onClose={closeVideoModal}
                onNext={nextVideo}
                onPrev={prevVideo}
            />
        </div>
    );
};

export default PerplexityChatResponse;