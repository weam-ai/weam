import React from 'react';
import Lottie from "lottie-react";
import loaderAnimation from '../loader.json';

interface StreamLoaderProps {
    className?: string;
    size?: number;
    loop?: boolean;
    removeWhitespace?: boolean;
    cropAmount?: number; // Amount to crop from each side
    variant?: 'default' | 'compact' | 'large'; // Predefined variants
}

const StreamLoader = ({ 
    className = 'flex justify-center items-center h-full mt-5',
    size, // Will be overridden by variant if provided
    loop = true,
    removeWhitespace = true,
    cropAmount = 40, // Increased crop amount for better whitespace removal
    variant = 'default'
}: StreamLoaderProps) => {
    // Predefined sizes for different variants
    const variantSizes = {
        compact: 70,
        default: 150,
        large: 250
    };

    const finalSize = size || variantSizes[variant];

    return (
        <div className={className}>
            <div 
                className={removeWhitespace ? 'overflow-hidden' : ''}
                style={removeWhitespace ? {
                    width: finalSize,
                    height: finalSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                } : {}}
            >
                <Lottie
                    animationData={loaderAnimation}
                    loop={loop}
                    style={{
                        width: finalSize + (removeWhitespace ? cropAmount * 2 : 0),
                        height: finalSize + (removeWhitespace ? cropAmount * 2 : 0),
                        margin: removeWhitespace ? `-${cropAmount}px` : '0',
                        transform: removeWhitespace ? 'scale(1.3)' : 'scale(1)', // Increased scale for better fill
                        objectFit: 'cover', // Ensure the animation fills the container
                        maxWidth: 'none', // Allow scaling beyond container
                        maxHeight: 'none'
                    }}
                />
            </div>
        </div>
    );
};

export default StreamLoader;
