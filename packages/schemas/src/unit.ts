import { z } from 'zod';
import { ArtifactGroupSchema } from './artifact.js';
import { GateSchema } from './gate.js';

export const UnitStatusSchema = z.enum([
  'PLANNED', 'SOURCE_READY', 'BRIEF_READY', 'CONTENT_GENERATING', 'CONTENT_READY',
  'CONTENT_QA', 'NOTEBOOKLM_PENDING', 'SLIDES_REVIEW', 'SLIDES_APPROVED',
  'VOICE_PENDING', 'VOICE_REVIEW', 'VOICE_APPROVED', 'VIDEO_PENDING',
  'FINAL_REVIEW', 'PUBLISHED', 'BLOCKED', 'QA_FAILED', 'REVISION_REQUIRED'
]);

export const UnitManifestSchema = z.object({
  schemaVersion: z.literal(1),
  unitId: z.string().min(1),
  courseId: z.string().min(1),
  level: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().min(1),
  coreThesis: z.string().min(1),
  status: UnitStatusSchema,
  drive: z.object({
    unitFolderId: z.string().nullable(),
    folders: z.record(z.string(), z.string()).default({})
  }).strict(),
  sources: z.array(z.string()),
  artifacts: z.record(z.string(), ArtifactGroupSchema),
  gates: z.record(z.string(), GateSchema),
  qa: z.object({
    status: z.enum(['NOT_RUN', 'PASSED', 'FAILED']),
    findings: z.array(z.object({
      code: z.string(),
      severity: z.enum(['INFO', 'WARNING', 'ERROR']),
      message: z.string(),
      artifactId: z.string().optional(),
      sourceId: z.string().optional()
    }).strict())
  }).strict(),
  history: z.array(z.object({
    timestamp: z.string().datetime(),
    actor: z.string(),
    action: z.string(),
    previous: z.string().nullable(),
    next: z.string().nullable(),
    evidence: z.array(z.string())
  }).strict())
}).strict();

export type UnitStatus = z.infer<typeof UnitStatusSchema>;
export type UnitManifest = z.infer<typeof UnitManifestSchema>;
