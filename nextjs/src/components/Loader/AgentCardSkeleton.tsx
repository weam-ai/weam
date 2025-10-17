import React from 'react';

type AgentCardSkeletonProps = {
    count?: number;
};

const AgentCardSkeleton: React.FC<AgentCardSkeletonProps> = ({
    count = 5,
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="btn btn-outline-gray py-2 flex items-center justify-center gap-x-2 animate-pulse cursor-default"
                >
                    {/* Icon skeleton */}
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    {/* Text skeleton */}
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
            ))}
        </>
    );
};

export default AgentCardSkeleton;
