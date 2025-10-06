'use client';
import dynamic from 'next/dynamic';

const ChatAccessControl = dynamic(
    () => import('@/components/Chat/ChatClone'),
    {
        ssr: false,
    }
);

const ChatItem = dynamic(
    () => import('@/components/Chat/ChatItem'),
    {
        ssr: false,
    }
);

const RefreshTokenClient = dynamic(
    () => import('@/components/Shared/RefreshTokenClient'),
    {
        ssr: false,
    }
);
const HomeChatInput = dynamic(
    () => import('@/components/Chat/ChatInput'),
    {
        ssr: false,
    }
);

const HomeAiModel = dynamic(
    () => import('@/components/Header/HomeAiModel'),
    {
        ssr: false,
    }
);


export const ChatCloneWrapper = () => {
    return <ChatAccessControl />;
};

export const ChatItemWrapper = () => {
    return <ChatItem />;
};

export const RefreshTokenClientWrapper = () => {
    return <RefreshTokenClient />;
};

export const HomeChatInputWrapper = ({ aiModals }) => {
    // Only render ChatInput if AI models are properly loaded
    // if (!aiModals || aiModals.length == 0) {
    //     return (
    //         <div className="w-full h-full overflow-y-auto flex justify-center">
    //             <div className="w-full flex flex-col max-lg:flex-col-reverse mx-auto px-5 md:max-w-[90%] lg:max-w-[980px] xl:max-w-[1100px]">
    //                 <div className="flex items-center justify-center h-32">
    //                     <div className="text-font-14 text-b6">Loading AI models...</div>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    return <HomeChatInput aiModals={aiModals} />;
};

export const HomeAiModelWrapper = ({ aiModals }) => {
    return <HomeAiModel aiModals={aiModals} />;
};