'use client';
import { useState, useCallback } from 'react';
import SlackConfigModal from './SlackConfigModal';
import GoogleConfigModal from './GoogleConfigModal';
import GmailIcon from '@/icons/GmailIcon';
import GoogleDriveIcon from '@/icons/GoogleDriveIcon';
import GoogleCalendarIcon from '@/icons/GoogleCalendarIcon';
import GitHubConfigModal from './GitHubConfigModal';
import GitHubIcon from '@/icons/GitHubIcon';
import ZoomConfigModal from './ZoomConfigModal';
import ZoomIcon from '@/icons/ZoomIcon';
import MongoDBIcon from '@/icons/MongoDBIcon';
import MongoDBConfigModal from './MongoDBConfigModal';
import { formatToCodeFormat } from '@/utils/helper';
import MCPDisconnectDialog from '../Shared/MCPDisconnectDialog';
import { MCP_CODES } from './MCPAppList';
import SlackIcon from '@/icons/SlackIcon';
import { updateMcpDataAction } from '@/actions/user';

type ConnectedAppCardProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonText: string;
    buttonClassName?: string;
    onButtonClick?: (title: string) => void; // <-- Add this
    connected: boolean;
}

const McpNotFound = () => {
    return (
        <div className="md:min-h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center px-4 col-span-3">
            <h1 className="text-4xl font-bold mb-4">404 - MCP Not Found</h1>
            <p className="text-gray-600 mb-6">
                Sorry, the mcp you are looking for does not exist.
            </p>
        </div>
    );
};


const ConnectedAppSelection = ({ filteredApps, fromDialog = false, mcpData }) => {
    const [showConfigurationModal, setShowConfigurationModal] = useState({
        GITHUB: false,
        SLACK: false,
        GMAIL: false,
        NOTION: false,
        STRIPE: false,
        GOOGLE_DRIVE: false,
        GOOGLE_CALENDAR: false,
        ZAPIER: false,
        AIRTABLE: false,
        ASANA: false,
        MONGODB: false,
        CANVA: false,
        N8N: false,
        FIGMA: false,
        CALENDLY: false,
        ZOOM: false,
    });
    const [loading, setLoading] = useState(false);

    const isConnected = useCallback((title: string) => {
        const mcpCode = formatToCodeFormat(title);
        const connected = mcpData && mcpData[mcpCode] ? true: false;
        return connected;
    }, [mcpData]);

    const handleButtonClick = useCallback((title: string) => {
        const normalizedTitle = formatToCodeFormat(title);
        setShowConfigurationModal((prev: Record<string, boolean>) => Object.fromEntries(
            Object.keys(prev).map(key => [key, key === normalizedTitle])
        ));
        return normalizedTitle;
    }, [showConfigurationModal]);

    const handleCloseModal = useCallback((title: string) => {
        setShowConfigurationModal({...showConfigurationModal, [title]: false});
    }, [showConfigurationModal]);

    const handleDisconnect = useCallback(async(title: string) => {
        try {
            setLoading(true);
            await updateMcpDataAction({ [`mcpdata.${title}`]: '', isDeleted: true });
        } finally {
            handleCloseModal(title);
            setLoading(false);
        }
    }, [handleCloseModal]);

    return (
        <>
            <div className={`${fromDialog ? 'h-96 overflow-y-auto pb-10' : 'h-full overflow-y-auto pb-10'}`}>
                <div className={`${fromDialog ? 'lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 grid gap-4 mt-6' : '3xl:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 grid gap-4 mt-6'}`}>
                    {
                        filteredApps.length > 0 ?
                            filteredApps.map((app) => {
                                return (
                                    <ConnectedAppCard
                                        key={app.title}
                                        icon={app.icon}
                                        title={app.title}
                                        description={app.description}
                                        buttonText={app.buttonText}
                                        buttonClassName={app.buttonClassName}
                                        onButtonClick={handleButtonClick}
                                        connected={isConnected(app.title)}
                                    />
                                )
                            }) : <McpNotFound />
                    }

                </div>
            </div>
            {
                isConnected(MCP_CODES.SLACK) ? (
                    <MCPDisconnectDialog
                        open={showConfigurationModal.SLACK}
                        closeModal={() => handleCloseModal(MCP_CODES.SLACK)}
                        onDisconnect={() => handleDisconnect(MCP_CODES.SLACK)}
                        serviceName="Slack"
                        serviceIcon={<SlackIcon className="size-6" />}
                        description="Are you sure you want to disconnect Slack? This will remove all connections and stop all automation."
                        loading={loading}
                        buttonVisible={true}
                    />
                ) : showConfigurationModal.SLACK && (
                    <SlackConfigModal 
                        isOpen={showConfigurationModal.SLACK}
                        onClose={() => handleCloseModal(MCP_CODES.SLACK)}
                    />
                )
            }
            {
                isConnected(MCP_CODES.GMAIL) ? (
                    <MCPDisconnectDialog
                        open={showConfigurationModal.GMAIL}
                        closeModal={() => handleCloseModal(MCP_CODES.GMAIL)}
                        onDisconnect={() => handleDisconnect(MCP_CODES.GMAIL)}
                        serviceName="Gmail"
                        serviceIcon={<GmailIcon className="size-6" />}
                        loading={loading}
                    />
                ) : showConfigurationModal.GMAIL && (
                    <GoogleConfigModal 
                        isOpen={showConfigurationModal.GMAIL}
                        onClose={() => handleCloseModal(MCP_CODES.GMAIL)}
                        mcpIcon={<GmailIcon className="size-6" />}
                        title="Gmail"
                        description="Connect your Gmail account to enable Gmail integrations."
                    />
                )
            }
            {
                isConnected(MCP_CODES.GOOGLE_DRIVE) ? (
                    <MCPDisconnectDialog
                        open={showConfigurationModal.GOOGLE_DRIVE}
                        closeModal={() => handleCloseModal(MCP_CODES.GOOGLE_DRIVE)}
                        onDisconnect={() => handleDisconnect(MCP_CODES.GOOGLE_DRIVE)}
                        serviceName="Google Drive"
                        serviceIcon={<GoogleDriveIcon className="size-6" />}
                        loading={loading}
                    />
                ) : showConfigurationModal.GOOGLE_DRIVE && (
                    <GoogleConfigModal 
                        isOpen={showConfigurationModal.GOOGLE_DRIVE}
                        onClose={() => handleCloseModal(MCP_CODES.GOOGLE_DRIVE)}
                        mcpIcon={<GoogleDriveIcon className="size-6" />}
                        title="Google Drive"
                        description="Connect your Google Drive account to enable Google Drive integrations."
                    />
                )
            }
            {
                isConnected(MCP_CODES.GOOGLE_CALENDAR) ? (
                    <MCPDisconnectDialog
                        open={showConfigurationModal.GOOGLE_CALENDAR}
                        closeModal={() => handleCloseModal(MCP_CODES.GOOGLE_CALENDAR)}
                        onDisconnect={() => handleDisconnect(MCP_CODES.GOOGLE_CALENDAR)}
                        serviceName="Google Calendar"
                        serviceIcon={<GoogleCalendarIcon className="size-6" />}
                        loading={loading}
                    />
                ) : showConfigurationModal.GOOGLE_CALENDAR && (
                    <GoogleConfigModal 
                        isOpen={showConfigurationModal.GOOGLE_CALENDAR}
                        onClose={() => handleCloseModal(MCP_CODES.GOOGLE_CALENDAR)}
                        mcpIcon={<GoogleCalendarIcon className="size-6" />}
                        title="Google Calendar"
                        description="Connect your Google Calendar account to enable Google Calendar integrations."
                    />
                )
            }
            {
                isConnected(MCP_CODES.GITHUB) ? (
                    <MCPDisconnectDialog
                        open={showConfigurationModal.GITHUB}
                        closeModal={() => handleCloseModal(MCP_CODES.GITHUB)}
                        onDisconnect={() => handleDisconnect(MCP_CODES.GITHUB)}
                        serviceName="GitHub"
                        serviceIcon={<GitHubIcon className="size-6" />}
                        loading={loading}
                    />
                ) : showConfigurationModal.GITHUB && (
                    <GitHubConfigModal 
                        isOpen={showConfigurationModal.GITHUB}
                        onClose={() => handleCloseModal(MCP_CODES.GITHUB)}
                    />
                )
            }
            {
                isConnected(MCP_CODES.ZOOM) ? (
                    <MCPDisconnectDialog
                        open={showConfigurationModal.ZOOM}
                        closeModal={() => handleCloseModal(MCP_CODES.ZOOM)}
                        onDisconnect={() => handleDisconnect(MCP_CODES.ZOOM)}
                        serviceName="Zoom"
                        serviceIcon={<ZoomIcon className="size-6" />}
                        loading={loading}
                    />
                ) : showConfigurationModal.ZOOM && (
                    <ZoomConfigModal 
                        isOpen={showConfigurationModal.ZOOM}
                        onClose={() => handleCloseModal(MCP_CODES.ZOOM)}
                        mcpIcon={<ZoomIcon className="size-6" />}
                        title="Zoom"
                        description="Connect your Zoom account to enable Zoom integrations."
                    />
                )
            }

            {
                localStorage.getItem('mongodb_config') ? (
                    <MCPDisconnectDialog
                        open={showConfigurationModal.MONGODB}
                        closeModal={() => handleCloseModal(MCP_CODES.MONGODB)}
                        onDisconnect={() => {
                            localStorage.removeItem('mongodb_config');
                            handleCloseModal(MCP_CODES.MONGODB);
                            window.location.reload();
                        }}
                        serviceName="MongoDB"
                        serviceIcon={<MongoDBIcon className="size-6" />}
                        description="Are you sure you want to disconnect MongoDB? This will remove all database connections and stop all automation."
                        loading={loading}
                        buttonVisible={true}
                    />
                ) : showConfigurationModal.MONGODB && (
                    <MongoDBConfigModal 
                        isOpen={showConfigurationModal.MONGODB}
                        onClose={() => handleCloseModal(MCP_CODES.MONGODB)}
                        onConnect={() => {
                            handleCloseModal(MCP_CODES.MONGODB);
                            window.location.reload();
                        }}
                        mcpData={mcpData}
                    />
                )
            }
        </>
    )
}

const ConnectedAppCard: React.FC<ConnectedAppCardProps> = ({
    icon,
    title,
    description,
    buttonText,
    buttonClassName = '',
    onButtonClick,
    connected
}) => {

    return (
        <div className='border rounded-lg p-5'>
            <div className='flex items-center gap-x-2'>
                <div className='border size-9 rounded-full p-2 flex items-center justify-center'>
                    {icon}
                </div>
                <h3 className='text-font-16'>{title}</h3>
                <button
                    className={`text-font-14 px-2 py-1 rounded-md ml-auto ${connected ? 'text-b6 bg-b12' : buttonClassName}`}
                    onClick={() => onButtonClick(title)}
                    type="button"
                >
                    {connected ? 'Disconnect' : buttonText}
                </button>
            </div>
            <p className='text-font-14 text-b6 mt-3'>{description}</p>
        </div>
    )
};

export default ConnectedAppSelection;