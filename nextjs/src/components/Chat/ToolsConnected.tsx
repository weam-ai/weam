'use client';
import React, { useState, useMemo } from 'react';
import ToolIcon from "@/icons/ToolIcon";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ConnectedAppMiniCard from '@/components/Mcp/ConnectedAppMiniCard';
import SlackIcon from '@/icons/SlackIcon';
import GitHubIcon from '@/icons/GitHubIcon';
import GoogleCalendarIcon from '@/icons/GoogleCalendarIcon';
import { Switch } from '@/components/ui/switch';
import BackArrowIcon from '@/icons/BackArrowIcon';
import MCP_OPTIONS, { MCP_CODES, MCP_TOOLS, MCP_OPTIONS_MAP } from '@/components/Mcp/MCPAppList';
import GoogleDriveIcon from '@/icons/GoogleDriveIcon';
import GmailIcon from '@/icons/GmailIcon';
import Link from 'next/link';
import routes from '@/utils/routes';
import { MCPDialogAppList } from '@/components/Mcp/MCPDialogAppList';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import AppIcon from '@/icons/AppsIcon';
import { toSentenceCaseFromSnakeCase } from '@/utils/helper';

interface ToolsConnectedProps {
    isWebSearchActive: boolean;
    toolStates: Record<string, string[]>;
    onToolStatesChange: (newToolStates: Record<string, string[]>) => void;
}

const ToolsConnected = ({ isWebSearchActive, toolStates, onToolStatesChange }: ToolsConnectedProps) => {
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
    const [showSecondStep, setShowSecondStep] = useState(false);
    const [selectedMCP, setSelectedMCP] = useState<string | null>(null);
    const [allToolsDisabled, setAllToolsDisabled] = useState(true);

    const mcpData = useSelector((state: RootState) => state.mcp.mcpdata);
    
    const handleMCPAction = (action: 'toggleSubmenu' | 'toggleTool' | 'toggleApp', mcpCode: string, tools: string[], toolName?: string, checked?: boolean) => {
        switch (action) {
            case 'toggleSubmenu':
                setOpenSubmenu(openSubmenu === mcpCode ? null : mcpCode);
                break;
            case 'toggleTool':
                if (toolName !== undefined && checked !== undefined) {
                    const currentTools = toolStates[mcpCode] || [];
                    const newToolStates = checked 
                        ? currentTools.includes(toolName) 
                            ? currentTools 
                            : [...currentTools, toolName]
                        : currentTools.filter(tool => tool !== toolName);
                    
                    onToolStatesChange({
                        ...toolStates,
                        [mcpCode]: newToolStates
                    });
                }
                break;
            case 'toggleApp':
                if (checked !== undefined) {
                    onToolStatesChange({
                        ...toolStates,
                        [mcpCode]: checked ? tools : []
                    });
                }
                break;
        }
    };

    // Handler for clicking a ConnectedAppMiniCard
    const handleCardClick = (mcpCode: string) => {
        setSelectedMCP(mcpCode);
        setShowSecondStep(true);
    };

    // Handler for clicking Back
    const handleBackClick = () => {
        setShowSecondStep(false);
        setSelectedMCP(null);
    };

    // Handler for toggling individual tools
    const handleToolToggle = (toolName: string, checked: boolean) => {
        if (selectedMCP) {
            const currentTools = toolStates[selectedMCP] || [];
            const newToolStates = checked 
                ? currentTools.includes(toolName) 
                    ? currentTools 
                    : [...currentTools, toolName]
                : currentTools.filter(tool => tool !== toolName);
            
            onToolStatesChange({
                ...toolStates,
                [selectedMCP]: newToolStates
            });
        }
    };

    // Handler for toggling all tools for selected MCP
    const handleAllToolsToggle = (checked: boolean) => {
        if (selectedMCP) {
            const tools = MCP_TOOLS[selectedMCP] || [];
            onToolStatesChange({
                ...toolStates,
                [selectedMCP]: checked ? tools : []
            });
            setAllToolsDisabled(!checked);
        }
    };

    const mcpConfigs = useMemo(() => {
        return Object.entries(mcpData).map(([mcpCode]) => {
            const mcpOption = MCP_OPTIONS_MAP.get(mcpCode);
            return {
                icon: mcpOption?.icon || '',
                mcpTitle: mcpOption?.title || '',
                mcpCode: mcpCode,
                tools: MCP_TOOLS[mcpCode] || []
            };
        });
    }, [mcpData]);

    // Get selected MCP config
    const selectedMCPConfig = useMemo(() => 
        mcpConfigs.find(config => config.mcpCode === selectedMCP), 
        [mcpConfigs, selectedMCP]
    );
    const selectedTools = selectedMCPConfig?.tools || [];
    const currentSelectedTools = toolStates[selectedMCP || ''] || [];

    return (
        <div>
            <Popover>
                <PopoverTrigger>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <div
                                    className={`chat-btn cursor-pointer transition ease-in-out duration-200 hover:bg-b11 rounded-md w-auto h-8 flex items-center px-[5px] ${
                                        isWebSearchActive
                                            ? 'opacity-50 pointer-events-none'
                                            : ''
                                    }`}
                                >
                                    <AppIcon 
                                        width={16}
                                        height={16}
                                        className="w-auto h-[15px] fill-b5"/>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-font-14">
                                    {isWebSearchActive
                                        ? 'This feature is unavailable in web search'
                                        : 'Select tools to connect'}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </PopoverTrigger>

                <PopoverContent
                    className="rounded-lg border py-1 px-2 w-[270px]"
                    side="bottom"
                    align="start"
                >
                    {!showSecondStep && (
                        <>
                            {mcpConfigs.map((config) => (
                                <React.Fragment key={config.mcpCode}>
                                    <div 
                                        onClick={() => handleCardClick(config.mcpCode)}
                                        className="cursor-pointer"
                                    >
                                        <ConnectedAppMiniCard
                                            {...config}
                                            isSubmenuOpen={
                                                openSubmenu === config.mcpCode
                                            }
                                            toolStates={toolStates}
                                            onAction={handleMCPAction}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
                            <div className="py-1">
                                <div className="flex items-center gap-x-2 cursor-pointer rounded-md pl-1">
                                    <div className="ml-2">
                                        <MCPDialogAppList dialogTriggerTitle="+ Add Connectors" />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3 px-3">
                                <Link
                                    href={routes.mcp}
                                    className="text-b2 underline text-font-15"
                                >
                                    View all Connections
                                </Link>
                            </div>
                        </>
                    )}

                    {showSecondStep && selectedMCPConfig && (
                        <div className="second-step p-2 max-h-[400px] overflow-y-auto">
                            <div
                                className="cursor-pointer mb-2 flex items-center gap-x-2 text-font-14 border-b pb-2 sticky top-0 bg-white z-10"
                                onClick={handleBackClick}
                            >
                                <BackArrowIcon className="w-1.5 h-auto fill-b5 inline-block" />
                                Back
                            </div>
                            
                            <div className="mb-3">
                                <div className="flex items-center gap-x-2 mb-2">
                                    {selectedMCPConfig.icon}
                                    <h3 className="text-font-14 font-medium">
                                        {selectedMCPConfig.mcpTitle} Tools
                                    </h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-x-2 cursor-pointer hover:bg-gray-100 rounded-md p-1.5 mb-2">
                                <p className="text-font-14">
                                    {currentSelectedTools.length === selectedTools.length
                                        ? 'Disable all tools'
                                        : 'Enable all tools'}
                                </p>
                                <div className="ml-auto">
                                    <Switch
                                        id="disable-enable"
                                        checked={currentSelectedTools.length === selectedTools.length}
                                        onCheckedChange={handleAllToolsToggle}
                                    />
                                </div>
                            </div>

                            {selectedTools.map((tool) => (
                                <div key={tool} className="flex items-center gap-x-2 cursor-pointer hover:bg-gray-100 rounded-md p-1.5">
                                    <p className="text-font-14">{toSentenceCaseFromSnakeCase(tool)}</p>
                                    <div className="ml-auto">
                                        <Switch 
                                            id={tool}
                                            checked={currentSelectedTools.includes(tool)}
                                            onCheckedChange={(checked) => handleToolToggle(tool, checked)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                   
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default ToolsConnected;

