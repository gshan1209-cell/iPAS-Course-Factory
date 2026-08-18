import { describe, expect, it } from 'vitest';
import type { UnitManifest } from '@ipas-course-factory/schemas';
import { createDefaultArtifactGroups } from '@ipas-course-factory/core';
import type { ArtifactDocumentPort, SourceText } from '@ipas-course-factory/drive';
import type { GenerationPort, GenerationRequest } from '../src/port.js';
import {
  ContentGenerationFailure,
  generatePreNotebookContentPack,
  generateSourceBrief
} from '../src/content-pack.js';

const sourcePack: SourceText[] = [
  { sourceId: 'scope', tier: 'S0', title: 'Scope', text: 'Computer Vision scope' },
  { sourceId: 'guide', tier: 'S1', title: 'Guide', text: 'Classification Detection Segmentation' }
];

const makeUnit = (status: UnitManifest['status']): UnitManifest => ({
  schemaVersion: 1,
  unitId: 'M1-03',
  courseId: 'ipas-ai-planner',
  level: 'intermediate',
  subjectId: 'M1',
  title: 'Computer Vision',
  coreThesis: 'AI 看一張圖，其實可能在回答三種不同問題。',
  status,
  drive: {
    unitFolderId: 'unit-root',
    folders: {
      source: 'f01', slides: 'f02', voice: 'f03', video: 'f04', handout: 'f05',
      desktopExplainers: 'f06', mobileCards: 'f07', formulaDecisionCard: 'f08',
      officialQuestionBreakdown: 'f09', questionBank: 'f10'
    }
  },
  sources: sourcePack.map(source => source.sourceId),
  artifacts: createDefaultArtifactGroups(),
  gates: {},
  qa: { status: 'NOT_RUN', findings: [] },
  history: []
});

class FakeGenerator implements GenerationPort {
  readonly calls: GenerationRequest[] = [];
  failOn: string | null = null;

  async generate(request: GenerationRequest) {
    this.calls.push(request);
    if (request.artifactKind === this.failOn) throw new Error(`generation failed:${request.artifactKind}`);
    if (request.artifactKind === 'UNIT_QUESTION_BANK') {
      const questions = Array.from({ length: 15 }, (_, index) => {
        const n = String(index + 1).padStart(3, '0');
        return {
          questionId: `M1-03-Q${n}`,
          topic: 'Computer Vision',
          stem: `Stem ${n}`,
          options: ['A one', 'B two', 'C three', 'D four'],
          answer: 'B',
          explanation: 'Because B is correct.',
          distractorReasoning: { A: 'wrong', C: 'wrong', D: 'wrong' },
          sourceIds: ['guide']
        };
      });
      return {
        text: `Readable bank\n<QUESTION_BANK_JSON>\n${JSON.stringify({ questions })}\n</QUESTION_BANK_JSON>`,
        provider: 'fake', model: 'fake-model', responseId: 'resp-bank'
      };
    }
    return {
      text: `generated:${request.artifactKind}`,
      provider: 'fake', model: 'fake-model', responseId: `resp-${request.artifactKind}`
    };
  }
}

class FakeDocuments implements ArtifactDocumentPort {
  readonly calls: Array<{ parentId: string; name: string; text: string; existingFileId?: string | null }> = [];
  failOnName: string | null = null;
  private sequence = 0;

  async upsertTextDocument(input: { parentId: string; name: string; text: string; existingFileId?: string | null }) {
    this.calls.push(input);
    if (input.name === this.failOnName) throw new Error(`drive failed:${input.name}`);
    const fileId = input.existingFileId ?? `doc-${++this.sequence}`;
    return { fileId, url: `https://docs.google.com/document/d/${fileId}/edit` };
  }
}

const templateVariables = {
  course: 'iPAS AI 應用規劃師',
  level: '中級',
  subject: '科目一',
  official_scope: 'Computer Vision',
  exam_focus: '分類、偵測、分割',
  known_traps: '分類與偵測不可混淆',
  visual_motif: '視覺掃描線',
  official_question_refs: 'Q-CV-01'
};

const clock = () => '2026-08-18T08:00:00.000Z';

describe('content pack orchestration', () => {
  it('generates and persists Source Brief before advancing to BRIEF_READY', async () => {
    const generation = new FakeGenerator();
    const documents = new FakeDocuments();
    const result = await generateSourceBrief({
      unit: makeUnit('SOURCE_READY'), sourcePack, generation, documents,
      templateVariables, actor: 'factory', now: clock,
      templateRoot: new URL('../../../templates/', import.meta.url).pathname
    });

    expect(generation.calls.map(call => call.artifactKind)).toEqual(['SOURCE_BRIEF']);
    expect(documents.calls[0]?.parentId).toBe('f01');
    expect(documents.calls[0]?.name).toBe('中級_M1_M1-03_SourceBrief_v1.0');
    expect(result.unit.status).toBe('BRIEF_READY');
    expect(result.unit.artifacts.sourceBrief.status).toBe('READY');
    expect(result.unit.artifacts.sourceBrief.items[0]?.sourceIds).toEqual(['scope', 'guide']);
    expect(result.unit.artifacts.sourceBrief.items[0]?.driveFileId).toBe('doc-1');
  });

  it('generates exactly eight remaining pre-Notebook artifacts and never external outputs', async () => {
    const generation = new FakeGenerator();
    const documents = new FakeDocuments();
    const result = await generatePreNotebookContentPack({
      unit: makeUnit('BRIEF_READY'), sourcePack, generation, documents,
      templateVariables, actor: 'factory', now: clock,
      templateRoot: new URL('../../../templates/', import.meta.url).pathname
    });

    expect(generation.calls.map(call => call.artifactKind)).toEqual([
      'SLIDES_PROMPT', 'VOICE_PROMPT', 'COURSE_HANDOUT', 'DESKTOP_EXPLAINERS',
      'MOBILE_KEY_CARDS', 'FORMULA_DECISION_CARD', 'OFFICIAL_QUESTION_BREAKDOWN',
      'UNIT_QUESTION_BANK'
    ]);
    expect(generation.calls.map(call => call.artifactKind)).not.toContain('SLIDES_OUTPUT');
    expect(generation.calls.map(call => call.artifactKind)).not.toContain('VOICE_OUTPUT');
    expect(generation.calls.map(call => call.artifactKind)).not.toContain('VIDEO_OUTPUT');
    expect(documents.calls.map(call => call.parentId)).toEqual(['f02','f03','f05','f06','f07','f08','f09','f10']);
    expect(result.unit.status).toBe('CONTENT_READY');
    expect(result.unit.artifacts.slides.status).toBe('GENERATING');
    expect(result.unit.artifacts.voice.status).toBe('GENERATING');
    expect(result.unit.artifacts.handout.status).toBe('READY');
    expect(result.unit.artifacts.questionBank.items[0]?.metadata.questions).toHaveLength(15);
    expect(generation.calls[1]?.prompt).toContain('generated:SLIDES_PROMPT');
  });

  it('preserves completed IDs and returns a QA_FAILED manifest when a later Drive write fails', async () => {
    const generation = new FakeGenerator();
    const documents = new FakeDocuments();
    documents.failOnName = '中級_M1_M1-03_課程講義_v1.0';

    let failure: ContentGenerationFailure | undefined;
    try {
      await generatePreNotebookContentPack({
        unit: makeUnit('BRIEF_READY'), sourcePack, generation, documents,
        templateVariables, actor: 'factory', now: clock,
        templateRoot: new URL('../../../templates/', import.meta.url).pathname
      });
    } catch (error) {
      failure = error as ContentGenerationFailure;
    }

    expect(failure).toBeInstanceOf(ContentGenerationFailure);
    expect(failure?.unit.status).toBe('QA_FAILED');
    expect(failure?.unit.artifacts.slides.items.find(item => item.kind === 'SLIDES_PROMPT')?.driveFileId).toBe('doc-1');
    expect(failure?.unit.artifacts.voice.items.find(item => item.kind === 'VOICE_PROMPT')?.driveFileId).toBe('doc-2');
    expect(failure?.unit.qa.findings.at(-1)?.artifactId).toBe('handout.document');
  });
});
