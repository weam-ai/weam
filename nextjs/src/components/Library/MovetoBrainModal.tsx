'use client';

import React, { useRef, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { useDispatch } from 'react-redux';
import { setMovetoBrainModalAction } from '@/lib/slices/modalSlice';
import { useSelector } from 'react-redux';
import store from '@/lib/store';
import BrainIcon from '@/icons/BrainIcon';
import { formatBrain } from '@/utils/helper';
import { SettingsIcon } from '@/icons/SettingsIcon';

const MovetoBrainModal = ({ title, brains, persistCustombot, botMoveToBrain, setSelectedBrain, movePrompt, loading, selectedBrain, btnTitle }) => {
    const dispatch = useDispatch();
    const isOpen = useSelector((store:any) => store.modalSlice.movetobrainmodal);

    const handleCancel = () => {
        persistCustombot.botdata = undefined;
        persistCustombot.promptdata = undefined;
        dispatch(setMovetoBrainModalAction(false));
        setSelectedBrain([]);
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
        <Dialog open={isOpen} onOpenChange={handleCancel}>           
            <DialogContent className="md:max-w-[650px] max-w-[calc(100%-30px)]">
                <DialogHeader>
                    <DialogTitle className="rounded-t-10 text-font-18 font-bold text-b2 bg-b12 px-[30px] py-6 border-b borer-b11">
                        <BrainIcon
                            width={'16'}
                            height={'16'}
                            className="size-5 object-contain me-3 align-middle inline-block fill-b2"
                        />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body h-full p-[30px] max-h-[70vh] overflow-y-auto">
                    {
                        brains.map((brain, index) => (
                            <div key={brain?._id} className='relative border-b border-b10 mb-3 pb-3'>
                                <label
                                    className="ml-2"
                                    htmlFor="pushNotification"
                                >
                                    {brain?.title}
                                </label>
                                <input
                                    className="input-checkbox bg-white !-ms-[0] !me-0 !mt-[0]"
                                    type="checkbox"
                                    role="switch"
                                    id="pushNotification"
                                    onChange={() => handleCheckboxChange(formatBrain(brain))}
                                />
                            </div>
                        ))
                    }
                </div>
                <DialogFooter className="flex items-center justify-center gap-2.5 pb-[30px] px-[30px]">
                    <button type="button" className="btn btn-black" disabled={loading || selectedBrain.length == 0}
                        onClick={
                            (persistCustombot.botdata == undefined) ? movePrompt :  botMoveToBrain}>
                        {btnTitle}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MovetoBrainModal;
