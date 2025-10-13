'use client';

import { React, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import Select from 'react-select';
import Label from '@/widgets/Label';
import PromptIcon from '@/icons/Prompt';
import { yupResolver } from '@hookform/resolvers/yup';
import { promptCreateSchema } from '@/schema/prompt';
import { useForm } from 'react-hook-form';
import usePrompt from '@/hooks/prompt/usePrompt';
import { retrieveBrainData, transformBrain } from '@/utils/helper';
import ValidationError from '@/widgets/ValidationError';
import { useSelector } from 'react-redux';
import CommonSelectInput from '@/widgets/CommonSelectInput';
import { Separator } from '../ui/separator';
import BrandProfile from './BrandProfile';
import { PROMPT_SELECTION } from '@/utils/constant';
import CompanyProfile from './CompanyProfile';
import ProductProfile from './ProductProfile';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';

import ChipInput from 'material-ui-chip-input';
import { makeStyles } from '@material-ui/core';
import TooltipIcon from '@/icons/TooltipIcon';
import Link from 'next/link';
import CommonInput from '@/widgets/CommonInput';
import PlusRound from '@/icons/PlusRound';
import CloseIcon from '@/../public/black-close-icon.svg';
import Image from 'next/image';
import { isEmptyObject } from '@/utils/common';
import useAssignModalList from '@/hooks/aiModal/useAssignModalList';
import BookMarkIcon, { ActiveBookMark } from '@/icons/Bookmark';
import { getCurrentUser } from '@/utils/handleAuth';
const useStyles = makeStyles((theme) => ({
    inputRoot: {
        // Custom styles for the input container
        borderRadius: '5px',
        border: '1px solid #ddd',
        backgroundColor: '#fff',
        '&:hover': {
            borderColor: '#aaa',
        },
    },
    input: {
        // Custom styles for the input field
        color: '#333',
        fontSize: '14px',
        padding: '15px 15px',
        '&::placeholder': {
            color: '#111',
        },
    },
    chip: {
        // Custom styles for the chip
        backgroundColor: '#6637EC',
        color: '#fff',
        margin: '7px 6px',
        '&:hover': {
            backgroundColor: '#ddd',
            color: '#000',
        },
    },
    chipDeleteIcon: {
        // Custom styles for the delete icon
        color: '#ff1744',
    },
}));

const ADDITIONAL_INFO = [
    { value: 'Select', label: 'Select', code: '' },
    { value: 'Brand Profile', label: 'Brand Profile', code: 'BRAND_PROFILE' },
    { value: 'Company Info', label: 'Company Info', code: 'COMPANY_INFO' },
    { value: 'Product Info', label: 'Product/Services Info', code: 'PRODUCT_INFO' },
]

const AddNewPromptModal = ({ open, closeModal, mycontent, edit, flag, chatprompt = false, setPromptState }:any) => {
    const classes = useStyles();
    const [promptTags, setPromptTags] = useState(edit?.tags || []);
    const { restrictWithoutOpenAIKey } = useAssignModalList();
    const handleDeleteChip = (chip, index) => {
        const updatedTags = promptTags.filter((tag, i) => i !== index);
        setPromptTags(updatedTags);
    };
    const handleAddChip = (chip) => {

        setPromptTags([...promptTags, chip]);
    };

    const { createPrompt, addPromptLoading, updatePromptContain } = usePrompt();
    const combined = useSelector((store:any) => store.brain.combined);
    const [promptContent, setPromptContent] = useState(mycontent);
    

    const customSelectStyles = {
        menu: (provided) => ({
            ...provided,
            zIndex: 1000, // Ensure the dropdown menu is above other content
            position: 'absolute',
        }),
        menuList: (provided) => ({
            ...provided,
            maxHeight: '150px', // Adjust as needed to prevent overflow
            overflowY: 'auto',
        }),
    };

    let selectedBrain = [];
    const braindata = retrieveBrainData();
    if (chatprompt) {
        selectedBrain.push({ value: braindata.title, label: braindata.title, id: braindata._id, slug: braindata.slug });
    } else {
        edit ? selectedBrain.push({ value: edit.brain.title, label: edit.brain.title, slug: edit.brain.slug, id: edit.brain.id }) : []
    }
    const defaultValues:any = {
        name: edit?.title || '',
        content: edit?.content || promptContent || '',
        tags: edit?.tags || promptTags,
        website: edit?.website || [''],
        summaries: edit?.summaries,
        brain: selectedBrain,
        addinfo: edit?.addinfo || undefined,
        brandProfile: {
            name: edit?.brandInfo?.name || undefined,
            tagline: edit?.brandInfo?.tagline || undefined,
            mission: edit?.brandInfo?.mission || undefined,
            audience: edit?.brandInfo?.audience || undefined,
            industry: edit?.brandInfo?.industry || undefined,
            values: edit?.brandInfo?.values || undefined,            
        },
        companyInfo: {
            name: edit?.companyInfo?.name || undefined,
            tagline: edit?.companyInfo?.tagline || undefined,
            overview: edit?.companyInfo?.overview || undefined,
            mission: edit?.companyInfo?.mission || undefined,
            values: edit?.companyInfo?.values || undefined,
            vision: edit?.companyInfo?.vision || undefined,
            industry: edit?.companyInfo?.industry || undefined,
            headquarter: edit?.companyInfo?.headquarter || undefined,
        },
        productInfo: {
            name: edit?.productInfo?.name || undefined,
            description: edit?.productInfo?.description || undefined,
            category: edit?.productInfo?.category || undefined,
            usp: edit?.productInfo?.usp || undefined,
            specification: edit?.productInfo?.specification || undefined,
            benifits: edit?.productInfo?.benifits || undefined,
            usage: edit?.productInfo?.usage || undefined,
            skus: edit?.productInfo?.skus || undefined,
        },
    };

    const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: defaultValues,
        resolver: yupResolver(promptCreateSchema),
    });
    
    const processForm = async (payload) => {
        const data = {
            title: payload.name,
            content: payload.content,
            brains: transformBrain(payload.brain, true),
            tags: promptTags,
            website: payload.website,
            addinfo: getValues('addinfo'),
            brandInfo: getValues('addinfo')?.code === PROMPT_SELECTION.BRAND_PROFILE ? getValues('brandProfile') : null,
            companyInfo: getValues('addinfo')?.code === PROMPT_SELECTION.COMPANY_INFO ? getValues('companyInfo') : null,
            productInfo: getValues('addinfo')?.code === PROMPT_SELECTION.PRODUCT_INFO ? getValues('productInfo') : null,
            selected: braindata._id,
            isFavorite: isFavourite
        }
        const newdata = edit ? await updatePromptContain(data, closeModal, edit._id) : await createPrompt(data, closeModal);
        setPromptState((prev) => prev + 1);
    };

    const websites = watch('website') || [];
    const scrapeSummaries = watch('summaries') || {};
    const user = getCurrentUser();
    
    const addNewTextInput = () => {
        setValue('website', [
            ...getValues('website'),
            '',
        ]);
    };

    const removeInput = (index) => {
        const newItems = [...getValues('website')];
        newItems.splice(index, 1);
        setValue('website', newItems);
    };
    const [isFavourite, setIsFavourite] = useState(edit?.favoriteByUsers?.includes(user?._id) ? true : false);
    const handleToggle = () => {
        setIsFavourite(!isFavourite);
      };    

    return (
        <Dialog open={open} onOpenChange={closeModal}>
            <DialogContent className="md:max-w-[650px] max-w-[calc(100%-30px)] py-7">
                <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                    <DialogTitle className="font-semibold flex items-center flex-wrap gap-x-1">
                        <PromptIcon width={"16"} height={"16"} className="w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top" />
                        { flag ? `Edit Prompt Template` : 'New Prompt Template'}
                        <div className="flex items-center gap-2 md:ml-auto ml-1 mr-5 mt-0 cursor-pointer" onClick={handleToggle}>
                        {/* Conditionally render icons */}
                        
                            {isFavourite ? (
                                <ActiveBookMark width={15} height={14} className="fill-orange" />
                            ) : (
                                <BookMarkIcon width={15} height={14} className="fill-b5" />
                            )}
                        
                        {/* Toggle text */}
                        <span className="text-b5 text-font-12 hidden md:inline">
                            {isFavourite ? 'Favorite' : 'Add to Favorite'}
                        </span>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <form className="w-full" onSubmit={handleSubmit(processForm)}>
                    <div className="dialog-body flex flex-col flex-1 relative h-full px-[30px] pt-5 max-h-[70vh] overflow-y-auto">                    
                        <div className='flex lg:flex-row flex-col'>
                            <div className="relative mb-4 lg:mr-3 flex-1">
                                <Label title={"Prompt Name"} htmlFor={'prompt-name'} />
                                <input
                                    type="text"
                                    className="default-form-input"
                                    id="prompt-name"
                                    placeholder="Prompt Name"
                                    {...register('name')}
                                    value={watch('name')}
                                    maxLength={50}
                                />
                                <ValidationError errors={errors} field={'name'}></ValidationError>
                            </div>
                            <div className="relative mb-4 flex-1">
                                <div className='flex items-center'>
                                <Label title={"Add To Brain"} htmlFor={'add-to-brain'} />
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className='cursor-pointer ml-1 mb-2 inline-block'>
                                                <TooltipIcon
                                                    width={15}
                                                    height={15}
                                                    className={
                                                        'w-[15px] h-[15px] object-cover inline-block fill-b7'
                                                    }
                                                />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="border-none">
                                            <p className='text-font-14'>{`Share this prompt with different brains`}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                </div>
                                <CommonSelectInput
                                    options={combined?.map((br) => {
                                        return {
                                            value: br.title,
                                            label: br.title,
                                            slug: br.slug,
                                            isShare : br?.isShare,
                                            id: br._id
                                        }
                                    })}
                                    styles={customSelectStyles}
                                    menuPlacement="auto"
                                    isMulti
                                    id="add-to-brain"
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    onChange={(e) => {
                                        const newValues = [...selectedBrain, ...e];
                                        const uniqueValues = newValues.filter((value, index, self) =>
                                            index === self.findIndex((v) => v.slug === value.slug)
                                        );
                                        setValue('brain', uniqueValues, { shouldValidate: true });
                                    }}
                                    value={watch('brain')}
                                />
                                <ValidationError errors={errors} field={'brain'}></ValidationError>                           
                            </div>
                        </div>
                        <div className="relative mb-4">
                            <Label title={"Prompt content"} htmlFor={'prompt-content'} />
                            <textarea
                                className="default-form-input"
                                placeholder="Enter prompt content here..."
                                id="prompt-content"
                                rows={3}
                                {...register('content')}
                                value={watch("content")}
                            />      
                           
                            <ValidationError errors={errors} field={'content'}></ValidationError>
                        </div>
                        <div className="relative mb-4">
                            <Label title={"Tags"} htmlFor={'tags'} required={false} />
                            <ChipInput
                                value={promptTags}
                                className="w-full default-form-input !p-0"
                                onAdd={(chip) => handleAddChip(chip)} 
                                onDelete={(chip, index) => handleDeleteChip(chip, index)} 
                                onChange={e => setPromptTags(e)}
                                placeholder='Type and press enter, tab or comma to add tags' 
                                disableUnderline
                                newChipKeys={['Enter', 'Tab', ',']}
                                classes={{
                                    root: classes.inputRoot,
                                    input: classes.input,
                                    chip: classes.chip,
                            }}
                            />
                        </div>
                        {
                            !restrictWithoutOpenAIKey(false) &&
                                <div className="relative mb-4">
                                    <div className='flex items-center'>
                                    <Label title={'Website'} htmlFor={'website-url'} required={false} />
                                    <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className='cursor-pointer mb-2 ml-1 inline-block'>
                                                        <TooltipIcon
                                                            width={15}
                                                            height={15}
                                                            className={
                                                                'w-[15px] h-[15px] object-cover inline-block fill-b7'
                                                            }
                                                        />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent className="border-none">
                                            
                                                <span className='text-font-14'>
                                                    {`Enter the URL of the website you want to scrape.`}{' '}
                                                    <br />
                                                    {`Please include 'http://' or 'https://' at the beginning.`}{' '}
                                                    <br />
                                                    {`For example: https://www.example.com`}
                                                </span>
                                            
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        </div>
                                    {websites.map((_, index) => (
                                        <div className="goal-input-wrap mb-2 relative" key={index}>
                                            <CommonInput
                                                className={'default-form-input !pr-10'}
                                                {...register(`website.${index}`)}
                                                value={watch(`website.${index}`)}
                                            />
                                            <ValidationError
                                                errors={errors}
                                                field={`website.${index}`}
                                            />

                                            {websites.length > 1 && index > 0 && (
                                                <button
                                                    type="button"
                                                    className="goal-input-remove absolute top-0 right-0 h-[50px] p-3"
                                                    onClick={() => removeInput(index)}
                                                >
                                                    <Image
                                                        src={CloseIcon}
                                                        width={12}
                                                        height={12}
                                                        alt="close"
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <ValidationError errors={errors} field={'website'} />

                                    <button
                                        className="btn btn-outline-gray mt-2.5"
                                        type="button"
                                        onClick={addNewTextInput}
                                    >
                                        <PlusRound
                                            className="inline-block mr-2.5 [&>circle]:fill-b10 [&>path]:fill-w13"
                                            width="22"
                                            height="22"
                                        />
                                        Add
                                    </button>
                                </div>
                        }
                        {
                            !isEmptyObject(scrapeSummaries) &&
                            <>
                                <div className="relative mb-4 flex-1">
                                    <div className='flex items-center'>
                                    <Label title={'Summaries'} htmlFor={'Summaries'} required={false} />
                                    
                                    <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className='cursor-pointer mb-2 ml-1 inline-block'>
                                                <TooltipIcon
                                                    width={15}
                                                    height={15}
                                                    className={
                                                        'w-[15px] h-[15px] object-cover inline-block fill-b7'
                                                    }
                                                />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="border-none">
                                            <span className=''>{`This section displays a summary of the content scraped from the website`}</span>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                </div>
                                    {
                                        websites.map(current => {
                                            const matchingEntry = Object.entries(scrapeSummaries).find(([_key, ele]:any) => ele.website === current);
                                        
                                            if (matchingEntry) {
                                                const [key] = matchingEntry;
                                                return (
                                                <CommonInput
                                                    className="mb-2 default-form-input"
                                                    key={key}
                                                    placeholder="Summaries"
                                                    {...register(`summaries.${key}.summary`)}
                                                    value={watch(`summaries.${key}.summary`)}
                                                />
                                                );
                                            }
                                            
                                            return null; 
                                        })
                                        .filter(Boolean)                                      
                                    }
                                    {/* {
                                        websites.reduce((accumulator, current) => {
                                            
                                            const matchingEntry = Object.entries(scrapeSummaries).find(([_key, ele]) => ele.website === current);
                                            
                                            if (matchingEntry) {
                                                const [key] = matchingEntry;
                                                accumulator.push(
                                                    <CommonInput
                                                        className={'mb-2 default-form-input'}                                            
                                                        key={key}
                                                        placeholder={'Summaries'}
                                                        {...register(`summaries.${key}.summary`)}
                                                        value={watch(`summaries.${key}.summary`)}
                                                    />
                                                )
                                                return accumulator
                                            }
                                        }, [])
                                    } */}
                                </div>

                            </>
                        }
                       <Separator className="border-b10 border-b mt-3 mb-5" />
                        <div className="relative mb-4">
                            <Label title={"Additional Information"} htmlFor={'additional-information'} required={false} />
                            <CommonSelectInput 
                                className="react-select-container" 
                                classNamePrefix="react-select" 
                                options={ADDITIONAL_INFO} 
                                side="top"
                                {...register('addinfo')}
                                onChange={(e) => {
                                    setValue('addinfo', e, { shouldValidate: true })
                                }}
                                value={watch('addinfo')}
                            />
                            <ValidationError errors={errors} field={'addinfo'}/>
                        </div>

                        {getValues('addinfo')?.code === PROMPT_SELECTION.BRAND_PROFILE &&
                            <BrandProfile 
                                register={register} 
                                watch={watch} 
                                getValues={getValues} 
                                setValue={setValue} 
                                errors={errors} 
                            />
                        }
                        {getValues('addinfo')?.code === PROMPT_SELECTION.COMPANY_INFO &&
                            <CompanyProfile 
                                register={register} 
                                watch={watch} 
                                getValues={getValues} 
                                setValue={setValue} 
                                errors={errors} 
                            />
                        }
                        {getValues('addinfo')?.code === PROMPT_SELECTION.PRODUCT_INFO &&
                            <ProductProfile 
                                register={register} 
                                watch={watch} 
                                getValues={getValues} 
                                setValue={setValue} 
                                errors={errors} 
                            />
                        }
                        
                        
                        <DialogFooter className="flex items-center justify-center gap-2.5 pb-[30px] px-[30px]">
                            <button type='submit' className='btn btn-black' disabled={addPromptLoading}>Save</button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

    );
};

export default AddNewPromptModal;
