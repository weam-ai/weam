import { FileType, FormatBrainType, FormatCompanyType, FormatUserType } from './common';

export type AgentRecordType = {
    _id: string;
    brain: FormatBrainType;
    createdAt: string;
    isActive: boolean;
    itrTimeDuration?: string;
    maxItr?: number;
    owner: FormatUserType;
    slug: string;
    systemPrompt: string;
    title: string;
    updatedAt: string;
    responseModel: {
        company: FormatCompanyType;
        name: string;
        id: string;
    };
    coverImg?: FileType;
    charimg?: string;
    favoriteByUsers: string[];
    type?: 'agent' | 'supervisor';
    description?: string;
};
