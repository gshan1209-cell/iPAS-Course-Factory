import { z } from 'zod';

export const CourseSchema = z.object({
  schemaVersion: z.literal(1),
  courseId: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  authority: z.string().min(1),
  levels: z.array(z.string()).min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  driveRootFolderId: z.string().min(1)
}).strict();

export type Course = z.infer<typeof CourseSchema>;
