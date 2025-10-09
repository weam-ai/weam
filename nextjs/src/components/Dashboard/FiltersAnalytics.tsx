'use client';
import React, { useState, useEffect } from 'react';
import SearchIcon from '@/icons/Search';
import FilterIcon from '@/icons/FilterIcon';
import { DateRangePicker, defaultStaticRanges } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import Select from 'react-select';
import useReport from '@/hooks/reports/useReport';
import useWorkspaceList from '@/hooks/workspace/useWorkspaceList';
import { bytesToMegabytes, capitalizeFirstLetter } from '@/utils/common';
import ThreeDotLoader from '../Loader/ThreeDotLoader';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  change,
  changeType = 'positive',
  icon
}) => {
  return (
    <div className={`rounded-md p-5 border`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-font-18 font-bold text-b2">{value}</span>
            {change && (
              <span className={`text-font-14 font-medium ${
                changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {change}
              </span>
            )}
          </div>
          <h3 className="text-font-14 text-b7 mt-1">{title}</h3>
          <p className="text-font-12 text-b2">{description}</p>
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

const FiltersAnalytics: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [workspace, setWorkspace] = useState('All workspaces');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [aiModel, setAiModel] = useState('All models');
  const [isMounted, setIsMounted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
    key: 'selection',
  });
  const [isFiltering, setIsFiltering] = useState(false);

  // Use the report hook
  const { loading, reportData, error, getAiAdoption } = useReport();
  
  // Use the workspace list hook
  const { workspaceList, getList, loading: workspaceLoading } = useWorkspaceList();

  useEffect(() => {
    setIsMounted(true);
    getList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".date-picker-container")) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch data when component mounts or filters change
  useEffect(() => {
    if (isMounted) {
      fetchReportData();
    }
  }, [isMounted, workspace, selectedWorkspaceId, aiModel, searchValue, dateRange]); // Added filter dependencies

  const fetchReportData = async () => {
    try {
      const startDate = dateRange?.startDate ? format(dateRange.startDate, "yyyy-MM-dd") : undefined;
      const endDate = dateRange?.endDate ? format(dateRange.endDate, "yyyy-MM-dd") : undefined;
      
      const filters = {
        workspaceId: selectedWorkspaceId || undefined,
        aiModel: aiModel !== 'All models' ? aiModel : undefined,
        search: searchValue || undefined
      };

      await getAiAdoption(startDate, endDate, filters);
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  if (!isMounted) {
    return null;
  }

  const handleSelect = (ranges) => {
    const { startDate, endDate } = ranges.selection;
    setDateRange(ranges.selection);
    
    // Check if a predefined range was selected
    const selectedRange = defaultStaticRanges.find(range =>
      range.range().startDate.getTime() === ranges.selection.startDate.getTime() &&
      range.range().endDate.getTime() === ranges.selection.endDate.getTime()
    );
    
    if (selectedRange) {
      setShowDatePicker(false);
    }
    
    // Remove immediate API call - let useEffect handle it
  };



  const formattedStartDate = (dateRange?.startDate !== null) ? format(dateRange?.startDate, "MM/dd/yyyy") : 'Start Date';
  const formattedEndDate = (dateRange?.endDate !== null) ? format(dateRange?.endDate, "MM/dd/yyyy") : 'End Date';

  // Clear all filters function
  const clearAllFilters = () => {
    setDateRange({
      startDate: null,
      endDate: null,
      key: 'selection',
    });
    setWorkspace('All workspaces');
    setSelectedWorkspaceId(null);
    setSearchValue('');
    setAiModel('All models');
    
    // Remove duplicate API call - let useEffect handle it
  };

  // Get data from API response or use default values
  const getMetricValue = (key: string, defaultValue: string | number) => {
    return reportData?.[key] || defaultValue;
  };

  // Create dynamic workspace options from API data
  const workspaceOptions = [
    'All workspaces',
    ...(workspaceList?.map(workspace => workspace.title) || [])
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full max-w-none">
      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-2 mb-8">
        {/* Search Members */}
        
        {/* Date Range */}
        <div className="relative date-picker-container w-full md:w-auto md:min-w-[200px]">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-b6 focus:border-b2 sm:text-sm text-left"
          >
            <div className="flex items-center justify-between">
              <span>{formattedStartDate} - {formattedEndDate}</span>
              {isFiltering && (
                <div className="w-4 h-4 border-2 border-b10 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </button>

          {/* Popover Date Picker */}
          {showDatePicker && (
            <div className="absolute z-10 mt-2 shadow-lg bg-white p-2 rounded-md">
              <DateRangePicker
                ranges={[dateRange]}
                onChange={handleSelect}
                staticRanges={defaultStaticRanges}
                inputRanges={[]}
                placeholder="Select Date"
              />
            </div>
          )}
        </div>

        {/* Workspace */}
        <div className="w-full md:w-auto md:min-w-[180px]">
          <Select
            options={workspaceOptions.map(option => ({ value: option, label: option }))}
            value={{ value: workspace, label: workspace }}
            onChange={(selectedOption) => {
              const selectedValue = selectedOption?.value || 'All workspaces';
              setWorkspace(selectedValue);
              
              if (selectedValue === 'All workspaces') {
                setSelectedWorkspaceId(null);
              } else {
                const selectedWorkspace = workspaceList.find(ws => ws.title === selectedValue);
                setSelectedWorkspaceId(selectedWorkspace?._id || null);
              }
              // Remove the setTimeout API call - let useEffect handle it
            }}
            isLoading={workspaceLoading}
            placeholder="Select Workspace"
            menuPlacement='auto'
            id="selectWorkspace"
            className="react-select-container"
            classNamePrefix="react-select"
          />
        </div>

        {/* Clear Button */}
        <div className="flex items-center w-full md:w-auto">
          <button
            onClick={clearAllFilters}
            className="btn btn-black"
          >
            Clear
          </button>
        </div>
        
      </div>

        {/* Loading State */}
        {loading && (
          <ThreeDotLoader />
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
            <div className="flex">
              <div className="text-red-800">
                <strong>Error:</strong> Failed to load report data. Please try again.
              </div>
            </div>
          </div>
        )}

        {/* Data State - Only show when not loading and no error */}
        {!loading && !error && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Active Users */}
              <MetricCard
                title="Users"
                value={getMetricValue('users', '0')}
                description="Active users in the system"
                changeType="positive"
              /> 

              {/* Active Prompts */}
              <MetricCard
                title="Prompts"
                value={getMetricValue('prompts', '0')}
                description="Total prompts created"
                changeType="positive"
              />         

              {/* Active Agents */}
              <MetricCard
                title="Agents"
                value={getMetricValue('agents', '0')}
                description="AI agents available"
                changeType="positive"
              />

              {/* Total Chats */}
              <MetricCard
                title="Chats"
                value={getMetricValue('chats', '0')}
                description="Total chat conversations"
                changeType="positive"
              />

              {/* Total Messages */}
              <MetricCard
                title="Messages"
                value={getMetricValue('messages', '0')}
                description="Total messages exchanged"
                changeType="positive"
              />

              {/* Storage Used */}
              <MetricCard
                title="Storage Used"
                value={bytesToMegabytes(getMetricValue('storageUsed', '0')) + ' mb'}
                description="Storage space utilized"
                changeType="positive"
              />
            </div>

            {/* Second Row of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Total Brains */}
              <MetricCard
                title="Brains"
                value={getMetricValue('brains', '0')}
                description="Total knowledge bases"
                changeType="positive"
              />

              {/* Public Brains */}
              <MetricCard
                title="Public Brains"
                value={getMetricValue('publicBrains', '0')}
                description="Public knowledge bases"
              />

              {/* Private Brains */}
              <MetricCard
                title="Private Brains"
                value={getMetricValue('privateBrains', '0')}
                description="Private knowledge bases"
              />

              {/* Most Used Model */}
              <MetricCard
                title={"Most Used " + capitalizeFirstLetter(getMetricValue('mostUsedModelName', 'NA'))}
                value={getMetricValue('mostUsedModelCount', '0')}
                description="Most popular AI model"
              />          
            </div>
          </>
        )}
    </div>
  );
};

export default FiltersAnalytics; 