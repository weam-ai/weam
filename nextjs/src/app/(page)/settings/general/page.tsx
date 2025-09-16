import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ModelList from '@/components/Settings/ModelList';
import Link from 'next/link';
import routes from '@/utils/routes';
import { Suspense } from 'react';
import { DataControls } from '@/components/Loader/DataControls';
import dynamic from 'next/dynamic';
const SharedLinks = dynamic(() => import('@/components/Settings/SharedLinks'), { ssr: true, loading: () => <DataControls items={10} /> });

const SHARED_TAB = 'shared';
const MODEL_TAB = 'model';
export default function GeneralSettings({ searchParams }) {   
    const tab = searchParams.tab || MODEL_TAB;
    return (
        <>
        <div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
        <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
            <div className="h-full overflow-y-auto w-full relative">
                <div className="mx-auto max-w-[950px]">
                    <Tabs defaultValue={tab === MODEL_TAB ? 'model-settings' : 'shared-links'} className="w-full mx-auto mt-0 lg:mt-4">
                        <TabsList className="flex p-0 space-x-6">
                                <Link href={`${routes.setting}?tab=${MODEL_TAB}`}>
                                <TabsTrigger value="model-settings" className="px-0">
                                        Models
                                </TabsTrigger>
                                </Link>
                                <Link href={`${routes.setting}?tab=${SHARED_TAB}`}>
                                    <TabsTrigger value="shared-links" className="px-0">
                                        Shared Links    
                                    </TabsTrigger>
                                </Link>
                        </TabsList>
                        <TabsContent value="model-settings">
                            <ModelList />
                        </TabsContent>
                        <TabsContent value="shared-links">
                            {tab === SHARED_TAB &&
                                (<Suspense fallback={<DataControls items={10}/>}>
                                    <SharedLinks />
                                </Suspense>)}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
        </>
    );
}


// 'use client'
// import ModelSetting from '@/components/Settings/ModelSetting';
// import SharedLinks from '@/components/Settings/SharedLinks';
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// export default function GeneralSettings() {
    
//     return (
//         <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
//             <div className="h-full overflow-y-auto w-full relative">
//                 <div className="mx-auto max-w-[730px]">
//                     <Tabs defaultValue="model-settings" className="w-full lg:px-5 px-3 mx-auto mt-0 lg:mt-4">
//                         <TabsList className="flex p-0">
//                             <TabsTrigger value="model-settings" className="px-4">
//                                 Models
//                             </TabsTrigger>
//                             <TabsTrigger value="shared-links" className="px-4">
//                                 Shared Links
//                             </TabsTrigger>
//                         </TabsList>
//                         <ModelSetting  />
//                         <SharedLinks />
//                     </Tabs>
//                     {/* <DeleteAccount /> */}
//                 </div>
//             </div>
//         </div>
//     );
// }

