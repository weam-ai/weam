import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTrigger,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import ViewIcon from '@/icons/ViewIcon';
import Customgpt from '@/icons/Customgpt';

const ViewCustomBot = ({ bot }) => {
    return (
        <Dialog>
            <DialogTrigger className='h-4'>
                <ViewIcon
                    className={
                        'fill-b5 hover:fill-b2 size-[17px] cursor-pointer transition-all ease-in-out'
                    }
                />
            </DialogTrigger>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7">
                <DialogHeader className="rounded-t-10 px-[30px] pb-3 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <Customgpt
                            width={20}
                            height={20}
                            className="w-5 h-auto object-contain fill-b5 me-3 inline-block align-text-top" />
                        Agents
                    </DialogTitle>
                    <DialogDescription>
                        <div className="small-description text-font-14 leading-[24px] text-b5 font-normal ml-9">
                            <p>{bot?.title}</p>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="dialog-body h-full max-h-[70vh] overflow-y-auto px-[30px] py-5">
                    <h3 className='font-bold mb-2'>System Prompt</h3>
                    <p className='text-b5 text-font-14'>{bot?.systemPrompt}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ViewCustomBot;
