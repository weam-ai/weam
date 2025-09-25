import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useBrainDocs from '@/hooks/brains/useBrainDocs';
import PdfIcon from '@/icons/PdfIcon';
import DocsIcon from '@/icons/Docs';
import useCustomGpt from '@/hooks/customgpt/useCustomGpt';
import { GPTTypes } from '@/utils/constant';
import { LINK } from '@/config/config';
import defaultCustomGptImage from '../../../public/defaultgpt.jpg';
import { truncateText } from '@/utils/common';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import SearchIcon from '@/icons/Search';
import Image from 'next/image';
import ImageFileIcon from '@/icons/ImageFileIcon';
import useAssignModalList from '@/hooks/aiModal/useAssignModalList';
import { GPTTypesOptions, SelectedContextType, UploadedFileType } from '@/types/chat';
import { BrainAgentType, BrainDocType, BrainPromptType } from '@/types/brain';
import useIntersectionObserver from '@/hooks/common/useIntersectionObserver';
import { DefaultPaginationType, PaginatorType } from '@/types/common';
import ExcelFileIcon from '@/icons/ExcelFileIcon';
import TxtFileIcon from '@/icons/TXTFILEIcon';
import { getFileIconClassName } from '@/utils/common';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import routes from '@/utils/routes';
import { getDisplayModelName } from '@/utils/helper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import CommonFileIcon from '@/icons/CommonFileIcon';
import Toast from '@/utils/toast';

const FileTypeIcons = {
    pdf: PdfIcon,
    doc: DocsIcon,
    docx: DocsIcon,
    image: ImageFileIcon,
    xls: ExcelFileIcon,
    xlsx: ExcelFileIcon,
    csv: ExcelFileIcon,
    txt: TxtFileIcon,
    eml: CommonFileIcon,
    html: CommonFileIcon,
    php: CommonFileIcon,
    js: CommonFileIcon,
    css: CommonFileIcon,
};

export type TabGptListProps = {
    onSelect?: <T>(type: keyof typeof GPTTypes, data: T) => void;
    selectedContext: SelectedContextType;
    handlePrompts: BrainPromptType[];
    setHandlePrompts: (prompts: any) => void;
    getList: (searchValue: string,pagination?: DefaultPaginationType ) => Promise<BrainPromptType[]>;
    promptLoader: boolean;
    setPromptLoader: (loader: boolean) => void;
    paginator: PaginatorType;
    setPromptList: (prompts: BrainPromptType[]) => void;
    setDialogOpen: (open: boolean) => void;
    uploadedFile: UploadedFileType [];
}

type TabRecordNotFoundProps = {
    message: string;
}

const TabRecordNotFound = React.memo(({ message }: TabRecordNotFoundProps) => {
    return (
        <div className="flex justify-center items-center h-full">
            <p>{message}</p>
        </div>
    )
})

const TabGptList: React.FC<TabGptListProps> = ({
    onSelect,
    uploadedFile,
    handlePrompts,
    setHandlePrompts,
    getList,
    promptLoader,
    setPromptLoader,
    paginator: promptPaginator,
    setPromptList,
    setDialogOpen
}: TabGptListProps) => {
    const { getTabDocList, brainDocs, loading: brainDocLoader,setLoading: setBrainDocLoader, paginator: brainDocPaginator, setBrainDocs } = useBrainDocs();
    const {
        customgptList,
        loading: customgptLoading,
        setLoading:setCustomGptLoading,
        getTabAgentList,
        paginator: agentPaginator,
        setCustomGptList
    } = useCustomGpt();
    
    const [triggerValue, setTriggerValue] = useState(null);
    const [currSelectedDoc, setCurrSelectedDoc] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState('');
    const searchParams = useSearchParams();
    const b = searchParams.get('b');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(()=>{
        setTriggerValue(GPTTypes.CustomGPT);
    },[])

    const handleResetList = useCallback(() => {
        setCustomGptList([]);
        setBrainDocs([]);
        setPromptList([]);
        setHandlePrompts([]);
        setCurrSelectedDoc(null);
    }, [triggerValue, searchValue]);

    const handleInputChanges = (e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value);
    const { restrictWithoutOpenAIKey } = useAssignModalList();
    const dispatch = useDispatch();

    const globalUploadedFile = useSelector((store: RootState) => store.conversation.uploadData);
    const handleTriggerClick = (value = GPTTypes.Prompts) => {
        setTriggerValue(value);
        setHandlePrompts(handlePrompts);
        setSearchValue('');
        const triggerObj = {
            [GPTTypes.Prompts]: setPromptLoader,
            [GPTTypes.CustomGPT]: setCustomGptLoading,
            [GPTTypes.Docs]: setBrainDocLoader
        }
        triggerObj[value](true)
    };

    useEffect(() => {
        // Reset the list when the trigger value changes
        handleResetList();
        const fetchData = () => {
            if (triggerValue === GPTTypes.Docs) {
                // Reset the list when search value changes
                setBrainDocs([]);
                getTabDocList(searchValue);
            }
            else if (triggerValue === GPTTypes.CustomGPT) {
                setCustomGptList([]);
                getTabAgentList(searchValue);
            }
            else if (triggerValue === GPTTypes.Prompts) {
                setPromptList([]);
                getList(searchValue);
            }
        };
        const timer = setTimeout(fetchData, 500);
        return () => clearTimeout(timer);
    }, [searchValue, triggerValue]);

    const gptListRef = useIntersectionObserver(() => {
        if (agentPaginator.hasNextPage && !customgptLoading) {
            getTabAgentList(searchValue, {
                offset: agentPaginator.offset + agentPaginator.perPage, limit: agentPaginator.perPage 
            })
        }
    }, [agentPaginator?.hasNextPage, !customgptLoading]);

    const docListRef = useIntersectionObserver(() => {
        if (brainDocPaginator.hasNextPage && !brainDocLoader) {
            getTabDocList(searchValue, {
                offset: brainDocPaginator.offset + brainDocPaginator.perPage, limit: brainDocPaginator.perPage 
            })
        }
    }, [brainDocPaginator?.hasNextPage, !brainDocLoader]);

    const promptListRef = useIntersectionObserver(() => {
        if (promptPaginator.hasNextPage && !promptLoader) {
            getList(searchValue, {
                offset: promptPaginator.offset + promptPaginator.perPage, limit: promptPaginator.perPage 
            })
        }
    }, [promptPaginator?.hasNextPage, !promptLoader]);

    
    // Handle document selection
    const handleDocSelection = (doc: BrainDocType) => {
        setCurrSelectedDoc(doc.fileId);
        onSelect(
            GPTTypes.Docs as GPTTypesOptions,
            {
                ...doc,
                isRemove: uploadedFile?.some((file: UploadedFileType) => file._id === doc.fileId)
                    ? true
                    : false
            }                                                
        );
        
        // Close dialog after selection
        setDialogOpen(false);
    };

    // Handle agent selection
    const handleAgentSelection = (gpt: BrainAgentType) => {
        onSelect(
            GPTTypes.CustomGPT as GPTTypesOptions,
            {
                ...gpt,
                isRemove: uploadedFile?.some(file => file?.gptname === gpt.title)
            }
        );
        
        // Close dialog after selection
        setDialogOpen(false);
    };
    
    return (
        <>
            {/* Tab GPT List Start */}
            <Tabs
                defaultValue={GPTTypes.CustomGPT}
                onValueChange={(value) => handleTriggerClick(value)}                
                className="w-full flex flex-col items-start"
            >
                
                <TabsList
                    className="flex rounded-md border-none gap-x-2 overflow-hidden px-1 py-1 bg-b12 mb-2"
                >
                    <TabsTrigger
                        className="text-font-14 text-left px-3 py-1.5 rounded-md font-medium bg-transparent group data-[state=active]:bg-b2 data-[state=active]:text-white border-none hover:text-b2 hover:bg-b10 transition ease-in-out duration-400"
                        value={GPTTypes.CustomGPT}
                    >
                        Agents
                    </TabsTrigger>
                    <TabsTrigger
                        className="text-font-14 text-left px-3 py-1.5 rounded-md font-medium bg-transparent group data-[state=active]:bg-b2 data-[state=active]:text-white border-none hover:text-b2 hover:bg-b10 transition ease-in-out duration-400"
                        value={GPTTypes.Prompts}
                    >
                        Prompts
                    </TabsTrigger>
                    <TabsTrigger
                        className="text-font-14 text-left px-3 py-1.5 rounded-md font-medium bg-transparent group data-[state=active]:bg-b2 data-[state=active]:text-white border-none hover:text-b2 hover:bg-b10 transition ease-in-out duration-400"
                        value={GPTTypes.Docs}
                    >
                        Docs
                    </TabsTrigger>
                </TabsList>

                <TabsContent
                    value={GPTTypes.Docs}
                    className="p-0 w-full"
                >
                    {/* Docs Tab content Start */}
                    <div className='flex mb-3'>
                        <div className="relative w-full">
                            <input
                                type="text"
                                className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-[36px]"
                                id="searchDocs"
                                placeholder="Search Docs"
                                onChange={handleInputChanges}
                                value={searchValue}
                            />
                            <span className="inline-block absolute left-[12px] top-1/2 -translate-y-1/2">
                                <SearchIcon className="w-4 h-auto fill-b6" />
                            </span>
                        </div>
                    </div>
                        
                    <div className="pr-1 h-full overflow-y-auto max-md:overflow-x-hidden w-full max-h-[370px]">
                        {
                            brainDocs.length > 0 && (
                            brainDocs.map((brdoc: BrainDocType, index: number, brainDocArray: BrainDocType[]) => {
                                const { doc } = brdoc;
                                const filedata = doc.name.split('.');
                                const fileType = filedata[1];
                                const FileTypeIcon =
                                    doc.mime_type?.startsWith('image')
                                        ? FileTypeIcons['image']
                                        : FileTypeIcons[fileType] ||
                                            null;
                                const isSelected = uploadedFile?.some((file: UploadedFileType) => file._id === brdoc.fileId);
                                
                                return (
                                    <div
                                        key={brdoc._id}
                                        className={`cursor-pointer border-b py-4 px-2.5 transition-all ease-in-out md:hover:bg-b13 ${
                                            isSelected || currSelectedDoc === brdoc.fileId
                                                ? 'bg-b12 border-b10'
                                                : 'bg-white border-b10'
                                        } flex-wrap`}
                                        onClick={() => handleDocSelection(brdoc)}
                                        ref={brainDocArray.length - 1 === index ? docListRef : null}
                                    >
                                        <div className="flex items-center flex-wrap">
                                            {FileTypeIcon && (
                                                <FileTypeIcon
                                                    width={16}
                                                    height={16}
                                                    className={`${getFileIconClassName(fileType)}`}
                                                />
                                            )}
                                            <p className="text-font-12 font-medium text-b2 break-words">
                                                {doc.name}
                                            </p>
                                            <span className='text-b6 ml-1 text-font-12 max-md:w-full'>
                                                - {brdoc.isShare ? 'Shared' : 'Private'} / {brdoc.brain.title}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                            )
                        }
                        {
                            brainDocLoader && (
                                <ThreeDotLoader className="justify-start ml-8 mt-3" />
                            )
                        }
                        {
                            !searchValue && brainDocs.length === 0 && !brainDocLoader && (
                                <TabRecordNotFound message='No Docs available' />
                            )
                        }
                    </div>
                    {/* Docs Tab content End */}
                </TabsContent>

                <TabsContent
                    value={GPTTypes.Prompts}
                    className="p-0 w-full"
                >
                    {/* Prompts Tab content Start */}
                    <div className='flex mb-3'>
                        <div className="relative w-full">
                            <input
                                type="text"
                                className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-[36px]"
                                id="searchPrompts"
                                placeholder="Search Prompts"
                                onChange={handleInputChanges}
                                value={searchValue}
                            />
                            <span className="inline-block absolute left-[12px] top-1/2 -translate-y-1/2">
                                <SearchIcon className="w-4 h-auto fill-b6" />
                            </span>                                    
                        </div>
                    </div>
                    <div className="pr-1 h-full overflow-y-auto max-md:overflow-x-hidden w-full max-h-[370px]">
                        {
                            handlePrompts?.length > 0 && (
                            handlePrompts?.map((currPrompt: BrainPromptType, index: number, promptArray: BrainPromptType[]) => (
                                <div
                                    key={currPrompt._id}
                                    className={`cursor-pointer border-b py-4 px-2.5 transition-all ease-in-out md:hover:bg-b13 ${
                                        currPrompt.isActive
                                            ? 'bg-b12 border-b10'
                                            : 'bg-white border-b10'
                                    }`}
                                    onClick={() => {
                                        if (currPrompt?.website?.length){
                                            const isRestricted = restrictWithoutOpenAIKey();
                                            if (isRestricted) {
                                                return;
                                            }
                                        }
                                        onSelect<BrainPromptType>(
                                            GPTTypes.Prompts as GPTTypesOptions,
                                            currPrompt
                                        );
                                        setDialogOpen(false);
                                    }}
                                    ref={promptArray.length - 1 === index ? promptListRef : null}
                                >
                                    <div className="flex items-center flex-wrap">
                                        <p className="text-font-12 text-b2 font-medium">
                                            {currPrompt.title}
                                        </p>
                                        <span className='text-b6 ml-1 text-font-12 max-md:w-full'>
                                            - {currPrompt.isShare ? 'Shared' : 'Private'} / {currPrompt.brain.title}
                                        </span>                                                
                                    </div>
                                    <p className='text-font-12 font-normal text-b6 mt-1'>
                                        {truncateText(currPrompt.content,190)}       
                                    </p>
                                    {/* Prompt Content  */}
                                </div>
                            ))
                            )
                        }
                        {
                            promptLoader && (
                                <ThreeDotLoader className="justify-start ml-8 mt-3" />
                            )
                        }
                        {
                            !searchValue && handlePrompts?.length === 0 && !promptLoader && (
                                <TabRecordNotFound message='No Prompts available' />
                            )
                        }
                    </div>
                    {/* Prompts Tab content End */}
                </TabsContent>

                <TabsContent
                    value={GPTTypes.CustomGPT}
                    className="p-0 w-full"
                >
                    <div className='normal-agent'>
                        <div className='flex mb-3'>
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-[36px]"
                                    id="searchBots"
                                    placeholder="Search Agents"
                                    onChange={handleInputChanges}
                                    value={searchValue}
                                />
                                <span className="inline-block absolute left-[12px] top-1/2 -translate-y-1/2">
                                    <SearchIcon className="w-4 h-auto fill-b6" />
                                </span>
                            </div>
                        </div>
                        <div className="pr-1 h-full overflow-y-auto max-md:overflow-x-hidden w-full max-h-[370px]">
                            {
                                customgptList.length > 0 && (
                                customgptList.map((gpt: BrainAgentType, index: number, gptArray: BrainAgentType[]) => {
                                    const isSelected = uploadedFile?.some((file: UploadedFileType) => file?._id === gpt._id);
                                    
                                    return (
                                        <div
                                            key={gpt._id}
                                            className={`cursor-pointer border-b border-b10 py-4 px-2.5 transition-all ease-in-out hover:bg-b13 ${    
                                                isSelected
                                                    ? 'bg-b12 border-b10'
                                                    : 'bg-white border-b10'
                                            } flex-wrap`}
                                            onClick={() => handleAgentSelection(gpt)}
                                            ref={gptArray.length - 1 === index ? gptListRef : null}
                                        >
                                            
                                            <div className="flex items-center flex-wrap">
                                                <Image
                                                    src={
                                                        gpt?.coverImg?.uri
                                                            ? `${LINK.AWS_S3_URL}${gpt.coverImg.uri}`
                                                            : gpt?.charimg
                                                            ? gpt.charimg
                                                            : defaultCustomGptImage.src
                                                    }
                                                    height={60}
                                                    width={60}
                                                    className="w-6 h-6 object-contain rounded-custom inline-block me-[9px]"
                                                    alt={
                                                        gpt?.coverImg
                                                            ?.name ||
                                                        gpt?.charimg
                                                            ? 'Character Image'
                                                            : 'Default Image'
                                                    }
                                                />
                                                <p className="text-font-12 font-medium text-b2">
                                                    {gpt.title}
                                                </p>
                                                <span className='text-font-12 ml-2 px-2 py-[2px] bg-b13 border rounded-full'>
                                                    {getDisplayModelName(gpt.responseModel.name)}
                                                </span>
                                                    <span className='text-font-12 ml-2 px-2 py-[2px] bg-b13 border rounded-full'>
                                                        {gpt.type === 'agent' ? 'Agent' : 'Supervisor'}
                                                    </span>
                                                <div className='ml-1 text-b6 text-font-12 max-md:w-full'>
                                                    - {gpt.isShare ? 'Shared' : 'Private'} / {gpt.brain.title}
                                                </div>
                                            </div>
                                            <p className='text-font-12 font-normal text-b6 mt-1'>
                                                {truncateText(gpt.systemPrompt,190)}                                                
                                            </p>
                                            
                                        </div>
                                    );
                                })
                                )
                            }
                            {
                                customgptLoading && (
                                    <ThreeDotLoader className="justify-start ml-8 mt-3" />
                                )
                            }
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            {/* Tab GPT List End */}
        </>
    );
};

export default TabGptList;