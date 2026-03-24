import type { PaginationState } from '@tanstack/react-table';
import { useQueryState } from 'nuqs';
import { createParser } from 'nuqs/server';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_PAGE_SIZE = 25;
const MIN_PAGE_SIZE = 1;

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

export const createPaginationParser = (totalRows: number) =>
  createParser({
    parse(value: string): PaginationState | null {
      if (!value) return null;

      const [parsedPageIndex, parsedPageSize] = value.split(',').map((val) => Number.parseInt(val));
      if (isNaN(parsedPageIndex) || isNaN(parsedPageSize)) return null;

      const pageSize = Math.min(Math.max(parsedPageSize, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
      const pageIndex = Math.min(
        Math.max(parsedPageIndex, 0),
        totalRows ? Math.ceil(totalRows / pageSize) - 1 : Infinity,
      );

      return { pageIndex, pageSize };
    },
    serialize(value: PaginationState): string {
      return `${value.pageIndex},${value.pageSize}`;
    },
  })
    .withDefault({ pageIndex: 0, pageSize: 25 })
    .withOptions({ shallow: false });

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export const usePaginationQueryState = (key: string, totalRows: number) => {
  return useQueryState(key ?? 'pagination', createPaginationParser(totalRows));
};
