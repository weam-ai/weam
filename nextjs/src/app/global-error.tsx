'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        console.log('Global Error:', error);
    }, [error]);
    return (
        <html>
            <body className="min-h-screen flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
                <p className="text-gray-600 mb-6">Our team has been notified and will fix this issue as soon as possible.</p>
                <a
                    href="/"
                    className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition"
                >
                    Go Home
                </a>
            </body>
        </html>
    );
}