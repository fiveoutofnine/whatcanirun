import type { PaginationState, SortingState } from '@tanstack/react-table';

import type { view__model_stats_by_device } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ModelsDataTableValue = typeof view__model_stats_by_device.$inferSelect;

export type ModelsDataTableQueryParams = {
  pagination: PaginationState;
  sorting: SortingState;
};
