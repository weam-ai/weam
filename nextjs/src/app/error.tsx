'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {

    useEffect(() => {
        console.error('Top Level Error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-gray-100 text-gray-900">
            <div className="text-center px-6 py-12">
                <h2 className="text-font-22 font-bold mt-4">
                    Something went wrong!
                </h2>
                <p className="text-font-16 text-gray-600 mt-2">
                    An unexpected error occurred. Please try again later. 
                </p>
                <p className="text-gray-100 -mb-5">Top Error.tsx</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn btn-black"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
