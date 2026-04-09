'use client';

import TrialsDataTableDesktop from './desktop';
import TrialsDataTableMobile from './mobile';
import type { TrialsDataTableValue } from './types';
import { getCoreRowModel, getExpandedRowModel, type TableOptions } from '@tanstack/react-table';

export type TrialsDataTableProps = {
  data: TrialsDataTableValue[];
};

export type TrialsDataTableInternalProps = Omit<TableOptions<TrialsDataTableValue>, 'columns'>;

const TrialsDataTable: React.FC<TrialsDataTableProps> = ({ data }) => {
  const tableOptions: TrialsDataTableInternalProps = {
    data,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  };

  return (
    <div className="flex w-full flex-col">
      <TrialsDataTableDesktop {...tableOptions} />
      <TrialsDataTableMobile {...tableOptions} />
    </div>
  );
};

export default TrialsDataTable;
