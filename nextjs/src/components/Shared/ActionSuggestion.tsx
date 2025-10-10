import Link from 'next/link';
import React from 'react';

const ActionSuggestion = ({ title, description, subtitle, note, linktext, href, videourl}:any) => {
    return (
        <div className='w-full flex md:flex-row flex-col gap-8 items-center mt-5 px-7 py-5 border-[2px] rounded-lg border-b-[5px]'>
            <div className='flex-1 w-full'>
                <div className='relative pb-[50%] h-0 '>
                    <iframe width="100%" height="350" className='w-full absolute top-0 left-0 h-full rounded-md' src={videourl} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
                </div>
            </div>
            <div className='flex-1'>
                <h2 className='font-bold text-font-18'>{title}</h2>
                <p className='text-font-14 text-b5'>{description}</p>
                {subtitle && <h3 className='font-bold mt-3'>{subtitle}</h3>}
                {note && <p className="text-font-14 text-b5" dangerouslySetInnerHTML={{ __html: note }} />}
                {linktext && href && (
                    <Link className="text-font-14 text-b2 mt-3 inline-block font-bold" href={href}>
                        {linktext}
                    </Link>
                )}
                
            </div>
        </div>
    );
};

export default ActionSuggestion;
