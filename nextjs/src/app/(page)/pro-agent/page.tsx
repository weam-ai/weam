'use client';
import React, {
    useCallback,
    useEffect,
    useState,
    useRef,
    memo,
    useMemo,
} from 'react';
import Image from 'next/image';
import ScrollToBottomButton from '@/components/ScrollToBottomButton';
import ThunderIcon from '@/icons/ThunderIcon';
import AttachFileIcon from '@/icons/AttachFileIcon';
import BookMarkIcon from '@/icons/Bookmark';
import GlobeIcon from '@/icons/GlobalIcon';
import PromptEnhanceIcon from '@/icons/PromptEnhance';
import VoiceChatIcon from '@/icons/VoiceChatIcon';
import UpLongArrow from '@/icons/UpLongArrow';
import MoveLeftIcon from '@/icons/MoveLeftIcon';
import Label from '@/widgets/Label';

const ProAgentChat = () => {
    const contentRef = useRef(null);
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

    const scrollToBottom = useCallback(() => {
        if (contentRef.current && shouldScrollToBottom) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [shouldScrollToBottom]);

    useEffect(() => {
        const handleScroll = () => {
            if (contentRef.current) {
                const { scrollTop, scrollHeight, clientHeight } =
                    contentRef.current;
                const isAtBottom =
                    Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
                setShouldScrollToBottom(isAtBottom);
            }
        };

        if (contentRef.current) {
            contentRef.current.addEventListener('scroll', handleScroll);
            scrollToBottom();
        }

        return () => {
            if (contentRef.current) {
                contentRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, [scrollToBottom]);

    useEffect(() => {
        scrollToBottom();
    }, [scrollToBottom]);


    const [leftList, setLeftList] = useState([
        { id: 'white-label-wordpress-agency', name: 'White Label WordPress Agency', searchVolume: '10,015', competition: 'Medium', checked: true, originalFromRight: false },
        { id: 'hire-wordpress-developers', name: 'Hire WordPress Developers', searchVolume: '10,015', competition: 'Medium', checked: true, originalFromRight: false },
        { id: 'wordpress-development-services', name: 'WordPress Development Services', searchVolume: '10,015', competition: 'Medium', checked: true, originalFromRight: false },
        { id: 'wordpress-maintanance-services', name: 'WordPress Maintenance Services', searchVolume: '10,015', competition: 'Medium', checked: true, originalFromRight: false },
        { id: 'wordpress-support-services', name: 'WordPress Support Services', searchVolume: '10,4115', competition: 'Medium', checked: true, originalFromRight: false },
      ]);
    
      const [rightList, setRightList] = useState([
        { id: 'wordpress-plugin-development', name: 'WordPress Plugin Development', searchVolume: '10,015', competition: 'Medium', checked: false },
        { id: 'wordpress-theme-development', name: 'WordPress Theme Development', searchVolume: '10,015', competition: 'Medium', checked: false },
        { id: 'wordpress-customization-services', name: 'WordPress Customization Services', searchVolume: '10,015', competition: 'Medium', checked: false },
        { id: 'wordpress-website-development', name: 'WordPress Website Development', searchVolume: '10,015', competition: 'Medium', checked: false },
        { id: 'wordpress-website-design', name: 'WordPress Website Design', searchVolume: '10,015', competition: 'Medium', checked: false },
        { id: 'wordpress-website-maintanance', name: 'WordPress Website Maintenance', searchVolume: '10,015', competition: 'Medium', checked: false },
      ]);
    
      const handleCheck = (item, fromLeft) => {
        if (!fromLeft) {
          setRightList(rightList.filter((i) => i.id !== item.id));
          setLeftList([...leftList, { ...item, checked: true, originalFromRight: true }]);
        } else {
          if (item.originalFromRight) {
            if (item.checked) {
              setLeftList(leftList.filter((i) => i.id !== item.id));
              setRightList([...rightList, { ...item, checked: false }]);
            } else {
              setLeftList(leftList.map((i) => i.id === item.id ? { ...i, checked: true } : i));
            }
          } else {
            setLeftList(leftList.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i));
          }
        }
      };

      const renderList = (list, fromLeft) =>
        list.map((item) => (
          <div key={item.id} className="my-3 pl-6">
            <input
              className="input-checkbox"
              type="checkbox"
              id={item.id}
              checked={item.checked}
              onChange={() => handleCheck(item, fromLeft)}
            />
            <label
            className={`inline-block ps-[0.15rem] hover:cursor-pointer font-bold text-font-14 ${
                fromLeft ? 'text-white' : 'text-b2'
            }`}
            htmlFor={item.id}
            >
            {item.name}
            </label>
            <p
            className={`text-font-14 ${
                fromLeft ? 'text-b10' : 'text-b5'
            }`}
            >
            Search Volume: <span>{item.searchVolume}</span> | Competition:
            <span> {item.competition}</span>
            </p>
          </div>
        ));
        const [isOutputVisible, setIsOutputVisible] = useState(false);
        const handleKeywords = () => {
            setIsOutputVisible(true); 
          };

    return (
        <div className="flex flex-col flex-1 h-full relative overflow-hidden">
            <div
                ref={contentRef}
                className="pb-8 pt-4 mt-[68px] h-full overflow-y-auto w-full relative"
            >
                <div className="chat-item w-full px-4 lg:gap-6 m-auto md:max-w-[90vw] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                    <div className="bg-gray-100 flex text-font-16 text-b2 ml-auto gap-3 rounded-10 transition ease-in-out duration-150 md:max-w-[30rem] xl:max-w-[36rem] px-3 pt-4 pb-6">
                        <div className="relative flex size-[25px] justify-center overflow-hidden rounded-full">
                            <span className="user-char flex items-center justify-center size-6 rounded-full bg-[#B3261E] text-b15 text-font-12 font-normal">
                                A
                            </span>
                        </div>
                        <div>
                            <div className="font-bold select-none mb-1">
                                Akash K
                            </div>
                            <div className="flex items-center gap-2 relative border border-b12 group-hover:border-b10 py-2 rounded-10">
                                <div className="attach-img w-5 min-w-5 h-auto rounded-custom overflow-hidden">
                                    <Image
                                        src="/images/attach.svg"
                                        alt="attach"
                                        width={20}
                                        height={20}
                                    />
                                </div>
                                <div className="attach-item-content">
                                    <span className="block text-b2 text-font-12 font-bold overflow-hidden whitespace-nowrap text-ellipsis max-w-[180px]">
                                        QA Specialist
                                    </span>
                                </div>
                            </div>
                            <div className="text-font-14">
                                URL: https://unlimitedwp.com/
                            </div>
                        </div>
                    </div>
                </div>

                {/* Response STARTED */}
                <div className="chat-item w-full px-4 lg:py-3 py-2 lg:gap-6 m-auto md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                    <div className="my-2 animate-pulse text-font-14 font-bold inline-block">
                        Analyzing...
                    </div>

                    {!isOutputVisible && (
                        <>
                        <div className='mx-auto'>
                            <p className='text-font-14 text-center'>Check a box to use a keyword in your content. Uncheck it to remove the keyword.</p>
                            <MoveLeftIcon width={40} height={40} className='w-10 h-auto fill-b2 mx-auto' />
                        </div>
                        <div className="relative bg-white text-b2 mx-auto flex gap-x-5">
                            <div className="border p-5 rounded-md w-1/2 shadow-2xl bg-b2">
                                <p className="font-bold text-font-14 text-white mb-5">Targeted Keywords</p>
                                {renderList(leftList, true)}
                            </div>
                            <div className="border p-5 rounded-md w-1/2">
                                <p className="font-bold text-font-14 mb-5">Recommended Keywords</p>
                                {renderList(rightList, false)}
                            </div>
                        </div>
                        <div className="flex justify-center gap-3 mt-5">
                            <button className="btn btn-outline-black" onClick={handleKeywords}>Save</button>
                        </div>
                    </>
                    )}

                    {isOutputVisible && (
                        <div className='topic'>
                            <p className='text-font-14 my-5'><strong>Targeted Keywords:</strong> White Label WordPress Agency, Hire WordPress Developers, WordPress Development Services, WordPress Support Services, WordPress Maintenance Services</p>
                            <Label title={"Topic"} htmlFor={"topic"} />
                            <input
                                type="text"
                                className="default-form-input"
                                id="topic"
                                value="The Ultimate Guide to Choosing Wireless Headphones in 2023" />                        
                                <div className="flex justify-center gap-3 mt-5">
                                    <button className="btn btn-outline-black">Regenerate</button>
                                    <button className="btn btn-black">Save Topic</button>
                                </div>
                        </div>
                    )}
                </div>
                {/* Response END */}
                
            </div>
            
            <ScrollToBottomButton contentRef={contentRef} />
            <div className='text-center text-font-12'>
                <p className='text-font-14 px-4'>In Pro Agent mode, chatting is disabled. To chat, please start a new conversation.</p>
            </div>
            <div className="w-full pt-2 pointer-events-none">
                <div className="flex flex-row mx-auto relative px-5 md:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[48.75rem]">
                    <div className="flex flex-col text-font-16 mx-auto group overflow-hidden rounded-[12px] [&:has(textarea:focus)]:shadow-[0_2px_6px_rgba(0,0,0,.05)] w-full flex-grow relative border border-b11">
                        <textarea
                            id="textarea"
                            placeholder="Ask a question or start with an idea"
                            className="bg-transparent w-full resize-none focus:outline-none focus:ring-0 focus-visible:ring-0 py-3 px-5 placeholder-b8 h-12"
                        ></textarea>

                        <div className="flex items-center z-10 px-4 pb-[6px]">
                            <div className="chat-btn cursor-pointer bg-white transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ">
                                <ThunderIcon
                                    width={'14'}
                                    height={'14'}
                                    className={'fill-b5 w-auto h-[17px]'}
                                />
                            </div>
                            <div className="chat-btn cursor-pointer bg-white transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ">
                                <AttachFileIcon
                                    width={'14'}
                                    height={'14'}
                                    className={'fill-b5 w-auto h-[17px]'}
                                />
                            </div>
                            <div className="chat-btn cursor-pointer bg-white transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ">
                                <BookMarkIcon
                                    width={16}
                                    height={15}
                                    className="fill-b5 w-auto h-[15px]"
                                />
                            </div>
                            <div className="chat-btn cursor-pointer bg-white transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ">
                                <GlobeIcon
                                    width={'14'}
                                    height={'14'}
                                    className="w-auto h-[17px] fill-b5"
                                />
                            </div>
                            <div className="chat-btn cursor-pointer bg-white transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ">
                                <PromptEnhanceIcon
                                    width="18"
                                    height="18"
                                    className="w-auto h-[17px] fill-b5 opacity-50"
                                />
                            </div>
                            <div className="chat-btn cursor-pointer bg-white transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ">
                                <VoiceChatIcon
                                    width="14"
                                    height="14"
                                    className="fill-b5 w-auto h-[17px]"
                                />
                            </div>
                            <button className="chat-submit ml-auto group bg-b12 w-[32px] z-10 h-[32px] flex items-center justify-center rounded-full transition-colors">
                                <UpLongArrow
                                    width="15"
                                    height="19"
                                    className="fill-b7"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className='relative py-2 md:max-w-[30rem] lg:max-w-[38rem] xl:max-w-[45.75rem] max-w-[calc(100%-30px)] w-full mx-auto'>
            </div>
        </div>
    );
};

export default ProAgentChat;
