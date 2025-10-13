import React, { useState, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import { IMPORT_IN_PROGRESS_MESSAGE, IMPORT_ERROR_MESSAGE, MODAL_NAME_CONVERSION, VALID_PLATFORMS, FILE } from '@/utils/constant';
import Select from "react-select";
import  Label  from '@/widgets/Label';
import FileUpload from '@/components/FileUploadDropZone';
import { useFormik } from 'formik';
import FormikError from '@/widgets/FormikError';
import { importChatSchema } from '@/schema/chat';
import { decodedObjectId } from '@/utils/helper';
import { getCurrentUser } from '@/utils/handleAuth';
import { BrainListType } from '@/types/brain';
import useChat from '@/hooks/chat/useChat';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useSearchParams } from 'next/navigation';
import TooltipIcon from '@/icons/TooltipIcon';
import ThreeDotLoader from '../Loader/ThreeDotLoader';

type ImportChatProps = {
    onClose: () => void;
    showImportChat: boolean;
    setShowImportChat: React.Dispatch<React.SetStateAction<boolean>>
}

const ImportChat = ({ onClose, showImportChat, setShowImportChat }: ImportChatProps) => {
    const [uploadMessage, setUploadMessage] = useState('');
    const [filesRemove, setFilesRemove] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const searchParams = useSearchParams();

    const b = searchParams.get('b');
    const brainData = useSelector((store: RootState) => store.brain.combined);
    const currentBrain=brainData.find((brain: BrainListType) => brain._id === decodedObjectId(b));
    const currentUser = useMemo(() => getCurrentUser(), []);
    const { pyUploadImportChat } = useChat();

    const formik = useFormik({
        initialValues: {
            code: '',
            file: null,
        },
        validationSchema: importChatSchema,
        onSubmit: async (values) => {
            if (!values.file || !values.code) return;
            setIsSubmitting(true);

            const formData = new FormData();
            formData.append('file', values.file);
            formData.append('user_id', currentUser._id);
            formData.append('company_id', currentUser.company.id);
            formData.append('brain_id', currentBrain._id);
            formData.append('brain_title', currentBrain.title);
            formData.append('brain_slug', currentBrain.slug);
            formData.append('company_name', currentUser.company.name);
            formData.append('code', values.code);

            try {
                const response = await pyUploadImportChat(formData, setShowImportChat);
                if (response?.status_code === 200) {
                    setUploadMessage(
                        response?.data?.message || IMPORT_IN_PROGRESS_MESSAGE
                    );
                }
            } catch (error) {
                setUploadMessage(IMPORT_ERROR_MESSAGE);
                setShowImportChat(false);
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    const { errors, handleSubmit, setFieldValue, touched } = formik;

    const handleFileUpload = (uploadedFiles) => {
        if (uploadedFiles && uploadedFiles.length > 0) {
            setFieldValue('file', uploadedFiles[0]);
        } else {
            setFieldValue('file', null);
        }
    };

    const handleFilesRemove = useCallback(
        (removedFiles) => {
            setFilesRemove(removedFiles || []);
            setFieldValue('file', null);
        },
        [setFieldValue]
    );



    const platformOptions = [];
    for (let [key, value] of Object.entries(VALID_PLATFORMS)) {
        platformOptions.push({
            label: value,
            value: key,
        });
    }

    // Add accepted file types constant
    const acceptedFileTypes = {
        'application/json': ['.json'],
        // 'application/zip': ['.zip']
    };

    const handleDialogChange = (open: boolean) => {
        if (!open) {
            setUploadMessage('');
            formik.resetForm();
            setFilesRemove([]);
            onClose();
        }
    };
    return (
        <Dialog open={showImportChat} onOpenChange={handleDialogChange}>
            <DialogContent className="md:max-w-[600px] max-w-[calc(100%-30px)] py-7 overflow-hidden">
                <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        Import Chats
                    </DialogTitle>
                </DialogHeader>

                {uploadMessage ? (
                    <div className="relative px-7 pt-7 pb-4">
                        <p className="text-center">{uploadMessage}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="dialog-body flex flex-col flex-1 pb-6 px-8 max-h-[70vh] overflow-y-auto">
                            <div className="py-4">
                                <Label title="Model" htmlFor="code" />
                                <Select
                                    options={platformOptions}
                                    id="code"
                                    className="react-select-container react-select-border-light bg-white react-select-sm"
                                    classNamePrefix="react-select"
                                    onChange={(
                                        option:
                                            | { value: string; label: string }
                                            | any
                                    ) => {
                                        setFieldValue(
                                            'code',
                                            option?.value || ''
                                        );
                                    }}
                                    name="code"
                                />
                                {errors.code && touched.code && (
                                    <FormikError
                                        errors={errors}
                                        field={'code'}
                                    />
                                )}
                                <div className='flex text-font-12 mb-2 mt-5'>
                                    <span className='w-6'>
                                        <TooltipIcon className="w-4 h-auto fill-b6" />
                                    </span>
                                    Export your chats from ChatGPT/Anthropic in a ZIP file format. Inside the ZIP file, locate the conversations.json file.
                                </div>
                                {/* <Label title="File" htmlFor="file" /> */}

                                <FileUpload
                                iconType="jsonIcon" 
                                className='border border-dashed border-b8 rounded-lg text-center cursor-pointer p-[30px]'
                                // fileFormat="file"
                                    onLoad={(uploadedFiles) =>
                                        handleFileUpload(uploadedFiles)
                                    }
                                    multiple={false}
                                    maxFiles={1}
                                    setFilesRemove={handleFilesRemove}
                                    filesRemove={filesRemove}
                                    acceptedFilesTypes={acceptedFileTypes}
                                    message={'Drag and drop the conversations.json file here, or click to select it'}
                                    subMessage={' '}
                                    maxFileSize={FILE.IMPORT_CHAT_SIZE}
                                />
                                {errors.file && touched.file && (
                                    <FormikError
                                        errors={errors}
                                        field={'file'}
                                    />
                                )}
                                

                                

                                <div>
                                {isSubmitting ? <ThreeDotLoader /> : ''}
                                </div>
                                <div className="flex justify-center mt-4 gap-2">
                                    
                                    <DialogClose asChild>
                                        <button
                                            type="button"
                                            className="btn btn-outline-gray"
                                            onClick={() => onClose()}
                                        >
                                            Cancel
                                        </button>
                                    </DialogClose>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="btn btn-black"
                                    >
                                        Import
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ImportChat;
