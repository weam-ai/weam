import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog"
import Label from '@/widgets/Label';
import UserSetting from '@/icons/UserSetting';

const UpdateInformationModal = ({open, closeModal}) => {

  return (
    <Dialog open={open} onOpenChange={closeModal}>
        <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)]">
        <DialogHeader>
            <DialogTitle className="rounded-t-10 text-font-18 font-bold text-b2 bg-b12 px-[30px] py-6 border-b borer-b11">
            <UserSetting width={'24'} height={'24'} className={'me-3 inline-block align-middle fill-b1'}/>
            Update Information
            </DialogTitle>
        </DialogHeader>
        <div className="dialog-body h-full p-[30px] pb-0 overflow-y-auto max-h-[75vh]">    
            <div className="grid grid-cols-12 gap-x-5">
                <div className="col-span-6 relative mb-4">  
                    <Label title={"First Name"} htmlFor={"firstName"}/>
                    <input  type="text" className="default-form-input" id="firstName"/>
                </div>
                <div className="col-span-6 relative mb-4">  
                    <Label title={"Last Name"} htmlFor={"lastName"}/>
                    <input  type="text" className="default-form-input" id="lastName"/>
                </div>
                <div className="col-span-12 relative mb-4">  
                    <Label title={"Address"} htmlFor={"Address"}/>
                    <input  type="text" className="default-form-input" id="Address" />
                </div>
                <div className="col-span-6 relative mb-4">  
                    <Label title={"City"} htmlFor={"City"}/>
                    <input  type="text" className="default-form-input" id="City"/>
                </div>
                <div className="col-span-6 relative mb-4">  
                    <Label title={"State"} htmlFor={"State"}/>
                    <input  type="text" className="default-form-input" id="State"/>
                </div>
                <div className="col-span-6 relative mb-4">  
                    <Label title={"Country"} htmlFor={"Country"}/>
                    <input  type="text" className="default-form-input" id="Country"/>
                </div>
                <div className="col-span-6 relative mb-4">  
                    <Label title={"Zip"} htmlFor={"Zip"}/>
                    <input  type="text" className="default-form-input" id="Zip"/>
                </div>
                <div className="col-span-12 relative mb-4">  
                    <Label title={"Contact No. (optional)"} htmlFor={"Contact"}/>
                    <input  type="text" className="default-form-input" id="Contact"/>
                </div>
                <div className="col-span-12 relative">  
                    <Label title={"Email"} htmlFor={"Email"}/>
                    <input  type="email" className="default-form-input" id="Email"/>
                </div>
            </div>  
        </div>
        <DialogFooter className="flex items-center justify-end gap-2.5 py-[30px] px-[30px]">
            <DialogClose asChild>
            <button className='btn btn-outline-gray'>Cancel</button>
            </DialogClose>
            <button className='btn btn-black'>Update Information</button>
        </DialogFooter>
        </DialogContent>
    </Dialog>
    
  );
};

export default UpdateInformationModal;
