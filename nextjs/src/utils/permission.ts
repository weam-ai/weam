import { APPLICATION_ENVIRONMENT, ROLE_TYPE, WEEKLY_REPORT_CAN_ACCESS } from "./constant";

export const PERMISSIONS = {
    WORKSPACE_ADD: 'workspace.add',
    WORKSPACE_EDIT: 'workspace.edit',
    UPGRADE_PLAN: 'plan.upgrade',
    ARCHIVE_WORKSPACE: 'workspace.archive',
    CHAT_DELETE: 'chat.delete',
    COMPANY_USAGE: 'company.usage',
    SUPER_SOLUTION_ACCESS: 'super-solution.access'
} as const;

export type Role = keyof typeof ROLES;
type Permission = (typeof ROLES)[Role][number];

const ROLES = {
    COMPANY: [
        PERMISSIONS.WORKSPACE_ADD,
        PERMISSIONS.WORKSPACE_EDIT,
        PERMISSIONS.UPGRADE_PLAN,
        PERMISSIONS.ARCHIVE_WORKSPACE,
        PERMISSIONS.CHAT_DELETE,
        PERMISSIONS.SUPER_SOLUTION_ACCESS
    ],
    MANAGER: [
        PERMISSIONS.WORKSPACE_ADD,
        PERMISSIONS.WORKSPACE_EDIT,
        PERMISSIONS.ARCHIVE_WORKSPACE,
        PERMISSIONS.CHAT_DELETE,
        PERMISSIONS.SUPER_SOLUTION_ACCESS
    ],
    USER: []
} as const;

export function hasPermission(role: Role, permission: Permission) {
    return (ROLES[role] as readonly Permission[]).includes(permission);
}

export function isCompanyAdminOrManager(user) {
    return user?.roleCode == ROLE_TYPE.COMPANY || user?.roleCode == ROLE_TYPE.COMPANY_MANAGER;
}

export function isWeamAdminOrManager(user) {
    if (process.env.NEXT_PUBLIC_APP_ENVIRONMENT === APPLICATION_ENVIRONMENT.PRODUCTION) {
        return WEEKLY_REPORT_CAN_ACCESS.includes(user?.email) && user?.company?.slug == 'weam-team' && (user?.roleCode == ROLE_TYPE.COMPANY || user?.roleCode == ROLE_TYPE.COMPANY_MANAGER);
    }
    return true;     
}