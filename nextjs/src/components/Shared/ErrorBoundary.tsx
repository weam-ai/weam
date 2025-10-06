'use client';
import React, { useState, useEffect, useCallback } from 'react';

type ErrorBoundaryProps = {
    children: React.ReactNode;
};

const ErrorBoundary = ({ children }: ErrorBoundaryProps) => {
    const [hasError, setHasError] = useState(false);

    const errorHandler = useCallback((event: ErrorEvent) => {
        // setHasError(true);
        console.error('Error caught:', {
            message: event.message,
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error
        });
    }, []);

    const rejectionHandler = useCallback((event: PromiseRejectionEvent) => {
        // setHasError(true);
        console.error('Promise rejection caught:', {
            reason: event.reason,
            promise: event.promise
        });
    }, []);

    useEffect(() => {
        const abortController = new AbortController();
        
        window.addEventListener('error', errorHandler, { signal: abortController.signal });
        window.addEventListener('unhandledrejection', rejectionHandler, { signal: abortController.signal });

        return () => {
            abortController.abort();
        };
    }, [errorHandler, rejectionHandler]);

    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-900">
                <div className="text-center px-6 py-12">
                    <h2 className="text-3xl md:text-4xl font-bold mt-4">
                        Something went wrong!
                    </h2>
                    <p className="text-gray-100 -mb-6">Top ErrorBoundary.tsx</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 inline-block btn btn-black"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default ErrorBoundary;
