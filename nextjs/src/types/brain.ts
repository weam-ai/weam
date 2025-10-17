import { FileType, FormatBrainType, FormatCompanyType, FormatUserType, ObjectType } from './common';

export type BrainType = {
    _id: string;
    title: string;
    slug: string;
    isShare?: boolean;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    __v?: number;
}

export type BrainListType = BrainType & {
    workspaceId: string;
    companyId: string;
    user: FormatUserType;
    team?: BrainTeamType[];
    charimg?: string;
}
export type BrainDocType = {
    _id: string;
    userId: FormatUserType;
    fileId: string;
    brainId: string;
    embedding_api_key: string;
    updatedAt: string;
    doc: FileType
    isShare: boolean;
    brain: FormatBrainType;
}

export type BrainPromptType = {
    _id: string;
    content: string;
    isActive: boolean;
    user: FormatUserType;
    brain: FormatBrainType;
    brandInfo?: ObjectType | null;
    productInfo?: ObjectType | null;
    companyInfo?: ObjectType | null;
    title: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    isCompleted: boolean;
    website: string[];
    defaultprompt: string;
    summaries: ObjectType;
    isShare: boolean;
}

export type BrainAgentType = {
    _id: string;
    title: string;
    slug: string;
    type?: 'agent' | 'supervisor';
    systemPrompt: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    maxItr: number;
    doc: FileType,
    owner: FormatUserType;
    brain: FormatBrainType;
    responseModel: {
        name: string;
        id: string;
        company: FormatCompanyType
    }
    isShare: boolean;
    coverImg: FileType;
    charimg?: string;
}

type BrainTeamType = {
    teamName: string;
    id:       string;
    _id:      string;
}

export type MemberType = FormatUserType & {
    value?: string;
    label?: string;
}

type TeamType = MemberType & {
    teamName: string;
    id: string;
    teamUsers: FormatUserType[];
}

export type BrainCreateType = {
    isShare: boolean;
    members?: MemberType[];
    workspaceId: string;
    title: string;
    teamsInput?: TeamType[];
    customInstruction?: string;
    charimg?: string;
}

export type AllBrainListType = {
    _id: string;
    brains: BrainListType[];
}

export type UpdateBrainActionType = {
    title: string;
    isShare: boolean;
    workspaceId: string;
    customInstruction?: string;
}
