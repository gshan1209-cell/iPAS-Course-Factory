import { z } from 'zod';

export const SourceTierSchema = z.enum(['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);

export const SourceSchema = z.object({
  sourceId: z.string().min(1),
  tier: SourceTierSchema,
  title: z.string().min(1),
  provider: z.string().min(1),
  driveFileId: z.string().min(1),
  scope: z.array(z.string()).default([]),
  effectiveDate: z.string().date().nullable().default(null),
  supersedes: z.array(z.string()).default([]),
  corrects: z.array(z.string()).default([])
});

export type SourceTier = z.infer<typeof SourceTierSchema>;
export type Source = z.infer<typeof SourceSchema>;
