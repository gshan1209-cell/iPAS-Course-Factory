import { z } from 'zod';

export const GateSchema = z.object({
  gateType: z.enum(['SLIDES', 'VOICE', 'FINAL_PUBLICATION']),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  approvedBy: z.string().nullable().default(null),
  approvedAt: z.string().datetime().nullable().default(null),
  evidence: z.array(z.string()).default([])
}).strict();

export type Gate = z.infer<typeof GateSchema>;
