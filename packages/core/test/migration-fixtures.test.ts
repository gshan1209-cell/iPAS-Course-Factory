import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YamlManifestStore } from '../src/manifest-store.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('iPAS intermediate migration fixtures', () => {
  it.each(['M1-01', 'M1-02'])('loads migrated %s manifest', async unitId => {
    const store = new YamlManifestStore(repoRoot);
    const unit = await store.loadUnit(unitId);
    expect(unit.unitId).toBe(unitId);
    expect(unit.status).toBe('CONTENT_READY');
    expect(unit.gates.slides?.status).toBe('PENDING');
    expect(unit.gates.voice?.status).toBe('PENDING');
    expect(unit.gates.finalPublication?.status).toBe('PENDING');
  });

  it('loads the canonical course, subject and official source registry', async () => {
    const store = new YamlManifestStore(repoRoot);
    expect((await store.loadCourse('ipas-ai-planner')).driveRootFolderId).toBe('15ei4NnV4FRfaWORZifUPONzsZ6Ki_1ke');
    expect((await store.loadSubject('intermediate-M1')).unitIds).toEqual(['M1-01', 'M1-02']);
    expect((await store.listSources()).map(source => source.sourceId)).toEqual([
      'ipas-mid-s1-subject1-guide',
      'ipas-mid-s2-errata-2026-04-10',
      'ipas-mid-s3-exam-2025-round2-subject1',
      'ipas-mid-s4-sample-2025-09-v2'
    ]);
  });
});
