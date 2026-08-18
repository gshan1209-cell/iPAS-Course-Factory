import type { UnitManifest } from '@ipas-course-factory/schemas';
import {
  assertUnitStatus,
  markGeneratedArtifactReady,
  markUnitGenerationFailure,
  transitionUnit
} from '@ipas-course-factory/core';
import type { ArtifactDocumentPort, SourceText } from '@ipas-course-factory/drive';
import type { GenerationPort, GenerationResult } from './port.js';
import { renderTemplate, type TemplateVariables } from './render.js';
import type { TemplateContractKey } from './template-registry.js';

const TEACHING_CHECKLIST = {
  plainLanguage: true,
  practicalExample: true,
  examFocus: true,
  commonTrap: true,
  mnemonic: true
} as const;

const OUTPUTS = {
  sourceBrief: {
    artifactKind: 'SOURCE_BRIEF', template: 'sourceBrief', groupKey: 'sourceBrief', itemKind: 'SOURCE_BRIEF',
    folderKey: 'source', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_SourceBrief_v1.0`
  },
  slides: {
    artifactKind: 'SLIDES_PROMPT', template: 'slides', groupKey: 'slides', itemKind: 'SLIDES_PROMPT',
    folderKey: 'slides', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_NotebookLM大師級簡報Prompt_v1.0`
  },
  voice: {
    artifactKind: 'VOICE_PROMPT', template: 'voice', groupKey: 'voice', itemKind: 'VOICE_PROMPT',
    folderKey: 'voice', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_NotebookLM逐頁語音Prompt_v1.0`
  },
  handout: {
    artifactKind: 'COURSE_HANDOUT', template: 'handout', groupKey: 'handout', itemKind: 'COURSE_HANDOUT',
    folderKey: 'handout', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_課程講義_v1.0`
  },
  desktopExplainers: {
    artifactKind: 'DESKTOP_EXPLAINERS', template: 'desktopExplainers', groupKey: 'desktopExplainers', itemKind: 'DESKTOP_EXPLAINERS',
    folderKey: 'desktopExplainers', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_電腦詳解圖腳本_v1.0`
  },
  mobileCards: {
    artifactKind: 'MOBILE_KEY_CARDS', template: 'mobileCards', groupKey: 'mobileCards', itemKind: 'MOBILE_KEY_CARDS',
    folderKey: 'mobileCards', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_手機重點卡腳本_v1.0`
  },
  formulaDecisionCard: {
    artifactKind: 'FORMULA_DECISION_CARD', template: 'formulaDecisionCard', groupKey: 'formulaDecisionCard', itemKind: 'FORMULA_DECISION_CARD',
    folderKey: 'formulaDecisionCard', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_公式或判斷卡_v1.0`
  },
  officialQuestionBreakdown: {
    artifactKind: 'OFFICIAL_QUESTION_BREAKDOWN', template: 'officialQuestionBreakdown', groupKey: 'officialQuestionBreakdown', itemKind: 'OFFICIAL_QUESTION_BREAKDOWN',
    folderKey: 'officialQuestionBreakdown', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_正式題拆解_v1.0`
  },
  questionBank: {
    artifactKind: 'UNIT_QUESTION_BANK', template: 'questionBank', groupKey: 'questionBank', itemKind: 'UNIT_QUESTION_BANK',
    folderKey: 'questionBank', name: (unit: UnitManifest) => `中級_${unit.subjectId}_${unit.unitId}_單元題庫_v1.0`
  }
} as const;

type OutputKey = keyof typeof OUTPUTS;
type OutputDefinition = typeof OUTPUTS[OutputKey];

export interface ContentGenerationInput {
  unit: UnitManifest;
  sourcePack: SourceText[];
  generation: GenerationPort;
  documents: ArtifactDocumentPort;
  templateVariables: TemplateVariables;
  actor: string;
  now: () => string;
  templateRoot?: string;
}

export interface ContentGenerationResult {
  unit: UnitManifest;
  generated: Record<string, GenerationResult>;
}

export class ContentGenerationFailure extends Error {
  constructor(
    message: string,
    public readonly unit: UnitManifest,
    public readonly artifactId: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'ContentGenerationFailure';
  }
}

export class MissingDriveFolderMappingError extends Error {
  constructor(public readonly folderKey: string) {
    super(`Missing Drive folder mapping: ${folderKey}`);
    this.name = 'MissingDriveFolderMappingError';
  }
}

export class QuestionBankValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionBankValidationError';
  }
}

export function formatSourcePack(sourcePack: SourceText[]): string {
  return sourcePack.map(source => [
    `## [${source.tier}] ${source.sourceId}｜${source.title}`,
    source.text.trim()
  ].join('\n')).join('\n\n');
}

function buildVariables(
  input: ContentGenerationInput,
  overrides: TemplateVariables = {}
): TemplateVariables {
  return {
    course: input.unit.courseId,
    level: input.unit.level,
    subject: input.unit.subjectId,
    unit: `${input.unit.unitId}｜${input.unit.title}`,
    core_thesis: input.unit.coreThesis,
    source_pack: formatSourcePack(input.sourcePack),
    ...input.templateVariables,
    ...overrides
  };
}

function getItem(unit: UnitManifest, groupKey: string, itemKind: string) {
  const group = unit.artifacts[groupKey];
  return group?.items.find(item => item.kind === itemKind);
}

function getFolderId(unit: UnitManifest, folderKey: string): string {
  const folderId = unit.drive.folders[folderKey];
  if (!folderId) throw new MissingDriveFolderMappingError(folderKey);
  return folderId;
}

function generationMetadata(result: GenerationResult, extra: Record<string, unknown> = {}) {
  return {
    teachingChecklist: { ...TEACHING_CHECKLIST },
    generation: {
      provider: result.provider,
      model: result.model,
      responseId: result.responseId
    },
    ...extra
  };
}

async function generateAndPersist(
  input: ContentGenerationInput,
  unit: UnitManifest,
  definition: OutputDefinition,
  variables: TemplateVariables,
  metadataFactory?: (result: GenerationResult) => Record<string, unknown>
): Promise<{ unit: UnitManifest; result: GenerationResult }> {
  const prompt = await renderTemplate(definition.template as TemplateContractKey, variables, {
    templateRoot: input.templateRoot
  });
  const sourceIds = input.sourcePack.map(source => source.sourceId);
  const result = await input.generation.generate({
    artifactKind: definition.artifactKind,
    systemInstructions: 'Use only the governed source pack and preserve source boundaries. Do not present unsupported content as an official iPAS exam claim.',
    prompt,
    sourceIds
  });

  const item = getItem(unit, definition.groupKey, definition.itemKind);
  if (!item) throw new Error(`Missing artifact item: ${definition.groupKey}/${definition.itemKind}`);

  const document = await input.documents.upsertTextDocument({
    parentId: getFolderId(unit, definition.folderKey),
    name: definition.name(unit),
    text: result.text,
    existingFileId: item.driveFileId
  });
  const generatedAt = input.now();

  return {
    result,
    unit: markGeneratedArtifactReady(unit, {
      groupKey: definition.groupKey,
      itemKind: definition.itemKind,
      driveFileId: document.fileId,
      url: document.url,
      sourceIds,
      generatedAt,
      metadata: metadataFactory ? metadataFactory(result) : generationMetadata(result),
      actor: input.actor
    })
  };
}

function failureManifest(
  unit: UnitManifest,
  input: ContentGenerationInput,
  artifactId: string,
  error: unknown
): UnitManifest {
  const message = error instanceof Error ? error.message : String(error);
  return markUnitGenerationFailure(unit, {
    artifactId,
    code: 'ARTIFACT_GENERATION_FAILED',
    message,
    actor: input.actor,
    now: input.now()
  });
}

export async function generateSourceBrief(input: ContentGenerationInput): Promise<ContentGenerationResult> {
  assertUnitStatus(input.unit, 'SOURCE_READY');
  const definition = OUTPUTS.sourceBrief;
  const generated: Record<string, GenerationResult> = {};
  let working = input.unit;
  let modelCompleted = false;

  try {
    const prompt = await renderTemplate(definition.template, buildVariables(input), { templateRoot: input.templateRoot });
    const sourceIds = input.sourcePack.map(source => source.sourceId);
    const result = await input.generation.generate({
      artifactKind: definition.artifactKind,
      systemInstructions: 'Build a governed source brief. Official scope and errata control exam-bound claims.',
      prompt,
      sourceIds
    });
    modelCompleted = true;
    generated[resultKey(definition)] = result;

    const item = getItem(working, definition.groupKey, definition.itemKind);
    if (!item) throw new Error(`Missing artifact item: ${definition.itemKind}`);
    const document = await input.documents.upsertTextDocument({
      parentId: getFolderId(working, definition.folderKey),
      name: definition.name(working),
      text: result.text,
      existingFileId: item.driveFileId
    });
    const now = input.now();
    working = markGeneratedArtifactReady(working, {
      groupKey: definition.groupKey,
      itemKind: definition.itemKind,
      driveFileId: document.fileId,
      url: document.url,
      sourceIds,
      generatedAt: now,
      metadata: generationMetadata(result),
      actor: input.actor
    });
    working = transitionUnit(working, 'BRIEF_READY', {
      actor: input.actor,
      now: input.now(),
      evidence: [`artifact:${definition.itemKind}`, `drive:${document.fileId}`]
    });
    return { unit: working, generated };
  } catch (error) {
    if (!modelCompleted) throw error;
    const artifactId = getItem(working, definition.groupKey, definition.itemKind)?.artifactId ?? 'sourceBrief.document';
    const failed = failureManifest(working, input, artifactId, error);
    throw new ContentGenerationFailure(
      `Source Brief generation failed after model output: ${error instanceof Error ? error.message : String(error)}`,
      failed,
      artifactId,
      { cause: error }
    );
  }
}

function resultKey(definition: OutputDefinition): string {
  return definition.artifactKind;
}

interface ParsedQuestion {
  questionId: string;
  topic: string;
  stem: string;
  options: string[];
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  distractorReasoning: Record<string, string>;
  sourceIds: string[];
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseQuestionBankMetadata(text: string, allowedSourceIds: string[]): ParsedQuestion[] {
  const start = '<QUESTION_BANK_JSON>';
  const end = '</QUESTION_BANK_JSON>';
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex < 0 || endIndex <= startIndex) {
    throw new QuestionBankValidationError('Question bank is missing machine-readable JSON markers');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text.slice(startIndex + start.length, endIndex).trim());
  } catch (error) {
    throw new QuestionBankValidationError(`Question bank JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }

  const questions = (payload as { questions?: unknown })?.questions;
  if (!Array.isArray(questions) || questions.length !== 15) {
    throw new QuestionBankValidationError('Question bank JSON must contain exactly 15 questions');
  }

  const allowed = new Set(allowedSourceIds);
  const ids = new Set<string>();
  return questions.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new QuestionBankValidationError(`Question ${index + 1} must be an object`);
    const question = raw as Record<string, unknown>;
    if (!nonEmptyString(question.questionId) || ids.has(question.questionId)) {
      throw new QuestionBankValidationError(`Question ${index + 1} has a missing or duplicate questionId`);
    }
    ids.add(question.questionId);
    if (!nonEmptyString(question.topic) || !nonEmptyString(question.stem) || !nonEmptyString(question.explanation)) {
      throw new QuestionBankValidationError(`Question ${question.questionId} is missing topic, stem, or explanation`);
    }
    if (!Array.isArray(question.options) || question.options.length !== 4 || !question.options.every(nonEmptyString)) {
      throw new QuestionBankValidationError(`Question ${question.questionId} must have exactly four non-empty options`);
    }
    if (!['A', 'B', 'C', 'D'].includes(String(question.answer))) {
      throw new QuestionBankValidationError(`Question ${question.questionId} has an invalid answer`);
    }
    if (!question.distractorReasoning || typeof question.distractorReasoning !== 'object') {
      throw new QuestionBankValidationError(`Question ${question.questionId} is missing distractorReasoning`);
    }
    const answer = question.answer as 'A' | 'B' | 'C' | 'D';
    const requiredDistractors = ['A', 'B', 'C', 'D'].filter(option => option !== answer);
    const distractors = question.distractorReasoning as Record<string, unknown>;
    if (!requiredDistractors.every(option => nonEmptyString(distractors[option]))) {
      throw new QuestionBankValidationError(`Question ${question.questionId} must explain every incorrect option`);
    }
    if (!Array.isArray(question.sourceIds) || question.sourceIds.length === 0 || !question.sourceIds.every(nonEmptyString)) {
      throw new QuestionBankValidationError(`Question ${question.questionId} must include sourceIds`);
    }
    const sourceIds = question.sourceIds as string[];
    const unknown = sourceIds.filter(sourceId => !allowed.has(sourceId));
    if (unknown.length > 0) {
      throw new QuestionBankValidationError(`Question ${question.questionId} references unknown source IDs: ${unknown.join(', ')}`);
    }

    return {
      questionId: question.questionId,
      topic: question.topic,
      stem: question.stem,
      options: question.options as string[],
      answer,
      explanation: question.explanation,
      distractorReasoning: Object.fromEntries(requiredDistractors.map(option => [option, String(distractors[option])] as const)),
      sourceIds
    };
  });
}

const PACK_ORDER: OutputKey[] = [
  'slides', 'voice', 'handout', 'desktopExplainers', 'mobileCards',
  'formulaDecisionCard', 'officialQuestionBreakdown', 'questionBank'
];

export async function generatePreNotebookContentPack(
  input: ContentGenerationInput
): Promise<ContentGenerationResult> {
  assertUnitStatus(input.unit, 'BRIEF_READY');
  let working = transitionUnit(input.unit, 'CONTENT_GENERATING', {
    actor: input.actor,
    now: input.now(),
    evidence: ['phase:pre-notebook-content-pack']
  });
  const generated: Record<string, GenerationResult> = {};

  for (const key of PACK_ORDER) {
    const definition = OUTPUTS[key];
    const artifactId = getItem(working, definition.groupKey, definition.itemKind)?.artifactId
      ?? `${definition.groupKey}.${definition.itemKind}`;
    try {
      const overrides: TemplateVariables = {};
      if (key === 'voice') {
        const slides = generated.SLIDES_PROMPT;
        if (!slides) throw new Error('VOICE_PROMPT requires generated SLIDES_PROMPT as slide_outline');
        overrides.slide_outline = slides.text;
      }
      const variables = buildVariables(input, overrides);
      const persisted = await generateAndPersist(
        input,
        working,
        definition,
        variables,
        key === 'questionBank'
          ? result => generationMetadata(result, {
              questions: parseQuestionBankMetadata(result.text, input.sourcePack.map(source => source.sourceId))
            })
          : undefined
      );
      working = persisted.unit;
      generated[resultKey(definition)] = persisted.result;
    } catch (error) {
      const failed = failureManifest(working, input, artifactId, error);
      throw new ContentGenerationFailure(
        `Content pack failed at ${definition.artifactKind}: ${error instanceof Error ? error.message : String(error)}`,
        failed,
        artifactId,
        { cause: error }
      );
    }
  }

  working = transitionUnit(working, 'CONTENT_READY', {
    actor: input.actor,
    now: input.now(),
    evidence: PACK_ORDER.map(key => `artifact:${OUTPUTS[key].itemKind}`)
  });
  return { unit: working, generated };
}
