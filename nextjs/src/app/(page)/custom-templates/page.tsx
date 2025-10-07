import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomBots from '@/components/CustomTemplate/CustomBots';
import CustomPrompts from '@/components/CustomTemplate/CustomPrompts';
import TemplateIcon from '@/icons/TemplateIcon';

const CustomTemplate = () => {
    return (
        <>
            <header className="h-[68px] min-h-[68px] flex items-center space-x-2 py-2 md:pl-[30px] md:pr-[15px] pl-[50px] pr-[15px] max-md:sticky max-md:top-0 z-10 bg-white">
                <div className="size-[30px] flex items-center justify-center rounded-full p-1">
                    <TemplateIcon width={20} height={20} className={"fill-b2 object-contain"} />
                </div>
                <p className="text-font-16 font-bold">
                    Agents & Prompts Library
                </p>
            </header>

            <Tabs defaultValue="bottemplate" className="w-full max-w-[1020px] lg:px-5 px-3 mx-auto mt-0 lg:mt-4">
                <TabsList className="flex p-0">
                    <TabsTrigger value="bottemplate" className="px-4 font-medium">
                        Agents
                    </TabsTrigger>
                    <TabsTrigger value="prompttemplate" className="px-4 font-medium">
                        Prompts
                    </TabsTrigger>
                </TabsList>
                <CustomBots />
                <CustomPrompts />                
            </Tabs>
        </>
    );
};

export default CustomTemplate;
