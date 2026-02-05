import { useSelector } from "react-redux";
import ChatUploadedFiles from "../ChatUploadedFiles";
import Image from 'next/image';
import { LINK } from "@/config/config";
import { displayName } from "@/utils/common";


const replayCountText = (count) => {
    if (count == 1) {
        return `${count} reply`
    } else if (count > 1) {
        return `${count} replies`
    }
}
const ThreadMainQuestionContent:any = () => {
    const thread = useSelector((store:any) => store.chat.thread);
    const content = thread.selectedContent;
    const totalThread = thread.data.length;
    
    return <>
        <div className="relative group flex flex-1 text-font-16 mx-auto gap-3 px-5 rounded-10 md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem] transition ease-in-out duration-150">
            <div className="relative flex flex-col flex-shrink-0">
                <div className="pt-0.5">
                    <div className="relative flex size-[25px] items-center justify-center overflow-hidden rounded-full">
                        {content?.user?.profile?.uri ? (
                            <Image
                                src={`${LINK.AWS_S3_URL}${content?.user?.profile?.uri}`}
                                alt={displayName(content?.user)}
                                loading="lazy"
                                width="25"
                                height="25"
                                className="rounded-full size-[25px] object-cover"
                            />
                        ) : (
                            <span className="user-char flex items-center justify-center size-[25px] rounded-full bg-[#B3261E] text-b15 leading-none uppercase text-font-16 font-normal">
                                {content?.user?.email.charAt(0)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative flex w-full flex-col">
                <div className="font-bold select-none mb-1">
                    {`${content?.user?.fname} ${content?.user?.lname}`}
                </div>
                <div className="flex-col gap-1 md:gap-3">
                    <div className="flex flex-grow flex-col max-w-full">
                        <div className="min-h-5 text-message flex flex-col items-start gap-3 break-words [.text-message+&]:mt-5 overflow-x-auto">
                            <ChatUploadedFiles
                                media={
                                    content?.media
                                }
                                customGptId={
                                    content?.customGptId
                                }
                                customGptTitle={
                                    content?.customGptTitle
                                }
                                workflow={content?.workflow}
                            />
                            <div className="chat-content max-w-none w-full break-words text-font-16 leading-7 tracking-[0.16px]">
                                {
                                    content?.message
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {totalThread > 0 &&
            <div className="flex items-center px-3">
                <div className="flex-1 h-0.5 bg-gray-300"></div>
                <div className="px-4 text-gray-600">{replayCountText(totalThread)}</div>
                <div className="flex-1 h-0.5 bg-gray-300"></div>
            </div>
        }
    </>
}

export default ThreadMainQuestionContent;