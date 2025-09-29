'use client'
import { useDispatch, useSelector } from 'react-redux';
import { setMovetoBrainModalAction } from '@/lib/slices/modalSlice';
import { SettingsIcon } from '@/icons/SettingsIcon';
import { useCallback, memo, useState } from 'react';
import Toast from '@/utils/toast';
import {  MODULE_ACTIONS } from '@/utils/constant';
import commonApi from '@/api';
import { getCurrentUser } from '@/utils/handleAuth';
import usePrompt from '@/hooks/prompt/usePrompt';
import { capitalizeFirstLetter } from '@/utils/common';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

import BrainIcon from '@/icons/BrainIcon';
import Moveto from '@/icons/MovetoBrain';
import { formatBrain } from '@/utils/helper';
import Close from '@/icons/Close';


const persistCustombot = {
    botdata: undefined,
    promptdata: undefined
}

const CustomTemplateSetting = memo(({bot, prompt, type, mykey, DialogTitle}) => {

    const currLoggedInUser=getCurrentUser()
    const dispatch = useDispatch();
    const shareBrains = useSelector((store:any) => store.brain.shareList);
    const privateList = useSelector((store:any) => store.brain.privateList);
    const allBrainList = [
        ...shareBrains,
        ...(currLoggedInUser?.isPrivateBrainVisible ? privateList : []),
    ];
    const [selectedBrain, setSelectedBrain] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState();
    const [openDialogIndex, setOpenDialogIndex] = useState(null); // Track the open dialog index

    const { createPrompt, addPromptLoading, setAddPromptLoading } = usePrompt();
    
    const title = `${'Choose Brain for Your '} ${capitalizeFirstLetter(DialogTitle)}`;
    const btnTitle = `${'Add To Brain'}`;

    const closeModal = () => {
        persistCustombot.botdata = undefined;
        persistCustombot.promptdata = undefined;
        dispatch(setMovetoBrainModalAction(false));
        setSelectedBrain([]);
        setOpenDialogIndex(null);
    }
    
    const handleOpen = useCallback((bot, prompt, mykey) => {
        
        if (openDialogIndex === mykey) {
            setOpenDialogIndex(null); // Close if the same dialog is already open
        } else {
            setOpenDialogIndex(mykey); // Open the selected dialog
        }

        if(type == 'bot')
            persistCustombot.botdata = bot;
        else 
            persistCustombot.promptdata = prompt;
        
        dispatch(setMovetoBrainModalAction(true));
    }, []);
    
    const botMoveToBrain = async () => {
        try {
            setAddPromptLoading(true);
            const user = getCurrentUser();

            const payload = {
                title: persistCustombot?.botdata?.title || '',
                systemPrompt: persistCustombot?.botdata?.systemPrompt || '',
                default: false, 
                responseModel: {
                    company: {
                        name: user?.company?.name || '',
                        slug: user?.company?.slug || '',
                        id: user?.company?.id || ''
                    }
                },
                maxItr: persistCustombot?.botdata?.maxItr || '0',
                selectedBrain: selectedBrain,
                charimg: persistCustombot?.botdata?.charimg || ''
            };

            const reqObject = {
                action: MODULE_ACTIONS.ASSIGN_GPT,
                common: false,
                data: payload,
                config: {
                    'Content-Type': 'multipart/form-data'
                }
            }
            
            const response = await commonApi(reqObject);

            if(response?.code != "ERROR"){
                Toast(response?.message);
            }   
            closeModal();
            setAddPromptLoading(false);
            setIsDialogOpen(false);
        } catch (error) {
            console.error('error: botMoveToBrain ', error);
        }
    };

    const movePrompt = async () => {
        try {
            const payload = {
                title: persistCustombot.promptdata?.title,
            content: persistCustombot.promptdata?.content,
            brains: selectedBrain,
            tags: persistCustombot.promptdata?.tags,
            addinfo: persistCustombot.promptdata?.addinfo,
            brandInfo: persistCustombot.promptdata?.brandInfo,
            companyInfo: persistCustombot.promptdata?.companyInfo,
            productInfo: persistCustombot.promptdata?.productInfo,
            selected: undefined
        }

            await createPrompt(payload, closeModal);        
        } catch (error) {
            console.log('error: movePrompt ', error);
        }
    }


    
    const handleCancel = (mykey) => {
        persistCustombot.botdata = undefined;
        persistCustombot.promptdata = undefined;
        dispatch(setMovetoBrainModalAction(false));
        setSelectedBrain([]);
        setOpenDialogIndex(null);
    };
    
    const handleCheckboxChange = (brain) => {
        setSelectedBrain(prevState => {
            const brainExists = prevState.some(item => item.id === brain.id);
            if (brainExists) {
                // Remove the brain if it's already selected
                return prevState.filter(item => item.id !== brain.id);
            } else {
                // Add the brain if it's not selected
                return [...prevState, brain];
            }
        });
    };

    return (
        
            <Dialog key={mykey} open={openDialogIndex === mykey}>
                <DialogTrigger className='h-4' onClick={ () => handleOpen(bot, prompt, mykey)}>
                    
                        <Moveto 
                            width={16}
                            height={16}
                            className={'fill-b5 hover:fill-b2 w-4 h-auto object-contain cursor-pointer mr-2 transition-all ease-in-out'
                            }
                        />
                </DialogTrigger>
                <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] pt-8 pb-2">
                    <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                        <button type='button' className="btn absolute top-4 right-0 z-10 opacity-0" onClick={() => handleCancel(mykey)}>
                            <Close height={24} width={24} className={'fill-b5 size-4'}/>
                        </button>
                        <DialogTitle className="font-semibold flex items-center">
                            <BrainIcon
                                width={'16'}
                                height={'16'}
                                className="size-5 object-contain me-3 align-middle inline-block fill-b2"
                            />
                            {title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="dialog-body h-full p-[30px] pb-[10px] max-h-[calc(100vh-260px)] overflow-y-auto">
                        {
                            allBrainList.map((brain, index) => (
                                <div key={brain?._id} className='relative border-b border-b10 mb-3 pb-3'>
                                    <label
                                        className="ml-2 text-font-15"
                                        htmlFor={`pushNotification-${index}`}
                                    >
                                        {brain?.title}
                                    </label>
                                    <input
                                        className="input-checkbox bg-white !-ms-[0] !me-0 !mt-[0]"
                                        type="checkbox"
                                        role="switch"
                                        id={`pushNotification-${index}`}
                                        onChange={() => handleCheckboxChange(formatBrain(brain))}
                                    />
                                </div>
                            ))
                        }
                    </div>
                    <DialogFooter className="flex items-center justify-center gap-2.5 py-7 px-[30px]">
                        <button type="button" className="btn btn-black" disabled={addPromptLoading || selectedBrain.length == 0}
                            onClick={
                                (persistCustombot.botdata == undefined) ? movePrompt :  botMoveToBrain}>
                            {btnTitle}
                        </button>
                    </DialogFooter>                    
                </DialogContent>
            </Dialog>
        
    );
});

export default CustomTemplateSetting;
