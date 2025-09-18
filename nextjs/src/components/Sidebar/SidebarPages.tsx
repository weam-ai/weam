'use client';
import routes from '@/utils/routes';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Spinner from '../Loader/Spinner';
import { usePathname } from 'next/navigation';
const ProfileSidebar = dynamic(() => import('./ProfileSidebar'), { ssr: false });

type SidebarPagesProps = {
    children: React.ReactNode;
    settingSidebar?: React.ReactNode;
}

const SidebarPages: React.FC<SidebarPagesProps> = ({ children, settingSidebar }) => {
    const pathname = usePathname();

   const dynamicChatPath = pathname.startsWith('/chat/');

   const dynamicCustomGptEditPath = pathname.startsWith('/custom-gpt/edit/');

    const routeComponents = {
        [routes.setting]: settingSidebar,
        [routes.dataControls]: settingSidebar,
        [routes.settingMembers]: settingSidebar,
        [routes.settingReports]: settingSidebar,
        [routes.weeklyReport]: settingSidebar,
        [routes.settingBilling]: settingSidebar,        
        [routes.mcp]: settingSidebar,
        [routes.Settingconfig]: settingSidebar,
        [routes.profileSetting]: <ProfileSidebar />, 
        [routes.twoFactorAuthentication]: <ProfileSidebar />,
        [routes.changePassword]: <ProfileSidebar/>,
        [routes.creditControl]: settingSidebar,
        [routes.superSolution]: settingSidebar
    };

    if (dynamicChatPath || dynamicCustomGptEditPath) return (
        <div className={`flex flex-col h-full w-full border-r`}>
            {/* <Suspense fallback={<Spinner />}> */}
                {routeComponents[pathname] || children}
            {/* </Suspense> */}
        </div> 
    )
    return (
        <div className={`flex flex-col h-full w-full border-r`}>
            {/* <Suspense fallback={<Spinner />}> */}
                {routeComponents[pathname] || children}
            {/* </Suspense> */}
        </div>
    )
};

export default SidebarPages;