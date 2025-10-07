'use client';
import TemplateIcon from '@/icons/TemplateIcon';
import routes from '@/utils/routes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';

export const SettingActiveIcon = ({ key, setting, children, isCollapsed }:any) => {
    const pathname = usePathname();
    const { closeSidebar } = useSidebar();
    
    // Conditionally apply hover class based on sidebar collapse state
    const hoverClass = isCollapsed ? '' : 'hover:bg-b11';
    
    return (
        <Link
            key={key}
            href={setting.navigate}
            target={setting.target && `${setting.target}`}
            className={`${
                pathname === setting.slug ? 'active' : ''
            } sidebar-sub-menu-items cursor-pointer flex items-center py-2.5 px-5 mb-2 rounded-custom ${hoverClass} [&.active]:bg-b12`}
            onClick={closeSidebar}
        >
            {children}
        </Link>
    );
};

export const TemplateLibrary = () => {
    const pathname = usePathname();
    const { closeSidebar } = useSidebar();
    return (
        <Link href={routes.customTemplates}
            className=
            {`group relative w-10 h-10 flex items-center justify-center rounded-full ease-in-out duration-150  hover:bg-b5 hover:bg-opacity-[0.2] ${pathname == routes.customTemplates ? 'bg-b11' : ''
                }`}
            onClick={closeSidebar}
            >
            <TemplateIcon width={'20'} height={'20'} className={"fill-b2 w-5 h-auto "} />
        </Link>
    )
}