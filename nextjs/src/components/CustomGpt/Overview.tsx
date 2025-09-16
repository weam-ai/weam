import React, { useState } from 'react';
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
import CharacterSelectionDialog from './CharacterSelectionDialog';

// Import the character data to access all characters for random selection
import { DEFAULT_CHARACTERS } from './CharacterSelectionDialog';

interface OverviewProps {
    onNext: () => void;
    customGptData: any;
    setCustomGptData: (data: any) => void;
}

const Overview: React.FC<OverviewProps> = ({ onNext, customGptData, setCustomGptData }) => {
    const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);

    // Function to get a random character from all tabs
    const getRandomCharacter = () => {
        const allCharacters: Array<{id: string, image: string}> = [];
        
        // Flatten all characters from all categories into a single array
        Object.values(DEFAULT_CHARACTERS).forEach(category => {
            allCharacters.push(...category);
        });
        
        // Return a random character
        const randomIndex = Math.floor(Math.random() * allCharacters.length);
        return allCharacters[randomIndex];
    };

    // Function to auto-assign a random character
    const autoAssignRandomCharacter = () => {
        const randomCharacter = getRandomCharacter();
        const normalizedImageUrl = randomCharacter.image.startsWith('/') ? randomCharacter.image : `/${randomCharacter.image}`;
        
        // Create character info similar to manual selection
        const characterInfo = {
            isCharacter: true,
            characterImage: normalizedImageUrl,
            characterId: randomCharacter.id,
            uri: normalizedImageUrl,
            name: `character-${randomCharacter.id}.jpg`,
            mime_type: 'image/jpeg',
            file_size: 0
        };
        
        return {
            previewCoverImg: normalizedImageUrl,
            coverImg: characterInfo,
            charimg: normalizedImageUrl
        };
    };

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: customGptData,
        validationSchema: overviewValidationSchema,
        onSubmit: async (values) => {
            try {
                let submissionData = { ...customGptData, ...values };
                
                // Check if user has selected any image (character or uploaded)
                if (!submissionData.previewCoverImg && !submissionData.coverImg) {
                    // Auto-assign a random character
                    const randomCharacterData = autoAssignRandomCharacter();
                    submissionData = { ...submissionData, ...randomCharacterData };
                }
                
                setCustomGptData(submissionData);
                onNext();
            } catch (error) {
                console.error('Error in Overview form submission:', error);
            }
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
    };

    const removeInput = (index: number) => {
        const newItems = [...values.goals];
        newItems.splice(index, 1);
        setFieldValue('goals', newItems);
    };

    const addNewInstructionInput = () => {
        setFieldValue('instructions', [...values.instructions, '']);
    };

    const removeNewInstructionInput = (index: number) => {
        const newItems = [...values.instructions];
        newItems.splice(index, 1);
        setFieldValue('instructions', newItems);
    };

    const handleImageSelect = (imageUrl: string, file?: File) => {
        if (file && (file as any).isCharacter) {
            // Ensure imageUrl has leading slash for character images
            const normalizedImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
            
            // Character selection - store character info properly
            setFieldValue('previewCoverImg', normalizedImageUrl);
            // Store character info in a way that will be visible in AgentList
            const characterInfo = {
                isCharacter: true,
                characterImage: normalizedImageUrl,
                characterId: (file as any).characterId || 'character',
                // Add these properties to make it compatible with the existing system
                uri: normalizedImageUrl,
                name: `character-${(file as any).characterId || 'character'}.jpg`,
                mime_type: 'image/jpeg',
                file_size: 0
            };
            setFieldValue('coverImg', characterInfo);
            // Set charimg field for character images
            setFieldValue('charimg', normalizedImageUrl);
        } else if (file) {
            // Normal file upload
            setFieldValue('coverImg', file);
            setFieldValue('previewCoverImg', imageUrl);
            // Clear charimg for uploaded files
            setFieldValue('charimg', '');
        } else {
            // Fallback - just set preview
            setFieldValue('previewCoverImg', imageUrl);
            setFieldValue('coverImg', null);
            // Clear charimg
            setFieldValue('charimg', '');
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                {/* Character Selection Trigger */}
                <div
                    className="mb-4 flex items-center gap-2 cursor-pointer group"
                    onClick={() => setIsCharacterDialogOpen(true)}
                >
                    <div className="w-14 h-14 bg-b12 rounded overflow-hidden p-1 flex items-center justify-center">
                        {values.previewCoverImg ? (
                            <Image
                                src={values.previewCoverImg}
                                alt="selected image"
                                width={56}
                                height={56}
                                className="object-cover w-10 h-auto rounded-full"
                            />
                        ) : (
                            <Image
                                src={WorkspacePlaceholder}
                                alt="upload"
                                width={56}
                                height={56}
                                className="w-10 h-auto object-cover rounded-full"
                            />
                        )}
                    </div>
                    <p className="text-font-14 font-medium group-hover:text-b2 text-b5">
                        Upload Image
                    </p>
                </div>

                {/* File Upload Fallback */}
                {/* <FileUploadCustom
                    inputId={'uploadCustomGPT'}
                    placeholder={WorkspacePlaceholder}
                    placeholderClass="h-[18px] w-auto"
                    className="mb-4"
                    prevImg={values.previewCoverImg}
                    onLoadPreview={(prevImg) => {
                        setFieldValue('previewCoverImg', prevImg || null);
                    }}
                    onLoad={(file) => {
                        setFieldValue('coverImg', file || null);
                    }}
                    page={'agent'}
                /> */}

                {/* Character Selection Dialog */}
                <CharacterSelectionDialog
                    isOpen={isCharacterDialogOpen}
                    onClose={() => setIsCharacterDialogOpen(false)}
                    onImageSelect={handleImageSelect}
                    currentImage={values.previewCoverImg}
                />

                {touched.coverImg && <FormikError errors={errors} field={'coverImg'} />}

                {/* Name */}
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

                {/* System Prompt */}
                <div className="relative mb-4">
                    <div className="flex items-center">
                        <Label htmlFor={'SystemPrompt'} title={'System Prompt'} />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-pointer mb-2 ml-1 inline-block">
                                        <TooltipIcon
                                            width={15}
                                            height={15}
                                            className="w-[15px] h-[15px] object-cover inline-block fill-b7"
                                        />
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="border-none">
                                    <p className="text-font-14">
                                        Define the agent’s role, tone, and essential context.
                                    </p>
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
                        onChange={handleChange}
                    ></textarea>
                    {touched.systemPrompt && (
                        <FormikError errors={errors} field={'systemPrompt'} />
                    )}
                </div>

                {/* Goals */}
                <div className="relative mb-5">
                    <div className="flex items-center">
                        <Label htmlFor={'Goals'} title={'Goals'} />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-pointer mb-2 ml-1">
                                        <TooltipIcon
                                            width={15}
                                            height={15}
                                            className="w-[15px] h-[15px] object-cover inline-block fill-b7"
                                        />
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="border-none">
                                    <p className="text-font-14">
                                        Outline specific aims and what success looks like for users
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {values.goals.map((value, index) => (
                        <div className="goal-input-wrap relative mb-2.5" key={index}>
                            <input
                                type="text"
                                className="default-form-input !pr-10"
                                id={`cgpt-goal-${index}`}
                                value={value}
                                name={`goals[${index}]`}
                                onChange={handleChange}
                            />
                            {touched.goals && (
                                <FormikError errors={errors} index={index} field={'goals'} />
                            )}
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
                    {errors.goals && typeof errors.goals === 'string' && (
                        <FormikError errors={errors} field={'goals'} />
                    )}
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

                {/* Instructions */}
                <div className="relative mb-4">
                    <div className="flex items-center">
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
                                            className="w-[15px] h-[15px] object-cover inline-block fill-b7"
                                        />
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="border-none">
                                    <p className="text-font-14">
                                        Detail how the agent should interact and handle various
                                        scenarios
                                    </p>
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
                            {touched.instructions && (
                                <FormikError errors={errors} index={index} field={'instructions'} />
                            )}
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
                    {errors.instructions && typeof errors.instructions === 'string' && (
                        <FormikError errors={errors} field={'instructions'} />
                    )}
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

                {/* Submit */}
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
