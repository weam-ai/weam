import React, { useEffect, useRef, useState } from 'react';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import Image from 'next/image';
import FileIcon from '../../../public/file-icon.svg';
import Close from '@/icons/Close';
import AttachFileIcon from '@/icons/AttachFileIcon';
import UpLongArrow from '@/icons/UpLongArrow';
import { useDispatch } from 'react-redux';
import {
    setIsOpenThreadModalAction,
    setThreadAction,
} from '@/lib/slices/chat/chatSlice';
import { useSelector } from 'react-redux';
import useThread from '@/hooks/chat/useThread';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/utils/handleAuth';
import useSocket from '@/utils/socket';
import { SOCKET_EVENTS, THREAD_MESSAGE_TYPE } from '@/utils/constant';
import InitialThreadScreenLoading from '../Loader/InitialThreadScreenLoading';
import useAttachmentUpload from '@/hooks/common/useAttachmentUpload';
import { LINK } from '@/config/config';
import { filterUniqueByNestedField, getDocType, getTimeAgo, formatDate } from '@/utils/common';
import Loader from '../ui/Loader';
import ThreadMainQuestionContent from '@/components/Chat/Thread/MainQuestionContent'
import ThreadMainAnswerContent from '@/components/Chat/Thread/MainAnswerContent'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import MentionInput from './MentionInput';
import { useRouter,useSearchParams } from 'next/navigation';
import routes from '@/utils/routes';
import { decryptedData } from '@/utils/helper';
import { RootState } from '@/lib/store';



const returnHtmlContent = (content) => {
    return content.replace(/@([A-Za-z0-9_]+)\s+([^@\s]*)/g, (match, username, trailingText) => {
        return `<span data-username="${username}" style="color: #6637EC; font-weight: bold; font-size: 14px; padding: 0 4px;">@${username} ${trailingText}</span>`;
    });
}


export const TypingTextSection = ({ typingUsers }) => {
    let text = '';
    if (typingUsers.length == 1) {
        text = `${typingUsers[0].fname} ${typingUsers[0].lname} is typing....`
    } else if (typingUsers.length == 2) {
        text = `${typingUsers[0].fname} ${typingUsers[0].lname} and ${typingUsers[1].fname} ${typingUsers[1].lname} are typing....`
    } else {
        text = `several user typing....`
    }
    return (
        <>
            <p className="px-2 text-font-14">{text}</p>
        </>
    )
}

const ImageSection = ({ item }) => {
    return (
        <div className="min-h-5 text-message flex flex-col items-start gap-3 whitespace-pre-wrap break-words [.text-message+&]:mt-5 overflow-x-auto">
            {item.map((media) => (
                <>
                    {media?.mime_type?.split('/')[0] === 'image' ? (
                        <>
                            <div className="overflow-hidden rounded-10 w-full h-full max-h-40">
                                <div className="relative h-auto w-full">
                                    <Image
                                        alt="Uploaded image"
                                        src={`${LINK.AWS_S3_URL}/${media?.uri}`}
                                        loading="lazy"
                                        width={50}
                                        height={50}
                                        className="object-cover object-center overflow-hidden rounded-lg max-w-full w-auto max-h-40 transition-opacity duration-300"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 relative border border-b12 group-hover:border-b10 p-2 rounded-10">
                                <div className="attach-img w-10 min-w-10 h-10 rounded-custom overflow-hidden">
                                    {getDocType(media?.mime_type)}
                                </div>
                                <div className="attach-item-content">
                                    <span className="block text-b2 text-font-14 font-bold overflow-hidden whitespace-nowrap text-ellipsis max-w-[180px]">
                                        {media?.name}
                                    </span>
                                    <span className="text-font-14 text-b8">
                                        {media?.mime_type}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </>
            ))}
        </div>
    );
};
const ThreadItem = ({ item, currentUser, threadId }) => {
    const handleHover = (event) => {
        const username = event.target.dataset.username;
        if (username) {
            // Implement your hover logic here (e.g., show user details, tooltip, etc.)
        }
    }
    return (
        <div className="px-2.5 py-2 justify-center text-font-16 text-b2 m-auto" style={{backgroundColor: (item?._id == threadId) ? "#f2f2f2" : ""}}>
            <div className="relative group flex flex-1 text-font-16 mx-auto gap-3 p-3 rounded-[10px] transition ease-in-out duration-150">
                <div className="flex-shrink-0 flex flex-col relative items-end">
                    <div className="pt-0.5">
                        <div className="relative flex size-[25px]  justify-center overflow-hidden rounded-full">
                            {item.sender?.profile?.uri ? (
                                <Image
                                    src={`${LINK.AWS_S3_URL}${item.sender.profile.uri}`}
                                    alt={item.sender.fname}
                                    loading="lazy"
                                    width="25"
                                    height="25"
                                    className="rounded-full size-[25px] object-cover"
                                />
                            ) : (
                                <span className="user-char flex items-center justify-center size-[25px] rounded-full bg-[#B3261E] text-b15 leading-none uppercase text-font-16 font-normal">
                                    {item?.sender?.email?.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="relative flex w-full flex-col">
                    <div className="select-none mb-1">
                        <span className='font-bold'>{`${item.sender?.fname} ${item.sender?.lname}`}</span>
                        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href="#">
                                        <span className='text-font-12 ml-1'>{getTimeAgo(item?.createdAt)}</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>{formatDate(item?.createdAt)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex-col gap-1 md:gap-3">
                        <div className="flex flex-grow flex-col max-w-full">
                            <div className="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wrap break-words [.text-message+&]:mt-5 overflow-x-auto">
                                {item.attachment.length > 0 && (
                                    <ImageSection item={item.attachment} />
                                )}
                                <div className="preview" onMouseOver={handleHover} dangerouslySetInnerHTML={{ __html: returnHtmlContent(decryptedData(item.content)) }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChatThreadOffcanvas = ({ queryParams, isBrainDeleted }) => {
    const [typingUsers, setTypingUsers] = useState([]);

    const dispatch = useDispatch();
    const params = useParams();
    const searchParams = useSearchParams();
    const user = getCurrentUser();
    const { addNewThread } = useThread();
    const messagesEndRef = useRef(null);
    const [showSearchList, setShowSearchList] = useState(false);
    const [content, setContent] = useState('');
    const [tagUsers, setTagUsers] = useState([]);


    const isOpenThreadModal = useSelector(
        (store:RootState) => store.chat.isOpenThreadModal
    );
    const thread = useSelector((store:RootState) => store.chat.thread);
    const chatMembers = useSelector((store:RootState) => store.chat.members);
    const { isLoading, getListReplyThread } = useThread();
    const router = useRouter();
    const [filterMembers, setFilterMembers] = useState([]);
    // const [currentPosition, setCurrentPosition] = useState('');

    useEffect(() => {
        if (isOpenThreadModal) {
            getListReplyThread({
                messageId: thread.messageId || queryParams.get('mid'),
                type: thread.type,
            });
            setTagUsers([]);
            setContent('');
            setShowSearchList(false);
            
            const filterIdSet=new Set()
            for(const currentUser of chatMembers){
                if(currentUser.user?.id && !filterIdSet.has(currentUser.user.id) && !currentUser.teamName){
                    filterIdSet.add(currentUser.user.id);
                    setFilterMembers((prev)=>[...prev,currentUser.user]);
                }
                else if(currentUser.teamName){
                    for(const currTeamUser of currentUser.teamUsers){
                        if(currTeamUser?.id && !filterIdSet.has(currTeamUser.id)){
                            filterIdSet.add(currTeamUser.id);
                            setFilterMembers((prev)=>[...prev,currTeamUser]);
                        }
                    }
                }
            }
        }
    }, [isOpenThreadModal]);


    useEffect(()=>{
        if (messagesEndRef.current) {
            setTimeout(() => {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth'});
            }, 100);
        }
    },[thread])

    const {
        handleFileChange,
        fileInputRef,
        isFileUploading,
        uploadedFiles,
        resetMediaUpload,
        removeUploadedFile,
    } = useAttachmentUpload();

    const isSubmitDisabled = content.trim() === '' && uploadedFiles.length == 0;

    const handleAttachButtonClick = () => {
        fileInputRef.current.click();
    };

    const createNewThread = async (payload) => {
        const nextIndex = thread?.data?.length + 1 || 1;

        addNewThread(nextIndex, payload);
        setContent('');
        setShowSearchList(false);
        resetMediaUpload();
    };

    const handleSubmit = (e) => {
       
        if (!isFileUploading) {
            // Use a regular expression to find and replace the pattern
            const outputText = content.replace(/@\[(.*?)\]\(\w+\)/g, "$1");

            createNewThread({
                content: outputText.trim(),
                chatId: params.id,
                messageId: thread.messageId,
                type: thread.type,
                attachment: uploadedFiles.map((item) => ({
                    ...item.meta_data,
                })),
                tagusers: tagUsers.map((user) => user._id),
            });
            setTagUsers([]);
        }
    };

    // const handleKeyDown = useCallback(
    //     async (e) => {
    //         if (
    //             (content.trim() !== '' || uploadedFiles.length > 0) &&
    //             e.key == 'Enter' &&
    //             !isFileUploading &&
    //             !e.shiftKey
    //         ) {
    //             e.preventDefault();
    //             createNewThread({
    //                 content: content.trim(),
    //                 chatId: params.id,
    //                 messageId: thread.messageId,
    //                 type: thread.type,
    //                 attachment: uploadedFiles.map((item) => ({
    //                     ...item.meta_data,
    //                 })),
    //                 tagusers: tagUsers.map((user) => user._id),
    //             });
    //             setTagUsers([]);
    //         }
    //     },
    //     [content, uploadedFiles]
    // );

    
    const closeModal = () => {
        dispatch(setIsOpenThreadModalAction(false));
        dispatch(setThreadAction({}));
        const b = searchParams.get('b');
        const model = searchParams.get('model');
        router.push(`${routes.chat}/${params?.id}?b=${b}&model=${model}`, { scroll: false });
    };

    // // Socket Configuration
    const socket = useSocket();
    const currentUser = getCurrentUser();

    const emitTyping = (user, typing) => {
        socket.emit(SOCKET_EVENTS.ON_TYPING_THREAD, {
            messageId: thread.messageId,
            user,
            type: thread.type,
            typing,
        });
    };

    const onTyping = () => {
        if (socket) {
            emitTyping(currentUser, true);
            clearTimeout(typingTimeout);
            var typingTimeout = setTimeout(() => {
                emitTyping(currentUser, false);
            }, 1000);
        }
    };

    // const showMentionUser = (val, currentposition) => {
    //     const mention = getCurrentTypingMention(val, currentposition);
    //     const searchedMembers = filterUsersByKeyword(chatMembers, mention);
        
    //     setFilterMembers(searchedMembers);

    //     if (mention.length > 1)
    //         setShowSearchList(true);
    //     else
    //         setShowSearchList(false);
    // }

    useEffect(() => {
        if (socket) {

            if (thread.messageId) {
                socket.emit(SOCKET_EVENTS.JOIN_THREAD_ROOM, {
                    messageId: thread.messageId,
                    type: thread.type,
                    userId: currentUser._id
                });

                socket.on(
                    SOCKET_EVENTS.ON_TYPING_THREAD,
                    ({ user, typing }) => {
                        if (typing && currentUser._id != user._id) {
                            setTypingUsers((prevUsers) => filterUniqueByNestedField([...prevUsers, user], 'id'));
                        } else {
                            setTypingUsers((prevUsers) =>
                                prevUsers.filter(
                                    (preUser) => preUser._id !== user._id
                                )
                            );
                        }
                    }
                );
            }

            const disConnect = () => {
                socket.off(SOCKET_EVENTS.ON_TYPING_THREAD);
                socket.emit(SOCKET_EVENTS.LEAVE_THREAD_ROOM, {
                    messageId: thread.messageId,
                    type: thread.type,
                    userId: currentUser._id
                });
            };

            return () => {
                disConnect();
                resetMediaUpload();
            };
        }
    }, [socket, isOpenThreadModal]);
    // End Socket Configuration

    // const handleTagUser = useCallback(
    //     (member, content, currentPosition) => {
    //         const membername = `${member.user.fname} ${member.user.lname}`;
    //         const currentword = getWordAtCursor(content, currentPosition);
            
    //         const newcontent = content.replace(currentword, '@' + membername);

    //         if (!tagUsers.includes(membername)) {
    //             setTagUsers([
    //                 ...tagUsers,
    //                 { email: membername, _id: member.user.id },
    //             ]);
    //             setContent(newcontent);
    //             // setContent((prev) => prev + `${membername.split('@')[0]} `);
    //         }
    //         setShowSearchList(false);
    //         setFilterMembers(chatMembers);
    //     },
    //     [tagUsers]
    // );


    return (
        <Sheet open={isOpenThreadModal} onOpenChange={closeModal}>
            <SheetContent
                className="sm:max-w-md"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex flex-col h-svh">
                    {/*offcanvas Header start */}
                    <div className="flex items-center justify-between p-4">
                        <h5
                            className="mb-0 text-font-16 font-bold text-b2"
                            id="threadChatOffcanvasLabel"
                        >
                            {' '}
                            Thread
                        </h5>
                        <div className="offcanvas-header-right ml-auto flex items-center gap-2.5">
                            {/* Close start */}
                            <SheetClose asChild>
                                <button
                                    type="button"
                                    aria-labelledby="close"
                                    className="md:w-10 md:h-10 md:min-w-10 w-8 h-8 rounded-full p-1 flex items-center justify-center border border-b11 hover:bg-b11"
                                >
                                    <Close
                                        width={'16'}
                                        height={'16'}
                                        className="fill-b2 md:h-4 md:w-4 w-3 h-3 object-contain"
                                    />
                                </button>
                            </SheetClose>
                            {/* Close End */}
                        </div>
                    </div>
                    <div className='overflow-y-auto h-full flex flex-col'>
                        <div className=''>
                            {thread.type == THREAD_MESSAGE_TYPE.QUESTION && <ThreadMainQuestionContent content={thread.selectedContent} />}
                            {thread.type == THREAD_MESSAGE_TYPE.ANSWER && <ThreadMainAnswerContent content={thread.selectedContent} />}
                        </div>
                        {/*offcanvas Header End */}

                        {/*offcanvas Body start */}
                        {isLoading ? (
                            [...Array(4)].map((_, index) => (
                                <InitialThreadScreenLoading key={index} />
                            ))
                        ) : (
                            <div className="modal-body flex flex-col flex-1 relative ">
                                <div className="w-full h-full ">
                                    {/* chat start */}
                                    <div className="chat-wrap flex flex-col flex-1 pb-9 h-full overflow-y-auto">
                                        {/* Chat item Start */}
                                        {thread?.data?.map((item, index) => (
                                            <div key={index} className="chat-item w-full">
                                                <ThreadItem
                                                    item={item}
                                                    currentUser={user}
                                                    threadId={queryParams.get('tid')}
                                                />
                                            </div>
                                        ))}
                                        {/* Empty div to act as a scroll target */}
                                        <div ref={messagesEndRef} />
                                        {/* Chat item End */}
                                    </div>
                                    {/* chat End */}
                                </div>
                                {/* Text Editor Start */}
                                <div className="px-5 pt-6 pb-5 sticky bottom-0 bg-white">
                                
                                    {typingUsers.length > 0 && (
                                        <TypingTextSection typingUsers={typingUsers} />
                                    )}
                                    {/* {showSearchList &&
                                        filterMembers.length > 0 &&
                                        filterMembers.map((member) => (
                                            <div
                                                key={member._id}
                                                className={`gpt-list-item border rounded-10 cursor-pointer flex justify-between p-2 transition-all ease-in-out`}
                                            >
                                                <div
                                                    className="flex items-center flex-1 hover:bg-gray-100 p-2"
                                                    onClick={() =>
                                                        handleTagUser(member, content, currentPosition)
                                                    }
                                                >
                                                    <img
                                                        src={`https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtuphMb4mq-EcVWhMVT8FCkv5dqZGgvn_QiA&s`}
                                                        height={60}
                                                        width={60}
                                                        className="w-4 h-4 object-contain rounded-custom inline-block me-[9px]"
                                                        alt={member.user.fname}
                                                    />
                                                    <p className="text-font-14 font-normal text-b2 group-hover/item:text-b15">
                                                        {member.user.fname}{' '}{member.user.lname}
                                                    </p>
                                                </div>
                                            </div>
                                        ))} */}
                                    { !isBrainDeleted &&
                                    <div className='chat-editor-wrap relative rounded-[10px] border border-b11 className="flex flex-col text-font-16 mx-auto group [&:has(textarea:focus)]:shadow-[0_0px_10px_0_rgba(0,0,0,0.1)] w-full flex-grow"'>
                                        {/* Attached file Start */}
                                        {uploadedFiles.length > 0 && (
                                            <>
                                                {uploadedFiles.map(
                                                    (item, index) => (
                                                        <div
                                                            className="attached-files p-2"
                                                            key={index}
                                                        >
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.file.type?.startsWith(
                                                                    'image/'
                                                                ) ? (
                                                                    <div className="attached-item flex items-center gap-2 group/item relative border border-b12 p-2 rounded-10">
                                                                        <Image
                                                                            src={URL.createObjectURL(
                                                                                item.file
                                                                            )}
                                                                            alt="Preview"
                                                                            width={
                                                                                40
                                                                            }
                                                                            height={
                                                                                40
                                                                            }
                                                                            className="size-10 object-contain rounded"
                                                                        />
                                                                        {!item?.uploaded ? (
                                                                            <>
                                                                                <span className="item:visible absolute top-0.5 right-0.5 cursor-pointer [&>svg]:h-2 [&>svg]:w-2 [&>svg]:fill-b7 [&>svg]:object-contain p-1 rounded-full border border-b11 bg-b12">
                                                                                    <Loader />
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span
                                                                                className="opacity-0  group-hover/item:opacity-100 invisible group-hover/item:visible absolute top-0.5 right-0.5 cursor-pointer [&>svg]:h-2 [&>svg]:w-2 [&>svg]:fill-b7 [&>svg]:object-contain p-1 rounded-full border border-b11 bg-b12"
                                                                                onClick={() =>
                                                                                    removeUploadedFile(
                                                                                        item
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Close
                                                                                    width={
                                                                                        '8'
                                                                                    }
                                                                                    height={
                                                                                        '8'
                                                                                    }
                                                                                    className="size-2"
                                                                                />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="attach-item flex items-center gap-2 group/item relative border border-b12 p-2 rounded-10">
                                                                        {!item?.uploaded ? (
                                                                            <>
                                                                                <span className="item:visible absolute top-0.5 right-0.5 cursor-pointer [&>svg]:h-2 [&>svg]:w-2 [&>svg]:fill-b7 [&>svg]:object-contain p-1 rounded-full border border-b11 bg-b12">
                                                                                    <Loader />
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span
                                                                                className="opacity-0  group-hover/item:opacity-100 invisible group-hover/item:visible absolute top-0.5 right-0.5 cursor-pointer [&>svg]:h-2 [&>svg]:w-2 [&>svg]:fill-b7 [&>svg]:object-contain p-1 rounded-full border border-b11 bg-b12"
                                                                                onClick={() =>
                                                                                    removeUploadedFile(
                                                                                        item
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Close
                                                                                    width={
                                                                                        '8'
                                                                                    }
                                                                                    height={
                                                                                        '8'
                                                                                    }
                                                                                    className="size-2"
                                                                                />
                                                                            </span>
                                                                        )}
                                                                        <div className="attach-img w-10 min-w-10 h-10 rounded-custom overflow-hidden">
                                                                            <Image
                                                                                src={
                                                                                    FileIcon
                                                                                }
                                                                                width={
                                                                                    40
                                                                                }
                                                                                height={
                                                                                    40
                                                                                }
                                                                                className="object-cover size-10"
                                                                                alt="File icon"
                                                                            />
                                                                        </div>
                                                                        <div className="attach-item-content">
                                                                            <span className="block text-b2 text-font-14 font-bold overflow-hidden whitespace-nowrap text-ellipsis max-w-[180px]">
                                                                                {
                                                                                    item
                                                                                        .file
                                                                                        .name
                                                                                }
                                                                            </span>
                                                                            <span className="text-font-14 text-b8">
                                                                                {
                                                                                    item
                                                                                        .file
                                                                                        .type
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </>
                                        )}
                                        {/* Attached file end */}
                                        <MentionInput users={filterMembers} setContent={setContent} content={content} onTyping={onTyping} 
                                        handleSubmit={handleSubmit}
                                        />
                                            
                                        {/* <textarea
                                            id="textarea-thread"
                                            placeholder="Reply..."
                                            onChange={(e) => {
                                                const { value } = e.target;

                                                const atIndex =
                                                    value.lastIndexOf('@');
                                                
                                                setContent(e.target.value);
                                                setCurrentPosition(e.target.selectionStart);
                                                showMentionUser(e.target.value, e.target.selectionStart);
                                                onTyping();
                                            }}
                                            value={content}
                                            onKeyDown={handleKeyDown}
                                            className="bg-transparent text-b2 m-0 w-full resize-none focus:outline-none focus:ring-0 focus-visible:ring-0 p-3 placeholder-b8"
                                        ></textarea> */}
                                        
                                        {/* Text Editor Footer start */}
                                        <div className="chat-editor-footer flex items-center pt-2 px-2 pb-2.5">
                                            {/* Attach File start */}
                                            <div className="cursor-pointer w-6 h-auto text-center mt-1 p-0.5">
                                                <div
                                                    className="flex-shrink-0 inline-flex cursor-pointer items-center justify-center"
                                                    onClick={
                                                        handleAttachButtonClick
                                                    }
                                                >
                                                    <AttachFileIcon
                                                        width={'8'}
                                                        height={'14'}
                                                        className="h-auto w-2.5 max-w-full fill-b7 object-contain hover:fill-b2"
                                                    />
                                                </div>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                    multiple
                                                />
                                            </div>

                                            {/* Attach File End */}

                                            {/* Text Type start */}
                                            {/* <div className="cursor-pointer flex items-center justify-center w-6 h-6 min-w-6 rounded-custom p-0.5 transition ease-in-out duration-150">
                                                <TextTypeIcon
                                                    width={'19'}
                                                    height={'14'}
                                                    className="w-5 h-3.5 object-contain fill-b7 hover:fill-blue"
                                                />
                                            </div> */}
                                            {/* Text Type End */}

                                            {/* Smile Reaction start */}
                                            {/* <div className="cursor-pointer flex items-center justify-center w-6 h-6 min-w-6 rounded-custom p-0.5 transition ease-in-out duration-150">
                                                <SmileIcon
                                                    width={'14'}
                                                    height={'14'}
                                                    className="size-3.5 object-contain fill-b7 hover:fill-blue"
                                                />
                                            </div> */}
                                            {/* Smile Reaction End */}

                                            {/* @ tag start */}
                                            {/* <div className="cursor-pointer flex items-center justify-center w-6 h-6 min-w-6 rounded-custom p-0.5 transition ease-in-out duration-150">
                                                <AtIcon
                                                    width={'14'}
                                                    height={'14'}
                                                    className="size-3.5 object-contain stroke-b7 hover:stroke-blue"                                               
                                                />
                                            </div> */}
                                            {/* @ tag End */}
                                        </div>
                                        {/* Text Editor Footer End */}
                                        {/* Chat submit start*/}
                                        <button
                                            type="submit"
                                            disabled={isSubmitDisabled}
                                            onClick={handleSubmit}
                                            className="chat-submit group bg-b2 w-[38px] h-[38px] flex items-center justify-center absolute bottom-2 right-2 rounded-full transition-colors disabled:bg-b12"
                                        >
                                            <UpLongArrow
                                                width="15"
                                                height="19"
                                                className="fill-b15 group-disabled:fill-b7"
                                            />
                                        </button>
                                        {/* Chat submit start*/}
                                    </div>
                                    }
                                </div>
                                {/* Text Editor End */}
                            </div>
                        )}
                        {/*offcanvas Body start */}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default ChatThreadOffcanvas;
