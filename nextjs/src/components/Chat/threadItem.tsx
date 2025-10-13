import React, { useEffect, useState } from 'react';
import RightArrow from '@/icons/RightArrow';
import Image from 'next/image';
import { filterUniqueByNestedField, getTimeAgo } from '@/utils/common';
import { LINK } from '@/config/config';

const ThreadItem = React.memo(({ handleOpenChatModal, thread }) => {
    const [usersList, setUserList] = useState([]);

    useEffect(() => {
        if(thread.users?.length > 0){
            const data = filterUniqueByNestedField(thread.users,'id');
            setUserList(data);            
        }
    }, [thread])

    return (
        <>
            {/* Thread Replay Start */}
            {thread.count > 0 &&
                <div onClick={handleOpenChatModal} className='thread-reply group/item relative cursor-pointer w-full max-w-[32rem] mt-1 flex md:flex-nowrap flex-wrap items-center bg-transparent md:hover:bg-b15 border border-transparent md:hover:border-b10 transition-all ease-in-out py-1.5 pl-1.5 pr-7 rounded-custom'>
                    <div className='flex space-x-1'>
                        {usersList.slice(0, 6).map((item, index) => (
                            <div key={index}>
                                {item?.profile?.uri !== undefined ? (

                                    <div className='relative rounded overflow-hidden'>
                                        <Image 
                                        src={`${LINK.AWS_S3_URL}${item?.profile?.uri}`}
                                            alt={item?.profile?.name} 
                                            width={"24"} height={"24"} className='size-6 object-cover overflow-hidden rounded' />
                                        {usersList.length > 6 && <span className='flex items-center justify-center absolute top-0 left-0 w-full h-full bg-b1/15 text-b15 text-font-14 font-semibold'>+6</span>}
                                    </div>
                                ) : (
                                    <div className="relative rounded overflow-hidden">
                                        <span className="user-char flex items-center justify-center size-6 rounded-full bg-[#B3261E] text-b15 text-font-12 font-normal mr-2.5">
                                            {item.email.charAt(0)}
                                            {usersList.length > 6 && (
                                                <span className="flex items-center justify-center absolute top-0 left-0 w-full h-full bg-b1/15 text-b15 text-font-14 font-semibold">
                                                    +6
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className='text-font-14 font-bold text-b2 md:ml-2.5 max-md:mr-1'>{`${thread.count} replies`}</div>
                    <div className='relative md:flex-1 *:transition-all *:ease-out'>
                        <span className='last-reply block md:absolute md:-top-2.5 text-font-14 max-md:text-font-12 max-md:mt-1 max-md:ml-0 font-medium text-b5 ml-3.5 group-hover/item:opacity-0 group-hover/item:invisible'>{`Last reply ${getTimeAgo(thread?.last_time)}`}</span>
                        <span className='view-thread block absolute -top-2.5 text-font-14 font-medium text-b5 ml-3.5 opacity-0 invisible md:group-hover/item:opacity-100 md:group-hover/item:visible'>View Thread</span>
                    </div>

                    <RightArrow
                        width={'6'}
                        height={'12'}
                        className={
                            'fill-b6 w-1.5 h-3 object-contain absolute right-3.5 opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible'
                        }
                    />
                </div>
            }
            {/* Thread Replay End */}
        </>
    );
});

export default ThreadItem;
