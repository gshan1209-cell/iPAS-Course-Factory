import { describe, expect, it } from 'vitest';
import type { UnitManifest } from '@ipas-course-factory/schemas';
import {
  ARTIFACT_KEYS,
  GateApprovalError,
  approveGate,
  calculateArtifactCompleteness,
  createDefaultArtifactGroups,
  registerExternalArtifact
} from '../src/artifacts.js';

const makeUnit = (): UnitManifest => ({
  schemaVersion: 1,
  unitId: 'M1-03',
  courseId: 'ipas-ai-planner',
  level: 'intermediate',
  subjectId: 'M1',
  title: 'Computer Vision',
  coreThesis: 'AI 看一張圖，其實可能在回答三種不同問題。',
  status: 'SLIDES_REVIEW',
  drive: { unitFolderId: null, folders: {} },
  sources: [],
  artifacts: createDefaultArtifactGroups(),
  gates: {},
  qa: { status: 'NOT_RUN', findings: [] },
  history: []
});

describe('artifact contract', () => {
  it('creates exactly ten artifact groups', () => {
    const groups = createDefaultArtifactGroups();
    expect(Object.keys(groups)).toHaveLength(10);
    expect(Object.keys(groups)).toEqual([...ARTIFACT_KEYS]);
  });

  it('creates prompt/output sub-artifacts for Slides and Voice', () => {
    const groups = createDefaultArtifactGroups();
    expect(groups.slides.items.map(item => item.kind)).toEqual(['SLIDES_PROMPT', 'SLIDES_OUTPUT']);
    expect(groups.voice.items.map(item => item.kind)).toEqual(['VOICE_PROMPT', 'VOICE_OUTPUT']);
  });

  it('counts NOT_APPLICABLE complete only when it has a reason', () => {
    const valid = makeUnit();
    valid.artifacts.sourceBrief.status = 'NOT_APPLICABLE';
    valid.artifacts.sourceBrief.reason = 'Source brief intentionally merged into approved source pack.';
    expect(calculateArtifactCompleteness(valid).complete).toBe(1);

    const invalid = makeUnit();
    invalid.artifacts.sourceBrief.status = 'NOT_APPLICABLE';
    invalid.artifacts.sourceBrief.reason = null;
    expect(calculateArtifactCompleteness(invalid).complete).toBe(0);
  });

  it('requires an external Slides output before Slides approval', () => {
    expect(() => approveGate(makeUnit(), {
      gateType: 'SLIDES', approvedBy: 'Sean', approvedAt: '2026-08-18T07:20:00.000Z', evidence: ['review:slides']
    })).toThrow(GateApprovalError);
  });

  it('requires an external Voice output before Voice approval', () => {
    expect(() => approveGate(makeUnit(), {
      gateType: 'VOICE', approvedBy: 'Sean', approvedAt: '2026-08-18T07:20:00.000Z', evidence: ['review:voice']
    })).toThrow(GateApprovalError);
  });

  it('requires an external Video output before final approval', () => {
    expect(() => approveGate(makeUnit(), {
      gateType: 'FINAL_PUBLICATION', approvedBy: 'Sean', approvedAt: '2026-08-18T07:20:00.000Z', evidence: ['review:final']
    })).toThrow(GateApprovalError);
  });

  it('rejects a parseable but non-ISO approval timestamp', () => {
    const registered = registerExternalArtifact(makeUnit(), {
      groupKey: 'slides', kind: 'SLIDES_OUTPUT', url: 'https://example.com/slides', actor: 'Sean', now: '2026-08-18T07:21:00.000Z'
    });
    expect(() => approveGate(registered, {
      gateType: 'SLIDES', approvedBy: 'Sean', approvedAt: 'August 18, 2026 07:22 UTC', evidence: ['review:slides']
    })).toThrow('approvedAt must be an ISO UTC datetime');
  });

  it('registers an external output immutably and permits its gate approval', () => {
    const before = makeUnit();
    const registered = registerExternalArtifact(before, {
      groupKey: 'slides', kind: 'SLIDES_OUTPUT', url: 'https://example.com/slides', actor: 'Sean', now: '2026-08-18T07:21:00.000Z'
    });
    const approved = approveGate(registered, {
      gateType: 'SLIDES', approvedBy: 'Sean', approvedAt: '2026-08-18T07:22:00.000Z', evidence: ['review:slides']
    });

    expect(before.gates).toEqual({});
    expect(registered.artifacts.slides.items.find(item => item.kind === 'SLIDES_OUTPUT')?.url).toBe('https://example.com/slides');
    expect(approved.gates.slides?.status).toBe('APPROVED');
  });
});
