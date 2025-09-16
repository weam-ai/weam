
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreditAllocation from '@/components/Settings/CreditControls/CreditAllocation';
// import BulkPurchase from '@/components/Settings/BulkPurchase/BulkPurchase';
import CreditTransaction from '@/components/Settings/CreditControls/CreditTransaction';

const CreditControl = async () => {

    return (
        <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2 max-md:mt-[50px]">
            <div className="h-full overflow-y-auto w-full relative">
                <div className="mx-auto max-w-[950px]">
                    <div className="mb-6">
                        <h1 className="text-font-24 font-bold text-b2 mb-2">Credit Control</h1>
                        <p className="text-b6 text-font-14">
                            Manage your organization&apos;s credit purchases, allocations, and usage tracking.
                        </p>
                    </div>

                    <Tabs defaultValue="allocation" className="w-full">
                        <TabsList className="px-0 space-x-10 max-md:space-x-5">
                            <TabsTrigger className="px-0 font-medium text-font-14 max-md:text-font-12" value="allocation">
                                Credit Allocation
                            </TabsTrigger>
                            {/* <TabsTrigger className="px-0 font-medium text-font-14 max-md:text-font-12" value="transactions">
                                Transaction History
                            </TabsTrigger> */}
                        </TabsList>

                        <TabsContent value="allocation" className="p-0">
                            <CreditAllocation />
                        </TabsContent>
                        {/* <TabsContent value="transactions" className="p-0">
                            <CreditTransaction />
                        </TabsContent> */}
                        
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default CreditControl;