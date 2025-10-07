import React, { useState } from 'react';
import MCP_OPTIONS, { MCP_TOOLS, MCP_CODES } from '@/components/Mcp/MCPAppList';

interface MCPToolsSelectorProps {
    selectedTools: string[];
    onSelectionChange: (selectedTools: string[]) => void;
}

const MCPToolsSelector: React.FC<MCPToolsSelectorProps> = ({
    selectedTools,
    onSelectionChange,
}) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const toggleSection = (code: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(code)) {
            newExpanded.delete(code);
        } else {
            newExpanded.add(code);
        }
        setExpandedSections(newExpanded);
    };

    const handleToolToggle = (toolName: string) => {
        const newSelectedTools = selectedTools.includes(toolName)
            ? selectedTools.filter(tool => tool !== toolName)
            : [...selectedTools, toolName];
        onSelectionChange(newSelectedTools);
    };

    const handleMCPToggle = (mcpCode: string) => {
        const mcpTools = MCP_TOOLS[mcpCode] || [];
        const allSelected = mcpTools.every(tool => selectedTools.includes(tool));
        
        if (allSelected) {
            // Remove all tools from this MCP
            const newSelectedTools = selectedTools.filter(tool => !mcpTools.includes(tool));
            onSelectionChange(newSelectedTools);
        } else {
            // Add all tools from this MCP
            const newSelectedTools = Array.from(new Set([...selectedTools, ...mcpTools]));
            onSelectionChange(newSelectedTools);
        }
    };

    const isToolSelected = (toolName: string) => selectedTools.includes(toolName);
    
    const isMCPSelected = (mcpCode: string) => {
        const mcpTools = MCP_TOOLS[mcpCode] || [];
        return mcpTools.length > 0 && mcpTools.every(tool => selectedTools.includes(tool));
    };

    const isMCPPartiallySelected = (mcpCode: string) => {
        const mcpTools = MCP_TOOLS[mcpCode] || [];
        return mcpTools.some(tool => selectedTools.includes(tool)) && !isMCPSelected(mcpCode);
    };

    return (
        <div className="space-y-2">
            
            
            {MCP_OPTIONS.map((mcp) => {
                const mcpTools = MCP_TOOLS[mcp.code] || [];
                const isExpanded = expandedSections.has(mcp.code);
                const isSelected = isMCPSelected(mcp.code);
                const isPartiallySelected = isMCPPartiallySelected(mcp.code);

                return (
                    <div key={mcp.code} className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="bg-gray-50 p-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isPartiallySelected;
                                        }}
                                        onChange={() => handleMCPToggle(mcp.code)}
                                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <div className="flex items-center space-x-1">
                                        {mcp.icon}
                                        <span className="font-medium text-gray-900">{mcp.title}</span>
                                        <span className='text-font-12 ml-2 px-2 py-[2px] bg-b13 border rounded-full'>
                                            {mcpTools.length} tools
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleSection(mcp.code)}
                                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    <svg
                                        className={`h-4 w-4 transform transition-transform ${
                                            isExpanded ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-font-14 text-gray-600 mt-1">{mcp.description}</p>
                        </div>

                        {isExpanded && mcpTools.length > 0 && (
                            <div className="p-2 bg-white border-t border-gray-200">
                                <div className="grid grid-cols-1 gap-1">
                                    {mcpTools.map((tool) => (
                                        <label
                                            key={tool}
                                            className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isToolSelected(tool)}
                                                onChange={() => handleToolToggle(tool)}
                                                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="text-gray-700 font-mono text-font-12">
                                                {tool}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default MCPToolsSelector;