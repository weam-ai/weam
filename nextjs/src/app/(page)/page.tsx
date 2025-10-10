import { RESPONSE_STATUS, RESPONSE_STATUS_CODE } from '@/utils/constant';
import { fetchAiModal } from '@/actions/modals';
import { getSubscriptionStatusAction } from '@/actions/chat';
import { HomeAiModelWrapper, HomeChatInputWrapper, RefreshTokenClientWrapper } from '@/components/Chat/ChatWrapper';

export default async function Home() {
    const [aiModals] = await Promise.all([
        fetchAiModal()
    ])
        
    const modelSequence = aiModals.status === RESPONSE_STATUS.SUCCESS && aiModals.data.length > 0 ? aiModals.data : [];
    return (
        <div className="h-full flex flex-col">
            {aiModals.status === RESPONSE_STATUS.FORBIDDEN && aiModals.code === RESPONSE_STATUS_CODE.REFRESH_TOKEN && <RefreshTokenClientWrapper />}
            {
                aiModals.status === RESPONSE_STATUS.SUCCESS && (
                    <>
                        <HomeAiModelWrapper aiModals={modelSequence} />
                        <HomeChatInputWrapper aiModals={modelSequence} />
                    </>
                )
            }
        </div>
    );
}
