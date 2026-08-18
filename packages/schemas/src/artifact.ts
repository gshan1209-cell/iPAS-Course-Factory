import { z } from 'zod';

export const ArtifactStatusSchema = z.enum([
  'NOT_STARTED', 'GENERATING', 'READY', 'QA_FAILED',
  'REVISION_REQUIRED', 'APPROVED', 'NOT_APPLICABLE'
]);

export const ArtifactItemSchema = z.object({
  artifactId: z.string().min(1),
  kind: z.string().min(1),
  status: ArtifactStatusSchema,
  driveFileId: z.string().min(1).nullable().default(null),
  url: z.string().url().nullable().default(null),
  sourceIds: z.array(z.string()).default([]),
  generatedAt: z.string().datetime().nullable().default(null),
  qaStatus: z.enum(['NOT_RUN', 'PASSED', 'FAILED']).default('NOT_RUN'),
  version: z.string().min(1).default('1.0'),
  metadata: z.record(z.string(), z.unknown()).default({})
}).strict();

export const ArtifactGroupNameSchema = z.enum([
  'SOURCE_BRIEF', 'SLIDES_PACKAGE', 'VOICE_PACKAGE', 'VIDEO_OUTPUT',
  'COURSE_HANDOUT', 'DESKTOP_EXPLAINERS', 'MOBILE_KEY_CARDS',
  'FORMULA_DECISION_CARD', 'OFFICIAL_QUESTION_BREAKDOWN', 'UNIT_QUESTION_BANK'
]);

export const ArtifactGroupSchema = z.object({
  group: ArtifactGroupNameSchema,
  status: ArtifactStatusSchema,
  reason: z.string().min(1).nullable().default(null),
  items: z.array(ArtifactItemSchema).default([])
}).strict().superRefine((value, ctx) => {
  if (value.status === 'NOT_APPLICABLE' && !value.reason) {
    ctx.addIssue({ code: 'custom', message: 'NOT_APPLICABLE requires reason', path: ['reason'] });
  }
});

export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;
export type ArtifactItem = z.infer<typeof ArtifactItemSchema>;
export type ArtifactGroupName = z.infer<typeof ArtifactGroupNameSchema>;
export type ArtifactGroup = z.infer<typeof ArtifactGroupSchema>;
