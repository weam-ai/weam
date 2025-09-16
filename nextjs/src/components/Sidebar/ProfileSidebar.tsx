import React, { useMemo } from 'react';
import { LINK } from '@/config/config';
import { usePathname, useRouter } from 'next/navigation';
import UserSetting from '@/icons/UserSetting';
import SecureIcon from '@/icons/SecureIcon';
import LockIcon from '@/icons/Lock';
import { GENERAL_BRAIN_TITLE } from '@/utils/constant';
import { getCurrentUser } from '@/utils/handleAuth';
import { encodedObjectId, generateObjectId } from '@/utils/helper';
import { RootState } from '@/lib/store';
import { useSelector } from 'react-redux';
import { BrainListType } from '@/types/brain';
import { useSidebar } from '@/context/SidebarContext';
import BackButton from './BackButton';
import ProfileSettingOptions from './ProfileSettingOptions';
import SidebarFooter from './SidebarFooter';

const ProfileSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const objectId = useMemo(() => generateObjectId(), []);
    const brainData = useSelector((store: RootState) => store.brain.combined);
    const { closeSidebar } = useSidebar();

    const settingOptions = [
        {
            name: 'General',
            icon: (
                <UserSetting
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: true,
            navigate: `${LINK.DOMAIN_URL}/profile-setting`,
            slug: '/profile-setting',
        },
        {
            name: 'Password',
            icon: (
                <LockIcon 
                height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: true,
            navigate: `${LINK.DOMAIN_URL}/profile-setting/password`,
            slug: '/profile-setting/password',
        },
        {
            name: 'Two-Factor Authentication',
            icon: (
                <SecureIcon
                    height={20}
                    width={20}
                    className={'w-[18px] h-auto object-contain fill-b2'}
                />
            ),
            hasAccess: true,
            navigate: `${LINK.DOMAIN_URL}/profile-setting/two-factor-authentication`,
            slug: '/profile-setting/two-factor-authentication',
        },
        
    ];
    // Function to handle navigation link clicks
    const handleLinkClick = () => {
        closeSidebar();
    };
    return (
        <>
            
            <div className="flex items-center justify-between py-4 gap-x-3">
                <BackButton />
                <div className="w-full relative font-bold collapsed-text">
                    Profile Settings
                </div>
            </div>

            <div className="sidebar-sub-menu-items flex flex-col relative h-full overflow-hidden pb-8">
                <div className="h-full overflow-y-auto w-full px-2.5">
                    <ProfileSettingOptions 
                        settingOptions={settingOptions} 
                        onLinkClick={closeSidebar}
                    />
                </div>
            </div>
            <SidebarFooter />
        </>
    );
};

export default ProfileSidebar;
