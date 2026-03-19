import { z } from 'zod';

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().positive().max(25).default(10),
  })
  .partial();
