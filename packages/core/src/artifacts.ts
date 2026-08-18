import type { ArtifactGroup, ArtifactItem, Gate, UnitManifest } from '@ipas-course-factory/schemas';

export const ARTIFACT_KEYS = [
  'sourceBrief', 'slides', 'voice', 'video', 'handout',
  'desktopExplainers', 'mobileCards', 'formulaDecisionCard',
  'officialQuestionBreakdown', 'questionBank'
] as const;

export type ArtifactKey = typeof ARTIFACT_KEYS[number];

const baseItem = (artifactId: string, kind: string): ArtifactItem => ({
  artifactId,
  kind,
  status: 'NOT_STARTED',
  driveFileId: null,
  url: null,
  sourceIds: [],
  generatedAt: null,
  qaStatus: 'NOT_RUN',
  version: '1.0',
  metadata: {}
});

const group = (name: ArtifactGroup['group'], items: ArtifactItem[]): ArtifactGroup => ({
  group: name,
  status: 'NOT_STARTED',
  reason: null,
  items
});

export function createDefaultArtifactGroups(): UnitManifest['artifacts'] {
  return {
    sourceBrief: group('SOURCE_BRIEF', [baseItem('sourceBrief.document', 'SOURCE_BRIEF')]),
    slides: group('SLIDES_PACKAGE', [
      baseItem('slides.prompt', 'SLIDES_PROMPT'),
      baseItem('slides.output', 'SLIDES_OUTPUT')
    ]),
    voice: group('VOICE_PACKAGE', [
      baseItem('voice.prompt', 'VOICE_PROMPT'),
      baseItem('voice.output', 'VOICE_OUTPUT')
    ]),
    video: group('VIDEO_OUTPUT', [baseItem('video.output', 'VIDEO_OUTPUT')]),
    handout: group('COURSE_HANDOUT', [baseItem('handout.document', 'COURSE_HANDOUT')]),
    desktopExplainers: group('DESKTOP_EXPLAINERS', [baseItem('desktopExplainers.document', 'DESKTOP_EXPLAINERS')]),
    mobileCards: group('MOBILE_KEY_CARDS', [baseItem('mobileCards.document', 'MOBILE_KEY_CARDS')]),
    formulaDecisionCard: group('FORMULA_DECISION_CARD', [baseItem('formulaDecisionCard.document', 'FORMULA_DECISION_CARD')]),
    officialQuestionBreakdown: group('OFFICIAL_QUESTION_BREAKDOWN', [baseItem('officialQuestionBreakdown.document', 'OFFICIAL_QUESTION_BREAKDOWN')]),
    questionBank: group('UNIT_QUESTION_BANK', [baseItem('questionBank.document', 'UNIT_QUESTION_BANK')])
  };
}

export function calculateArtifactCompleteness(unit: UnitManifest) {
  const groups = ARTIFACT_KEYS.map(key => unit.artifacts[key]);
  const complete = groups.filter(current => current && (
    current.status === 'READY' || current.status === 'APPROVED' ||
    (current.status === 'NOT_APPLICABLE' && Boolean(current.reason))
  )).length;

  return {
    complete,
    total: ARTIFACT_KEYS.length,
    percent: Math.round((complete / ARTIFACT_KEYS.length) * 100)
  };
}

export interface RegisterExternalArtifactInput {
  groupKey: 'slides' | 'voice' | 'video';
  kind: 'SLIDES_OUTPUT' | 'VOICE_OUTPUT' | 'VIDEO_OUTPUT';
  driveFileId?: string;
  url?: string;
  actor: string;
  now: string;
}

const EXTERNAL_KIND_BY_GROUP = {
  slides: 'SLIDES_OUTPUT',
  voice: 'VOICE_OUTPUT',
  video: 'VIDEO_OUTPUT'
} as const;

export class ExternalArtifactRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExternalArtifactRegistrationError';
  }
}

export function registerExternalArtifact(
  unit: UnitManifest,
  input: RegisterExternalArtifactInput
): UnitManifest {
  if (!input.driveFileId?.trim() && !input.url?.trim()) {
    throw new ExternalArtifactRegistrationError('External artifact requires driveFileId or url');
  }
  if (EXTERNAL_KIND_BY_GROUP[input.groupKey] !== input.kind) {
    throw new ExternalArtifactRegistrationError(`Artifact kind ${input.kind} does not belong to ${input.groupKey}`);
  }

  const currentGroup = unit.artifacts[input.groupKey];
  if (!currentGroup) {
    throw new ExternalArtifactRegistrationError(`Missing artifact group: ${input.groupKey}`);
  }
  const itemIndex = currentGroup.items.findIndex(item => item.kind === input.kind);
  if (itemIndex < 0) {
    throw new ExternalArtifactRegistrationError(`Missing artifact item: ${input.kind}`);
  }

  const updatedItems = currentGroup.items.map((item, index) => index === itemIndex ? {
    ...item,
    status: 'READY' as const,
    driveFileId: input.driveFileId?.trim() || null,
    url: input.url?.trim() || null,
    generatedAt: input.now
  } : item);
  const groupReady = updatedItems.every(item =>
    item.status === 'READY' || item.status === 'APPROVED' || item.status === 'NOT_APPLICABLE'
  );

  return {
    ...unit,
    artifacts: {
      ...unit.artifacts,
      [input.groupKey]: {
        ...currentGroup,
        items: updatedItems,
        status: groupReady ? 'READY' : currentGroup.status
      }
    },
    history: [...unit.history, {
      timestamp: input.now,
      actor: input.actor,
      action: 'artifact.external.register',
      previous: input.kind,
      next: 'READY',
      evidence: [input.driveFileId, input.url].filter((value): value is string => Boolean(value))
    }]
  };
}

export interface ApproveGateInput {
  gateType: 'SLIDES' | 'VOICE' | 'FINAL_PUBLICATION';
  approvedBy: string;
  approvedAt: string;
  evidence: string[];
}

const GATE_CONFIG = {
  SLIDES: { gateKey: 'slides', groupKey: 'slides', kind: 'SLIDES_OUTPUT' },
  VOICE: { gateKey: 'voice', groupKey: 'voice', kind: 'VOICE_OUTPUT' },
  FINAL_PUBLICATION: { gateKey: 'finalPublication', groupKey: 'video', kind: 'VIDEO_OUTPUT' }
} as const;

const ISO_UTC_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export class GateApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GateApprovalError';
  }
}

export function approveGate(unit: UnitManifest, input: ApproveGateInput): UnitManifest {
  if (!input.approvedBy.trim()) throw new GateApprovalError('approvedBy is required');
  if (!ISO_UTC_DATETIME.test(input.approvedAt) || Number.isNaN(Date.parse(input.approvedAt))) {
    throw new GateApprovalError('approvedAt must be an ISO UTC datetime');
  }
  const evidence = input.evidence.filter(item => item.trim().length > 0);
  if (evidence.length === 0) throw new GateApprovalError('Gate approval requires evidence');

  const config = GATE_CONFIG[input.gateType];
  const artifactGroup = unit.artifacts[config.groupKey];
  const output = artifactGroup?.items.find(item => item.kind === config.kind);
  if (!output || (!output.driveFileId && !output.url)) {
    throw new GateApprovalError(`${input.gateType} approval requires registered ${config.kind}`);
  }

  const previousGate = unit.gates[config.gateKey];
  const approvedGate: Gate = {
    gateType: input.gateType,
    status: 'APPROVED',
    approvedBy: input.approvedBy.trim(),
    approvedAt: input.approvedAt,
    evidence
  };

  return {
    ...unit,
    gates: { ...unit.gates, [config.gateKey]: approvedGate },
    history: [...unit.history, {
      timestamp: input.approvedAt,
      actor: input.approvedBy.trim(),
      action: 'gate.approve',
      previous: previousGate?.status ?? 'PENDING',
      next: 'APPROVED',
      evidence
    }]
  };
}
