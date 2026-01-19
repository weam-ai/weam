'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import Label from '@/widgets/Label';
import MongoDBIcon from '@/icons/MongoDBIcon';
import Toast from '@/utils/toast';
import { updateMcpDataAction } from '@/actions/user';
import { encryptedData } from '@/utils/helper';
import { MCP_CODES } from '@/components/Mcp/MCPAppList';
import { ConfigurationButton } from './Shared';
import MCPDisconnectDialog from '../Shared/MCPDisconnectDialog';

interface MongoDBConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect?: () => void;
    mcpData?: any;
}

const MongoDBConfigModal: React.FC<MongoDBConfigModalProps> = ({ isOpen, onClose, onConnect, mcpData }) => {
    const [connectionUri, setConnectionUri] = useState('');
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionData, setConnectionData] = useState<any>(null);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    useEffect(() => {
        // Check if MongoDB is already configured from mcpData
        if (mcpData && mcpData[MCP_CODES.MONGODB]) {
            setIsConnected(true);
            setConnectionData(mcpData[MCP_CODES.MONGODB]);
        } else {
            setIsConnected(false);
            setConnectionData(null);
        }
    }, [mcpData]);

    const handleConnect = async () => {
        if (!connectionUri.trim()) {
            Toast('Please enter a MongoDB URI', 'error');
            return;
        }

        // Basic MongoDB URI validation
        if (!connectionUri.startsWith('mongodb://') && !connectionUri.startsWith('mongodb+srv://')) {
            Toast('Please enter a valid MongoDB URI (must start with mongodb:// or mongodb+srv://)', 'error');
            return;
        }

        setLoading(true);
        try {
            // Encrypt the URI using the same method as OAuth tokens
            const encryptedUri = encryptedData(connectionUri);
            
            const payload = {
                connection_string: encryptedUri,
                connectedAt: new Date().toISOString(),
                status: 'connected'
            };

            // Save to database using the same pattern as OAuth tokens
            const mcpDataKey = 'mcpdata.' + MCP_CODES.MONGODB;
            await updateMcpDataAction({ [mcpDataKey]: payload, isDeleted: false });
            
            setIsConnected(true);
            setConnectionData(payload);
            setConnectionUri(''); // Clear the input for security
            Toast('MongoDB connected successfully!', 'success');
            if (onConnect) {
                onConnect();
            }
            // Close the modal after successful connection
            onClose();
        } catch (error) {
            console.error('MongoDB connection error:', error);
            Toast('Failed to connect to MongoDB', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        setShowDisconnectDialog(true);
    };

    const handleConfirmDisconnect = async () => {
        setLoading(true);
        try {
            await updateMcpDataAction({
                mcpdata: {
                    [MCP_CODES.MONGODB]: null
                },
                isDeleted: true
            });

            setIsConnected(false);
            setConnectionData(null);
            setShowDisconnectDialog(false);
            Toast('Successfully disconnected from MongoDB!', 'success');
            onClose();
        } catch (error) {
            console.error('Error disconnecting MongoDB:', error);
            Toast('Failed to disconnect from MongoDB. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[600px] max-w-[calc(100%-30px)] py-7 border-none">
                <DialogHeader className="px-[30px] pb-5 border-b">
                    <div className="flex items-center gap-3">
                        <MongoDBIcon className="size-6" />
                        <div>
                            <DialogTitle className="font-bold text-font-20">Configure MongoDB</DialogTitle>
                            <DialogDescription className="!text-b6 text-font-14">
                                Connect your MongoDB database to store and retrieve data efficiently.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-5 md:px-10 py-5">
                    {!isConnected ? (
                        <div className="space-y-4">
                            <div className="bg-b2/10 p-4 rounded-lg">
                                <h3 className="font-semibold text-font-16 mb-2">Connect to MongoDB</h3>
                                <p className="text-b6 text-font-14 mb-4">
                                    Connect your MongoDB database to enable data storage and retrieval operations.
                                </p>
                                
                                <div className="space-y-3 mb-4">
                                    <Label title="MongoDB URI *" />
                                    <input
                                        type="password"
                                        className="default-form-input"
                                        placeholder="mongodb://username:password@host:port/database or mongodb+srv://..."
                                        value={connectionUri}
                                        onChange={(e) => setConnectionUri(e.target.value)}
                                    />
                                    <p className="text-xs text-b6">
                                        Enter your complete MongoDB connection URI including credentials and database name.
                                    </p>
                                </div>
                                
                                <button
                                    className="btn btn-black w-full"
                                    onClick={handleConnect}
                                    disabled={loading || !connectionUri.trim()}
                                >
                                    {loading ? 'Connecting...' : 'Connect to MongoDB'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Connection Status */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="font-semibold text-green-800">Connected to MongoDB</span>
                                </div>
                                {connectionData && (
                                    <div className="text-sm text-green-700">
                                        <p>Connected on {new Date(connectionData.connectedAt).toLocaleDateString()}</p>
                                        <p className="text-xs mt-1">Database connection is active and ready for operations</p>
                                    </div>
                                )}
                            </div>

                            {/* Disconnect Button */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-font-16 mb-3 text-red-600">Danger Zone</h3>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <p className="text-red-700 text-sm mb-3">
                                        Disconnecting will remove all MongoDB integrations and stop all MongoDB MCP related operations.
                                    </p>
                                    <button
                                        className="btn btn-outline-red"
                                        onClick={handleDisconnect}
                                        disabled={loading}
                                    >
                                        {loading ? 'Disconnecting...' : 'Disconnect MongoDB'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center justify-center gap-2.5 pb-[30px] px-[30px]">
                    <button
                        className="btn btn-outline-black"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
            
            <MCPDisconnectDialog
                open={showDisconnectDialog}
                closeModal={() => setShowDisconnectDialog(false)}
                onDisconnect={handleConfirmDisconnect}
                serviceName="MongoDB"
                serviceIcon={<MongoDBIcon className="size-6" />}
                description="Are you sure you want to disconnect from MongoDB? This will remove all MongoDB integrations and stop all MongoDB MCP related operations."
                loading={loading}
            />
        </Dialog>
    );
};

export default MongoDBConfigModal;