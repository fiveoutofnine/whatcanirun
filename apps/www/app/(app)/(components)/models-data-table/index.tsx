'use client';

import ModelsDataTableDesktop from './desktop';
import ModelsDataTableMobile from './mobile';
import type { ModelStats } from './types';
import { getCoreRowModel, getExpandedRowModel, type TableOptions } from '@tanstack/react-table';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export type ModelsDataTableProps = {
  data: ModelStats[];
  //total: number;
};

export type ModelsDataTableInternalProps = Omit<TableOptions<ModelStats>, 'columns'> & {
  //total: number;
  isLoading: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelsDataTable: React.FC<ModelsDataTableProps> = ({ data }) => {
  const isLoading = false;

  const tableOptions: ModelsDataTableInternalProps = {
    data,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    // total: 0,
    isLoading,
  };

  return (
    <div className="flex w-full flex-col">
      <ModelsDataTableDesktop {...tableOptions} />
      <ModelsDataTableMobile {...tableOptions} />
    </div>
  );
};

export default ModelsDataTable;
