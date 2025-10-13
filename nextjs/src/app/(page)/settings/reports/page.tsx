'use client';
import React, { useState, useEffect } from "react";
import DataTableSearch from '@/components/DataTable/DataTableSearch';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { Calendar } from 'react-date-range';
import { DateRangePicker, defaultStaticRanges } from 'react-date-range';
import MultiSelect from '@/components/ui/multi-select';
import { format } from 'date-fns';
import Link from 'next/link';

import CompanyUsage from "@/components/Dashboard/CompanyUsage";
import { getCurrentUser } from "@/utils/handleAuth";
import UserUsage from "@/components/Dashboard/UserUsage";
import { isCompanyAdminOrManager, isWeamAdminOrManager, PERMISSIONS } from "@/utils/permission";
import { modelNameConvert, showNameOrEmail } from "@/utils/common";
import useAssignModalList from "@/hooks/aiModal/useAssignModalList";
import { RootState } from "@/lib/store";
import { useSelector } from "react-redux";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FilterIcon from "@/icons/FilterIcon";
import FiltersAnalytics from "@/components/Dashboard/FiltersAnalytics";


export default function DashboardReport() {
    const [dateRange, setDateRange] = useState({
        startDate: null,
        endDate: null,
        key: 'selection',
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectModel, setSelectModel] = useState([]);
    const [searchValue, setSearchValue] = useState('');
    const [modelOptions, setModelOptions] = useState([]);
    const [isPaid, setIsPaid] = useState(true);
    const [isStartDateSelected, setIsStartDateSelected] = useState(false);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const user = getCurrentUser();
    const startDatelbl = 'Start Date';
    const endDatelbl = 'End Date';
    const { fetchSocketModalList } = useAssignModalList();
    const assignModelList = useSelector((state: RootState) => state.assignmodel.list);
    
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
        setDateRange(
            {
              startDate: null, 
              endDate: null,   
              key: 'selection',
            },
        );
        setIsPaid(true);
        setSearchValue('');
        setSelectModel([]);
        setPagination({
            pageIndex: 0,
            pageSize: 10,
        });
    }    

    useEffect(() => {
        fetchSocketModalList();
    }, []);

    useEffect(() => {
        const modelOptions = assignModelList.map((item) => ({
            value: item.name,
            label: modelNameConvert(item?.bot?.code, item.name) + ' (' + item?.bot?.code + ')',
        }));
        setModelOptions(modelOptions);
    }, [assignModelList]);
    
    return (
        <>
        <div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
            <div className="flex flex-col flex-1 relative h-full lg:pt-20 pb-2 px-5 overflow-y-auto ">
                <div className="h-full w-full relative">
                    <div className="mx-auto 3xl:max-w-[1450px]">
                        <h5 className="text-font-18 font-bold text-b2">
                            { 
                                isCompanyAdminOrManager(user)
                                ? 'AI Adoption Report of ' + user?.company?.name
                                : 'AI Adoption Report'
                            }                            
                        </h5>
                        <p className="text-font-15 font-normal text-b5 mb-2 flex md:items-center justify-between max-md:flex-col">
                            { 
                                isCompanyAdminOrManager(user)
                                    ? 'Detailed Report of company usage'
                                    : 'Detailed Report of usage ' + showNameOrEmail(user)
                            }                             
                            { isWeamAdminOrManager(user) &&
                                <Link href="/settings/weekly-report" className="text-font-14 underline hover:text-b2 text-b4 mb-2">
                                    Companies Weekly Usage Report
                                </Link>
                            }
                        </p>
                        {/* Filters & Analytics Component - Only for Company Admin/Manager */}
                        {isCompanyAdminOrManager(user) && <FiltersAnalytics />}
                        
                        <div className='hidden md:flex my-3 items-center'>
                            {
                                isCompanyAdminOrManager(user) && (
                                    <DataTableSearch
                                        placeholder="Search a Member"
                                        handleFilterChange={handleFilterChange}
                                        value={searchValue}
                                        width='max-w-[300px]'
                                    />
                                )
                            }

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
                                        <div className="absolute z-10 mt-2 right-0 shadow-lg bg-white p-2 rounded-md">
                                            <DateRangePicker
                                                ranges={[dateRange]}
                                                onChange={handleSelect}
                                                staticRanges={defaultStaticRanges}
                                                inputRanges={[]}
                                                placeholder="Select Date"
                                                color="#323232"
                                                rangeColors={['#323232']}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="max-w-40 md:min-w-[150px]">
                                    <MultiSelect
                                        options={modelOptions}
                                        value={selectModel}
                                        onChange={setSelectModel}
                                        placeholder="Select Model"
                                    />
                                </div>
                                <DropdownMenu>
                                    {/*<DropdownMenuTrigger asChild>
                                        <div className="relative cursor-pointer border h-10 w-9 flex items-center justify-center rounded-md bg-white border-gray-300">
                                            <FilterIcon width={18} height={18} className="h-5 w-auto fill-b6" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[210px] !rounded-[15px]">
                                        <div className="px-4 py-3 text-font-14 font-bold text-b2">
                                            Filter by plan type
                                        </div>
                                        <DropdownMenuItem
                                            onClick={() => setIsPaid(true)}
                                            className={`border-0 ${(isPaid === true) ? 'bg-gray-100 font-semibold' : ''}`}
                                        >
                                            Paid Plan
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setIsPaid(false)}
                                            className={`border-0 ${(isPaid === false) ? 'bg-gray-100 font-semibold' : ''}`}
                                        >
                                            Free Plan
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>*/}
                                </DropdownMenu>
                                <button
                                        onClick={clearAll}
                                        className="btn btn-black"
                                    >
                                        Clear
                                </button>
                                {/* <span
                                    className="inline-flex items-center cursor-pointer px-3 py-3 rounded-md btn btn-black"
                                >
                                    <ExportIcon width={18}
                                        height={18}
                                        className="w-[26px] h-[18px] object-contain fill-white mr-1" />
                                    <span className="text-sm font-semibold ">
                                        Export
                                    </span>
                                </span> */}
                            </div>
                        </div>
                        {
                            isCompanyAdminOrManager(user)
                                ? <CompanyUsage 
                                    startDate={formattedStartDate == startDatelbl ? '' : formattedStartDate} 
                                    endDate={formattedEndDate == endDatelbl ? '' : formattedEndDate} 
                                    model={selectModel} 
                                    searchValue={searchValue}
                                    isPaid={isPaid}
                                    pagination={pagination}
                                    setPagination={setPagination}
                                />
                            :   <UserUsage 
                                    startDate={formattedStartDate == startDatelbl ? '' : formattedStartDate} 
                                    endDate={formattedEndDate == endDatelbl ? '' : formattedEndDate} 
                                    model={selectModel}
                                    isPaid={isPaid}
                                    pagination={pagination}
                                    setPagination={setPagination}
                                />
                        }
                    </div>
                </div>
            </div>
        </>
    );
}