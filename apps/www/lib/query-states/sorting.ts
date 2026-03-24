import type { SortingState } from '@tanstack/react-table';
import { useQueryState } from 'nuqs';
import { createParser } from 'nuqs/server';

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

export const createSortingParser = createParser({
  parse(value: string): SortingState {
    if (!value) return [];

    return value.split('|').map((column) => {
      const [id, desc] = column.split(',');

      return { id: id.toLowerCase(), desc: desc.toLowerCase() === 'true' };
    });
  },
  serialize(value: SortingState): string {
    return value.map(({ id, desc }) => `${id.toLowerCase()},${desc}`).join('|');
  },
})
  .withDefault([])
  .withOptions({ shallow: false });

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export const useSortingQueryState = (key: string) => {
  return useQueryState(key ?? 'sorting', createSortingParser);
};
