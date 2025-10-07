import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog"
import LogOutIcon from "@/icons/LogOutIcon";
import { handleLogout } from '@/utils/handleAuth';

const LogOutModal = ({open, closeModal}) => {

  return (
    <Dialog open={open} onOpenChange={closeModal}>
        <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                <DialogTitle className="font-semibold flex items-center">
                <LogOutIcon width={'24'} height={'24'} className={'me-3 inline-block align-middle fill-b1'}/>
                Log Out
                </DialogTitle>
            </DialogHeader>
            <div className="dialog-body h-full py-[30px] ">   
                <div className="h-full px-[30px] overflow-y-auto max-h-[75dvh]">
                    <p className="font-semibold text-center text-b2 mb-5">Are you sure you want to log out?</p>
                    <div className="flex items-center justify-center space-x-2.5">
                        <DialogClose asChild>
                            <button className='btn btn-outline-gray'>Cancel</button>
                        </DialogClose>
                        <button className='btn btn-black' onClick={handleLogout}>Confirm</button>
                    </div>
                </div> 
            </div>
        
        </DialogContent>
    </Dialog>
    
  );
};

export default LogOutModal;
