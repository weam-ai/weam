'use client'

import React, { useRef , useState, useEffect } from 'react'
import Datatable from '@/components/DataTable/DataTable'
import DataTableSearch from '@/components/DataTable/DataTableSearch'
import DataTablePageSizeSelector from '@/components/DataTable/DataTablePageSizeSelector'
import DataTablePagination from '@/components/DataTable/DataTablePagination'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table'
import CommonInput from '@/widgets/CommonInput'
import useCreditAllocation from '@/hooks/credit/useCreditAllocation'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

export default function CreditAllocation() {
  const [columnFilters, setColumnFilters] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [bulkCredits, setBulkCredits] = useState('')
  const [filterInput, setFilterInput] = useState('')

  const {
    users,
    loading,
    totalPages,
    getUsersForCreditAllocation,
    updateUserCredits
  } = useCreditAllocation()

  const [userAllocatedCredits, setUserAllocatedCredits] = useState<{ [_id: string]: number }>({})

  useEffect(() => {
    const initialCredits = Object.fromEntries(users.map(u => [u._id, 0]))
    setUserAllocatedCredits(initialCredits)
  }, [users])

  useEffect(() => {
    getUsersForCreditAllocation('', pagination.pageSize, pagination.pageIndex * pagination.pageSize)
  }, [pagination.pageIndex, pagination.pageSize])

  const [lastEditedUserId, setLastEditedUserId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});


 useEffect(() => {
  if (lastEditedUserId) {
    const inputToFocus = inputRefs.current[lastEditedUserId];
    if (inputToFocus) {
      inputToFocus.focus();
    }
  }
}, [userAllocatedCredits, lastEditedUserId]);

const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});

  // Table columns
  const columns = [
    {
      header: () => (
        <CommonInput
          type="checkbox"
          onChange={(e) => setSelectedUserIds(e.target.checked ? users.map(u => u._id) : [])}
          checked={selectedUserIds.length === users.length && users.length > 0}
          className="w-4 h-4"
        />
      ),
      accessorKey: 'select',
      enableSorting: false,
      cell: ({ row }: any) => (
        <CommonInput
          type="checkbox"
          checked={selectedUserIds.includes(row.original._id)}
          onChange={e => {
            setSelectedUserIds(e.target.checked
              ? [...selectedUserIds, row.original._id]
              : selectedUserIds.filter(id => id !== row.original._id)
            )
          }}
          className="w-4 h-4"
        />
      ),
    },
    {
      header: 'User',
      accessorKey: 'name',
      accessorFn: (row) => `${row.name} ${row.email}`,
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-font-12 text-b7">{row.original.email}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: ({ row }: any) => (
        <div>
          <div className="text-font-12 bg-b12 px-2 py-1 rounded-md border text-center">{row.original.role}</div>
        </div>
      ),
    },
    {
      header: 'Total Credits',
      accessorKey: 'totalCredits',
      cell: ({ row }: any) => (
        <div>
          <div className="text-center">{row.original.totalCredits}</div>
        </div>
      ),
    },
    {
      header: 'Used Credits',
      accessorKey: 'usedCredits',
      cell: ({ row }: any) => (
        <div>
          <div className="text-center">{row.original.usedCredits}</div>
        </div>
      ),
    },
    {
      header: 'Left Credits',
      accessorKey: 'leftCredits',
      cell: ({ row }: any) => (
        <div className="flex flex-col items-center gap-2">
          <div className="text-center">{row.original.leftCredits}</div>
          {row.original.leftCredits <= 100 && (
            <Badge variant="destructive" className="text-xs bg-red text-white">
              Low
            </Badge>
          )}
        </div>
      ),
    },
   {
  header: 'Allocated Credits',
  accessorKey: 'allocatedCredits',
  enableSorting: false,
  cell: ({ row }: any) => {
    const userId = row.original._id;
    const original = 0;
    const current = userAllocatedCredits[userId] ?? original;
    const isDirty = current !== original;
    const difference = current - original;

    return (
      <div className='flex items-center justify-center'>
        <CommonInput
          ref={(element: HTMLInputElement) => {
            if (element) {
              inputRefs.current[userId] = element;
            } else {
              delete inputRefs.current[userId];
            }
          }}
          type="number"
          className="px-3 py-2 border border-b10 mx-2 rounded-md w-16"
          value={current}
          min={-row.original.totalCredits}
          onChange={e => {
            const value = Number(e.target.value);
            const validatedValue = Math.max(-row.original.totalCredits, value);
            
            setUserAllocatedCredits(prev => ({
              ...prev,
              [userId]: validatedValue,
            }));
            setLastEditedUserId(userId);
          }}
        />
        {isDirty && (
          <button
            className={`text-font-14 px-3 py-1.5 rounded-md text-white ${
              difference > 0 
                ? 'bg-green hover:bg-green-600' 
                : 'bg-red hover:bg-red-600'
            }`}
            onClick={async () => {
              try {
                await updateUserCredits([userId], difference);
                setLastEditedUserId(null);
              } catch (error) {
                setUserAllocatedCredits(prev => ({
                  ...prev,
                  [userId]: original,
                }));
              }
            }}
          >
            {difference > 0 ? '↗' : '↘'}
          </button>
        )}
      </div>
    );
  },
},
  ]

  // Table instance
  const table = useReactTable({
    data: users,
    columns,
    state: {
      pagination,
      columnFilters,
    },
    pageCount: totalPages,
    manualPagination: true,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
  })

  // Handlers
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || ''
    setFilterInput(value)
    setColumnFilters([
      { id: 'name', value: value.toLowerCase() }
    ])
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination((old) => ({ ...old, pageSize, pageIndex: 0 }))
  }

  const handleBulkAllocate = async () => {
    if (selectedUserIds.length === 0 || !bulkCredits || Number(bulkCredits) <= 0) return;
    
    try {
      await updateUserCredits(selectedUserIds, Number(bulkCredits));
      setSelectedUserIds([]);
      setBulkCredits('');
    } catch (error) {
      console.error('Bulk allocation failed:', error);
    }
  }

             
  return (
    <div className='max-w-[100vw]'> 
      <div className='mb-4'>
        <div className='border p-4 bg-white rounded-md w-full mt-3 mb-3'>
          <h2 className='text-font-16 font-medium text-b2'>Bulk Credit Allocation</h2>
          <p className='text-font-12 text-b7'>Select multiple users and allocate credits to all of them at once</p>
          <div className='pt-3 mt-2 flex items-center max-md:flex-col gap-y-2'>
            <label className='font-medium text-font-14'>
              Credits per user: 
            </label>
            <CommonInput
              type="number"
              className="px-3 py-2 border border-b10 mx-2 rounded-md"
              value={bulkCredits}
              onChange={(e) => setBulkCredits(e.target.value)}
              placeholder="Credits per user"
              min={0}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="btn btn-black font-medium text-font-14"
                    onClick={handleBulkAllocate}
                    disabled={selectedUserIds.length === 0 || !bulkCredits || Number(bulkCredits) <= 0}
                  >
                    Allocate to Selected
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {selectedUserIds.length === 0 
                    ? "Please select users first" 
                    : !bulkCredits || Number(bulkCredits) <= 0 
                      ? "Please enter credits to allocate" 
                      : "Allocate credits to selected users"
                  }
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className='border p-4 bg-white rounded-md w-full max-w-[100vw]'>
          <div className='flex items-center justify-between max-md:flex-col max-md:items-start'>
            <div>
              <h2 className='text-font-16 font-medium text-b2'>User Credit Management</h2>
              <p className='text-font-12 text-b7'>Manage individual user credit allocations and view current balances</p>
            </div>
            <div className="text-sm text-b2 text-font-14">
              Selected: <span className='font-bold'>{selectedUserIds.length} users</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-5 mt-5">
            <DataTableSearch
              placeholder={'Search a User'}
              handleFilterChange={handleFilterChange}
              value={filterInput}
            />
            <div className="flex space-x-2">
              <DataTablePageSizeSelector
                pagination={pagination}
                handlePageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
          <div className='max-w-full overflow-x-auto'>
          <Datatable table={table} loading={loading} />
          <DataTablePagination
            table={table}
            pagination={pagination}
            handlePageSizeChange={handlePageSizeChange}
          />
          </div>
        </div>
        
      </div>
      
    </div>
  )
}