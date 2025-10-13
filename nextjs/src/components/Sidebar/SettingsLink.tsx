'use client';
import Link from 'next/link';
import Setting from '@/icons/Setting';
import routes from '@/utils/routes';
import { useSidebar } from '@/context/SidebarContext';
import { usePathname } from 'next/navigation';

const SettingsLink = () => {
  const { closeSidebar } = useSidebar();
  const pathname = usePathname();

  const isActive = pathname.startsWith('/settings');

  return (
    <Link
      href={routes.settingReports}
      className={`group relative w-10 h-10 flex items-center justify-center rounded-full ease-in-out duration-150 hover:bg-b5 hover:bg-opacity-[0.2] ${isActive ? ' bg-b11' : 'bg-transparent'}`}
      onClick={closeSidebar}
    >
      <Setting
        width={'18'}
        height={'18'}
        className={'fill-b2 w-[18px] h-auto'}
      />
    </Link>
  );
};

export default SettingsLink;