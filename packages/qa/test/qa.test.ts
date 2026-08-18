import { describe, expect, it } from 'vitest';
import type { Source, UnitManifest } from '@ipas-course-factory/schemas';
import { createDefaultArtifactGroups } from '@ipas-course-factory/core';
import { runUnitQa } from '../src/run-unit-qa.js';

const guide: Source = {
  sourceId: 'guide', tier: 'S1', title: 'Guide', provider: 'iPAS', driveFileId: 'g',
  scope: ['CV'], effectiveDate: null, supersedes: [], corrects: []
};
const internal: Source = {
  sourceId: 'internal', tier: 'S5', title: 'Internal', provider: 'JunCloud', driveFileId: 'i',
  scope: ['CV'], effectiveDate: null, supersedes: [], corrects: []
};

const makeUnit = (): UnitManifest => ({
  schemaVersion: 1, unitId: 'M1-03', courseId: 'ipas-ai-planner', level: 'intermediate', subjectId: 'M1',
  title: 'CV', coreThesis: 'CV thesis', status: 'CONTENT_READY',
  drive: { unitFolderId: 'root', folders: {} }, sources: ['guide'], artifacts: createDefaultArtifactGroups(), gates: {},
  qa: { status: 'NOT_RUN', findings: [] }, history: []
});

function codes(unit: UnitManifest, registry: Source[]) {
  return runUnitQa({ unit, registry }).findings.map(finding => finding.code);
}

describe('structured QA codes', () => {
  it('reports SOURCE_OFFICIAL_MISSING for an S5-only unit', () => {
    const unit = makeUnit(); unit.sources = ['internal'];
    expect(codes(unit, [internal])).toContain('SOURCE_OFFICIAL_MISSING');
  });

  it('reports SOURCE_ID_UNKNOWN for unresolved manifest sources', () => {
    const unit = makeUnit(); unit.sources = ['missing'];
    expect(codes(unit, [guide])).toContain('SOURCE_ID_UNKNOWN');
  });

  it('reports ERRATA_MAPPING_UNRESOLVED when a correction target is unknown', () => {
    const errata: Source = { ...guide, sourceId: 'errata', tier: 'S2', corrects: ['missing-guide'] };
    const unit = makeUnit(); unit.sources = ['errata'];
    expect(codes(unit, [errata])).toContain('ERRATA_MAPPING_UNRESOLVED');
  });

  it('reports ARTIFACT_GROUP_MISSING when the ten-group contract is incomplete', () => {
    const unit = makeUnit(); delete unit.artifacts.handout;
    expect(codes(unit, [guide])).toContain('ARTIFACT_GROUP_MISSING');
  });

  it('reports GATE_OUTPUT_MISSING for an approved gate without its external output', () => {
    const unit = makeUnit();
    unit.gates.slides = { gateType: 'SLIDES', status: 'APPROVED', approvedBy: 'Sean', approvedAt: '2026-08-18T08:00:00.000Z', evidence: ['review'] };
    expect(codes(unit, [guide])).toContain('GATE_OUTPUT_MISSING');
  });

  it('reports CONTENT_LINEAGE_MISSING and CONTENT_CHECKLIST_INCOMPLETE for a generated teaching artifact', () => {
    const unit = makeUnit();
    const item = unit.artifacts.handout.items[0]!;
    item.status = 'READY'; item.driveFileId = 'doc'; item.url = 'https://example.com/doc'; item.sourceIds = [];
    item.metadata = { teachingChecklist: { plainLanguage: true, practicalExample: false, examFocus: true, commonTrap: true, mnemonic: true } };
    const found = codes(unit, [guide]);
    expect(found).toContain('CONTENT_LINEAGE_MISSING');
    expect(found).toContain('CONTENT_CHECKLIST_INCOMPLETE');
  });

  it('reports exam question structural errors with stable codes', () => {
    const unit = makeUnit();
    const item = unit.artifacts.questionBank.items[0]!;
    item.status = 'READY'; item.sourceIds = ['guide'];
    item.metadata = {
      teachingChecklist: { plainLanguage: true, practicalExample: true, examFocus: true, commonTrap: true, mnemonic: true },
      questions: [{ questionId: 'Q1', topic: '', stem: 'stem', options: ['A', 'B'], answer: '', explanation: '', distractorReasoning: {}, sourceIds: [] }]
    };
    const found = codes(unit, [guide]);
    expect(found).toContain('EXAM_ANSWER_MISSING');
    expect(found).toContain('EXAM_EXPLANATION_MISSING');
    expect(found).toContain('EXAM_TOPIC_MISSING');
    expect(found).toContain('EXAM_SOURCE_LINEAGE_MISSING');
  });

  it('passes when only non-error findings exist and fails on any ERROR', () => {
    const healthy = makeUnit();
    const report = runUnitQa({ unit: healthy, registry: [guide] });
    expect(report.status).toBe('PASSED');

    healthy.sources = ['missing'];
    expect(runUnitQa({ unit: healthy, registry: [guide] }).status).toBe('FAILED');
  });
});
