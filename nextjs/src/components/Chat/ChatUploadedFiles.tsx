import React from 'react';
import Image from 'next/image';
import { isEmptyObject, getDocType } from '../../../src/utils/common';
import { LINK } from '@/config/config';
import { UploadedFileType } from '@/types/chat';
import { DynamicImage } from '@/widgets/DynamicImage';

type RenderImageProps = {
    file: UploadedFileType;
}

const RenderImage = ({ file }: RenderImageProps) => {
    return (
        <div key={file._id} >
            <div className="overflow-hidden rounded-10 w-full h-full max-h-40">
                <div className="relative h-auto w-full">
                    <DynamicImage
                        alt="Uploaded image"
                        src={`${LINK.AWS_S3_URL}${file.uri}`}
                        loading="lazy"
                        width={400}
                        height={400}
                        className="object-cover object-center overflow-hidden rounded-lg max-w-full w-auto max-h-40 transition-opacity duration-300"
                        placeholder='blur'
                    />
                </div>
            </div>
        </div>
    )
}

const RenderDocument = ({ file, customGptId, customGptTitle, gptCoverImage }) => {
    const hasDocument = file?.isDocument;
    const hasAgent = file?.isCustomGpt || customGptId !== undefined;
    return (
        <div key={file._id} className="uploaded-item w-full">
            <div className="flex items-center gap-2 relative py-2 rounded-10">
                <div className="attach-img w-5 min-w-5 h-5 rounded-custom overflow-hidden">   
                    {hasAgent && !hasDocument ? (
                            <Image
                                alt={customGptId?.title || customGptTitle || file?.gptname}
                                src={file?.isCustomGpt ? file.gptCoverImage : gptCoverImage?`${gptCoverImage}` || gptCoverImage: file.uri}
                                loading="lazy"
                                width={20}
                                height={20}
                                className="object-cover object-center overflow-hidden rounded-lg max-w-full w-auto h-5 transition-opacity duration-300"
                            />
                        ) : (getDocType(file.mime_type))
                    }
                </div>
                <div className="attach-item-content">
                    <span className="block text-b2 text-font-12 font-bold overflow-hidden whitespace-nowrap text-ellipsis max-w-[180px]">
                        {hasAgent && !hasDocument
                            ? customGptId?.title || customGptTitle || file?.gptname
                            : file.name}
                    </span>
                    {file.isCustomGpt == undefined &&
                        isEmptyObject(customGptId) && !hasDocument && (
                            <span className="text-font-12 text-b8">
                                {file.mime_type}
                            </span>
                    )}
                </div>
            </div>
        </div>
    )
}

const RenderWorkflowTag = ({ workflow }) => {
    if (!workflow || !workflow.name) return null;
    
    return (
        <div className="flex items-center gap-2 relative border border-b12 group-hover:border-b10 p-2 rounded-10">
            <div className="flex items-center gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-b12 text-[11px] text-b5 font-medium">
                    WF
                </div>
                <p className="text-font-14 font-medium truncate max-w-[180px]">
                    {workflow.name}
                </p>
                <span className="block text-[11px] text-b2 bg-b12 px-2 py-[2px] rounded-lg">
                    Workflow
                </span>
            </div>
        </div>
    );
};

const ChatUploadedFiles = React.memo(({ media, customGptId, customGptTitle, gptCoverImage, workflow }) => {
    const hasMedia = media && !isEmptyObject(media) && media.length > 0;
    const hasDocument = hasMedia && Array.isArray(media) && media.some((file: UploadedFileType) => file.isDocument);
    const hasWorkflow = workflow && workflow.name;
    
    if (!hasMedia && !customGptId && !hasWorkflow) return null;
    
    return (
        <>
            {(customGptId && !hasDocument) || hasMedia || hasWorkflow ? (
                <div className="flex flex-wrap w-3/4 gap-2">
                    {hasWorkflow && (
                        <RenderWorkflowTag workflow={workflow} />
                    )}
                    {customGptId && !hasDocument ? (
                        customGptId?.title || customGptTitle ? (
                            <div className="flex items-center gap-2 relative border border-b12 group-hover:border-b10 p-2 rounded-10">
                                <div className="attach-img w-5 min-w-5 h-auto rounded-custom overflow-hidden">   
                                    <Image
                                        alt={customGptId?.title || customGptTitle}
                                        src={gptCoverImage ? `${gptCoverImage}` : ''}
                                        loading="lazy"
                                        width={20}
                                        height={20}
                                        className="object-cover object-center overflow-hidden rounded-lg max-w-full w-auto h-5 transition-opacity duration-300"
                                    />
                                </div>
                                
                                <div className="attach-item-content">
                                    <span className="block text-b2 text-font-12 font-bold overflow-hidden whitespace-nowrap text-ellipsis max-w-[180px]">
                                        {customGptId?.title || customGptTitle}
                                    </span>
                                </div>
                            </div>
                        ) : null
                    ) : (
                        hasMedia && media.map((file: UploadedFileType) => {
                            const isImage = file?.mime_type?.split('/')[0] === 'image';
                            return isImage ? (
                                <RenderImage file={file} key={file._id}/>
                            ) : (
                                <RenderDocument file={file} customGptId={customGptId} customGptTitle={customGptTitle} gptCoverImage={gptCoverImage} key={file.uri}/>
                            );
                        })
                    )}
                </div>
            ) : null}
        </>
    );
});

export default ChatUploadedFiles;
