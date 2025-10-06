import React, { useEffect, useState } from 'react';
import Datatable from '@/components/DataTable/DataTable';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
} from '@tanstack/react-table';
import useUsage from '@/hooks/usage/useUsage';
import { bytesToMegabytes, displayName } from '@/utils/common';
import DataTablePagination from '../DataTable/DataTablePagination';
import { DEFAULT_SORT } from '@/utils/constant';

const columns = [
    {
      accessorKey: 'userName',
      header: 'User Name',
      cell: ({row}) => displayName(row?.original),
	  enableSorting: false
    },
    {
      accessorKey: 'email',
      header: 'Email Address',
	  enableSorting: false
    },
    {
      accessorKey: 'msgCount',
      header: () => <div className="text-center">Total Message</div>,
      sortDescFirst: true,
      cell: ({ row }) => (
        <div className="text-center w-full">{row.original.msgCount}</div>
      ),
    },        
    {
      accessorKey: 'totalUsedCredit',
      header: () => <div className="text-center">Total Credit</div>,
      cell: ({ row }) => (
          <div className="text-center w-full">{row.original.totalUsedCredit}</div>
      ),
  },
  {
      accessorKey: 'usedSize',
      header: () => <div className="text-center">Storage (MB)</div>,
      cell: ({ row }) => (
          <div className="text-center w-full">{bytesToMegabytes(row?.original?.usedSize)}</div>
      ),
  }   
];

const CompanyUsage = ({ startDate, endDate, model, searchValue, isPaid, pagination, setPagination }) => {
    const { getUsage, userList, totalRecords, loading } = useUsage();
    const [sorting, setSorting] = useState([]);
	const table = useReactTable({
        data: userList,
        columns,
        pageCount: Math.ceil(totalRecords / pagination.pageSize),
        state: {
            sorting,
            pagination,
        },
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
		manualSorting: true,
        onSortingChange: (newSorting) => {
          setSorting(newSorting);          
        },
        onPaginationChange: setPagination,
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const tableSortingClm = table.getState().sorting[0];
		const sortingColumn = tableSortingClm ? 
			{ [tableSortingClm.id]: tableSortingClm.desc ? -1 : 1 } 
			: {};

	useEffect(() => {
		getUsage(pagination.pageSize, pagination.pageIndex * pagination.pageSize, model, startDate, endDate, searchValue, sortingColumn, isPaid);
    }, [pagination, table.getState().sorting]);

    useEffect(() => {
        getUsage(pagination.pageSize, 0, model, startDate, endDate, searchValue, sortingColumn, isPaid);
    }, [model, startDate, endDate, isPaid]);

    const handlePageSizeChange = (pageSize) => {
    	setPagination((old) => ({ ...old, pageSize }));
    };

    useEffect(() => {
		const fetchData = () => {
            const tableSortingClm = table.getState().sorting[0];
            const sortingColumn = tableSortingClm ? 
                { [tableSortingClm.id]: tableSortingClm.desc ? -1 : 1 } 
                : {};
            const offset = searchValue.length > 0 ? 0 : pagination.pageIndex * pagination.pageSize
			getUsage(pagination.pageSize, offset, model, startDate, endDate, searchValue, sortingColumn, isPaid);          
		};
		const timer = setTimeout(fetchData, 1000);
		return () => clearTimeout(timer);
    }, [searchValue]);

    return (
        <div className='md:max-w-full max-w-[100vw] overflow-x-auto'>
          <div className='overflow-x-auto max-w-full'>
              <Datatable table={table} loading={loading} />
              <DataTablePagination
                  table={table}
                  pagination={pagination}
                  handlePageSizeChange={handlePageSizeChange}
              />
          </div>
        </div>
    );
};

export default CompanyUsage;