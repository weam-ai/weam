import React, { useState, useEffect } from 'react';
import WorkspacePlaceholder from '../../../public/wokspace-placeholder.svg';
import CloseIcon from '../../../public/black-close-icon.svg';
import Image from 'next/image';
import FileUploadCustom from '../FileUploadCustom';
import FileUpload from '../FileUploadDropZone';
import ArrowNext from '@/icons/ArrowNext';
import ArrowBack from '@/icons/ArrowBack';
import Label from '@/widgets/Label';
import PlusRound from '@/icons/PlusRound';
import { overviewValidationSchema, modalSelectionKeys, docsSelectionSchema } from '@/schema/customgpt';
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
import AgentSelector from './AgentSelector';
// import MCPToolsSelector from './MCPToolsSelector';
import Select from 'react-select';
import useAssignModalList from '@/hooks/aiModal/useAssignModalList';
import { AI_MODAL_NAME, API_TYPE_OPTIONS, MODULES, MODULE_ACTIONS, FILE } from '@/utils/constant';
import { getDisplayModelName } from '@/utils/helper';
import commonApi from '@/api';
import Toast from '@/utils/toast';
import { useRouter, useSearchParams } from 'next/navigation';
import routes from '@/utils/routes';
import { retrieveBrainData } from '@/utils/helper';

// Import the character data to access all characters for random selection
import { DEFAULT_CHARACTERS } from './CharacterSelectionDialog';

interface OverviewProps {
    customGptData: any;
    setCustomGptData: (data: any) => void;
}

const CUSTOM_BOT_IGNORE_MODAL = [
    AI_MODAL_NAME.SONAR,
    AI_MODAL_NAME.SONAR_REASONING_PRO
];

const Overview: React.FC<OverviewProps> = ({ customGptData, setCustomGptData }) => {
    const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filesRemove, setFilesRemove] = useState([]);
    const router = useRouter();
    const b = useSearchParams().get('b');
    const { userModalList, userModals } = useAssignModalList();

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
        validationSchema: modalSelectionKeys.concat(docsSelectionSchema),
        onSubmit: async (values) => {
            try {
                let submissionData = { ...customGptData, ...values };
                
                // Check if user has selected any image (character or uploaded)
                if (!submissionData.previewCoverImg && !submissionData.coverImg) {
                    // Auto-assign a random character
                    const randomCharacterData = autoAssignRandomCharacter();
                    submissionData = { ...submissionData, ...randomCharacterData };
                }

                // Complete form submission logic from Docs component
                const brainData = retrieveBrainData();

                const formData = new FormData();
                formData.append('title', submissionData.title);
                formData.append('systemPrompt', submissionData.systemPrompt);
                formData.append('type', submissionData.type || 'agent');
                
                if (submissionData.description) {
                    formData.append('description', submissionData.description);
                }
                
                if (submissionData.Agents && submissionData.Agents.length > 0) {
                    formData.append('Agents', JSON.stringify(submissionData.Agents));
                }
                
                // if (submissionData.mcpTools && submissionData.mcpTools.length > 0) {
                //     formData.append('mcpTools', JSON.stringify(submissionData.mcpTools));
                // }
                
                if (submissionData.charimg) {
                    formData.append('charimg', submissionData.charimg);
                }
                formData.append('responseModel[name]', submissionData.responseModel.name);
                formData.append('responseModel[id]', submissionData.responseModel.id);
                formData.append('responseModel[company][name]', submissionData.responseModel.company.name);
                formData.append('responseModel[company][slug]', submissionData.responseModel.company.slug);
                formData.append('responseModel[company][id]', submissionData.responseModel.company.id);
                formData.append('responseModel[bot][id]', submissionData.responseModel.bot.id);
                formData.append('responseModel[bot][title]', submissionData.responseModel.bot.title);
                formData.append('responseModel[bot][code]', submissionData.responseModel.bot.code);
                formData.append('responseModel[provider]', submissionData.responseModel.provider);
                formData.append('maxItr', submissionData.maxItr);
                formData.append('itrTimeDuration', submissionData.itrTimeDuration);

                if(submissionData.coverImg instanceof File || submissionData.removeCoverImg){
                    formData.append('coverImg', submissionData.coverImg instanceof File ? submissionData.coverImg : null);
                }

                if(Array.isArray(submissionData.doc)){
                    submissionData.doc.forEach((file:any) => {
                        if(!file.id){
                            formData.append('doc', file);
                        }
                    });
                } 

                if(filesRemove.length){
                    formData.append('removeDoc', JSON.stringify(filesRemove));
                }

                formData.append('brain[id]', brainData?._id);
                formData.append('brain[title]', brainData?.title);
                formData.append('brain[slug]', brainData?.slug);
                formData.append('imageEnable', submissionData.responseModel.bot.code === API_TYPE_OPTIONS.OPEN_AI ? submissionData?.imageEnable || false : false);
           
                setLoading(true);
                const reqObject = {
                    action: MODULE_ACTIONS.CREATE,
                    prefix: MODULE_ACTIONS.WEB_PREFIX,
                    module: MODULES.CUSTOM_GPT,
                    common: true,
                    data: formData,
                    config: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
                if(submissionData.id){
                    Object.assign(reqObject,{action: MODULE_ACTIONS.UPDATE, parameters:[submissionData.id]})
                }
                const response = await commonApi(reqObject);
                Toast(response.message);
                router.push(`${routes.customGPT}?b=${b}`);
            } catch (error) {
                console.error('Error in form submission:', error);
            } finally {
                setLoading(false);
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

    useEffect(() => {
        userModalList();
    }, []);


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
                <div className='inline-block mb-5 min-w-[180px]'>
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
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
                </div>

                {/* Character Selection Dialog */}
                <CharacterSelectionDialog
                    isOpen={isCharacterDialogOpen}
                    onClose={() => setIsCharacterDialogOpen(false)}
                    onImageSelect={handleImageSelect}
                    currentImage={values.previewCoverImg}
                />

                {touched.coverImg && <FormikError errors={errors} field={'coverImg'} />}
                
                {/* Name */}
                <div className="relative w-full mb-5">
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

                {/* Agent Type Selection - Only show for new agents */}
                {!values.id && (
                    <div className="relative w-full mb-5">
                        <Label htmlFor={'agent-type'} title={'Agent Type'} />
                        <Select
                            options={[
                                { value: 'agent', label: 'Agent' },
                                { value: 'supervisor', label: 'Supervisor Agent' }
                            ]}
                            value={{ value: values.type, label: values.type === 'agent' ? 'Agent' : 'Supervisor Agent' }}
                            onChange={(selectedOption: any) => {
                                setFieldValue('type', selectedOption.value);
                                // Reset agents when switching types
                                if (selectedOption.value === 'agent') {
                                    setFieldValue('Agents', []);
                                }
                            }}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            placeholder="Select agent type..."
                            isSearchable={false}
                        />
                        {touched.type && <FormikError errors={errors} field={'type'} />}
                    </div>
                )}

                {/* Description - Required for both agent types */}
                <div className="relative w-full mb-5">
                    <Label htmlFor={values.type === 'agent' ? 'agent-description' : 'agent-description'} title={'Description'} />
                    <textarea
                        className="default-form-input"
                        id={values.type === 'agent' ? 'agent-description' : 'agent-description'}
                        placeholder={values.type === 'agent' ? 'Describe what this agent does...' : 'Describe what this supervisor agent does...'}
                        name="description"
                        rows={2}
                        value={values.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                    {touched.description && <FormikError errors={errors} field={'description'} />}
                </div>

                {/* Agents Selection for Supervisor */}
                {values.type === 'supervisor' && (
                    <div className="relative w-full mb-5">
                        <div className="flex items-center mb-2">
                            <Label htmlFor="tool-agents" title="Agents" required={true} />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="ml-1 cursor-help">
                                            <TooltipIcon />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Select the agents that this supervisor agent will manage</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <AgentSelector
                            selectedAgents={values.Agents || []}
                            onSelectionChange={(selectedIds) => 
                                setFieldValue('Agents', selectedIds)
                            }
                        />
                        {touched.Agents && <FormikError errors={errors} field={'Agents'} />}
                    </div>
                )}

                {/* Model Selection */}
                {userModals && (
                    <div className="relative mb-5">
                        
                        <div className="flex items-center">
                            <Label htmlFor={'model'} title={'Model'} />
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
                                        <p className="text-font-14">{`Select the model for generating responses for your agents.`}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Select
                            options={userModals?.reduce((accumulator, current) => {
                                if (!CUSTOM_BOT_IGNORE_MODAL.includes(current.name) && !current.isDisable) {
                                    accumulator.push({
                                        value: getDisplayModelName(current.name),
                                        label: getDisplayModelName(current.name),
                                        id: current._id,
                                        company: current.company,
                                        isDisabled:current.isDisable || false,
                                        provider: current?.provider,
                                        bot: current.bot,
                                        name: current.name,
                                    })
                                }
                                return accumulator;
                            }, [])}
                            id="model"
                            className="react-select-container"
                            classNamePrefix="react-select"
                            name="responseModel"
                            onChange={(value)=>{
                                setFieldValue('responseModel',value);
                            }}
                            value={values.responseModel}
                            isOptionDisabled={(option)=> option.isDisabled}
                            styles={{
                                option: (provided, option) => ({
                                ...provided,
                                cursor: option.isDisabled ? 'not-allowed' : 'pointer',
                                })
                            }}
                        />
                        {touched.responseModel && <FormikError errors={errors} field={'responseModel'} />}

                        {values.responseModel?.bot?.code === API_TYPE_OPTIONS.OPEN_AI && (
                            <div className="mt-4">
                                <Label htmlFor={'imageEnable'} title={'Capabilities'} required={false} />
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                        checked={values?.imageEnable || false}
                                        onChange={(e) => setFieldValue('imageEnable', e.target.checked)}
                                    />
                                    <span className="ml-2">Image Generation</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}
                

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

                
                {/* File Upload Section */}
                <div className="relative mb-5">
                    <Label htmlFor={'doc'} title={'Documents (optional)'} required={false} />
                    <FileUpload
                        fileFormat="file"
                        className='border border-b-4 rounded-lg text-center cursor-pointer p-[30px]' 
                        onLoad={(files: File[]) => {
                            if (files) {
                                setFieldValue('doc', files);
                                // Don't call setCustomGptData here as it causes Formik reinitialization
                                // Formik will handle the state through setFieldValue
                            } else {
                                setFieldValue('doc', null);
                            }
                        }}
                        multiple
                        maxFiles={10}
                        setFilesRemove={setFilesRemove}
                        filesRemove={filesRemove}
                        existingFiles={values.doc || []}
                        maxFileSize={FILE.SIZE}
                    />
                    {(values.doc && values.doc.length > 0) ?
                        <>{
                            values.doc.map((item, index) => (
                                <FormikError key={index} errors={errors} index={index} field={'doc'} />
                            ))
                        }
                        </> : <FormikError errors={errors} field={'doc'} />}
                </div>

                {/* MCP Tools Selection - Only for agents (optional) */}
                {/* {values.type === 'agent' && (
                    <div className="relative w-full mb-5">
                        <Label htmlFor={'mcp-tools'} title={'MCP Tools (optional)'} required={false} />
                        <div className="text-sm text-gray-600 mb-2">
                            Select the MCP tools that this tool agent can use
                        </div>
                        <MCPToolsSelector
                            selectedTools={values.mcpTools || []}
                            onSelectionChange={(selectedTools) => {
                                setFieldValue('mcpTools', selectedTools);
                            }}
                        />
                    </div>
                )} */}

                {/* Submit */}
                <div className="flex mt-5">
                    <button type="submit" className="btn btn-black" disabled={loading}>
                        Save Agent
                        
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Overview;
