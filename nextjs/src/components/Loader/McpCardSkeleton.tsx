import React from 'react';

type McpCardSkeletonProps = {
    count?: number;
}

const McpCardSkeleton: React.FC<McpCardSkeletonProps> = ({
    count = 6,
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className='border rounded-lg p-5 animate-pulse'>
                    <div className='flex items-center gap-x-2'>
                        <div className='border size-9 rounded-full p-2 flex items-center justify-center bg-gray-100'>
                            <div className='w-6 h-6 bg-gray-200 rounded'></div>
                        </div>
                        <div className='flex-1'>
                            <div className='h-4 bg-gray-100 rounded w-24 mb-1'></div>
                        </div>
                        <div className='h-6 bg-gray-100 rounded w-20'></div>
                    </div>
                    <div className='mt-3 space-y-2'>
                        <div className='h-3 bg-gray-100 rounded w-full'></div>
                        <div className='h-3 bg-gray-100 rounded w-3/4'></div>
                    </div>
                </div>
            ))}
        </>
    );
};

export default McpCardSkeleton; 