import React, { memo } from 'react';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ModelCapability, ModelCodeGroup, SelectedPopOver } from './RenderModalList';
import CreditIcon from '@/icons/CreditIcon';
import { Progress } from '@/components/ui/Progress';
import { AiModalType } from '@/types/aimodels';
import { getModelImageByName, MODEL_CREDIT_INFO } from '@/utils/constant';
import { DynamicImage } from '@/widgets/DynamicImage';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { getModelImageByCode } from '@/utils/common';

type UserModalPopOverProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    selectedAIModal: AiModalType;
    handleModelChange: (model: AiModalType) => void;
    userModals: AiModalType[];
}

const UserModalPopOver = ({ open, setOpen, selectedAIModal, handleModelChange, userModals }: UserModalPopOverProps) => {
    const creditInfo = useSelector((store: RootState) => store.chat.creditInfo);
    const progressValue = creditInfo?.msgCreditLimit > 0
        ? (creditInfo.msgCreditUsed / creditInfo.msgCreditLimit) * 100
        : 0;
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <SelectedPopOver selectedAIModal={selectedAIModal} open={open} />
            <PopoverContent
                                className="md:min-w-[470px] min-w-[300px]"
                                align="start"
                            >
                                <Command>
                                    <CommandList>
                                    {(
                                    <div className='sticky top-0 bg-white z-10'>
                                        <div className="flex justify-between text-font-14 px-1 pt-3 items-center">
                                            <span className='font-medium'>Credits usage : </span>
                                            <span className='text-b5 ml-auto flex items-center gap-x-1'>
                                                <CreditIcon width={16} height={16} className="w-4 h-auto fill-b5" />
                                                {creditInfo?.msgCreditUsed>=0 && `${creditInfo.msgCreditUsed?.toFixed(2)} / ${creditInfo.msgCreditLimit}`}
                                            </span>
                                        </div>
                                        <div className='px-2 mb-2 mt-2'>
                                            <Progress value={progressValue} className="w-full max-w-full" />
                                        </div>
                                        <div className="flex justify-between text-font-12 pl-3 pr-1 py-2 items-center border-b border-t font-medium max-md:hidden">
                                            <div className="w-[60%]">
                                                Model
                                            </div>
                                            <div className='w-[20%]'>
                                                Capabilities
                                            </div>
                                            <div className='w-[20%]'>
                                                Credit/Message
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                        {Object.entries(
                                            userModals.reduce((acc:any, model:any):any => {
                                                if (!model?.bot) {
                                                    return acc; // Skip this record if model.bot is not found
                                                }
                                                const { code } = model.bot;
                                                if (!acc[code]) {
                                                    acc[code] = {
                                                        enabled: [],
                                                        disabled: [],
                                                    };
                                                }
                                                if (model.isDisable) {
                                                    acc[code].disabled.push(
                                                        model
                                                    );
                                                } else {
                                                    acc[code].enabled.push(
                                                        model
                                                    );
                                                }
                                                return acc;
                                            }, {})
                                        ).map(
                                            ([
                                                botCode,
                                                { enabled } 
                                            ]:any) => {
                                                return (
                                                    <CommandGroup key={botCode}>
                                                        {/* Header with Message Count */}
                                                        
                                                        {enabled.length > 0 && (<ModelCodeGroup botCode={botCode} />)}
                                                        
                                                        {/* Enabled Models */}
                                                        {enabled.map(
                                                            (model: AiModalType) => {
                                                                const matchedModel = MODEL_CREDIT_INFO.find((m) => m.model === model.name);
                                                                return (
                                                                    <CommandItem
                                                                    className="break-words whitespace-normal max-md:flex-wrap"
                                                                    key={model._id}
                                                                    value={model.name}
                                                                    onSelect={() => handleModelChange(model)}
                                                                    disabled={model?.isDisable}
                                                                >
                                                                    <DynamicImage
                                                                        src={getModelImageByCode(model?.bot?.code)}
                                                                        alt={model?.name}
                                                                        width={40}
                                                                        height={40}
                                                                        className="rounded-full w-[20px] h-[20px] object-cover mr-2.5"
                                                                    />
                                                                    <div className='mr-2 w-[56%] max-md:w-[calc(100%-40px)]'>
                                                                        {matchedModel?.displayName || model?.name}
                                                                        <p className='text-font-12 text-b6'>
                                                                            {matchedModel?.snippet || 'Good for content generation tasks.'}
                                                                        </p>
                                                                    </div>
                                                                    <ModelCapability matchedModel={matchedModel} />
                                                                </CommandItem>
                                                                )
                                                            }
                                                        )}
                                                    </CommandGroup>
                                                );
                                            }
                                        )}
                                        {/* <AddModel /> */}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
        </Popover>
    );
};

export default memo(UserModalPopOver);
