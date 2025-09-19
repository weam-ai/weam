import { BrainListType } from "./brain";
import { FormatCompanyType, InviteStatusEnum, RoleCode } from "./common";

export type UserMemberList={
    company: FormatCompanyType;
    email: string;
    roleId: string;
    roleCode: keyof typeof RoleCode;
    fcmTokens?: string[];
    inviteLink?: string;
    inviteExpireOn?: string;
    invited?: boolean;
    fileSize?: number;
    usedSize?: number;
    msgCredit?: number;
    mfa?: boolean;
    isActive?: boolean;
    isProfile?: boolean;
    inviteSts?: keyof typeof InviteStatusEnum;
    invitedBy?: string;
    isPrivateBrainVisible?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
    _id?: string;
}

export type Profile = {
    id: string,
    mime_type: string,
    name: string,
    uri: string,
}

export type SetUserData = {
    _id: string,
    email: string,
    roleId: string,
    roleCode: string,
    company: FormatCompanyType,
    invitedBy: string,
    fname: string,
    lname: string,
    mobNo?: string,
    mfa?: boolean,
    isProfile?: boolean,
    profileImg?: string,
    profile?: Profile,
    isPrivateBrainVisible?: boolean,
    countryName?: string,
    countryCode?: string,
    defaultBrain?: BrainListType,
    access_token?: string,
    inviteSts?: string,
    isFreeTrial?: CreditInfoType,
    onboard?: boolean,
}

export type CreditInfoType = {
    msgCreditLimit: number;
    msgCreditUsed: number;
    freeTrialStartDate?: Date | string;
    subscriptionStatus?: string;
}

export type LoginPayload = {
    email: string;
    password: string;
}

export type SetIronSessionData = SetUserData & {
    refresh_token: string,
    companyId: () => string,
}

export type SessionUserType = {
    email: string;
    access_token: string;
    refresh_token: string;
    _id: string;
    isProfileUpdated?: boolean;
    roleCode?: string;
    companyId?: string;
}

export type IronSessionData = {
    user?: SessionUserType;
}                              