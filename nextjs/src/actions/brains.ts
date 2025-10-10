'use server';
import { DEFAULT_SORT, MODULE_ACTIONS, MODULES, REVALIDATE_TAG_NAME, ROLE_TYPE } from '@/utils/constant';
import { revalidateTagging, serverApi } from './serverApi';
import { getSessionUser } from '@/utils/handleAuth';
import { FormatUserType, ObjectType } from '@/types/common';
import { BrainCreateType, MemberType, UpdateBrainActionType } from '@/types/brain';

type TeamsInput = {
    id: string; 
    teamName: string;
    teamUsers: FormatUserType[];
}

type CreateBrainActionData = {
    title: string;
    isShare: boolean;
    customInstruction?: string;
    workspaceId: string;
    shareWith?: MemberType[];
    teams?: TeamsInput[];
}

export const fetchBrainList = async () => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.BRAIN_LIST_ALL,
        config: { next: { revalidate: 86400, tags: [`${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`] } },
    });
    return response;
};

export async function createBrainAction(obj: BrainCreateType) {
    const sessionUser = await getSessionUser();
    const data: CreateBrainActionData = {
        title: obj.title,
        isShare: obj.isShare,
        workspaceId: obj.workspaceId,
        customInstruction: obj.customInstruction,
    };
    if (obj.isShare) {
        data.shareWith = obj.members.map((user) => {
            return {
                email: user.email.toLowerCase(),
                id: user.id,
                fname: user?.fname,
                lname: user?.lname,
            };
        });
        data.teams = obj?.teamsInput?.length ? obj?.teamsInput?.map((currTeam) => ({
                id: currTeam.id,
                teamName: currTeam.teamName,
                teamUsers: currTeam.teamUsers,
        })) : [];
    }
    const response = await serverApi({
        action: MODULE_ACTIONS.CREATE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.BRAINS,
        data,
        common: true,
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
}

export async function deleteBrainAction(data, id) {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.DELETE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.BRAINS,
        data,
        common: true,
        parameters: [id],
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
};

export async function updateBrainAction(data: UpdateBrainActionType, id: string) {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.UPDATE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.BRAINS,
        data,
        common: true,
        parameters: [id],
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
};

export const archiveBrainAction = async () => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.LIST,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.BRAINS,
        common: true,
        data: {
            options: {
                sort: { createdAt: DEFAULT_SORT },
                pagination: false,
                populate: [
                    {
                        path: 'workspaceId',
                        select: 'title',
                    },
                ],
            },
            query: {
                companyId: sessionUser.companyId,
                'user.id':
                    sessionUser?.roleCode == ROLE_TYPE.USER
                        ? sessionUser?._id
                        : undefined,
                deletedAt: {
                    $exists: true,
                },
            },
        },
        config: { next: { revalidate: 86400, tags: [`${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`] } },
    });
    return response;
};

export const restoreBrainAction = async (data) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.RESTORE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.BRAINS,
        common: true,
        parameters: [data?._id],
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
};

export const hardDeleteBrainAction = async (id) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.DELETE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.BRAINS,
        common: true,
        parameters: [id],
        data: {
            isHardDelete: true,
        },
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
};

export const addBrainMemberAction = async (id: string, users: ObjectType[], workspaceId: string) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.UPDATE,
        prefix: MODULE_ACTIONS.ADMIN_PREFIX,
        module: MODULES.BRAINS,
        common: true,
        data: {
            shareWith: users,
            isShare: true,
            workspaceId: workspaceId
        },
        parameters: [id]
    })
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
}

export const removeBrainMemberAction = async (id: string, userId: string) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.UNSHARE,
        parameters: [id],
        data: { user_id: userId }
    })
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
}

export const shareTeamToBrainAction = async (workspaceId: string, companyId: string, brainId: string, teams: ObjectType[], title: string) => {
    const response = await serverApi({
        action: MODULE_ACTIONS.UPDATE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.TEAM_BRAIN,
        parameters: [brainId],
        data: {
            workspaceId,
            companyId,
            teams,
            title,
        },
        common: true,
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${companyId}`),
    ]);
    return response;
};

export const deleteShareTeamToBrainAction = async (workspaceId: string, companyId: string, brainId: string, teamId: string) => {
    const sessionUser = await getSessionUser();
    const response = await serverApi({
        action: MODULE_ACTIONS.DELETE,
            prefix: MODULE_ACTIONS.WEB_PREFIX,
            module: MODULES.TEAM_BRAIN,
            parameters: [teamId],
            data: {
                workspaceId,
                companyId,
            ...(brainId && { brainId }),
        },
        common: true,
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
}

export const addDefaultBrainAction = async (workspaceId: string, companyId: string) => {
    const response = await serverApi({
        action: MODULE_ACTIONS.CREATE,
        prefix: MODULE_ACTIONS.WEB_PREFIX,
        module: MODULES.CHAT,
        common: true,
        data: {
            brain: {},
            isShare: false,
            addDefaultBrain: true,
            workspaceId: workspaceId,
        },
    });
    
    await revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${companyId}`);

    return response;
}

export const convertToSharedAction = async (brainId: string, data: { members?: ObjectType[], teams?: ObjectType[], customInstruction?: string }) => {
    const sessionUser = await getSessionUser();
    // Map members -> shareWith to match backend service signature
    const payload = {
        shareWith: data?.members || [],
        teams: data?.teams || [],
        customInstruction: data?.customInstruction || '',
    };
    const response = await serverApi({
        action: 'convertToShared',
        data: payload,
        parameters: [brainId],
    });
    await Promise.all([
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.WORKSPACE}-${sessionUser.companyId}`),
        revalidateTagging(response, `${REVALIDATE_TAG_NAME.BRAIN}-${sessionUser.companyId}`),
    ]);
    return response;
};