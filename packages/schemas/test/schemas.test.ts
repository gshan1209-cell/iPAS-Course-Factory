import { describe, expect, it } from 'vitest';
import { UnitManifestSchema } from '../src/index.js';

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
});
