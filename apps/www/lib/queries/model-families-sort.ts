export const MODEL_FAMILY_SORT_OPTIONS = ['newest', 'most-tested', 'least-tested'] as const;

export type ModelFamilySort = (typeof MODEL_FAMILY_SORT_OPTIONS)[number];
