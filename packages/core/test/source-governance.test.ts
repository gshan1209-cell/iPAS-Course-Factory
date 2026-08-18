import { describe, expect, it } from 'vitest';
import type { Source } from '@ipas-course-factory/schemas';
import {
  hasOfficialSource,
  resolveAuthoritativeSources,
  validateSourceLineage
} from '../src/source-governance.js';

const guide: Source = {
  sourceId: 'guide', tier: 'S1', title: 'Guide', provider: 'iPAS',
  driveFileId: 'g', scope: ['NLP'], effectiveDate: null, supersedes: [], corrects: []
};
const errata: Source = {
  sourceId: 'errata', tier: 'S2', title: 'Errata', provider: 'iPAS',
  driveFileId: 'e', scope: ['NLP'], effectiveDate: '2026-04-10', supersedes: [], corrects: ['guide']
};
const sample: Source = {
  sourceId: 'sample', tier: 'S4', title: 'Sample', provider: 'iPAS',
  driveFileId: 's', scope: [], effectiveDate: null, supersedes: [], corrects: []
};
const internal: Source = {
  sourceId: 'internal', tier: 'S5', title: 'Internal', provider: 'JunCloud',
  driveFileId: 'i', scope: [], effectiveDate: null, supersedes: [], corrects: []
};

describe('source governance', () => {
  it('places errata before the source it explicitly corrects', () => {
    expect(resolveAuthoritativeSources([guide, errata]).map(x => x.sourceId)).toEqual(['errata', 'guide']);
  });

  it('keeps S5 behind official tiers', () => {
    expect(resolveAuthoritativeSources([internal, sample]).map(x => x.sourceId)).toEqual(['sample', 'internal']);
  });

  it('returns unknown source IDs from lineage validation', () => {
    expect(validateSourceLineage(['guide', 'missing'], [guide])).toEqual(['missing']);
  });

  it('requires at least one S0-S4 source to count as official', () => {
    expect(hasOfficialSource(['internal'], [internal, sample])).toBe(false);
    expect(hasOfficialSource(['sample'], [internal, sample])).toBe(true);
  });
});
