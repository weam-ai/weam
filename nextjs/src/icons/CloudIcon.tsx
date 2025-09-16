import React from 'react';

interface CloudIconProps {
    className?: string;
    height?: number;
    width?: number;
}

const CloudIcon: React.FC<CloudIconProps> = ({ className, height = 24, width = 24 }) => {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M18 10.5C18 7.46 15.54 5 12.5 5C9.46 5 7 7.46 7 10.5C7 10.5 7 10.5 7 10.5C4.24 10.5 2 12.74 2 15.5C2 18.26 4.24 20.5 7 20.5H17C19.76 20.5 22 18.26 22 15.5C22 12.74 19.76 10.5 17 10.5C17 10.5 17 10.5 17 10.5"
            />
            <path
                d="M12 15L12 9"
            />
            <path
                d="M9 12L12 15L15 12"
            />
        </svg>
    );
};

export default CloudIcon;
