'use client';
import { useSidebar } from '@/context/SidebarContext';

interface MainContentWrapperProps {
  children: React.ReactNode;
}

const MainContentWrapper: React.FC<MainContentWrapperProps> = ({ children }) => {
  const { isCollapsed } = useSidebar();
  
  const getMarginClass = () => {
    if (isCollapsed) {
      return 'lg:ml-[100px] collapsed'; // 80px sidebar + 20px margin
    }
    return 'lg:ml-[290px]'; // 290px sidebar + 20px margin
  };

  return (
    <div className={`main-wrapper flex flex-col flex-1 ${getMarginClass()} lg:overflow-hidden lg:p-0 md:pb-10 pb-2 transition-all duration-300`}>
      {children}
    </div>
  );
};

export default MainContentWrapper;
