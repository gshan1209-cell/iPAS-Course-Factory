import { describe, expect, it } from 'vitest';
import { GateSchema, SourceMappingSchema, SourceSchema, SubjectSchema, UnitManifestSchema } from '../src/index.js';

const valid = {
  schemaVersion: 1,
  unitId: 'M1-02',
  courseId: 'ipas-ai-planner',
  level: 'intermediate',
  subjectId: 'M1',
  title: 'Transformer 與 BERT',
  coreThesis: '有了向量還不夠，模型還要知道一句話裡哪些詞彼此最重要。',
  status: 'CONTENT_READY',
  drive: { unitFolderId: null, folders: {} },
  sources: [],
  artifacts: {},
  gates: {},
  qa: { status: 'NOT_RUN', findings: [] },
  history: []
};

describe('UnitManifestSchema', () => {
  it('accepts a valid unit manifest', () => {
    expect(UnitManifestSchema.parse(valid).unitId).toBe('M1-02');
  });

  it('rejects an unknown workflow state', () => {
    expect(() => UnitManifestSchema.parse({ ...valid, status: 'DONE' })).toThrow();
  });

  it('rejects NOT_APPLICABLE without a reason', () => {
    expect(() => UnitManifestSchema.parse({
      ...valid,
      artifacts: {
        formula: {
          group: 'FORMULA_DECISION_CARD',
          status: 'NOT_APPLICABLE',
          reason: null,
          items: []
        }
      }
    })).toThrow('NOT_APPLICABLE requires reason');
  });

  it('rejects unknown top-level fields', () => {
    expect(() => UnitManifestSchema.parse({ ...valid, unexpected: true })).toThrow();
  });

  it('rejects unknown nested artifact fields instead of stripping them', () => {
    expect(() => UnitManifestSchema.parse({
      ...valid,
      artifacts: {
        formula: { group: 'FORMULA_DECISION_CARD', status: 'READY', reason: null, items: [], typoField: true }
      }
    })).toThrow();
  });
});

describe('canonical nested schemas', () => {
  it('rejects unknown source fields', () => {
    expect(() => SourceSchema.parse({
      sourceId: 'guide', tier: 'S1', title: 'Guide', provider: 'iPAS', driveFileId: 'g',
      scope: [], effectiveDate: null, supersedes: [], corrects: [], typoField: true
    })).toThrow();
  });

  it('rejects unknown gate fields', () => {
    expect(() => GateSchema.parse({
      gateType: 'SLIDES', status: 'PENDING', approvedBy: null, approvedAt: null, evidence: [], approvedAT: null
    })).toThrow();
  });
});

describe('operator support schemas', () => {
  it('accepts a governed SourceMapping contract', () => {
    const mapping = SourceMappingSchema.parse({
      schemaVersion: 1,
      unitId: 'M1-03',
      sourceIds: ['guide'],
      scope: ['Computer Vision'],
      officialQuestionRefs: [{ sourceId: 'exam', questions: ['Q10'] }],
      templateVariables: {
        official_scope: 'Computer Vision',
        exam_focus: 'Classification / Detection / Segmentation',
        known_traps: 'task confusion',
        visual_motif: 'scan light'
      }
    });
    expect(mapping.unitId).toBe('M1-03');
  });

  it('defaults Subject driveFolderId to null but accepts a mapped folder', () => {
    const base = {
      schemaVersion: 1 as const, subjectId: 'M1', courseId: 'ipas-ai-planner', level: 'intermediate',
      name: 'Subject 1', badge: 'AI PLANNER', unitIds: []
    };
    expect(SubjectSchema.parse(base).driveFolderId).toBe(null);
    expect(SubjectSchema.parse({ ...base, driveFolderId: 'drive-M1' }).driveFolderId).toBe('drive-M1');
  });
});
