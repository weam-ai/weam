'use client';
import React, { useState, useEffect } from "react";
import DataTableSearch from '@/components/DataTable/DataTableSearch';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRangePicker, defaultStaticRanges } from 'react-date-range';
import { format } from 'date-fns';
import Select from 'react-select';
import { getCurrentUser } from "@/utils/handleAuth";
import WeeklyUsage from "@/components/Dashboard/WeeklyUsage";
import PageNotFound from "@/components/Shared/PageNotFound";
import { isWeamAdminOrManager } from "@/utils/permission";
import ExportIcon from "@/icons/ExportIcon";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from "next/link";

export default function DashboardReport() {
    const [dateRange, setDateRange] = useState({
        startDate: new Date(),
        endDate: new Date(),
        key: 'selection',
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isStartDateSelected, setIsStartDateSelected] = useState(false);
    const [selectPlanCode, setSelectPlanCode] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const exportOptions = [
        { value: 'thismonth', label: 'This Month' },
        { value: 'lastmonth', label: 'Last Month' },
        { value: 'lasttwomonth', label: 'Last 2 Months' },
        { value: 'lastthreemonth', label: 'Last 3 Months' },
        { value: 'lastfourmonth', label: 'Last 4 Months' },
        { value: 'lastfivemonth', label: 'Last 5 Months' },
        { value: 'lastsixmonth', label: 'Last 6 Months' },
        { value: 'lastsevenmonth', label: 'Last 7 Months' },
        { value: 'lasteightmonth', label: 'Last 8 Months' },
        { value: 'lastninemonth', label: 'Last 9 Months' },
        { value: 'lasttenmonth', label: 'Last 10 Months' },
        { value: 'lastelevenmonth', label: 'Last 11 Months' },
        { value: 'lasttwelvemonth', label: 'Last 12 Months' },
    ];
    const planOptions = [
        {value: '', label: 'Free & Paid'},
        {value: 'free', label: 'Free'},
        {value: 'paid', label: 'Paid'}
    ];
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    // If you need selected export code in your WeeklyUsage or for button visuals:
    const [selectedExportLabel, setSelectedExportLabel] = useState('');

    const user = getCurrentUser();
    const startDatelbl = 'Start Date';
    const endDatelbl = 'End Date';

    const handleSelect = (ranges) => {
        const { startDate, endDate } = ranges.selection;
        setDateRange(ranges.selection);
        // Check if a predefined range was selected
        const selectedRange = defaultStaticRanges.find(range =>
            range.range().startDate.getTime() === ranges.selection.startDate.getTime() &&
            range.range().endDate.getTime() === ranges.selection.endDate.getTime()
        );
        if (!isStartDateSelected) {
            setIsStartDateSelected(true);
        }
        if (isStartDateSelected && startDate && endDate) {
            setShowDatePicker(false);
            setIsStartDateSelected(false); // Reset the state for next use
        }
        if (selectedRange)
            setShowDatePicker(false);
    };

    const handleClickOutside = (event) => {
        if (!event.target.closest(".date-picker-container")) {
            setShowDatePicker(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formattedStartDate = (dateRange?.startDate !== null) ? format(dateRange?.startDate, "MM/dd/yyyy") : startDatelbl;
    const formattedEndDate = (dateRange?.endDate !== null) ? format(dateRange?.endDate, "MM/dd/yyyy") : endDatelbl;

    const handleFilterChange = (e) => {
        const value = e.target.value.trim() || '';
        setSearchValue(value);
    };

    const clearAll = () => {
        setSearchValue('');
        setPagination({
            pageIndex: 0,
            pageSize: 10,
        });
        setSelectedExportLabel('');
        setSelectPlanCode('');
        setDateRange({
            startDate: new Date(),
            endDate: new Date(),
            key: 'selection',
        });
    };

    const handleExport = (option) => {
        setSelectedExportLabel(option.value);
    };

    return (
        isWeamAdminOrManager(user) ?
        <>
            <div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
            <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
                <div className="h-full overflow-y-auto w-full relative">
                    <div className="mx-auto max-w-[950px] xl:max-w-[1200px]">
                        <h5 className="text-font-18 font-bold text-b2 mb-1">
                            Companies Weekly Usage Report
                        </h5>
                        <p className="text-font-15 font-normal text-b5 mb-2 flex md:items-center justify-between max-md:flex-col">
                            Weekly usage report by companies
                            <Link href="/settings/reports" className="text-font-14 underline hover:text-b5 text-b2 mb-2">
                                Back to Usage Report
                            </Link>
                        </p>
                        <div className='hidden md:flex my-3 items-center'>
                            <DataTableSearch
                                placeholder="Search Company"
                                handleFilterChange={handleFilterChange}
                                value={searchValue}
                                width='max-w-[300px]'
                            />

                            <div className='ml-auto flex items-center gap-2'>
                                <div className="relative date-picker-container">
                                    <button
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className="border border-gray-300 px-4 py-2 h-10 text-font-14 rounded-md shadow-sm bg-white"
                                    >
                                        {formattedStartDate} - {formattedEndDate}
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
                                <div>
                                    <Select
                                        placeholder="Plan Type"
                                        options={planOptions}
                                        menuPlacement='auto'
                                        id="selectPlan"
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        onChange={(selectedOptions) => {
                                            setSelectPlanCode(selectedOptions.value);
                                            setSelectedExportLabel('');
                                            setPagination({
                                                pageIndex: 0,
                                                pageSize: 10,
                                            });
                                        }}
                                        value={planOptions.find(option => option.value === selectPlanCode)}
                                    />
                                </div>
                                <div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            className={`md:text-font-18 text-font-16 leading-[1.3] font-bold text-b2 flex items-center transition duration-150 ease-in-out focus:outline-none focus:ring-0 motion-reduce:transition-none`}
                                        >
                                            <button className="btn btn-outline-gray flex items-center font-medium border-[#bfbfbf]">
                                                <ExportIcon className="w-4 h-4 fill-b5 mr-1" />
                                                Export
                                                {selectedExportLabel && (
                                                    <span className="ml-2 text-b5 font-normal">({selectedExportLabel})</span>
                                                )}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="min-w-[180px]">
                                            {/* Map export options here */}
                                            {exportOptions.map((option) => (
                                                <DropdownMenuItem
                                                    key={option.value}
                                                    onSelect={() => handleExport(option)}
                                                >
                                                    {option.label}
                                                </DropdownMenuItem>
                                            ))}
                                            
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <button
                                    onClick={clearAll}
                                    className="btn btn-black"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        {
                            <WeeklyUsage 
                                searchValue={searchValue}
                                pagination={pagination}
                                setPagination={setPagination}
                                exportCode={selectedExportLabel}
                                setSelectExportCode={setSelectedExportLabel}
                                startDate={formattedStartDate == startDatelbl ? '' : formattedStartDate} 
                                endDate={formattedEndDate == endDatelbl ? '' : formattedEndDate}
                                planCode={selectPlanCode}
                            />
                        }
                    </div>
                </div>
            </div>
        </>
        :
        <>
            <PageNotFound />
        </>
    );
}