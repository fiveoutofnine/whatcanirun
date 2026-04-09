import { trials } from '@/lib/db/schema';

export type TrialsDataTableValue = typeof trials.$inferSelect & {
  deviceRamGb: number;
};
