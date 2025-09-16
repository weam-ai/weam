'use client';
import useShareChat from '@/hooks/chat/useShareChat';
import Image from 'next/image';
import React, { Fragment, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChatResponse from '@/components/Chat/ChatResponse';
import { useResponseUpdate } from '@/hooks/chat/useResponseUpdate';
import ChatUploadedFiles from '@/components/Chat/ChatUploadedFiles';
import ProfileImage from '@/components/Profile/ProfileImage';
import { displayName, getModelImageByCode } from '@/utils/common';
import ThreeDotLoader from '@/components/Loader/ThreeDotLoader';
import PageNotFound from '@/components/Shared/PageNotFound';
import { API_TYPE_OPTIONS } from '@/utils/constant';
import RenderAIModalImage from '@/components/Chat/RenderAIModalImage';
import ProAgentQuestion from '@/components/Chat/ProAgentQuestion';
import { getDisplayModelName } from '@/utils/helper';

const PublicChat = () => {
    const params = useParams();
    const { viewChat, viewLoading, viewShareChat } = useShareChat();
    
    // Response update functionality for public chat
    const { handleResponseUpdate } = useResponseUpdate({
        onUpdateResponse: async (messageId: string, updatedResponse: string) => {
            // For public chat, we might want to show a toast or handle differently
            console.log('Public chat response updated:', { messageId, updatedResponse });
        }
    });
    
    useEffect(() => {
        viewShareChat(params.id);
    }, []);
    return (
        <div className="h-full md:p-5 p-3 mx-auto w-full">
            <div className="h-full overflow-y-auto w-full max-h-[100dvh]">
                {/* Chat Start*/}
                {/* Shared Chat start*/}
                <div className="chat-wrap flex flex-col flex-1 pb-8 pt-4">
                    {/* Chat item Start*/}
                    {viewLoading
                        ? <ThreeDotLoader/>
                        : viewChat?.conversation.length > 0 ?
                          viewChat.conversation.map((conversation, index) => {
                              return (
                                  <Fragment key={index}>
                                      <div className="chat-item w-full md:px-4 px-1 py-2 md:gap-6 m-auto md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                                        <div className="relative group bg-slate-100 flex flex-1 text-font-16 text-b2 ml-auto gap-3 p-5 rounded-10 transition ease-in-out duration-150 md:max-w-[30rem] lg:max-w-[38rem] xl:max-w-[40rem]">
                                            <div className="relative flex">
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
                                                        {displayName(conversation?.user)}
                                                      </div>
                                                      <div className="flex-col gap-1 md:gap-3">
                                                          <div className="flex flex-grow flex-col max-w-full">
                                                              <div className="min-h-[20px] text-message flex flex-col items-start gap-3 break-words [.text-message+&]:mt-5 overflow-x-auto">
                                                                    <ChatUploadedFiles
                                                                        media={conversation?.cloneMedia}
                                                                        customGptId={conversation?.cloneCustomGptId}
                                                                        customGptTitle={conversation?.cloneCustomGptTitle}
                                                                    />
                                                                    <div className="">
                                                                        { conversation?.responseAPI == API_TYPE_OPTIONS.PRO_AGENT &&
                                                                            <ProAgentQuestion proAgentData={conversation?.proAgentData} />
                                                                        }
                                                                        { conversation?.responseAPI != API_TYPE_OPTIONS.PRO_AGENT && 
                                                                            conversation.message
                                                                        }
                                                                    </div>
                                                              </div>
                                                          </div>
                                                      </div>
                                            </div>
                                        </div>
                                      </div>
                                      <div className="chat-item w-full md:px-4 px-1 py-2 md:gap-6 m-auto md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                                        <div className="relative group flex flex-1 text-font-16 text-b2 mx-auto gap-3 p-5 rounded-10 transition ease-in-out duration-150">
                                            <div className="relative flex">
                                                <RenderAIModalImage
                                                    src={conversation?.responseAPI === API_TYPE_OPTIONS.OPEN_AI_CUSTOM_GPT_WITH_DOC ? getModelImageByCode(conversation.responseModel, true) : getModelImageByCode(conversation?.model?.code || conversation?.responseAPI)}
                                                    alt={conversation?.responseModel}
                                                />
                                            </div>
                                            <div className="relative flex w-full flex-col">
                                                    <div className="font-bold select-none mb-1">
                                                        {getDisplayModelName(conversation.responseModel)}
                                                    </div>
                                                    <div className="flex-col gap-1 md:gap-3">
                                                        <div className="flex flex-grow flex-col max-w-full">
                                                            <div className="flex flex-col items-start gap-4 break-words overflow-x-auto min-h-[20px]">
                                                                <div className="chat-content max-w-none w-full break-words text-font-16 leading-[28px] tracking-[0.16px]">
                                                                    <ChatResponse
                                                                        conversations={viewChat}
                                                                        i={index}
                                                                        m={conversation}
                                                                        privateChat={false}
                                                                        onResponseUpdate={handleResponseUpdate}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                            </div>
                                        </div>
                                      </div>
                                  </Fragment>
                              );
                          }) : <PageNotFound/> }
                </div>
                {/* Shared Chat End */}
                {/* chat End */}
            </div>
        </div>
    );
};

export default PublicChat;
