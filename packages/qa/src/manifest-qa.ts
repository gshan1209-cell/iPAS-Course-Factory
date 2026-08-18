import { ARTIFACT_KEYS } from '@ipas-course-factory/core';
import type { UnitManifest } from '@ipas-course-factory/schemas';
import type { QaFinding, UnitQaContext } from './types.js';

const NORMAL_ORDER: UnitManifest['status'][] = [
  'PLANNED', 'SOURCE_READY', 'BRIEF_READY', 'CONTENT_GENERATING', 'CONTENT_READY', 'CONTENT_QA',
  'NOTEBOOKLM_PENDING', 'SLIDES_REVIEW', 'SLIDES_APPROVED', 'VOICE_PENDING', 'VOICE_REVIEW',
  'VOICE_APPROVED', 'VIDEO_PENDING', 'FINAL_REVIEW', 'PUBLISHED'
];

const gateConfig = {
  slides: { gateKey: 'slides', gateType: 'SLIDES', outputGroup: 'slides', outputKind: 'SLIDES_OUTPUT', requiredFrom: 'SLIDES_APPROVED' },
  voice: { gateKey: 'voice', gateType: 'VOICE', outputGroup: 'voice', outputKind: 'VOICE_OUTPUT', requiredFrom: 'VOICE_APPROVED' },
  finalPublication: { gateKey: 'finalPublication', gateType: 'FINAL_PUBLICATION', outputGroup: 'video', outputKind: 'VIDEO_OUTPUT', requiredFrom: 'PUBLISHED' }
} as const;

function stateAtOrAfter(status: UnitManifest['status'], threshold: UnitManifest['status']): boolean {
  const current = NORMAL_ORDER.indexOf(status);
  const required = NORMAL_ORDER.indexOf(threshold);
  return current >= 0 && required >= 0 && current >= required;
}

function hasOutput(unit: UnitManifest, groupKey: string, kind: string): boolean {
  const item = unit.artifacts[groupKey]?.items.find(candidate => candidate.kind === kind);
  return Boolean(item && (item.driveFileId || item.url));
}

export function runManifestQa(context: UnitQaContext): QaFinding[] {
  const findings: QaFinding[] = [];
  for (const key of ARTIFACT_KEYS) {
    if (!context.unit.artifacts[key]) {
      findings.push({
        code: 'ARTIFACT_GROUP_MISSING', severity: 'ERROR',
        message: `Missing required artifact group: ${key}`
      });
    }
  }

  for (const config of Object.values(gateConfig)) {
    const gate = context.unit.gates[config.gateKey];
    if (gate?.status === 'APPROVED' && !hasOutput(context.unit, config.outputGroup, config.outputKind)) {
      findings.push({
        code: 'GATE_OUTPUT_MISSING', severity: 'ERROR',
        message: `Approved ${config.gateType} gate requires registered ${config.outputKind}.`
      });
    }
    if (stateAtOrAfter(context.unit.status, config.requiredFrom) && gate?.status !== 'APPROVED') {
      findings.push({
        code: 'GATE_APPROVAL_MISSING', severity: 'ERROR',
        message: `State ${context.unit.status} requires approved ${config.gateType} gate.`
      });
    }
  }

  return findings;
}
