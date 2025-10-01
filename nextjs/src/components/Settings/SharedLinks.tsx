import Link from 'next/link';
import LinkIcon from '@/icons/LinkIcon';
import { dateDisplay } from '@/utils/common';
import { TabsContent } from '@radix-ui/react-tabs';
import { sharedLinksAction } from '@/actions/settings';
import { DeleteAllSharedChat, DeleteSharedChat } from './SharedAction';

const ShareItem = ({ share }) => {
    return (
        <tr>
            <td>
                <Link href={share.uri}>
                    <LinkIcon
                        width={'14'}
                        height={'14'}
                        className="fill-b5 hover:fill-b2 inline-block me-2.5"
                    />
                    {share?.chatId?.title}
                </Link>
            </td>
            <td>{dateDisplay(share.createdAt)}</td>
            <td className="text-right">
                <div className="flex items-center justify-end gap-2.5">
                    <DeleteSharedChat share={share} />
                </div>
            </td>
        </tr>
    );
};

const SharedLinksNotFound = () => {
    return (
        <tr>
            <td colSpan={3} className="text-center">No data found</td>
        </tr>
    )
}

const SharedLinks = async () => {
    const { data} = await sharedLinksAction()
    return (
        <TabsContent value="shared-links">
            <div className="overflow-x-auto bg-white mt-5">
                <table className="table remove-left-right-padding">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Date Shared</th>
                            <th className="text-right">
                                { data?.length > 0 && <DeleteAllSharedChat />}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        { data?.length > 0 ? data.map((share) => (<ShareItem share={share} key={share._id} />)) : <SharedLinksNotFound />}
                    </tbody>
                </table>
            </div>
        </TabsContent>
    );
};

export default SharedLinks;


// 'use client';
// import React, { useEffect } from 'react';
// import Link from 'next/link';
// import {
//     Tooltip,
//     TooltipContent,
//     TooltipProvider,
//     TooltipTrigger,
// } from '@/components/ui/tooltip';
// import RemoveIcon from '@/icons/RemoveIcon';
// import LinkIcon from '@/icons/LinkIcon';
// import useShareChat from '@/hooks/chat/useShareChat';
// import { dateDisplay } from '@/utils/common';
// import { TabsContent } from '@radix-ui/react-tabs';

// const SharedLinks = () => {
//     const {
//         listLoading,
//         getShareChatList,
//         shareList,
//         deleteLoading,
//         deleteShareChat,
//     } = useShareChat();

//     useEffect(() => {
//         getShareChatList();
//     }, []);

//     const handleDeleteChat = (payload) => {
//         const data = payload.isBulk
//             ? { isBulk: true }
//             : { isBulk: false, id: payload.id };
//         deleteShareChat(data);
//     };
//     return (
//         <TabsContent value="shared-links">
//             <div className="overflow-x-auto bg-white mt-5">
//                     <table className="table">
//                         <thead>
//                             <tr>
//                                 <th>Name</th>
//                                 <th>Date Shared</th>
//                                 <th className="text-right">
//                                     { shareList.length > 0 &&
//                                     <TooltipProvider
//                                         delayDuration={0}
//                                         skipDelayDuration={0}
//                                     >
//                                         <Tooltip>
//                                             <TooltipTrigger
//                                                 asChild
//                                             >
//                                                 <button
//                                                     onClick={() =>
//                                                         handleDeleteChat(
//                                                             {
//                                                                 isBulk: false,
//                                                                 // id: share._id,
//                                                             }
//                                                         )
//                                                     }
//                                                 >
//                                                     <RemoveIcon
//                                                         width={
//                                                             16
//                                                         }
//                                                         height={
//                                                             16
//                                                         }
//                                                         className={
//                                                             'w-[16px] h-[16px] object-contain fill-b4 hover:fill-red'
//                                                         }
//                                                     />
//                                                 </button>
//                                             </TooltipTrigger>
//                                                 <TooltipContent side="bottom">
//                                                     <p>
//                                                         Delete all shared links
//                                                     </p>
//                                                 </TooltipContent>                                            
//                                         </Tooltip>
//                                     </TooltipProvider>
//                                     }
                                   
//                                 </th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {listLoading
//                                 ? <tr>
//                                     <td colSpan={3}>
//                                         <div className="flex justify-center items-center h-full mt-5">
//                                             <div className="dot-flashing"></div>
//                                         </div>
//                                     </td>
//                                 </tr>                                
//                                 : shareList.length > 0 ?
//                                 shareList.map((share) => (
                                    
//                                         <tr key={share._id}>
//                                             <td>
//                                                 <Link
//                                                     href={share.uri}
//                                                 >
//                                                     <LinkIcon
//                                                         width={'14'}
//                                                         height={'14'}
//                                                         className="fill-blue hover:fill-bluehover inline-block me-2.5"
//                                                     />
//                                                     {share?.chatId?.title}
//                                                 </Link>
//                                             </td>
//                                             <td>
//                                                 {dateDisplay(share.createdAt)}
//                                             </td>
//                                             <td className="text-right">
//                                                 <div className="flex items-center justify-end gap-2.5">
//                                                     <TooltipProvider
//                                                         delayDuration={0}
//                                                         skipDelayDuration={0}
//                                                     >
//                                                         <Tooltip>
//                                                             <TooltipTrigger
//                                                                 asChild
//                                                             >
//                                                                 <button
//                                                                     onClick={() =>
//                                                                         handleDeleteChat(
//                                                                             {
//                                                                                 isBulk: false,
//                                                                                 id: share._id,
//                                                                             }
//                                                                         )
//                                                                     }
//                                                                 >
//                                                                     <RemoveIcon
//                                                                         width={
//                                                                             16
//                                                                         }
//                                                                         height={
//                                                                             16
//                                                                         }
//                                                                         className={
//                                                                             'w-[16px] h-[16px] object-contain fill-b4 hover:fill-red'
//                                                                         }
//                                                                     />
//                                                                 </button>
//                                                             </TooltipTrigger>
//                                                             <TooltipContent side="bottom">
//                                                                 <p>
//                                                                     Delete
//                                                                     Link
//                                                                 </p>
//                                                             </TooltipContent>
//                                                         </Tooltip>
//                                                     </TooltipProvider>
//                                                 </div>
//                                             </td>
//                                         </tr>
                                    
//                                 ))
//                                 : (<tr>
//                                     <td colSpan={3} align='center'>No Record Found</td>
//                                 </tr>)}
//                         </tbody>
//                     </table>
//                 </div>
//         </TabsContent>
//     );
// };

// export default SharedLinks;