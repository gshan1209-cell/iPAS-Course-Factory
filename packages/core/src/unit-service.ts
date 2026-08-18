import type { UnitManifest, UnitStatus } from '@ipas-course-factory/schemas';
import { transitionUnit } from './workflow.js';

export class UnitStatusPreconditionError extends Error {
  constructor(public readonly actual: UnitStatus, public readonly expected: UnitStatus) {
    super(`Unit status must be ${expected}; current status is ${actual}`);
    this.name = 'UnitStatusPreconditionError';
  }
}

export function assertUnitStatus(unit: UnitManifest, expected: UnitStatus): void {
  if (unit.status !== expected) throw new UnitStatusPreconditionError(unit.status, expected);
}

export interface MarkGeneratedArtifactReadyInput {
  groupKey: string;
  itemKind: string;
  driveFileId: string;
  url: string;
  sourceIds: string[];
  generatedAt: string;
  metadata: Record<string, unknown>;
  actor: string;
}

export class ArtifactContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactContractError';
  }
}

export function markGeneratedArtifactReady(
  unit: UnitManifest,
  input: MarkGeneratedArtifactReadyInput
): UnitManifest {
  const currentGroup = unit.artifacts[input.groupKey];
  if (!currentGroup) throw new ArtifactContractError(`Missing artifact group: ${input.groupKey}`);

  const itemIndex = currentGroup.items.findIndex(item => item.kind === input.itemKind);
  if (itemIndex < 0) throw new ArtifactContractError(`Missing artifact item: ${input.itemKind}`);

  const updatedItems = currentGroup.items.map((item, index) => index === itemIndex ? {
    ...item,
    status: 'READY' as const,
    driveFileId: input.driveFileId,
    url: input.url,
    sourceIds: [...input.sourceIds],
    generatedAt: input.generatedAt,
    metadata: { ...item.metadata, ...input.metadata }
  } : item);

  const allItemsComplete = updatedItems.every(item =>
    item.status === 'READY' || item.status === 'APPROVED' || item.status === 'NOT_APPLICABLE'
  );
  const nextGroupStatus = allItemsComplete
    ? 'READY' as const
    : updatedItems.some(item => item.status === 'READY' || item.status === 'APPROVED')
      ? 'GENERATING' as const
      : currentGroup.status;

  return {
    ...unit,
    artifacts: {
      ...unit.artifacts,
      [input.groupKey]: {
        ...currentGroup,
        status: nextGroupStatus,
        items: updatedItems
      }
    },
    history: [...unit.history, {
      timestamp: input.generatedAt,
      actor: input.actor,
      action: 'artifact.generated.ready',
      previous: input.itemKind,
      next: 'READY',
      evidence: [input.driveFileId, input.url, ...input.sourceIds]
    }]
  };
}

export interface MarkUnitGenerationFailureInput {
  artifactId: string;
  code: string;
  message: string;
  actor: string;
  now: string;
  sourceId?: string;
}

export function markUnitGenerationFailure(
  unit: UnitManifest,
  input: MarkUnitGenerationFailureInput
): UnitManifest {
  const withFinding: UnitManifest = {
    ...unit,
    qa: {
      status: 'FAILED',
      findings: [...unit.qa.findings, {
        code: input.code,
        severity: 'ERROR',
        message: input.message,
        artifactId: input.artifactId,
        ...(input.sourceId ? { sourceId: input.sourceId } : {})
      }]
    }
  };

  if (withFinding.status === 'QA_FAILED') return withFinding;

  return transitionUnit(withFinding, 'QA_FAILED', {
    actor: input.actor,
    now: input.now,
    evidence: [`artifact:${input.artifactId}`],
    reason: input.message
  });
}
