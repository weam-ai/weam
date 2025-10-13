
import React from 'react';
import { Table } from '@/components/ui/table';
import DatatableHeader from './DataTableHeader';
import DataTableBody from './DataTableBody';

export default function Datatable({ table,loading }:any) {
  return (
    <div className="rounded-md border">
      <Table>
        <DatatableHeader headerGroups={table.getHeaderGroups()} />
        <DataTableBody rows={table.getRowModel().rows} columns={table.getAllColumns()} loading={loading} />
      </Table>
    </div>
  );
}