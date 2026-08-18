import { describe, expect, it } from 'vitest';
import type { UnitManifest } from '@ipas-course-factory/schemas';
import { createDefaultArtifactGroups } from '../src/artifacts.js';
import {
  UnitStatusPreconditionError,
  assertUnitStatus,
  markGeneratedArtifactReady,
  markUnitGenerationFailure
} from '../src/unit-service.js';

const makeUnit = (status: UnitManifest['status']): UnitManifest => ({
  schemaVersion: 1, unitId: 'M1-03', courseId: 'ipas-ai-planner', level: 'intermediate', subjectId: 'M1',
  title: 'CV', coreThesis: 'CV thesis', status,
  drive: { unitFolderId: 'root', folders: {} }, sources: ['guide'], artifacts: createDefaultArtifactGroups(), gates: {},
  qa: { status: 'NOT_RUN', findings: [] }, history: []
});

describe('unit service generation helpers', () => {
  it('rejects the wrong state before orchestration starts', () => {
    expect(() => assertUnitStatus(makeUnit('PLANNED'), 'SOURCE_READY')).toThrow(UnitStatusPreconditionError);
  });

  it('marks one-item groups READY but keeps prompt/output packages GENERATING', () => {
    const handout = markGeneratedArtifactReady(makeUnit('CONTENT_GENERATING'), {
      groupKey: 'handout', itemKind: 'COURSE_HANDOUT', driveFileId: 'doc-h', url: 'https://example.com/h',
      sourceIds: ['guide'], generatedAt: '2026-08-18T08:00:00.000Z', metadata: {}, actor: 'factory'
    });
    const slides = markGeneratedArtifactReady(makeUnit('CONTENT_GENERATING'), {
      groupKey: 'slides', itemKind: 'SLIDES_PROMPT', driveFileId: 'doc-s', url: 'https://example.com/s',
      sourceIds: ['guide'], generatedAt: '2026-08-18T08:00:00.000Z', metadata: {}, actor: 'factory'
    });

    expect(handout.artifacts.handout.status).toBe('READY');
    expect(slides.artifacts.slides.status).toBe('GENERATING');
  });

  it('records a structured QA finding and enters QA_FAILED on generation failure', () => {
    const failed = markUnitGenerationFailure(makeUnit('CONTENT_GENERATING'), {
      artifactId: 'handout.document', code: 'ARTIFACT_GENERATION_FAILED', message: 'drive write failed',
      actor: 'factory', now: '2026-08-18T08:00:00.000Z'
    });
    expect(failed.status).toBe('QA_FAILED');
    expect(failed.qa.status).toBe('FAILED');
    expect(failed.qa.findings.at(-1)?.artifactId).toBe('handout.document');
  });
});
