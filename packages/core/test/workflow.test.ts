import { describe, expect, it } from 'vitest';
import type { UnitManifest } from '@ipas-course-factory/schemas';
import { canTransition, IllegalTransitionError, transitionUnit } from '../src/workflow.js';

const unit = (status: UnitManifest['status']): UnitManifest => ({
  schemaVersion: 1,
  unitId: 'M1-03',
  courseId: 'ipas-ai-planner',
  level: 'intermediate',
  subjectId: 'M1',
  title: 'Computer Vision',
  coreThesis: '同一張圖，可以對應不同視覺任務。',
  status,
  drive: { unitFolderId: null, folders: {} },
  sources: [], artifacts: {}, gates: {},
  qa: { status: 'NOT_RUN', findings: [] }, history: []
});

describe('workflow state machine', () => {
  it('allows the approved normal path through voice review', () => {
    expect(canTransition('SLIDES_APPROVED', 'VOICE_PENDING')).toBe(true);
    expect(canTransition('VOICE_PENDING', 'VOICE_REVIEW')).toBe(true);
    expect(canTransition('VOICE_REVIEW', 'VOICE_APPROVED')).toBe(true);
    expect(canTransition('VOICE_APPROVED', 'VIDEO_PENDING')).toBe(true);
  });

  it('rejects a skipped human-gated path', () => {
    expect(canTransition('SLIDES_REVIEW', 'PUBLISHED')).toBe(false);
  });

  it('treats transition to the current state as idempotent', () => {
    const current = unit('CONTENT_READY');
    expect(canTransition('CONTENT_READY', 'CONTENT_READY')).toBe(true);
    expect(transitionUnit(current, 'CONTENT_READY', {
      actor: 'tester', now: '2026-08-18T07:10:00.000Z'
    })).toBe(current);
  });

  it('requires a reason to enter exception states', () => {
    expect(canTransition('CONTENT_QA', 'QA_FAILED')).toBe(false);
    expect(canTransition('CONTENT_QA', 'QA_FAILED', 'critical finding')).toBe(true);
  });

  it('records immutable audit history for a legal transition', () => {
    const before = unit('CONTENT_READY');
    const after = transitionUnit(before, 'CONTENT_QA', {
      actor: 'qa-bot',
      now: '2026-08-18T07:11:00.000Z',
      evidence: ['artifact:handout']
    });
    expect(before.history).toEqual([]);
    expect(after.status).toBe('CONTENT_QA');
    expect(after.history).toHaveLength(1);
    expect(after.history[0]?.previous).toBe('CONTENT_READY');
    expect(after.history[0]?.next).toBe('CONTENT_QA');
  });

  it('requires evidence when recovering from an exception state', () => {
    expect(() => transitionUnit(unit('QA_FAILED'), 'CONTENT_QA', {
      actor: 'reviewer', now: '2026-08-18T07:12:00.000Z', reason: 'fixed'
    })).toThrow(IllegalTransitionError);
  });
});
