import React, { useState } from "react";
import useLeaveBrain from "@/hooks/brains/useLeaveBrain";
import ExitIcon from "@/icons/ExitIcon";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LeaveBrainButtonProps {
  brainId: string;
  brainTitle: string;
  onLeaveSuccess?: (brainId: string) => void;
  buttonClassName?: string;
  iconClassName?: string;
  hideLabel?: boolean;
}

const LeaveBrainButton: React.FC<LeaveBrainButtonProps> = ({
  brainId,
  brainTitle,
  onLeaveSuccess,
  buttonClassName = "",
  iconClassName = "",
  hideLabel = false,
}) => {
  const [open, setOpen] = useState(false);
  const { leaveBrain, isLeaving } = useLeaveBrain({ onLeaveSuccess });

  const handleLeave = () => {
    leaveBrain(brainId);
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`cursor-pointer flex items-center gap-x-1 text-red hover:opacity-80 transition-opacity ${buttonClassName}`}
      >
        <ExitIcon
          width={14}
          height={14}
          className={`fill-red ${iconClassName}`}
        />
        {!hideLabel && <span className="hidden md:inline">Leave Brain</span>}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7">
          <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
            <DialogTitle className="font-semibold flex items-center">
              <ExitIcon
                width={24}
                height={24}
                className="fill-red me-3 inline-block align-text-top"
              />
              Leave Brain
            </DialogTitle>
          </DialogHeader>
          
          <div className="dialog-body h-full p-[30px] max-h-[70vh]">
            <div className="text-center">
              <p className="text-font-16 text-b5 mb-2">
                Are you sure you want to leave
              </p>
              <p className="text-font-18 font-semibold text-b2 mb-4">
                "{brainTitle}"?
              </p>
              <p className="text-font-14 text-b5">
                You will lose access to all its content and conversations.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex items-center justify-end gap-2.5 pb-[30px] px-[30px]">
            <DialogClose asChild>
              <Button 
                variant="outline" 
                className="btn btn-outline-gray"
                disabled={isLeaving}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="btn btn-black bg-red border-red hover:bg-red-dark hover:border-red-dark"
              onClick={handleLeave}
              disabled={isLeaving}
            >
              {isLeaving ? "Leaving..." : "Leave Brain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveBrainButton;