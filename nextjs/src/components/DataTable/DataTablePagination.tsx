import React from 'react';

export default function DataTablePagination({ table, pagination }:any) {

  // Function to generate pagination buttons with ellipsis
  const generatePaginationButtons = () => {
    const pageCount = table.getPageCount();
    const currentPage = pagination.pageIndex + 1;

    // Always show first two pages, last two pages, and ellipsis if needed
    let pages = [];
    if (pageCount <= 4) {
      pages = Array.from(Array(pageCount).keys()).map(i => i + 1);
    } else {
      if (currentPage <= 2) {
        pages = [1, 2, 3, '...', pageCount];
      } else if (currentPage >= pageCount - 1) {
        pages = [1, '...', pageCount - 2, pageCount - 1, pageCount];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', pageCount];
      }
    }

    return pages;
  };

  return (
      table?.getRowCount() > 0 && (
          <div className="flex items-center justify-between mt-5">
              <div className="ml-auto flex items-center justify-center gap-[5px]">
                  <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="text-font-14 text-b2 font-normal pe-2 disabled:opacity-50"
                  >
                      Prev
                  </button>
                  {generatePaginationButtons().map((page, index) => (
                      <button
                          key={index}
                          onClick={() => {
                              if (typeof page === 'number') {
                                  table.setPageIndex(page - 1); // table.setPageIndex() expects zero-based index
                              }
                          }}
                          className={`size-7 flex items-center justify-center text-font-14 font-normal bg-b12 rounded-custom ${
                              pagination.pageIndex + 1 === page
                                  ? 'bg-b2 text-white'
                                  : 'text-b2'
                          }`}
                          disabled={page === '...'}
                      >
                          {page}
                      </button>
                  ))}
                  <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="text-font-14 text-b2 font-normal ps-2 disabled:opacity-50"
                  >
                      Next
                  </button>
              </div>
          </div>
      )
  );
  
}
