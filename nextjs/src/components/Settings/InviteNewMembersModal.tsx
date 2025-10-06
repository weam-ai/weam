import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog"


import Select from 'react-select';
import Label from '@/widgets/Label';

export const customSelectStyles = {
    menu: (provided) => ({
        ...provided,
        zIndex: 1000, // Ensure the dropdown menu is above other content
        position: 'absolute',
    }),
    menuList: (provided) => ({
        ...provided,
        maxHeight: '150px', // Adjust as needed to prevent overflow
        overflowY: 'auto',
    }),
    option: (provided, state) => ({
        ...provided,
        cursor: state.isDisabled ? 'not-allowed' : 'pointer',
        color: state.isDisabled ? '#B6B6B6' : '#121212',
        // backgroundColor: state.isDisabled ? '#B6B6B6' : '#121212',
    }),
};

const InviteNewMembersModal = ({open, closeModal}) => {
  const [chips, setChips] = React.useState([])

  const handleChange = (newChips) => {
    setChips(newChips)
  }

  const roleModalOptions = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Member', label: 'Member' },
    ]

  return (
    <Dialog open={open} onOpenChange={closeModal}>
        <DialogContent className="md:max-w-[730px] max-w-[calc(100%-30px)]">
        <DialogHeader>
            <DialogTitle className="rounded-t-10 text-font-18 font-bold text-b2 bg-b12 px-[30px] py-6 border-b borer-b11">
            Invite New Members
            </DialogTitle>
        </DialogHeader>
        <div className="dialog-body h-full p-[30px] max-h-[70vh]">        
            <div className="relative mb-4">
                <Label title={'Email Addresses'}/>
                <span className="block text-font-16 text-b5 mb-2">
                    Enter or paste one or more
                    email addresses, separated
                    by spaces or commas
                </span>
            </div>
            <div className="relative overflow-visible">
            <Label title={"Role"} htmlFor={"role"}/>
            <Select styles={customSelectStyles} menuPlacement="auto" id="role" options={roleModalOptions} className="react-select-container react-select-border-light lg:w-[200px]" classNamePrefix="react-select"/>
            </div>
        </div>
        <DialogFooter className="flex items-center justify-end gap-2.5 pb-[30px] px-[30px]">
            <DialogClose asChild>
            <button className='btn btn-outline-gray'>Cancel</button>
            </DialogClose>
            <button className='btn btn-black' disabled>Send Invitations</button>
        </DialogFooter>
        </DialogContent>
    </Dialog>
    
  );
};

export default InviteNewMembersModal;
