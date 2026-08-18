import type { Source } from '@ipas-course-factory/schemas';

const tierWeight = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4, S5: 5 } as const;

export function resolveAuthoritativeSources(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    if (a.corrects.includes(b.sourceId) || a.supersedes.includes(b.sourceId)) return -1;
    if (b.corrects.includes(a.sourceId) || b.supersedes.includes(a.sourceId)) return 1;
    return tierWeight[a.tier] - tierWeight[b.tier] || a.sourceId.localeCompare(b.sourceId);
  });
}

export function validateSourceLineage(sourceIds: string[], registry: Source[]): string[] {
  const known = new Set(registry.map(source => source.sourceId));
  return sourceIds.filter(id => !known.has(id));
}

export function hasOfficialSource(sourceIds: string[], registry: Source[]): boolean {
  const selected = registry.filter(source => sourceIds.includes(source.sourceId));
  return selected.some(source => source.tier !== 'S5');
}
