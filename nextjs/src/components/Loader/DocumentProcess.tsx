import { useState, useEffect } from 'react';

const DocumentProcessing = () => {
    const messages = [
        'Document uploaded. Analyzing now.',
        'Reviewing your document for context.',
        'Extracting key insights for you.',
        'Processing your document.',
        'Compiling information. Almost done!',        
    ];

    const [currentMessage, setCurrentMessage] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessage(
                (prevMessage) => (prevMessage + 1) % messages.length
            );
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col justify-center items-center mx-auto">
            <div className="book">
			<div className="page"></div>
			<div className="page backPage"></div>
			<div className="page pageFlip"></div>
		  <div className="page pageFlip"></div>
			<div className="page pageFlip"></div>
		</div>
            <div className="bg-black px-5 py-3 rounded-lg shadow-lg text-center max-w-md animate-[fade-in_0.3s_both]">
                <p className="text-white">{messages[currentMessage]}</p>
            </div>
        </div>
    );
};

export default DocumentProcessing;





		

