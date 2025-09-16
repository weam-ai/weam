'use client';

import React, { createContext, useContext, useState } from 'react';

type SidebarContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapse: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <SidebarContext.Provider value={{ 
      isOpen, 
      setIsOpen, 
      toggleSidebar, 
      closeSidebar, 
      isCollapsed, 
      setIsCollapsed, 
      toggleCollapse 
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};