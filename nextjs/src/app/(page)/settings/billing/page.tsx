'use client';
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useModal from '@/hooks/common/useModal';
import UserStorage from '@/components/Settings/billing/UserStorage';
import StorageRequestList from '@/components/Settings/billing/StorageRequestList';

export default function BillingSettings() {
    const membersOptions = [
        { value: 'Everyone', label: 'Everyone' },
        { value: 'Admin', label: 'Admin' },
        { value: 'Manager', label: 'Manager' },
        { value: 'Member', label: 'Member' },
    ];

    const { isOpen, openModal, closeModal } = useModal();
    const [selectedTab, setSelectedTab] = useState('storage-request');
    
    return (
        <>
            <div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
            <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
                <div className="h-full overflow-y-auto w-full relative">
                    <div className="mx-auto md:max-w-[950px] max-w-full">
                        <Tabs defaultValue="storage-request" className="w-full mx-auto mt-0 lg:mt-4">
                            <TabsList className="flex p-0 space-x-6">
                            <TabsTrigger className="px-0" value="storage-request">
                                    Storage Request
                                </TabsTrigger>
                                <TabsTrigger className="px-0" value="Members">
                                    Storage Usage
                                </TabsTrigger>                                
                            </TabsList>
                            <TabsContent value="storage-request" className="p-0 max-w-[calc(100vw-25px)] overflow-x-auto">
                                <StorageRequestList 
                                    selectedTab={selectedTab} 
                                    isOpen={isOpen} 
                                    membersOptions={membersOptions} 
                                />
                            </TabsContent>
                            <TabsContent value="Members" className="p-0 max-w-[calc(100vw-25px)] overflow-x-auto">
                                <UserStorage />                                
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </>
    );
}
