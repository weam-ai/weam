import * as yup from 'yup'
import { ollamaKeys } from '@/utils/constant'

export const defaultModalKeys = yup.object({
    modal: yup.object().nullable().required('please choose modal.'),
    key: yup.string().required('please enter your key')
})

export const setModalAPIKeys = yup.object({
    key: yup.string().required('please enter your key'),
    model: yup.object({
        value: yup.string().required(),
        label: yup.string().required()
    }).nullable().required('provider is required')
})

export const onBoardAPIKeys = yup.object().shape({
    apiKey: yup.string().optional(),
    modal: yup.object().nullable().when('apiKey', {
        is: (val) => val && val.value !== '',
        then: (schema) => schema.required('please select at list one'),
        otherwise: (schema) => schema.notRequired()
    })
})

export const huggingFaceKeys = yup.object({
    name: yup.string().required('please choose model name.'),
    taskType: yup.object().nullable().required('please choose task type.'),
    apiType: yup.object().nullable().required('please choose api type.'),
    description: yup.string().optional(),
    endpoint: yup.string().required('please choose endpoint url.'),
    repo: yup.string().required('please choose repository.'),
    sequences: yup.string().optional(),
    key: yup.string().required('please enter your key'),
});

export const anthropicKeys = yup.object({
    key: yup.string().required('please enter your key')
})

export const geminiKeys = yup.object({
    key: yup.string().required('please enter your key')
})

// Imported from constants to centralize schema definition
export { ollamaKeys };

export type ModelKeysSchemaType = yup.InferType<typeof setModalAPIKeys>;
