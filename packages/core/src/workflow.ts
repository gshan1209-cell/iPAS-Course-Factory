import type { UnitManifest, UnitStatus } from '@ipas-course-factory/schemas';

export const NORMAL_NEXT = {
  PLANNED: 'SOURCE_READY',
  SOURCE_READY: 'BRIEF_READY',
  BRIEF_READY: 'CONTENT_GENERATING',
  CONTENT_GENERATING: 'CONTENT_READY',
  CONTENT_READY: 'CONTENT_QA',
  CONTENT_QA: 'NOTEBOOKLM_PENDING',
  NOTEBOOKLM_PENDING: 'SLIDES_REVIEW',
  SLIDES_REVIEW: 'SLIDES_APPROVED',
  SLIDES_APPROVED: 'VOICE_PENDING',
  VOICE_PENDING: 'VOICE_REVIEW',
  VOICE_REVIEW: 'VOICE_APPROVED',
  VOICE_APPROVED: 'VIDEO_PENDING',
  VIDEO_PENDING: 'FINAL_REVIEW',
  FINAL_REVIEW: 'PUBLISHED',
  PUBLISHED: undefined
} as const;

const EXCEPTION_STATES = new Set<UnitStatus>(['BLOCKED', 'QA_FAILED', 'REVISION_REQUIRED']);
const NORMAL_STATES = new Set<UnitStatus>(Object.keys(NORMAL_NEXT) as UnitStatus[]);

export class IllegalTransitionError extends Error {
  constructor(public readonly from: UnitStatus, public readonly to: UnitStatus) {
    super(`Illegal unit transition: ${from} -> ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

export function canTransition(from: UnitStatus, to: UnitStatus, reason?: string): boolean {
  if (from === to) return true;

  const hasReason = Boolean(reason?.trim());
  if (EXCEPTION_STATES.has(to)) return hasReason;
  if (EXCEPTION_STATES.has(from)) return hasReason && NORMAL_STATES.has(to);

  return NORMAL_NEXT[from as keyof typeof NORMAL_NEXT] === to;
}

export function transitionUnit(
  unit: UnitManifest,
  next: UnitStatus,
  context: { actor: string; now: string; evidence?: string[]; reason?: string }
): UnitManifest {
  if (!canTransition(unit.status, next, context.reason)) {
    throw new IllegalTransitionError(unit.status, next);
  }
  if (unit.status === next) return unit;

  const recovering = EXCEPTION_STATES.has(unit.status) && !EXCEPTION_STATES.has(next);
  if (recovering && !(context.evidence?.length)) {
    throw new IllegalTransitionError(unit.status, next);
  }

  const evidence = [...(context.evidence ?? [])];
  if (context.reason) evidence.push(context.reason);

  return {
    ...unit,
    status: next,
    history: [...unit.history, {
      timestamp: context.now,
      actor: context.actor,
      action: 'workflow.transition',
      previous: unit.status,
      next,
      evidence
    }]
  };
}
