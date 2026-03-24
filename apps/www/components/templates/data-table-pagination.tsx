'use client';

import type { PaginationState } from '@tanstack/react-table';
import { ArrowLeft, ArrowRight, MoreHorizontal } from 'lucide-react';

import { ButtonGroup, IconButton } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type DataTablePaginationProps = {
  maxPageIndex: number;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  maxPageIndex,
  pagination,
  setPagination,
}) => {
  return (
    <div className="flex items-center justify-center px-1 pt-2">
      <ButtonGroup>
        <IconButton
          variant="outline"
          onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
          disabled={pagination.pageIndex === 0}
          aria-label="Navigate to the previous page in the table."
        >
          <ArrowLeft />
        </IconButton>
        {[
          { pageIndex: 0, hidden: false },
          { pageIndex: null, hidden: pagination.pageIndex < 2 },
          {
            pageIndex: pagination.pageIndex,
            hidden: pagination.pageIndex === 0 || pagination.pageIndex === maxPageIndex,
          },
          { pageIndex: null, hidden: pagination.pageIndex > maxPageIndex - 2 },
          { pageIndex: maxPageIndex, hidden: maxPageIndex < 1 },
        ]
          .filter(({ hidden }) => !hidden)
          .map(({ pageIndex }, i) =>
            pageIndex !== null ? (
              <IconButton
                key={i}
                className={
                  pagination.pageIndex === pageIndex
                    ? 'data-[variant=outline]:border-gray-8 data-[variant=outline]:bg-gray-5 data-[variant=outline]:text-gray-12 data-[variant=outline]:hover:bg-gray-5 data-[variant=outline]:active:bg-gray-5'
                    : ''
                }
                variant="outline"
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex }))}
              >
                {pageIndex + 1}
              </IconButton>
            ) : (
              <span
                key={i}
                className="flex size-8 items-center justify-center border border-gray-7 text-gray-11"
              >
                <MoreHorizontal className="size-4" />
              </span>
            ),
          )}
        <IconButton
          variant="outline"
          onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
          disabled={pagination.pageIndex === maxPageIndex}
          aria-label="Navigate to the next page in the table."
        >
          <ArrowRight />
        </IconButton>
      </ButtonGroup>
    </div>
  );
};

export default DataTablePagination;
