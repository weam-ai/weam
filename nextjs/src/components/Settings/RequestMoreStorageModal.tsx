"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import StorageIcon from '@/icons/StorageIcon';
import StorageSelector from '../StorageSelector';
import { megabytesToBytes } from '@/utils/common';
import { updateStorageAction } from '@/actions/storage';
import useServerAction from '@/hooks/common/useServerActions';
import { RESPONSE_STATUS } from '@/utils/constant';
import Toast from '@/utils/toast';

const RequestMoreStorageModal = ({ open, closeModal }: any) => {
    const [value, setValue] = useState(20);
    const [updateStorage, isPending] = useServerAction(updateStorageAction);

    const handleStorage = async () => {
        const payload = {
            requestSize: megabytesToBytes(value)
        }

        const response = await updateStorage(payload);
        if(response.status === RESPONSE_STATUS.SUCCESS){
            Toast(response.message);
            closeModal();
        }
    }

    return (
        <Dialog open={open} onOpenChange={closeModal}>
            <DialogContent className="md:max-w-[730px] max-w-[calc(100%-30px)] py-7">
                <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <StorageIcon width={'24'} height={'24'} className={'me-3 inline-block align-middle fill-b1'} />
                        Request for more storage
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body h-full p-[30px]">
                    <div className="flex items-center justify-center gap-2.5">
                        <p className='text-font-16 font-normal text-b2'>Storage Need</p>
                        <StorageSelector className="bg-white" min={0} max={500} 
                            step={20} 
                            initialValue={value} 
                            unit="mb" 
                            onChange={(newValue) => setValue(newValue)} />
                        <button 
                            className='btn btn-black'
                            onClick={handleStorage}
                            disabled={value < 1 || isPending}
                        >Request</button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

    );
};

export default RequestMoreStorageModal;
