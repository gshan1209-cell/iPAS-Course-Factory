import type { Command } from 'commander';
import { approveGate, transitionUnit } from '@ipas-course-factory/core';
import type { UnitStatus } from '@ipas-course-factory/schemas';
import type { CliContainer } from '../container.js';

const approvalTargets = {
  SLIDES_APPROVED: 'SLIDES',
  VOICE_APPROVED: 'VOICE',
  PUBLISHED: 'FINAL_PUBLICATION'
} as const;

const statuses = new Set<UnitStatus>([
  'PLANNED', 'SOURCE_READY', 'BRIEF_READY', 'CONTENT_GENERATING', 'CONTENT_READY', 'CONTENT_QA',
  'NOTEBOOKLM_PENDING', 'SLIDES_REVIEW', 'SLIDES_APPROVED', 'VOICE_PENDING', 'VOICE_REVIEW', 'VOICE_APPROVED',
  'VIDEO_PENDING', 'FINAL_REVIEW', 'PUBLISHED', 'BLOCKED', 'QA_FAILED', 'REVISION_REQUIRED'
]);

const exceptionStates = new Set<UnitStatus>(['BLOCKED', 'QA_FAILED', 'REVISION_REQUIRED']);

export async function executeTransition(
  unitId: string,
  target: UnitStatus,
  evidence: string,
  container: CliContainer
): Promise<string> {
  let unit = await container.store.loadUnit(unitId);
  const gateType = approvalTargets[target as keyof typeof approvalTargets];
  if (gateType) {
    const key = gateType === 'SLIDES' ? 'slides' : gateType === 'VOICE' ? 'voice' : 'finalPublication';
    if (unit.gates[key]?.status !== 'APPROVED') {
      unit = approveGate(unit, {
        gateType,
        approvedBy: container.actor,
        approvedAt: container.now(),
        evidence: [evidence]
      });
    }
  }
  unit = transitionUnit(unit, target, {
    actor: container.actor,
    now: container.now(),
    evidence: [evidence],
    reason: exceptionStates.has(target) || exceptionStates.has(unit.status) ? evidence : undefined
  });
  await container.store.saveUnit(unit);
  return `${unitId} | ${unit.status}`;
}

export function registerTransition(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.argument('<unit-id>').argument('<state>').requiredOption('--evidence <text>')
    .action(async (unitId: string, state: string, options: { evidence: string }) => {
      if (!statuses.has(state as UnitStatus)) throw new Error(`Unknown unit state: ${state}`);
      write(await executeTransition(unitId, state as UnitStatus, options.evidence, container));
    });
}
