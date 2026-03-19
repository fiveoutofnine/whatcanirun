import { z } from 'zod';

export const cliAuthSearchParamsSchema = z.object({
  port: z.coerce.number().int().positive().max(65535),
  state: z.string().min(1),
});
