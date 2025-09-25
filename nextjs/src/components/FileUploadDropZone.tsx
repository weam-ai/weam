import { LINK } from '@/config/config';
import Close from '@/icons/Close';
import UploadIcon from '@/icons/UploadIcon';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import JsonImportIcon from '@/icons/JsonUploadIcon';
import Toast from '@/utils/toast';
import { FILE, FILE_SIZE_MESSAGE } from '@/utils/constant';
import Image from 'next/image';
type RejectedErrorProps = {
  code: string,
  message: string
}

type RejectedFileProps = {
    file: File,
    errors: RejectedErrorProps[]
}

const errorCode = {
    FILE_TOO_LARGE: 'file-too-large',
    FILE_TYPE_NOT_ALLOWED: 'file-invalid-type',
    FILE_TOO_MANY: 'file-too-many',
} as const;
import { bytesToMegabytes } from '@/utils/common';
import { hasExtraExtension } from '@/utils/fileHelper';

export const fileIconImages = {
  'application/pdf': `${LINK.DOMAIN_URL}/pdf-file-icon.png`,

  'application/msword': `${LINK.DOMAIN_URL}/doc-file-icon.png`,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': `${LINK.DOMAIN_URL}/doc-file-icon.png`,
  'application/wps-office.doc': `${LINK.DOMAIN_URL}/doc-file-icon.png`,
  'application/wps-office.docx': `${LINK.DOMAIN_URL}/doc-file-icon.png`,

  'text/plain': `${LINK.DOMAIN_URL}/text-file-icon.png`,
  'application/json': `${LINK.DOMAIN_URL}/text-file-icon.png`,
  'application/zip': `${LINK.DOMAIN_URL}/text-file-icon.png`,
  'application/wps-office.txt': `${LINK.DOMAIN_URL}/txt-file-icon.png`,
  
  'application/vnd.ms-excel': `${LINK.DOMAIN_URL}/xls.png`,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': `${LINK.DOMAIN_URL}/xls.png`,
  'application/wps-office.xls': `${LINK.DOMAIN_URL}/xls.png`,
  'application/wps-office.xlsx': `${LINK.DOMAIN_URL}/xls.png`,

  'text/csv': `${LINK.DOMAIN_URL}/csv.png`,
  'message/rfc822': `${LINK.DOMAIN_URL}/common-doc.png`,
  'text/html': `${LINK.DOMAIN_URL}/common-doc.png`,

  'application/x-httpd-php': `${LINK.DOMAIN_URL}/common-doc.png`,
  'text/php': `${LINK.DOMAIN_URL}/common-doc.png`,
  'text/x-php': `${LINK.DOMAIN_URL}/common-doc.png`,

  'text/css': `${LINK.DOMAIN_URL}/common-doc.png`,
  
  'text/javascript': `${LINK.DOMAIN_URL}/common-doc.png`,
  'application/x-javascript': `${LINK.DOMAIN_URL}/common-doc.png`,
  'application/javascript': `${LINK.DOMAIN_URL}/common-doc.png`,
  'text/x-javascript': `${LINK.DOMAIN_URL}/common-doc.png`,

  'application/sql': `${LINK.DOMAIN_URL}/common-doc.png`,

};

const FileUpload = ({ 
  errors, 
  onLoad, 
  existingFiles = [], 
  multiple = false, 
  maxFiles = 1, 
  setFilesRemove,
  className, 
  acceptedFilesTypes,
  iconType,
  fileFormat,
  message = "Choose or drop files here", 
  messageClassName = "text-font-14 text-b2 mb-2",
  subMessage = "Provide supportive materials that are organized and easy to reference.", 
  maxFileSize 
  }:any) => {
    const [files, setFiles] = useState(existingFiles);
    const defaultAcceptedTypes = {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/wps-office.xlsx': ['.xlsx'],
      'text/csv': ['.csv'],
      'message/rfc822': ['.eml'],
      'text/html': ['.html', '.htm'],
      'application/x-httpd-php': ['.php'],
      'text/javascript': ['.js'],
      'text/css': ['.css'],
      'text/php': ['.php'],
      'text/x-php': ['.php'],
      'application/x-javascript': ['.js'],
      'application/javascript': ['.js'],
      'text/x-javascript': ['.js'],
      'application/sql': ['.sql'],
  };
  
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: RejectedFileProps[]) => {
      if (rejectedFiles.length > 0) {
          rejectedFiles.map((record) => {
              if (record.errors.some((error) => error.code === errorCode.FILE_TOO_LARGE)) {
                  Toast(`${record.file.name}: ${FILE_SIZE_MESSAGE}`, 'error');
                  return;
              }
              if (record.errors.some((error) => error.code === errorCode.FILE_TYPE_NOT_ALLOWED)) {
                  Toast(`${record.file.name}: file type is not supported`, 'error');
                  return;
              }
          });
      }
        // Do something with the files
    // const isRestricted = restrictWithoutOpenAIKey();
    // if (isRestricted) {
    //     return;
    // }
    if(acceptedFiles.length > 0){
      // Check file sizes first
      for (const file of acceptedFiles) {
        if(file.size > maxFileSize){
          Toast(`File size should not exceed ${bytesToMegabytes(maxFileSize)} MB`, "error");
          return; // This will exit the entire function
        }
      }

      // Only proceed if all files are within size limit
      const totalFiles = files.length + acceptedFiles.length;
      if (totalFiles > maxFiles) {
        Toast(`Maximum ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed`, "error");
        return;
      }
      
      setFiles((prevFiles) => {
        const updatedFiles = [...prevFiles, ...acceptedFiles];
        onLoad(updatedFiles);
        return updatedFiles;
      });
    }
  }, [maxFiles, onLoad, files]);

    const removeFile = (index, removefile) => {
        setFiles((prevFiles) => {
            onLoad(prevFiles.filter((_, i) => i !== index));
            return prevFiles.filter((_, i) => i !== index);
        });

    let updatedRemoveFiles;
    setFilesRemove((prevRemoveFiles) => {
      updatedRemoveFiles = [...prevRemoveFiles, removefile];
      return updatedRemoveFiles;
    });    
  };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        multiple,
        maxFiles,
        accept: acceptedFilesTypes || defaultAcceptedTypes,
        maxSize: FILE.SIZE,
    });

    const allowedTypesKeys = Object.keys(acceptedFilesTypes || defaultAcceptedTypes);
    const allowedTypesValues = Object.values(acceptedFilesTypes || defaultAcceptedTypes);
    // Get all extensions in a flat array and remove the dots
    let supportedFormats = allowedTypesValues
        .flat()
        .filter((v,i,a)=>a.indexOf(v)==i)
        .join(', ');

    const getFileType = (file: File) => {
      return {
        isPhpFile: hasExtraExtension(file.name),
        isAllowedType: allowedTypesKeys.includes(file.type)
      };
    };

    return (
        <div>
            <div {...getRootProps()} className={className}>
                <input {...getInputProps()} />
                {iconType === 'jsonIcon' ? (
                <JsonImportIcon className="mx-auto w-56 h-28 my-5" height={112} width={224} />
                ) : (
                  <UploadIcon className="mx-auto mb-2.5" width={60} height={61} />
                )}
                
              <p className={messageClassName}>
                {message}  
                {subMessage && <span className='block text-font-12 text-b6'>{subMessage}</span>}
              </p>
              {fileFormat === 'file' ? (
                <p className='text-font-14 text-b6'>{`Supported file formats: ${supportedFormats}`}</p>
                ) : ("")}
              
      </div>

      {files.length > 0 && (
        <div className='mt-5'>
          {files.reduce((acc, file, index) => {
            const imageSource = fileIconImages[file.type] || fileIconImages['text/html'];
            const { isPhpFile, isAllowedType } = getFileType(file);
            if(isPhpFile || isAllowedType){
              acc.push(
                <div key={index} className='border py-2 px-3 rounded-custom flex items-center gap-3'>
                  {imageSource && (
                    <div className="relative w-[35px] h-auto flex-shrink-0">
                      <img 
                        src={imageSource} 
                        alt={`${file.name} preview`} 
                        className='object-contain' 
                        width={35}
                        height={35}
                      />                      
                    </div>
                  )}
                  <p className='text-font-14 text-b2 break-all flex-grow'>{file.name}</p>
                  <button 
                    type="button" 
                    onClick={() => removeFile(index, file)} 
                    className='text-red flex-shrink-0 hover:text-black transition-colors'
                  >
                    <Close className="fill-red size-4" />
                  </button>
                </div>
              )
            }
            return acc;
          }, [])}
        </div>
      )}
    </div>
  );
};


export default FileUpload;