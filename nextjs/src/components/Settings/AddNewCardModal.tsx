import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog"
import CardIcon from '@/icons/CardIcon';
import Label from '@/widgets/Label';

const AddNewCardModal = ({open, closeModal}) => {

  return (
    <Dialog open={open} onOpenChange={closeModal}>
        <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)]">
        <DialogHeader>
            <DialogTitle className="rounded-t-10 text-font-18 font-bold text-b2 bg-b12 px-[30px] py-6 border-b borer-b11">
            <CardIcon width={'36'} height={'24'} className={'me-3 inline-block align-middle fill-b1'}/>
            Add New Card 
            </DialogTitle>
        </DialogHeader>
        <div className="dialog-body h-full p-[30px]">    
            <div className="grid grid-cols-12 gap-x-5">
                <div className="col-span-12 relative mb-4">  
                    <Label title={"Name on Card"} htmlFor={"nameOnCard"}/>
                    <input  type="text" className="default-form-input" id="nameOnCard" />
                </div>
                <div className="col-span-12 relative mb-4">  
                    <Label title={"Card Number"} htmlFor={"cardNumber"}/>
                    <input  type="text" className="default-form-input" id="cardNumber" />
                </div>
                <div className="col-span-6 relative mb-4">  
                    <Label title={"Expirty Date"} htmlFor={"expirtyDate"}/>
                    <input  type="text" className="default-form-input" id="expirtyDate" placeholder='MM/YY'/>
                </div>
                <div className="col-span-6 relative mb-4">  
                    <Label title={"Security Code"} htmlFor={"securityCode"}/>
                    <input  type="text" className="default-form-input" id="securityCode" placeholder='XXX'/>
                </div>
            </div>  
        </div>
        <DialogFooter className="flex items-center justify-end gap-2.5 pb-[30px] px-[30px]">
            <DialogClose asChild>
            <button className='btn btn-outline-gray'>Cancel</button>
            </DialogClose>
            <button className='btn btn-black'>Add Card</button>
        </DialogFooter>
        </DialogContent>
    </Dialog>
    
  );
};

export default AddNewCardModal;
