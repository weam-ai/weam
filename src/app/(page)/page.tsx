import { RESPONSE_STATUS } from '@/utils/constant';
import { fetchAiModal } from '@/actions/modals';
import { getSubscriptionStatusAction } from '@/actions/chat';
import { HomeAiModelWrapper, HomeChatInputWrapper } from '@/components/Chat/ChatWrapper';
import { ClientFallback } from '@/components/ClientFallback';
import { CSRFReloadWrapper } from '@/components/CSRFReloadWrapper';



export default async function Home() {
    let aiModals, subscriptionStatus;
    
    try {
        [aiModals, subscriptionStatus] = await Promise.all([
            fetchAiModal(),
            getSubscriptionStatusAction()
        ]);
    } catch (error) {
        console.error("🚀 ~ Home ~ Error:", error);
        // If server-side fails due to cookies, fall back to client-side rendering
        return <ClientFallback />;
    }
    
    const modelSequence = aiModals.status === RESPONSE_STATUS.SUCCESS && aiModals.data.length > 0 ? aiModals.data : [];
    return (
        <CSRFReloadWrapper aiModals={aiModals} subscriptionStatus={subscriptionStatus}>
            <div className="h-full flex flex-col">
                {/* {aiModals.status === RESPONSE_STATUS.FORBIDDEN && aiModals.code === RESPONSE_STATUS_CODE.REFRESH_TOKEN && <RefreshTokenClientWrapper />} */}
                {
                    aiModals.status === RESPONSE_STATUS.SUCCESS && (
                        <>
                            <HomeAiModelWrapper aiModals={modelSequence} />
                            <HomeChatInputWrapper aiModals={modelSequence} subscriptionStatus={subscriptionStatus.data}/>
                        </>
                    )
                }
                {/* Show error state if both actions fail */}
                {aiModals.status === RESPONSE_STATUS.ERROR && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-red-500">Failed to load content. Please refresh the page.</p>
                    </div>
                )}
            </div>
        </CSRFReloadWrapper>
    );
}
