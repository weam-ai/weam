'use client';
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import commonApi from '@/api';
import { useSearchParams } from 'next/navigation';
import { retrieveBrainData } from '@/utils/helper';

interface Agent {
    _id: string;
    title: string;
    type: string;
}

interface AgentSelectorProps {
    selectedAgents: string[];
    onSelectionChange: (selectedIds: string[]) => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({
    selectedAgents,
    onSelectionChange
}) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);
    const b = useSearchParams().get('b');

    useEffect(() => {
        fetchAgents();
    }, [b]);
    const braindata = retrieveBrainData();

    const fetchAgents = async () => {
        try {
            if (!b) {
                console.log('No brain ID provided');
                setAgents([]);
                return;
            }
            
            setLoading(true);
            
            const response = await commonApi({
                action: 'agents',
                parameters: [braindata._id]
            });
            
            if (response && response.data) {
                setAgents(response.data);
            } else {
                setAgents([]);
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
            setAgents([]);
        } finally {
            setLoading(false);
        }
    };

    const options = agents.map(agent => ({
        value: agent._id,
        label: agent.title
    }));

    const selectedOptions = options.filter(option => 
        selectedAgents.includes(option.value)
    );

    const handleChange = (selectedOptions: any) => {
        const selectedIds = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
        onSelectionChange(selectedIds);
    };

    return (
        <div>
            <Select
                isMulti
                options={options}
                value={selectedOptions}
                onChange={handleChange}
                isLoading={loading}
                placeholder="Select agents..."
                className="react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => loading ? "Loading..." : "No agents available"}
            />
        </div>
    );
};

export default AgentSelector;