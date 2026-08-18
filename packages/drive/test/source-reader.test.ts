import { describe, expect, it } from 'vitest';
import type { Source } from '@ipas-course-factory/schemas';
import { readSourcePack, UnknownSourceError } from '../src/source-reader.js';
import type { SourceFilePort } from '../src/port.js';

const registry: Source[] = [
  { sourceId: 'guide', tier: 'S1', title: 'Guide', provider: 'iPAS', driveFileId: 'g', scope: ['CV'], effectiveDate: null, supersedes: [], corrects: [] },
  { sourceId: 'errata', tier: 'S2', title: 'Errata', provider: 'iPAS', driveFileId: 'e', scope: ['CV'], effectiveDate: '2026-04-10', supersedes: [], corrects: ['guide'] },
  { sourceId: 'exam', tier: 'S3', title: 'Exam', provider: 'iPAS', driveFileId: 'x', scope: ['CV'], effectiveDate: null, supersedes: [], corrects: [] }
];

class FakeReader implements SourceFilePort {
  readonly reads: string[] = [];
  async readTextFile(fileId: string) {
    this.reads.push(fileId);
    return { mimeType: 'text/plain', text: `text:${fileId}` };
  }
}

describe('readSourcePack', () => {
  it('reads sources in governed deterministic order while preserving metadata', async () => {
    const reader = new FakeReader();
    const result = await readSourcePack(['guide', 'exam', 'errata'], registry, reader);
    expect(result.map(item => item.sourceId)).toEqual(['errata', 'guide', 'exam']);
    expect(result[0]).toEqual({ sourceId: 'errata', tier: 'S2', title: 'Errata', text: 'text:e' });
    expect(reader.reads).toEqual(['e', 'g', 'x']);
  });

  it('rejects unknown source IDs before reading any file', async () => {
    const reader = new FakeReader();
    await expect(readSourcePack(['guide', 'missing'], registry, reader)).rejects.toThrow(UnknownSourceError);
    expect(reader.reads).toEqual([]);
  });
});
