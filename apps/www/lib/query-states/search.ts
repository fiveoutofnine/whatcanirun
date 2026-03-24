import { useQueryState } from 'nuqs';
import { createParser } from 'nuqs/server';

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

export const createSearchParser = createParser({
  parse(value: string): string | null {
    if (!value) return '';

    return decodeURIComponent(value);
  },
  serialize(value: string): string {
    return encodeURIComponent(value);
  },
})
  .withDefault('')
  .withOptions({ shallow: false });

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export const useSearchQueryState = (key: string) => {
  return useQueryState(key ?? 'search', createSearchParser);
};
