'use client';

import type { Column } from '@tanstack/react-table';
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronsUpDown } from 'lucide-react';

import { Dropdown } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface DataTableSortHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  lowLabel?: string;
  highLabel?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DataTableSortHeader = <TData, TValue>({
  className,
  column,
  lowLabel,
  highLabel,
  children,
}: DataTableSortHeaderProps<TData, TValue>) => {
  if (!column.getCanSort()) {
    return children;
  }

  const Icon =
    column.getIsSorted() === 'asc'
      ? ArrowUpWideNarrow
      : column.getIsSorted() === 'desc'
        ? ArrowDownWideNarrow
        : ChevronsUpDown;

  const low = (lowLabel || 'Low').toLowerCase();
  const high = (highLabel || 'High').toLowerCase();

  return (
    <div className={className}>
      <Dropdown.Root>
        <Dropdown.Trigger className="-mx-1 -my-0.5 flex items-center justify-start gap-1 rounded px-1 py-0.5 transition-colors hover:bg-gray-4 focus:outline-none focus-visible:bg-gray-5 focus-visible:ring-2 focus-visible:ring-blue-9 data-[state=open]:bg-gray-5">
          {children}
          <Icon className="size-3 text-gray-11" />
        </Dropdown.Trigger>
        <Dropdown.Content className="[&_[dropdown-item-content]]:mr-1.5" align="start">
          <Dropdown.Item onClick={() => column.toggleSorting(false)} icon={<ArrowUpWideNarrow />}>
            {low.charAt(0).toUpperCase()}
            {low.slice(1)} to {high.length > 1 ? high : highLabel}
          </Dropdown.Item>
          <Dropdown.Item onClick={() => column.toggleSorting(true)} icon={<ArrowDownWideNarrow />}>
            {high.charAt(0).toUpperCase()}
            {high.slice(1)} to {low.length > 1 ? low : lowLabel}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
};

export default DataTableSortHeader;
