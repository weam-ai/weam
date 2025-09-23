import React from 'react';
import WorkspacePlaceholder from '../../../public/wokspace-placeholder.svg';
import CloseIcon from '../../../public/black-close-icon.svg';
import Image from 'next/image';
import FileUploadCustom from '../FileUploadCustom';
import ArrowNext from '@/icons/ArrowNext';
import Label from '@/widgets/Label';
import PlusRound from '@/icons/PlusRound';
import { overviewValidationSchema } from '@/schema/customgpt';
import { useFormik } from "formik";
import FormikError from '@/widgets/FormikError';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import TooltipIcon from '@/icons/TooltipIcon';

const Overview = ({ onNext, customGptData, setCustomGptData }) => {
    const formik = useFormik({
        initialValues: customGptData,
        validationSchema:overviewValidationSchema,
        onSubmit: async ({ title, systemPrompt, goals, instructions, coverImg, previewCoverImg }) => {
            setCustomGptData({ ...customGptData, title, systemPrompt, goals, instructions, coverImg, previewCoverImg });
            onNext();

        }
    });

    const {
        errors,
        touched,
        handleBlur,
        values,
        handleChange,
        handleSubmit,
        setFieldValue,
    } = formik;

    const addNewTextInput = () => {
        setFieldValue('goals', [...values.goals, '']);
    }

    const removeInput = (index) => {
        const newItems = [...values.goals];
        newItems.splice(index, 1);
        setFieldValue('goals', newItems);
    }

    const addNewInstructionInput = () => {
        setFieldValue('instructions', [...values.instructions, '']);
    }

    const removeNewInstructionInput = (index) => {
        const newItems = [...values.instructions];
        newItems.splice(index, 1);
        setFieldValue('instructions', newItems);
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <FileUploadCustom
                    inputId={'uploadCustomGPT'}
                    placeholder={WorkspacePlaceholder}
                    placeholderClass="h-[18px] w-auto"
                    className="mb-4"
                    prevImg={values.previewCoverImg}
                    onLoadPreview={(prevImg) => {
                        if (prevImg) {
                            setFieldValue('previewCoverImg', prevImg);
                        } else {
                            setFieldValue('previewCoverImg', null);
                        }
                    }}
                    onLoad={(file) => {
                        if (file) {
                            setFieldValue('coverImg', file);
                        } else {
                            setFieldValue('coverImg', null);
                        }
                    }}
                    setData={setCustomGptData}
                    page={'agent'}
                />
                {touched.coverImg && <FormikError errors={errors} field={'coverImg'} />}
                <div className="relative mb-5">
                    <Label htmlFor={'cgpt-name'} title={'Name'} />
                    <input
                        type="text"
                        className="default-form-input"
                        id="cgpt-name"
                        placeholder="SloganGen AI"
                        name="title"
                        onBlur={handleBlur}
                        value={values.title}
                        onChange={handleChange}
                    />
                    {touched.title && <FormikError errors={errors} field={'title'} />}
                </div>
                <div className="relative mb-4">
                    <div className='flex items-center'>
                        <Label htmlFor={'SystemPrompt'} title={'System Prompt'} />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-pointer mb-2 ml-1 inline-block">
                                        
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
                                    <p className='text-font-14'>{`Define the agents role, tone, and essential context.`}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <textarea
                        className="default-form-input"
                        placeholder="Enter System Prompt content here..."
                        id="SystemPrompt"
                        rows={3}
                        name="systemPrompt"
                        value={values.systemPrompt}
                        onChange={(e) => {
                            handleChange(e);
                        }}
                    ></textarea>
                    {touched.systemPrompt && <FormikError errors={errors} field={'systemPrompt'} />}
                </div>
                <div className="relative mb-5">
                <div className='flex items-center'>
                    <Label htmlFor={'Goals'} title={'Goals'} />
                    <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-pointer mb-2 ml-1">
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
                                    <p className='text-font-14'>{`Outline specific aims and what success looks like for users`}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {values.goals.map((value, index) => (
                        <div
                            className="goal-input-wrap relative mb-2.5"
                            key={index}
                        >
                            <input
                                type="text"
                                className="default-form-input !pr-10"
                                id={`cgpt-goal-${index}`}
                                value={value}
                                name={`goals[${index}]`}
                                onChange={handleChange}
                            />
                            {touched.goals && <FormikError errors={errors} index={index} field={'goals'} />}
                            {values.goals.length > 1 && index > 0 && (
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
                    {errors.goals && typeof errors.goals == 'string' &&
                        <FormikError errors={errors} field={'goals'} />
                    }
                    <button
                        className="btn btn-outline-gray"
                        id="add-new-goal"
                        type="button"
                        onClick={addNewTextInput}
                    >
                        <PlusRound
                            className="inline-block mr-2.5 [&>circle]:fill-b11 [&>path]:fill-b2"
                            width="22"
                            height="22"
                        />
                        Add
                    </button>
                </div>
                <div className="relative mb-4">
                    <div className='flex items-center'>
                    <Label
                        htmlFor={'cgpt-prompt-content'}
                        title={'Instruction (optional)'}
                        required={false}
                    />
                    <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-pointer mb-2 ml-1 inline-block">
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
                                    <p className='text-font-14'>{`Detail how the bot should interact and handle various scenarios`}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        </div>
                    {values.instructions.map((value, index) => (
                            <div className="goal-input-wrap relative mt-2.5" key={index}>
                                <textarea
                                    className="default-form-input !pr-10"
                                    placeholder="Enter Instruction here..."
                                    id={`cgpt-prompt-content-${index}`}
                                    rows={2}
                                    value={value}
                                    name={`instructions[${index}]`}
                                    onChange={handleChange}
                                ></textarea>
                                {touched.instructions && <FormikError errors={errors} index={index} field={'instructions'} />}
                                {values.instructions.length > 1 && index > 0 && (
                                    <button
                                        className="goal-input-remove absolute top-0 right-0 h-[50px] p-3"
                                        type="button"
                                        onClick={() => removeNewInstructionInput(index)}
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
                    {errors.instructions && typeof errors.instructions == 'string' &&
                        <FormikError errors={errors} field={'instructions'} />
                    }
                    <button
                        className="btn btn-outline-gray mt-2.5"
                        id="add-new-instruction"
                        type="button"
                        onClick={addNewInstructionInput}
                    >
                        <PlusRound
                            className="inline-block mr-2.5 [&>circle]:fill-b11 [&>path]:fill-b2"
                            width="22"
                            height="22"
                        />
                        Add
                    </button>
                </div>
                <div className="flex justify-end mt-5">
                    <button type="submit" className="btn btn-blue">
                        Next
                        <ArrowNext
                            width="14"
                            height="12"
                            className="fill-b15 ms-2.5 inline-block align-middle -mt-0.5"
                        />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Overview;