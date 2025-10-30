import React, { useState, useEffect } from 'react';
import Datatable from '@/components/DataTable/DataTable';
import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
} from '@tanstack/react-table';
import useUsage from '@/hooks/usage/useUsage';
import DataTablePagination from '../DataTable/DataTablePagination';
import { modelNameConvert } from '@/utils/common';

const columns = [
	{
		accessorKey: 'model',
		header: 'Model',
		enableSorting: false,
		cell: ({ row }) => {
			return modelNameConvert(row?.original?.modeldata?.code, row?.original?.model);
		}
	},
	{
		accessorKey: 'msgCount',
		header: () => <div className="text-center w-full">Message</div>,
		sortDescFirst: true,
		cell: ({ row }) => (
			<div className="text-center w-full">{row.original.msgCount}</div>
		),
	},
	{
		accessorKey: 'totalUsedCredit',
		header: () => <div className="text-center w-full">Total Credit</div>,
		cell: ({ row }) => (
			<div className="text-center w-full">{row.original.totalUsedCredit}</div>
		),
	}	
];

const UserUsage = ({ startDate, endDate, model, isPaid, pagination, setPagination }) => {
	const { getUserUsage, userList, totalRecords, loading } = useUsage();
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
		getUserUsage(pagination.pageSize, 0, model, startDate, endDate, sortingColumn, isPaid);
	}, [model, startDate, endDate, isPaid]);	

	useEffect(() => {
		getUserUsage(pagination.pageSize, pagination.pageIndex * pagination.pageSize, model, startDate, endDate, sortingColumn, isPaid);
	}, [pagination, table.getState().sorting]);	

	const handlePageSizeChange = (pageSize) => {
		setPagination((old) => ({ ...old, pageSize }));
	};

	return (
		<>
			<Datatable table={table} loading={loading} />
			<DataTablePagination
				table={table}
				pagination={pagination}
				handlePageSizeChange={handlePageSizeChange}
			/>
		</>
	);
};

export default UserUsage;