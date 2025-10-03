import React from 'react';

const PageNotFound = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-800">404</h1>
                <p className="text-gray-500 mt-2">
                    Oops! The page you’re looking for has been deleted or moved. The link is no longer available.
                </p>
                <a
                    href="/"
                    className="mt-6 btn btn-black"
                >
                    Go Home
                </a>
            </div>
        </div>
    );
};

export default PageNotFound;
