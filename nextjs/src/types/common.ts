import { AgentRecordType } from '@/types/agent';
import { DocRecordType } from '@/types/doc';
import { PromptRecordType } from '@/types/prompt';

export type ObjectType = {
    [key: string]: string | number | boolean | ObjectType ;
}

export type APIResponseType<T> = {
    message: string;
    data: T;
    status: number;
    code: 'SUCCESS' | 'ERROR' | 'LOGIN' | 'OTP_VERIFIED' | 'FORGOT_PASSWORD' | 'ERROR' | 'ALERTS' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'TOKEN_NOT_FOUND' | 'REDIRECT' | 'LINK_EXPIRED';
    paginator?: PaginatorType;
}

export type FormatCompanyType = {
    name: string;
    slug: string;
    id: string;
}

export type FormatUserType = {
    email: string;
    id?: string;
    _id?: string;
    fname?: string;
    lname?: string;
    profile?: {
        name: string;
        uri: string;
        mime_type: string;
        id: string;
    };
}

export enum RoleCode {
    'ADMIN',
    'MANAGER',
    'MEMBER',
}


export enum InviteStatusEnum {
    'PENDING',
    'ACCEPT',
    'EXPIRED',
}

export type PaginationType = {
    pageIndex: number;
    pageSize: number;
}

export type ModalConfigType = {
    apikey: string;
};


export type PaginatorType = {
    currentPage: number;
    filterCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    itemCount: number;
    next?: number | boolean | null;
    offset: number;
    page: number;
    pageCount: number;
    prev?: number | boolean | null;
    perPage?: number;
    slNo?: number;
}

export type DefaultPaginationType = {
    offset: number;
    limit: number;
}


export type FileType = {
    _id?: string;
    id?: string;
    name: string;
    file_size: number;
    mime_type: string;
    uri: string;
    createdAt?: string;
    size?: number;
}

export type FormatBrainType = {
    _id?: string;
    id?: string;
    title: string;
    slug: string;
}

export type FormatBotType = {
    id: string;
    title: string;
    code: string;
}
export type BotType = {
    title: string;
    code: string;
    id: string;
  };


export type FavoriteItemsType = {
    type: 'CustomGPT' | 'Docs' | 'Prompts';
    itemId: string;
    details: PromptRecordType | AgentRecordType | DocRecordType;
}

export enum ProAgentCode {
    QA_SPECIALISTS = 'QA_SPECIALISTS',
    SEO_OPTIMISED_ARTICLES = 'SEO_OPTIMISED_ARTICLES',
    SALES_CALL_ANALYZER = 'SALES_CALL_ANALYZER',
    CV_SCREENING_SPECIALIST = 'CV_SCREENING_SPECIALIST',
    WEB_PROJECT_PROPOSAL = 'WEB_PROPOSAL',
    VIDEO_CALL_ANALYZER = 'VIDEO_CALL_ANALYZER',
    SEO_OPTIMIZER = 'SEO_OPTIMIZER',
}

export enum ProAgentComponentLable {
    QA = 'QA',
    SEO = 'SEO',
    SALES = 'SALES',
    HR = 'HR',
    PROJECT = 'PROJECT',
    CALL = 'CALL',
}

export type CountriesType = {
    code: string;
    createdAt: string;
    nm: string;
    shortCode: string;
    updatedAt: string;
    _id: string;
    __v: number;
}

export enum ProAgentPythonCode {
    SEO_OPTIMIZER = 'SEO_OPTIMIZER',
}