import { AiModalType } from '@/types/aimodels';
import React, { useMemo } from 'react';
import { PopoverTrigger } from '../ui/popover';
import { DynamicImage } from '@/widgets/DynamicImage';
import { getModelImageByCode } from '@/utils/common';
import DownArrowIcon from '@/icons/DownArrow';
import { MODAL_NAME_CONVERSION } from '@/utils/constant';
import Link from 'next/link';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@radix-ui/react-hover-card';
import ChatwithDocIcon from '@/icons/ChatwithDocIcon';
import ChatwithImage from '@/icons/ChatwithImageIcon';
import ChatwithSearchIcon from '@/icons/ChatwithSearchIcon';
import ChatwithReasoningIcon from '@/icons/ChatwithReasoningIcon';
import CreditIcon from '@/icons/CreditIcon';
import { getDisplayModelName, getModelCredit } from '@/utils/helper';
import VisionSupportedIcon from '@/icons/VisionSupportIcon';

type SelectedPopOverProps = {
    selectedAIModal: AiModalType;
    open: boolean;
}

type ModelCodeGroupProps = {
    botCode: string;
}

const capabilities = [
    {
        key: 'doc',
        icon: ChatwithDocIcon,
        label: 'Chat with doc'
    },
    {
        key: 'vision',
        icon: VisionSupportedIcon,
        label: 'Vision supported'
    },
    {
        key: 'image',
        icon: ChatwithImage,
        label: 'Image generation'
    },
    {
        key: 'reasoning',
        icon: ChatwithReasoningIcon,
        label: 'Has reasoning capabilities'
    },
    {
        key: 'websearch',
        icon: ChatwithSearchIcon,
        label: 'Web Search'
    }
];

export const SelectedPopOver = ({ selectedAIModal, open }: SelectedPopOverProps) => {
    const displayModelName = useMemo(() => {
        return getDisplayModelName(selectedAIModal?.name);
    }, [selectedAIModal])
    return (
        <>
            {selectedAIModal?.name && (
                <PopoverTrigger asChild>
                    <button
                        role="combobox"
                        aria-expanded={open}
                        className="flex items-center [&[data-state=open]>.drop-arrow]:rotate-180"
                    >
                        <DynamicImage
                            src={getModelImageByCode(selectedAIModal?.bot?.code)}
                            alt={selectedAIModal.name}
                            width={40}
                            height={40}
                            className="rounded-full w-[24px] h-[24px] object-cover mr-2.5"
                            placeholder="blur"
                        />
                        <span className="text-font-15 font-bold text-b2 text-left">
                            {displayModelName}
                        </span>
                        <DownArrowIcon
                            width={'14'}
                            height={'8'}
                            className="drop-arrow ms-2.5 w-3.5 min-w-3 mr-1 h-2 object-contain fill-b2 transition duration-150 ease-in-out"
                        />
                    </button>
                </PopoverTrigger>
            )}
        </>
    );
};

export const ModelCodeGroup = ({ botCode }: ModelCodeGroupProps) => {
    return (
        <div className="flex justify-between text-font-14 pl-3 pr-1 py-2 items-center">
            <div className="font-bold">
                {MODAL_NAME_CONVERSION[botCode]}
            </div>
            <div className="text-right">
                <div className="text-rose-500 font-bold text-font-12">
                    <Link
                        href="/login"
                        className="text-b2 hover:text-b5 font-semibold ml-1"
                    >
                    </Link>
                </div>
            </div>
        </div>
    )
}

export const ModelCapability = ({ matchedModel }) => {
    return (
        <div className='flex items-center gap-x-1 ml-auto w-[44%] max-md:w-full max-md:mt-1 max-md:ml-8'>
            <div className='md:w-[65%] flex items-center gap-x-1 justify-center'>
                {capabilities.map(({ key, icon: Icon, label }) =>
                    matchedModel?.[key] ? (
                        <HoverCard key={key}>
                            <HoverCardTrigger>
                                <Icon width={18} height={18} className="w-6 h-auto" />
                            </HoverCardTrigger>
                            <HoverCardContent side='bottom' align='center' className="z-50">
                                <div className='px-3 py-1.5 rounded-md bg-white drop-shadow-lg border'>
                                    <p>{label}</p>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    ) : null
                )}
            </div>
            <span className='flex items-center justify-end md:ml-auto md:w-[35%]'>
                <CreditIcon width={16} height={16} className="w-4 h-auto fill-b5 mr-1" />
                {matchedModel?.credit}
            </span>
        </div>
    );
};
