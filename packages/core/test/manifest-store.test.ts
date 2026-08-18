import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { YamlManifestStore } from '../src/manifest-store.js';

const fixture = {
  schemaVersion: 1 as const,
  unitId: 'M1-99',
  courseId: 'ipas-ai-planner',
  level: 'intermediate',
  subjectId: 'M1',
  title: 'Fixture',
  coreThesis: 'Fixture thesis',
  status: 'PLANNED' as const,
  drive: { unitFolderId: null, folders: {} },
  sources: [],
  artifacts: {},
  gates: {},
  qa: { status: 'NOT_RUN' as const, findings: [] },
  history: []
};

describe('YamlManifestStore', () => {
  it('validates and round-trips a unit manifest', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'course-factory-'));
    const store = new YamlManifestStore(root);

    await store.saveUnit(fixture);

    expect((await store.loadUnit('M1-99')).unitId).toBe('M1-99');
    expect(await readFile(path.join(root, 'catalog/units/M1-99.yaml'), 'utf8')).toContain('unitId: M1-99');
  });

  it('rejects an invalid unit before writing', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'course-factory-'));
    const store = new YamlManifestStore(root);
    const invalid = { ...fixture, status: 'DONE' };

    await expect(store.saveUnit(invalid as never)).rejects.toThrow();
  });

  it('preserves semantic data across save-load-save', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'course-factory-'));
    const store = new YamlManifestStore(root);

    await store.saveUnit(fixture);
    const first = await store.loadUnit('M1-99');
    await store.saveUnit(first);
    const second = await store.loadUnit('M1-99');

    expect(second).toEqual(first);
  });
});
