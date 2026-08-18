import { describe, expect, it } from 'vitest';
import type { UnitManifest } from '@ipas-course-factory/schemas';
import {
  canTransition,
  IllegalTransitionError,
  recoveryTargetFor,
  transitionUnit
} from '../src/workflow.js';

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

const ctx = (reason?: string, evidence: string[] = ['review:evidence']) => ({
  actor: 'reviewer',
  now: '2026-08-18T07:12:00.000Z',
  evidence,
  reason
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

  it('blocks domain transitions into gated states until the matching gate is approved', () => {
    const slidesReview = unit('SLIDES_REVIEW');
    expect(() => transitionUnit(slidesReview, 'SLIDES_APPROVED', ctx()))
      .toThrow(IllegalTransitionError);

    const slidesGateApproved: UnitManifest = {
      ...slidesReview,
      gates: {
        ...slidesReview.gates,
        slides: {
          gateType: 'SLIDES',
          status: 'APPROVED',
          approvedBy: 'human-reviewer',
          approvedAt: '2026-08-18T07:12:00.000Z',
          evidence: ['review:slides']
        }
      }
    };
    expect(transitionUnit(slidesGateApproved, 'SLIDES_APPROVED', ctx()).status)
      .toBe('SLIDES_APPROVED');

    const voiceReview = unit('VOICE_REVIEW');
    expect(() => transitionUnit(voiceReview, 'VOICE_APPROVED', ctx()))
      .toThrow(IllegalTransitionError);

    const finalReview = unit('FINAL_REVIEW');
    expect(() => transitionUnit(finalReview, 'PUBLISHED', ctx()))
      .toThrow(IllegalTransitionError);
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

  it('forbids direct recovery from QA_FAILED to a normal or terminal state', () => {
    expect(canTransition('QA_FAILED', 'CONTENT_QA', 'fixed')).toBe(false);
    expect(canTransition('QA_FAILED', 'PUBLISHED', 'fixed')).toBe(false);
    expect(canTransition('QA_FAILED', 'REVISION_REQUIRED', 'fixed')).toBe(true);
  });

  it('requires evidence while entering the explicit revision path', () => {
    const failed = transitionUnit(unit('CONTENT_QA'), 'QA_FAILED', ctx('critical finding'));
    expect(() => transitionUnit(failed, 'REVISION_REQUIRED', ctx('fix planned', [])))
      .toThrow(IllegalTransitionError);
  });

  it('recovers only to the history-derived state after REVISION_REQUIRED', () => {
    const failed = transitionUnit(unit('CONTENT_QA'), 'QA_FAILED', ctx('critical finding'));
    const revision = transitionUnit(failed, 'REVISION_REQUIRED', ctx('fix planned'));

    expect(recoveryTargetFor(revision)).toBe('CONTENT_QA');
    expect(canTransition('REVISION_REQUIRED', 'PUBLISHED', 'fixed', recoveryTargetFor(revision))).toBe(false);

    const recovered = transitionUnit(revision, 'CONTENT_QA', ctx('content corrected'));
    expect(recovered.status).toBe('CONTENT_QA');
  });

  it('returns a failed generation to BRIEF_READY so the content pack can be regenerated', () => {
    const generating = transitionUnit(unit('BRIEF_READY'), 'CONTENT_GENERATING', {
      actor: 'factory', now: '2026-08-18T07:13:00.000Z', evidence: ['generation:start']
    });
    const failed = transitionUnit(generating, 'QA_FAILED', ctx('generation failed'));
    const revision = transitionUnit(failed, 'REVISION_REQUIRED', ctx('generator fixed'));

    expect(recoveryTargetFor(revision)).toBe('BRIEF_READY');
    expect(transitionUnit(revision, 'BRIEF_READY', ctx('retry generation')).status).toBe('BRIEF_READY');
  });
});
