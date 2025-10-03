'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { ConfigurationButton, DisconnectButton } from './Shared';
import { useZoomOAuth } from '@/hooks/mcp/useZoomOAuth';

type ZoomConfigModalProps = {
    isOpen: boolean;
    onClose: () => void;
    mcpIcon: React.ReactNode;
    title: string;
    description: string;
};

const ZoomConfigModal: React.FC<ZoomConfigModalProps> = ({
    isOpen,
    onClose,
    mcpIcon,
    title,
    description,
}) => {
    const { isConnected, isLoading, connectZoom, disconnectZoom } = useZoomOAuth();

    const handleConnect = () => {
        connectZoom();
    };

    const handleDisconnect = async () => {
        await disconnectZoom();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[600px] max-w-[calc(100%-30px)] py-7 border-none">
                <DialogHeader className="px-[30px] pb-5 border-b">
                    <div className="flex items-center gap-3">
                        {mcpIcon}
                        <div>
                            <DialogTitle className="font-bold text-font-20">{`Configure to ${title}`}</DialogTitle>
                            <DialogDescription className="!text-b6 text-font-14">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-5 md:px-10 py-5">
                    {!isConnected ? (
                        <ConfigurationButton
                            title={title}
                            description={description}
                            handleConnect={handleConnect}
                            loading={isLoading}
                        />
                    ) : (
                        <DisconnectButton
                            title={title}
                            description={description}
                            handleDisconnect={handleDisconnect}
                            loading={isLoading}
                        />
                    )}
                </div>

                <DialogFooter className="flex items-center justify-center gap-2.5 pb-[30px] px-[30px]">
                    <button className="btn btn-outline-black" onClick={onClose}>
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ZoomConfigModal;