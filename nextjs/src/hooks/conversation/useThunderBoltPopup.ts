import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { GPTTypesOptions, SelectedContextData, UploadedFileType } from '@/types/chat';
import {
    IMAGE_SELECTION_ERROR_MESSAGE,
    IMAGE_AND_AGENT_ERROR_MESSAGE,
    ONLY_ONE_AGENT_ERROR_MESSAGE,
    IMAGE_AND_DOC_ERROR_MESSAGE,
    FILE_ALREADY_SELECTED_ERROR_MESSAGE,
    FILE,
    GPTTypes
} from '@/utils/constant';
import { allowImageConversation, hasDocumentFile, hasImageFile } from '@/utils/helper';
import { isEmptyObject } from '@/utils/common';
import { LINK } from '@/config/config';
import defaultCustomGptImage from '@/../public/defaultgpt.jpg';
import { setUploadDataAction } from '@/lib/slices/aimodel/conversation';
import Toast from '@/utils/toast';
import { AiModalType } from '@/types/aimodels';
import store from '@/lib/store';

type SelectedContextType = {
    type: GPTTypesOptions | null,
    prompt_id: string |undefined,
    custom_gpt_id: string |undefined,
    doc_id: string |undefined,
    textDisable: boolean,
    attachDisable: boolean,
    title?: string | undefined,
    name?: string,
    gptCoverImage?: string,
}

type UseThunderBoltPopupProps = {
    selectedContext: SelectedContextType;
    setSelectedContext: (context: SelectedContextType) => void;
    selectedAIModal: AiModalType;
    uploadedFile: UploadedFileType[];
    removeSelectedContext?: () => void;
    setText?: (text: string) => void;
}

export const useThunderBoltPopup = ({
    selectedContext,
    setSelectedContext,
    selectedAIModal,
    uploadedFile,
    removeSelectedContext,
    setText
}: UseThunderBoltPopupProps) => {
    const dispatch = useDispatch();

    const onSelectMenu = useCallback((type: GPTTypesOptions, data: SelectedContextData) => {
        if (data?.doc?.mime_type?.startsWith('image/') && selectedAIModal) {
            const result = allowImageConversation(selectedAIModal);
            if (!result) {
                Toast(IMAGE_SELECTION_ERROR_MESSAGE, 'error');
                return;
            }
        }

        if (GPTTypes.CustomGPT == type) {
            const custom_gpt_id = (data._id == selectedContext.custom_gpt_id && !data._id) ? undefined : data._id;
            const hasImage = uploadedFile?.some((file: UploadedFileType) => file.mime_type?.startsWith('image/'));
            if (hasImage) {
                Toast(IMAGE_AND_AGENT_ERROR_MESSAGE, 'error');
                return;
            }
            const sameAgentPresent = uploadedFile?.some((file: UploadedFileType) => file?.isCustomGpt);
            if (sameAgentPresent) {
                Toast(ONLY_ONE_AGENT_ERROR_MESSAGE, 'error');
                return;
            }

            if (data?.isRemove) {
                const removeAgent = uploadedFile?.filter((file: UploadedFileType) => file?._id !== data?._id);
                if (removeSelectedContext) {
                    if (!removeAgent.length) {
                        removeSelectedContext();
                    } else {
                        removeSelectedContext();
                    }
                }
                dispatch(setUploadDataAction(removeAgent));
                return;
            }

            const persistTag = {
                provider: data?.responseModel?.provider,
                custom_gpt_id: data?._id,
                responseModel: data?.responseModel?.name,
                bot: data?.responseModel?.bot,
            }

            if (custom_gpt_id && Array.isArray(data?.doc) && data?.doc.length > 0) {
                // Agent + Multiple Documents case pass only Agent Details, Document not needed to pass
                const fileData = {
                    name: data.doc[0].name,
                    uri: `${LINK.AWS_S3_URL}${data.doc[0].uri}`,
                    isCustomGpt: true,
                    _id: data?._id,
                    mime_type: data.doc[0].mime_type,
                    type: data.doc[0].mime_type,
                    gptname: data?.title,
                    gptCoverImage: (data?.coverImg?.uri && `${LINK.AWS_S3_URL}${data?.coverImg?.uri}`) || (data?.charimg ? data.charimg : defaultCustomGptImage.src),
                    responseModel: data?.responseModel?.name,
                    persistTag
                }
                const updatedFileData = [...uploadedFile, fileData];
                dispatch(setUploadDataAction(updatedFileData));
            } else {
                const fileData = {
                    name: data?.title,
                    uri: isEmptyObject(data.coverImg) || !data.coverImg ? `${defaultCustomGptImage.src}` : `${LINK.AWS_S3_URL}${data.coverImg.uri}`,
                    isCustomGpt: true,
                    _id: data?._id,
                    mime_type: 'application/jpeg',
                    type: 'application/jpeg',
                    gptname: data?.title,
                    gptCoverImage: (data?.coverImg?.uri && `${LINK.AWS_S3_URL}${data?.coverImg?.uri}`) || (data?.charimg ? data.charimg : defaultCustomGptImage.src),
                    responseModel: data?.responseModel?.name,
                    persistTag
                }
                const updatedFileData = [...uploadedFile, fileData];
                dispatch(setUploadDataAction(updatedFileData));
            }

            setSelectedContext({
                type: GPTTypes.CustomGPT,
                doc_id: undefined,
                prompt_id: selectedContext.prompt_id,
                custom_gpt_id: custom_gpt_id,
                textDisable: false,
                attachDisable: true,
                title: data.title,
                gptCoverImage: (data?.coverImg?.uri && `${LINK.AWS_S3_URL}${data?.coverImg?.uri}`) || (data?.charimg ? data.charimg : defaultCustomGptImage.src),
            });
        } else if (GPTTypes.Docs == type) {
            const doc_id = data._id == selectedContext.doc_id ? undefined : data._id;
            const currentUploadData = store.getState().conversation.uploadData || [];

            if (!data.isRemove) {
                if (uploadedFile?.length > 0) {
                    const uploadedDocuments = uploadedFile.filter((file: UploadedFileType) => file.isDocument);
                    if (uploadedDocuments.length == FILE.UPLOAD_LIMIT) {
                        Toast('You can only upload up to 10 files', 'error');
                        return;
                    }

                    if (data.doc.mime_type?.startsWith("image/") && hasDocumentFile(uploadedFile)) {
                        Toast(IMAGE_AND_DOC_ERROR_MESSAGE, 'error');
                        return;
                    } else if (!data.doc.mime_type?.startsWith("image/") && hasImageFile(uploadedFile)) {
                        Toast(IMAGE_AND_DOC_ERROR_MESSAGE, 'error');
                        return;
                    }
                }
                const hasDocumentPresent = Array.isArray(currentUploadData) && currentUploadData.some(file => file._id === data.fileId && file.isDocument);
                if (hasDocumentPresent) {
                    Toast(FILE_ALREADY_SELECTED_ERROR_MESSAGE, 'error');
                    return;
                }

                const fileData = [{
                    name: data.doc.name,
                    _id: data.fileId,
                    uri: data.doc.uri,
                    mime_type: data.doc.mime_type,
                    type: data.doc.mime_type,
                    embedding_api_key: data.embedding_api_key,
                    isDocument: true,
                }];
                const combinedFileData = [...(Array.isArray(currentUploadData) ? currentUploadData : []), ...fileData];
                dispatch(setUploadDataAction(combinedFileData));
            } else {
                const updatedFiles = Array.isArray(uploadedFile)
                    ? uploadedFile.filter((file) => file._id !== data?.fileId)
                    : null;
                if (!updatedFiles.length) {
                    dispatch(setUploadDataAction([]));
                } else {
                    dispatch(setUploadDataAction(updatedFiles));
                }
            }

            setSelectedContext({
                type: GPTTypes.Docs,
                doc_id: doc_id,
                prompt_id: selectedContext.prompt_id,
                custom_gpt_id: undefined,
                textDisable: false,
                attachDisable: true,
                name: data.doc.name,
            });
        } else if (GPTTypes.Prompts == type) {
            const prompt_id = data._id == selectedContext.prompt_id ? undefined : data._id;

            if (setText) {
                const summaries = data?.summaries
                    ? Object.values(data.summaries)
                        .map((currSummary: any) => `${currSummary.website} : ${currSummary.summary}`)
                        .join('\n')
                    : '';
                const promptContent = data.content + (summaries ? '\n' + summaries : '');
                setText(promptContent);
            }
            setSelectedContext({
                type: GPTTypes.Prompts,
                prompt_id: prompt_id,
                custom_gpt_id: selectedContext.custom_gpt_id,
                doc_id: selectedContext.doc_id,
                textDisable: false,
                attachDisable: true,
                title: data.title,
            });
        }
    }, [selectedContext, selectedAIModal, uploadedFile, dispatch, removeSelectedContext]);

    return {
        onSelectMenu
    };
}; 