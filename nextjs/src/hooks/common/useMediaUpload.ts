import commonApi from '@/api';
import { ALLOWED_TYPES, FILE, FILE_SIZE_MESSAGE, IMAGE_SELECTION_ERROR_MESSAGE, MODULE_ACTIONS } from '@/utils/constant';
import React, { useRef, useState, useEffect } from 'react';
import Toast from '@/utils/toast';
import { useDispatch, useSelector } from 'react-redux';
import { setUploadDataAction } from '@/lib/slices/aimodel/conversation';
import { allowImageConversation, decodedObjectId, generateObjectId, retrieveBrainData } from '@/utils/helper';
import store, { RootState } from '@/lib/store';
import { UploadedFileType } from '@/types/chat';
import { useSearchParams } from 'next/navigation';
import { BrainListType } from '@/types/brain';
import { hasExtraExtension } from '@/utils/fileHelper';

const MAX_FILE_UPLOAD_ERROR = 'Maximum 10 files can be uploaded at once';

const useMediaUpload = ({ selectedAIModal = {} }:any) => {
    const [fileLoader, setFileLoader] = useState(false);
    const [uploadedFile, setUploadedFile] = useState([]);
    const [isFileUpload, setIsFileUpload] = useState(false);
    const [storeVector, setStoreVector] = useState(false);
    const [disableCall, setDisableCall] = useState(false);
    const [copyFiles, setCopyFiles] = useState<File[]>([]);
    const [isFileDragging, setIsFileDragging] = useState(false);
    const fileInputRef = useRef(null);
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const brainData = useSelector((store: RootState) => store.brain.combined);

    const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        const validFiles: File[] = [];
        const hasDocuments = Array.from(files).some((file:any) => !file.type?.startsWith('image/'));
        const skippedFiles: string[] = [];
        const invalidFiles: string[] = [];
        
        // Add file count validation
        if (files.length > FILE.UPLOAD_LIMIT) {
            Toast('Maximum 10 files can be uploaded at once', 'error');
            fileInputRef.current.value = null;
            return;
        }

        Array.from(files).forEach((file: File) => {
            if (file.size > FILE.SIZE) {
                Toast(`${file.name}: ${FILE_SIZE_MESSAGE}`, 'error');
                return;
            }
            
            if(!ALLOWED_TYPES.includes(file.type)){
                if(!hasExtraExtension(file.name)){
                    invalidFiles.push(file.name);
                    return;
                }
            }

            if (hasDocuments && file.type?.startsWith('image/')) {
                // If documents are present, skip images and collect their names
                skippedFiles.push(file.name);
                return;
            }
            
            if (file.type?.startsWith('image/') && selectedAIModal?.name !== undefined) {
                const result = allowImageConversation(selectedAIModal);
                if (!result) {
                    Toast(`${file.name}: Image upload not supported for this model`, 'error');
                    return;
                }
            }
    
            validFiles.push(file);
        });

        // Show message for skipped images
        if (skippedFiles.length > 0) {
            Toast(`Files (${skippedFiles.join(', ')}) weren't uploaded. Images and documents can't be uploaded together. Please try again separately.`, 'error');
        }

        if (invalidFiles.length > 0) {
            Toast(`Following files are not supported: ${invalidFiles.join(', ')}`, 'error');
        }

        // Clear input if no valid files
        if (validFiles.length === 0) {
            fileInputRef.current.value = null;
            return;
        }
        
        try {
            setFileLoader(true);
            const selectedBrain = retrieveBrainData();
            const formData:any = new FormData();
            validFiles.forEach((file: File) => {
                // formData.append('files', file); // Using 'files[]' for array-like behavior                
                // formData.append('fileId', generateObjectId());
                const fileId = generateObjectId();
                formData.append(`files[${fileId}]`, file, file.name);
            });        
            
            if (selectedBrain?._id) {
                formData.append('vectorApiCall', 'true');
            }
            const response = await commonApi({
                action: MODULE_ACTIONS.MEDIA_UPLOAD,
                config: {
                    'Content-Type': 'multipart/form-data',
                    'x-brain-id': selectedBrain?._id
                },
                data: formData
            })
            Toast(response.message);
            // Process the response for multiple files
            // const uploadedFilesData = response.data.map((fileData: any) => ({
            //     name: fileData.name,
            //     uri: fileData.uri,
            //     _id: fileData?.id || fileData?._id,
            //     mime_type: fileData.mime_type,
            //     type: fileData.type,
            //     embedding_api_key: fileData?.embedding_api_key,
            //     imageT: fileData?.imageToken,
            // }));
            
            setIsFileUpload(true);            
            setDisableCall(true);
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setFileLoader(false);
        }
    };

    const resetMediaUpload = () => {
        setIsFileUpload(false);
        setStoreVector(false);
        fileInputRef.current.value = null;
    }

    const processFiles = async (files: File[]) => {
        const brain = brainData.find((brain: BrainListType) => brain._id === decodedObjectId(searchParams.get('b')));
        if (!brain) return;
        const globalUploadedFiles = store.getState().conversation.uploadData || [];
        // fetch selected modal directly for drag and drop
        const selectedModal = store.getState().assignmodel.selectedModal;

        const hasImage = files.some((file: File) => file.type?.startsWith('image/'));
        if (hasImage) {
            const result = allowImageConversation(selectedModal);
            if (!result) {
                Toast(IMAGE_SELECTION_ERROR_MESSAGE, 'error');
                return;
            }
        }

        const validFiles: File[] = [];
        const hasDocuments = files.some((file: File) => !file.type?.startsWith('image/'));
        const hasCustomGpt = globalUploadedFiles?.some(file => file.isCustomGpt);
        const skippedFiles: string[] = [];
        const invalidFiles: string[] = [];

        // here check on 0 index of globalUploadedFiles because we have to skip and invalid files.
        const existingFileIsImage = globalUploadedFiles?.[0]?.mime_type?.startsWith('image/');
        const existingFileIsDocument = globalUploadedFiles?.[0]?.mime_type && !globalUploadedFiles[0].mime_type.startsWith('image/') && !hasCustomGpt;
        const documents = globalUploadedFiles.filter((file: UploadedFileType) => file.isDocument);

        if (files.length > FILE.UPLOAD_LIMIT || (documents && files.length + documents.length > FILE.UPLOAD_LIMIT)) {
            Toast(MAX_FILE_UPLOAD_ERROR, 'error');
            fileInputRef.current && (fileInputRef.current.value = '');
            return;
        }

        files.forEach((file: File) => {
            if (file.size > FILE.SIZE) {
                Toast(`${file.name}: ${FILE_SIZE_MESSAGE}`, 'error');
                return;
            }
            if ( !ALLOWED_TYPES.includes(file.type)) {
                if(!hasExtraExtension(file.name)){
                    invalidFiles.push(file.name);
                    return;
                }
            }

            const isCurrentFileImage = file.type?.startsWith('image/');

            if (globalUploadedFiles?.length) {
                if (existingFileIsImage && !isCurrentFileImage) {
                    skippedFiles.push(file.name);
                    return;
                }
                if ((existingFileIsDocument || hasCustomGpt) && isCurrentFileImage) {
                    skippedFiles.push(file.name);
                    return;
                }
            } else if ((hasDocuments || hasCustomGpt) && isCurrentFileImage) {
                skippedFiles.push(file.name);
                return;
            }

            if (file.type?.startsWith('image/') && selectedModal?.name !== undefined) {
                const result = allowImageConversation(selectedModal);
                if (!result) {
                    Toast(`${file.name}: Image upload not supported for this model`, 'error');
                    return;
                }
            }

            validFiles.push(file);
        });
        if (skippedFiles.length > 0) {
            Toast(`Files (${skippedFiles.join(', ')}) weren't uploaded. Images and documents can't be uploaded together. Please try again separately.`, 'error');
        }
        if (invalidFiles.length > 0) {
            Toast(`Following files are not supported: ${invalidFiles.join(', ')}`, 'error');
        }

        if (validFiles.length === 0) {
            fileInputRef.current && (fileInputRef.current.value = '');
            return;
        }

        try {
            setFileLoader(true);
            const formData: FormData = new FormData();
            validFiles.forEach((file: File) => {
                formData.append('files', file);
            });
            if (brain?._id) {
                formData.append('brainId', brain._id);
                formData.append('vectorApiCall', 'true');
            }
            const response = await commonApi({
                action: MODULE_ACTIONS.MEDIA_UPLOAD,
                config: {
                    'Content-Type': 'multipart/form-data',
                    'x-brain-id': brain?._id
                },
                data: formData
            });
            Toast(response.message);

            const uploadedFilesData = response.data.map((fileData: any) => ({
                name: fileData.name,
                uri: fileData.uri,
                _id: fileData?.id || fileData?._id,
                mime_type: fileData.mime_type,
                type: fileData.type,
                embedding_api_key: fileData?.embedding_api_key,
                imageT: fileData?.imageToken,
                isDocument: true
            }));
            const currentUploadData = store.getState().conversation.uploadData || [];
            const combinedFileData = [
                ...(Array.isArray(currentUploadData) ? currentUploadData : []),
                ...uploadedFilesData
            ];

            dispatch(setUploadDataAction(combinedFileData));
            // setUploadedFile((prevFiles) => [...(prevFiles || []), ...uploadedFilesData]);
            dispatch(setUploadDataAction(combinedFileData));
            setIsFileUpload(true);
            if (uploadedFilesData.some((file: any) => !file.mime_type?.startsWith('image/'))) {
                setStoreVector(true);
            }
            setDisableCall(true);
        } catch (error) {
            console.error('error: ', error);
        } finally {
            setFileLoader(false);
        }
    };

    const handlePasteFiles = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (fileLoader) return;
    
        const items = event.clipboardData.items;
        const pastedFiles: File[] = [];
    
        let hasPlainText = false;
    
        // First pass: detect if text is included
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'string' && item.type === 'text/plain') {
                hasPlainText = true;
                break;
            }
        }
    
        // Second pass: collect files
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
    
            if (item.kind === 'file') {
                const file = item.getAsFile();
    
                if (!file || file.size === 0) continue;
    
                const isImagePastedFromOffice =
                    hasPlainText && file.type === 'image/png';
    
                // ⛔ Skip image/png if it’s from MS Office (text + image combo)
                if (isImagePastedFromOffice) {
                    console.log('🛑 Skipping fake image paste from Office');
                    continue;
                }
    
                // ✅ Add any other file (image, pdf, docx, etc.)
                const alreadyExists = copyFiles.some(
                    (data: File) =>
                        data.name === file.name &&
                        data.size === file.size &&
                        data.lastModified === file.lastModified
                );
    
                if (!alreadyExists) {
                    pastedFiles.push(file);
                }
            }
        }
    
        if (pastedFiles.length > 0) {
            event.preventDefault(); // prevent native paste behavior
            setCopyFiles(pastedFiles);
            await processFiles(pastedFiles);
        }
    };          

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files as File[];
        if (!files) return;
        await processFiles(Array.from(files));
        fileInputRef.current && (fileInputRef.current.value = '');
    };  

    useEffect(() => {
        /**
         * When using global dragenter or dragleave event every child element inside
         * the dropzone triggers a new dragenter or dragleave event.
         * 
         * This cause state flip back and forth rapidly.
         */
        let dragCounter = 0;
        const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
            e.preventDefault();
        };

        const handleDragEnter = (e: React.DragEvent<HTMLTextAreaElement>) => {
            e.preventDefault();
            dragCounter++;
            if (dragCounter === 1) {
                setIsFileDragging(true);
            }
        };

        const handleDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                setIsFileDragging(false);
            }
        };

        const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
            e.preventDefault();
            if (fileLoader) return;
            dragCounter = 0;
            setIsFileDragging(false);

            const files = Array.from(e.dataTransfer.files ?? []);
            if (files.length > 0) {
                await processFiles(files as File[]);
            }
        };

        const controller = new AbortController();
        const isIOS = /iPad|iPhone/.test(navigator.userAgent);

        // Check if addEventListener is available
        const hasAddEventListener = typeof document.addEventListener !== 'undefined';
        // Check if addListener is available (for older browsers)
        const hasAddListener = typeof (document as any).addListener !== 'undefined';

        if (!isIOS) {
            // For non-iOS devices
            document.addEventListener('dragover', handleDragOver, { signal: controller.signal });
            document.addEventListener('dragenter', handleDragEnter, { signal: controller.signal });
            document.addEventListener('dragleave', handleDragLeave, { signal: controller.signal });
            document.addEventListener('drop', handleDrop, { signal: controller.signal });
        } else {
            if (!hasAddEventListener && hasAddListener) {
                // For older Safari versions that support addListener but not addEventListener
                (document as any).addListener('dragover', handleDragOver, { signal: controller.signal });
                (document as any).addListener('dragenter', handleDragEnter, { signal: controller.signal });
                (document as any).addListener('dragleave', handleDragLeave, { signal: controller.signal });
                (document as any).addListener('drop', handleDrop, { signal: controller.signal });
            } else if (hasAddEventListener) {
                // For browsers that support addEventListener
                document.addEventListener('dragenter', handleDragEnter, { signal: controller.signal });
                document.addEventListener('dragleave', handleDragLeave, { signal: controller.signal });
                document.addEventListener('drop', handleDrop, { signal: controller.signal });
            } else {
                // Fallback for browsers that support neither method
                console.warn('Neither addEventListener nor addListener is supported in this browser');
                // You could implement an alternative approach here if needed
            }
        }

        return () => {
            controller.abort();
        };
    }, []);

    return {
        fileLoader,
        handleFileChange,
        uploadedFile,
        setUploadedFile,
        fileInputRef,
        isFileUpload,
        storeVector,
        setStoreVector,
        resetMediaUpload,
        disableCall,
        uploadFiles,
        handlePasteFiles,
        isFileDragging
    }
};

export default useMediaUpload;
