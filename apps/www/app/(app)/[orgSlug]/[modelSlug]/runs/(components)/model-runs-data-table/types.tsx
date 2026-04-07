import type { PaginationState, SortingState } from '@tanstack/react-table';

import type { devices, models, modelsInfo, organizations, runs } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ModelRunsDataTableValue = typeof runs.$inferSelect & {
  model: typeof models.$inferSelect & {
    info:
      | (typeof modelsInfo.$inferSelect & {
          lab: typeof organizations.$inferSelect | null;
          quantizedBy: typeof organizations.$inferSelect | null;
        })
      | null;
  };
  device: typeof devices.$inferSelect;
};

export type ModelRunsDataTableQueryParams = {
  stale: boolean;
  pagination: PaginationState;
  sorting: SortingState;
};
