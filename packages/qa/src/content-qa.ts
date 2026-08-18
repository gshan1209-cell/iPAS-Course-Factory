import type { QaFinding, UnitQaContext } from './types.js';

const SOURCE_BOUND_KINDS = new Set([
  'SOURCE_BRIEF', 'SLIDES_PROMPT', 'VOICE_PROMPT', 'COURSE_HANDOUT', 'DESKTOP_EXPLAINERS',
  'MOBILE_KEY_CARDS', 'FORMULA_DECISION_CARD', 'OFFICIAL_QUESTION_BREAKDOWN', 'UNIT_QUESTION_BANK'
]);
const CHECKLIST_FIELDS = ['plainLanguage', 'practicalExample', 'examFocus', 'commonTrap', 'mnemonic'] as const;

function isReady(status: string): boolean {
  return status === 'READY' || status === 'APPROVED';
}

export function runContentQa(context: UnitQaContext): QaFinding[] {
  const findings: QaFinding[] = [];
  for (const group of Object.values(context.unit.artifacts)) {
    for (const item of group.items) {
      if (!isReady(item.status) || !SOURCE_BOUND_KINDS.has(item.kind)) continue;

      if (item.sourceIds.length === 0) {
        findings.push({
          code: 'CONTENT_LINEAGE_MISSING', severity: 'ERROR', artifactId: item.artifactId,
          message: `Generated artifact ${item.artifactId} has no source lineage.`
        });
      }

      const checklist = item.metadata.teachingChecklist;
      const complete = Boolean(checklist && typeof checklist === 'object'
        && CHECKLIST_FIELDS.every(field => (checklist as Record<string, unknown>)[field] === true));
      if (!complete) {
        findings.push({
          code: 'CONTENT_CHECKLIST_INCOMPLETE', severity: 'ERROR', artifactId: item.artifactId,
          message: `Generated teaching artifact ${item.artifactId} is missing a complete teaching checklist.`
        });
      }
    }
  }
  return findings;
}
