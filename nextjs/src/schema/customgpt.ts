import * as yup from 'yup';

export const overviewValidationSchema = yup.object({
    title: yup.string().required('please enter name'),
    systemPrompt: yup.string().required('please enter system prompt'),
});

export const modalSelectionKeys = yup.object({
    responseModel: yup.object().nullable().required('please choose modal'),
    maxmaxItr: yup.number().optional(),
    itrTimeDuration: yup.string().optional(),
    imageEnable: yup.boolean().optional()
});

export const docUploadKeys = yup.object().shape({
    doc: yup.array()
    .min(1, 'please upload file')
    .max(1, 'please upload file')
    .of(
        yup.mixed().test('fileType', 'Only doc, pdf and txt are allowed', (value:any) => {
        if (!value) return true; 
        const supportedFormats = ['text/plain', 'application/msword', 'application/pdf'];
        return supportedFormats.includes(value.type);
      })
      .test('fileSize', 'File size must be less than 2MB', (value:any) => {
        if (!value) return true;
        return value.size || Number(value.file_size) <= 1024 * 1024 * 2;
      })
    )
    .nullable()
    .required('please upload valid file'),
});

export const docsSelectionSchema = yup.object({
    doc: yup.array()
    .max(10, 'maximum 10 files allowed')
    .of(
        yup.mixed()
        .test('fileSize', 'File size must be less than 5MB', (value:any) => {
            if (!value) return true;
            return value.size || Number(value.file_size) <= 1024 * 1024 * 5;
        })
    )
    .nullable(),
});