import { hasOfficialSource, validateSourceLineage } from '@ipas-course-factory/core';
import type { QaFinding, UnitQaContext } from './types.js';

export function runSourceQa(context: UnitQaContext): QaFinding[] {
  const findings: QaFinding[] = [];
  const unknown = validateSourceLineage(context.unit.sources, context.registry);
  for (const sourceId of unknown) {
    findings.push({
      code: 'SOURCE_ID_UNKNOWN', severity: 'ERROR', sourceId,
      message: `Unit references unknown source ID: ${sourceId}`
    });
  }

  if (!hasOfficialSource(context.unit.sources, context.registry)) {
    findings.push({
      code: 'SOURCE_OFFICIAL_MISSING', severity: 'ERROR',
      message: 'Exam-bound unit requires at least one official S0-S4 source.'
    });
  }

  const selected = context.registry.filter(source => context.unit.sources.includes(source.sourceId));
  const registryIds = new Set(context.registry.map(source => source.sourceId));
  for (const source of selected) {
    for (const targetId of [...source.corrects, ...source.supersedes]) {
      if (!registryIds.has(targetId)) {
        findings.push({
          code: 'ERRATA_MAPPING_UNRESOLVED', severity: 'ERROR', sourceId: source.sourceId,
          message: `Source ${source.sourceId} references unresolved correction/supersession target: ${targetId}`
        });
      }
    }
  }

  return findings;
}
