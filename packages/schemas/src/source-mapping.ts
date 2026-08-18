import { z } from 'zod';

export const SourceMappingSchema = z.object({
  schemaVersion: z.literal(1),
  unitId: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  scope: z.array(z.string().min(1)).default([]),
  officialQuestionRefs: z.array(z.object({
    sourceId: z.string().min(1),
    questions: z.array(z.string().min(1)).default([])
  }).strict()).default([]),
  templateVariables: z.object({
    official_scope: z.string().min(1),
    exam_focus: z.string().min(1),
    known_traps: z.string().min(1),
    visual_motif: z.string().min(1)
  }).strict()
}).strict();

export type SourceMapping = z.infer<typeof SourceMappingSchema>;
