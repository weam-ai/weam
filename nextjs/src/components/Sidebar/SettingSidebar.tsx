import {
    BillingIcon,
    DataControlIcon,
    MembersIcon,
    SettingsIcon,
} from '@/icons/SettingsIcon';
import React from 'react';
import { LINK } from '@/config/config';
import { getSessionUser } from '@/utils/handleAuth';
import { ROLE_TYPE } from '@/utils/constant';
import { hasPermission, PERMISSIONS, Role } from '@/utils/permission';
import ReportIcon from '@/icons/ReportIcon';
import dynamic from 'next/dynamic';
import AppIcon from '@/icons/AppsIcon';
import StorageIcon from '@/icons/StorageIcon';
import SupportIcon from '@/icons/SupportIcon';
import SidebarFooter from './SidebarFooter';
import SettingOptions from './SettingOptions';
import DashboardIcon from '@/icons/DashboardIcon';
import CreditControlIcon from '@/icons/CreditControlIcon';

const BackButton = dynamic(() => import('./BackButton'), { ssr: false });
const SettingsLink = dynamic(() => import('./SettingsLink'), { ssr: false });

const SettingSidebar = async () => {
    const userDetail = await getSessionUser();
    
    const settingOptions = [
        {
            name: 'Reports',
            icon: (
                <ReportIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: true,
            navigate: `${LINK.DOMAIN_URL}/settings/reports`,
            slug: '/settings/reports',
        },
        {
            name: 'Connections',
            icon: (
                <AppIcon
                    height={20}
                    width={20}
                    className={'w-5 h-5 object-contain fill-b2'}
                />
            ),
            hasAccess: true,
            navigate: `${LINK.DOMAIN_URL}/mcp`,
            slug: '/mcp',
        },
        {
            name: 'General',
            icon: (
                <SettingsIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: true,
            navigate: `${LINK.DOMAIN_URL}/settings/general`,
            slug: '/settings/general',
        },
        {
            name: 'Data Controls',
            icon: (
                <DataControlIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: true,
            navigate: `${LINK.DOMAIN_URL}/settings/data-controls`,
            slug: '/settings/data-controls',
        },
        {
            name: 'Configuration',
            icon: (
                <DataControlIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: (userDetail?.roleCode == ROLE_TYPE.USER) ? false : true,
            navigate: `${LINK.DOMAIN_URL}/settings/config`,
            slug: '/settings/config',
        },
        {
            name: 'Members',
            icon: (
                <MembersIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: (userDetail?.roleCode == ROLE_TYPE.USER) ? false : true,
            navigate: `${LINK.DOMAIN_URL}/settings/members`,
            slug: '/settings/members',
        },
        {
            name: 'Storage',
            icon: (
                <StorageIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: userDetail?.roleCode == ROLE_TYPE.COMPANY,
            navigate: `${LINK.DOMAIN_URL}/settings/billing`,
            slug: '/settings/billing',
        },
        // {
        //     name: 'Support',
        //     icon: (
        //         <SupportIcon
        //             height={18}
        //             width={18}
        //             className={'w-[18px] h-auto object-contain fill-b2'}
        //         />
        //     ),
        //     hasAccess: userDetail?.roleCode !== ROLE_TYPE.USER,
        //     navigate: 'https://weamai.freshdesk.com/support/tickets/new?ticket_form=report_an_issue',
        //     slug: '/support',
        //     target: '_blank',
        // },
        {
            name: 'Apps',
            icon: (
                <DashboardIcon 
                    height={18}
                    width={18}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: hasPermission(userDetail?.roleCode as Role, PERMISSIONS.SUPER_SOLUTION_ACCESS),
            navigate: `${LINK.DOMAIN_URL}/settings/super-solution`,
            slug: '/settings/super-solution',
        },
        {
            name: 'Credit Control',
            icon: (
                <CreditControlIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: (userDetail?.roleCode == ROLE_TYPE.COMPANY) ? true : false,
            navigate: `${LINK.DOMAIN_URL}/settings/credit-control`,
            slug: '/settings/credit-control',
        }
    ];
    return (
        <>
            <div className="flex items-center justify-between py-4 gap-x-3">
                <BackButton />
                <div className="w-full relative font-bold collapsed-text">
                    Settings
                </div>
            </div>
            
            <div className="sidebar-sub-menu-items flex flex-col flex-1 relative h-full overflow-hidden pb-8">
                <div className="h-full overflow-y-auto w-full px-2.5">
                    <SettingOptions settingOptions={settingOptions} />
                </div>
            </div>
            <SidebarFooter />
        </>
    );
};

export default SettingSidebar;