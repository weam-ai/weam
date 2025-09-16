import React from 'react';

type PromptCardSkeletonProps = {
    count?: number;
};

const PromptCardSkeleton: React.FC<PromptCardSkeletonProps> = ({
    count = 4,
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div 
                    key={index}
                    className='border rounded-md p-5 bg-white animate-pulse'
                >
                    {/* Title skeleton */}
                    <div className='h-4 bg-gray-200 rounded w-3/4 mb-2'></div>
                    {/* Content skeleton with multiple lines */}
                    <div className='space-y-2'>
                        <div className='h-3 bg-gray-100 rounded w-full'></div>
                        <div className='h-3 bg-gray-100 rounded w-5/6'></div>
                        <div className='h-3 bg-gray-100 rounded w-4/5'></div>
                        <div className='h-3 bg-gray-100 rounded w-3/4'></div>
                        <div className='h-3 bg-gray-100 rounded w-2/3'></div>
                        <div className='h-3 bg-gray-100 rounded w-3/4'></div>
                        <div className='h-3 bg-gray-100 rounded w-2/3'></div>
                    </div>
                </div>
            ))}
        </>
    );
};

export default PromptCardSkeleton;
