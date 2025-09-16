import { ConversationType } from '@/types/chat'
import React, { memo } from 'react'
import ChatUploadedFiles from './ChatUploadedFiles'
import ProfileImage from '../Profile/ProfileImage'
import { API_TYPE_OPTIONS } from '@/utils/constant'
import ProAgentQuestion from './ProAgentQuestion'

type EmptyChatConversationProps = {
    emptyChatConversation: ConversationType[]
}

type EmptyChatQuestionProps = {
    conversation: ConversationType;
}

type EmptyChatProAgentQuestionProps = {
    conversation: ConversationType;
}

const EmptyChatProAgentQuestion = ({ conversation }: EmptyChatProAgentQuestionProps) => {
    return (
        <div className="chat-content max-w-none w-full break-words text-font-16 leading-7 tracking-[0.16px] whitespace-pre-wrap">
            {conversation?.responseAPI == API_TYPE_OPTIONS.PRO_AGENT &&
                <ProAgentQuestion proAgentData={conversation?.proAgentData} />
            }
            {conversation?.responseAPI != API_TYPE_OPTIONS.PRO_AGENT &&
                conversation?.message
            }
        </div>
    )
}

const EmptyChatQuestion = ({ conversation }: EmptyChatQuestionProps) => {
    return (
        <div className='h-full w-full'>
            <div className="chat-item w-full px-4 lg:gap-6 m-auto md:max-w-[90vw] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                <div className="relative group bg-gray-100 flex flex-1 text-font-16 text-b2 ml-auto gap-3 rounded-10 transition ease-in-out duration-150 md:max-w-[30rem] xl:max-w-[36rem] px-3 pt-4 pb-6">
                    <div className="relative flex flex-col flex-shrink-0">
                        <div className="pt-0.5">
                            <div className="relative flex size-[25px] justify-center overflow-hidden rounded-full">
                                <ProfileImage user={conversation?.user} w={25} h={25}
                                    classname={'user-img w-[25px] h-[25px] rounded-full object-cover'}
                                    spanclass={'user-char flex items-center justify-center size-6 rounded-full bg-[#B3261E] text-b15 text-font-12 font-normal'}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="relative flex w-full flex-col">
                        <div className="font-bold select-none mb-1">
                            {`${conversation?.user.fname} ${conversation?.user.lname}` || conversation?.user.email.split('@')[0]}
                        </div>
                        <div className="flex-col gap-1 md:gap-3">
                            <div className="flex flex-grow flex-col max-w-full">
                                <div className="min-h-5 text-message flex flex-col items-start gap-3  break-words [.text-message+&]:mt-5 overflow-x-auto">
                                    <ChatUploadedFiles
                                        media={conversation?.cloneMedia}
                                        customGptId={conversation?.customGptId}
                                        customGptTitle={conversation?.customGptTitle}
                                        gptCoverImage={conversation?.coverImage}
                                    />
                                    <EmptyChatProAgentQuestion conversation={conversation} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const EmptyChatConversation = ({ emptyChatConversation }: EmptyChatConversationProps) => {
    return (
        <>
            {
                emptyChatConversation.length > 0 &&
                emptyChatConversation.map((conversation, index) => (
                    <EmptyChatQuestion key={index} conversation={conversation} />
                ))
            }
        </>
    )
}

export default memo(EmptyChatConversation)