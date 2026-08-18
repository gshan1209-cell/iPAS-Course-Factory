import { z } from 'zod';

export const SubjectSchema = z.object({
  schemaVersion: z.literal(1),
  subjectId: z.string().min(1),
  courseId: z.string().min(1),
  level: z.string().min(1),
  name: z.string().min(1),
  badge: z.string().min(1),
  unitIds: z.array(z.string()).default([]),
  driveFolderId: z.string().min(1).nullable().default(null)
}).strict();

export type Subject = z.infer<typeof SubjectSchema>;
