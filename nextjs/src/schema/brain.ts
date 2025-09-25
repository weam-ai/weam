import * as yup from 'yup';

export const addSharedBrainKeys = yup.object({
    title: yup.string().required('Brain name is required'),
    members: yup.array().of(
        yup.object().shape({
            email: yup.string().email().required(),
            id: yup.string().required(),
        })
    ).min(1, 'Please select at least one member'),
    customInstruction: yup.string().optional()
})

export const addPersonalBrainKeys = yup.object({
    title: yup.string().required('Brain name is required'),
    customInstruction: yup.string().optional()
})


export const addMemberBrainKeys = yup.object({
    members: yup.array().of(
        yup.object().shape({
            email: yup.string().email().required(),
            id: yup.string().required(),
        })
    ).min(1, 'Please select at least one member'),
})


export const addTeamBrainKeys = yup.object({
    teamsInput:yup
    .array()
    .transform((value, originalValue) =>
        typeof originalValue === 'string' && originalValue === ''
            ? []
            : value
    )
    .min(1, 'Please Select A Team')
    .required('Select a team')
    .default([]),
})