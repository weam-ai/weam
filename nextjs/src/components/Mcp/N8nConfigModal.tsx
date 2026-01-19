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
import NeightNIcon from '@/icons/nEightnIcon';
import Toast from '@/utils/toast';
import { updateMcpDataAction } from '@/actions/user';
import { encryptedData } from '@/utils/helper';
import { MCP_CODES } from '@/components/Mcp/MCPAppList';
import MCPDisconnectDialog from '../Shared/MCPDisconnectDialog';
import ValidationError from '@/widgets/ValidationError';

interface N8nConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect?: () => void;
    mcpData?: any;
}

const N8nConfigModal: React.FC<N8nConfigModalProps> = ({ isOpen, onClose, onConnect, mcpData }) => {
    const [apiKey, setApiKey] = useState('');
    const [apiBaseUrl, setApiBaseUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionData, setConnectionData] = useState<any>(null);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    useEffect(() => {
        // Check if n8n is already configured from mcpData
        if (mcpData && mcpData[MCP_CODES.N8N]) {
            setIsConnected(true);
            setConnectionData(mcpData[MCP_CODES.N8N]);
            // Set API base URL if it exists, otherwise use default
            if (mcpData[MCP_CODES.N8N].api_base_url) {
                setApiBaseUrl(mcpData[MCP_CODES.N8N].api_base_url);
            }
        } else {
            setIsConnected(false);
            setConnectionData(null);
        }
    }, [mcpData]);

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            Toast('Please enter an n8n API key', 'error');
            return;
        }

        // Validate API base URL format if provided
        if (apiBaseUrl.trim() && !isValidUrl(apiBaseUrl.trim())) {
            Toast('Please enter a valid API base URL (e.g., https://api.n8n.io/api/v1 or https://your-instance.com/api/v1)', 'error');
            return;
        }

        setLoading(true);
        try {
            // Encrypt the API key
            const encryptedApiKey = encryptedData(apiKey);
            
            const payload: any = {
                api_key: encryptedApiKey,
                connectedAt: new Date().toISOString(),
                status: 'connected'
            };
            console.log("🚀 ~ handleConnect ~ payload:", payload)

            // Add API base URL if provided (for self-hosted instances)
            if (apiBaseUrl.trim() && apiBaseUrl.trim() !== 'https://api.n8n.io/v1') {
                payload.api_base_url = apiBaseUrl.trim();
            }
            
            // Save to database
            const mcpDataKey = 'mcpdata.' + MCP_CODES.N8N;
            await updateMcpDataAction({ [mcpDataKey]: payload, isDeleted: false });
            
            setIsConnected(true);
            setConnectionData(payload);
            setApiKey(''); // Clear the input for security
            Toast('n8n connected successfully!', 'success');
            if (onConnect) {
                onConnect();
            }
            // Close the modal after successful connection
            onClose();
        } catch (error) {
            console.error('n8n connection error:', error);
            Toast('Failed to connect to n8n', 'error');
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
                    [MCP_CODES.N8N]: null
                },
                isDeleted: true
            });

            setIsConnected(false);
            setConnectionData(null);
            setApiBaseUrl('https://api.n8n.io/v1'); // Reset to default
            setShowDisconnectDialog(false);
            Toast('Successfully disconnected from n8n!', 'success');
            onClose();
        } catch (error) {
            console.error('Error disconnecting n8n:', error);
            Toast('Failed to disconnect from n8n. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isValidUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[600px] max-w-[calc(100%-30px)] py-7 border-none">
                <DialogHeader className="px-[30px] pb-5 border-b">
                    <div className="flex items-center gap-3">
                        <NeightNIcon className="size-6" />
                        <div>
                            <DialogTitle className="font-bold text-font-20">Configure n8n</DialogTitle>
                            <DialogDescription className="!text-b6 text-font-14">
                                Connect your n8n instance to build and manage workflows.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-5 md:px-10 py-5">
                    {!isConnected ? (
                        <div className="space-y-4">
                            <div className="bg-b2/10 p-4 rounded-lg">
                                <h3 className="font-semibold text-font-16 mb-2">Connect to n8n</h3>
                                <p className="text-b6 text-font-14 mb-4">
                                    Connect your n8n instance to enable workflow automation and management operations.
                                </p>
                                
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <Label title="API Key" />
                                        <input
                                            type="password"
                                            className="default-form-input"
                                            placeholder="Enter your n8n API key"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                        />
                                        <p className="text-xs text-b6 mt-1">
                                            You can find your API key in n8n Settings → API. For self-hosted instances, generate an API key from your instance.
                                        </p>
                                    </div>

                                    <div>
                                        
                                        <Label title="API Base URL" />
                                        <input
                                            type="text"
                                            className="default-form-input"
                                            placeholder="https://api.n8n.io/v1"
                                            value={apiBaseUrl}
                                            onChange={(e) => setApiBaseUrl(e.target.value)}
                                        />
                                        <ValidationError errors={[{message: 'Please enter a valid API base URL (e.g., https://api.n8n.io/v1 or https://your-instance.com/api/v1)'}]} field={'apiBaseUrl'} />
                                        <p className="text-xs text-b6 mt-1">
                                            For self-hosted instances, enter your instance URL (e.g., https://your-instance.com/api/v1)
                                        </p>
                                    </div>
                                </div>
                                
                                <button
                                    className="btn btn-black w-full"
                                    onClick={handleConnect}
                                    disabled={loading || !apiKey.trim() || !apiBaseUrl.trim()}
                                >
                                    {loading ? 'Connecting...' : 'Connect to n8n'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Connection Status */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="font-semibold text-green-800">Connected to n8n</span>
                                </div>
                                {connectionData && (
                                    <div className="text-sm text-green-700">
                                        <p>Connected on {new Date(connectionData.connectedAt).toLocaleDateString()}</p>
                                        {connectionData.api_base_url && (
                                            <p className="text-xs mt-1">API Base URL: {connectionData.api_base_url}</p>
                                        )}
                                        <p className="text-xs mt-1">n8n integration is active and ready for operations</p>
                                    </div>
                                )}
                            </div>

                            {/* Disconnect Button */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-font-16 mb-3 text-red-600">Danger Zone</h3>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <p className="text-red-700 text-sm mb-3">
                                        Disconnecting will remove all n8n integrations and stop all n8n MCP related operations.
                                    </p>
                                    <button
                                        className="btn btn-outline-red"
                                        onClick={handleDisconnect}
                                        disabled={loading}
                                    >
                                        {loading ? 'Disconnecting...' : 'Disconnect n8n'}
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
                serviceName="n8n"
                serviceIcon={<NeightNIcon className="size-6" />}
                description="Are you sure you want to disconnect from n8n? This will remove all n8n integrations and stop all n8n MCP related operations."
                loading={loading}
            />
        </Dialog>
    );
};

export default N8nConfigModal;

