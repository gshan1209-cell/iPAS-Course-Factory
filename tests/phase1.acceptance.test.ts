import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Course, Source, SourceMapping, Subject, UnitManifest } from '@ipas-course-factory/schemas';
import type { DriveNode, DrivePort, SourceFilePort, ArtifactDocumentPort } from '@ipas-course-factory/drive';
import type { GenerationPort, GenerationRequest } from '@ipas-course-factory/generator';
import { runCli, type CliContainer } from '../apps/cli/src/index.js';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const templateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates');

const guide: Source = {
  sourceId: 'acceptance-guide',
  tier: 'S1',
  title: 'Acceptance Guide',
  provider: 'iPAS',
  driveFileId: 'guide-file',
  scope: ['Computer Vision'],
  effectiveDate: null,
  supersedes: [],
  corrects: []
};

const exam: Source = {
  sourceId: 'acceptance-exam',
  tier: 'S3',
  title: 'Acceptance Exam',
  provider: 'iPAS',
  driveFileId: 'exam-file',
  scope: ['Computer Vision'],
  effectiveDate: null,
  supersedes: [],
  corrects: []
};

const course: Course = {
  schemaVersion: 1,
  courseId: 'ipas-ai-planner',
  name: 'iPAS AI 應用規劃師',
  provider: 'iPAS',
  authority: 'iPAS',
  levels: ['intermediate'],
  status: 'ACTIVE',
  driveRootFolderId: 'course-root'
};

const initialSubject: Subject = {
  schemaVersion: 1,
  subjectId: 'M1',
  courseId: course.courseId,
  level: 'intermediate',
  name: '人工智慧技術應用與規劃',
  badge: 'AI PLANNER',
  unitIds: [],
  driveFolderId: 'subject-root'
};

const sourceMapping: SourceMapping = {
  schemaVersion: 1,
  unitId: 'M1-99',
  sourceIds: [guide.sourceId, exam.sourceId],
  scope: ['Computer Vision'],
  officialQuestionRefs: [{ sourceId: exam.sourceId, questions: ['Q-CV-01'] }],
  templateVariables: {
    official_scope: 'Computer Vision：Classification / Detection / Segmentation',
    exam_focus: '辨識 Classification、Detection、Segmentation 的任務差異',
    known_traps: '分類只回答是什麼；偵測還要回答在哪裡；分割細到像素',
    visual_motif: '視覺掃描線與逐步變清晰的學習導引光'
  }
};

class AcceptanceDrive implements DrivePort, SourceFilePort {
  readonly nodes = new Map<string, DriveNode>();
  readonly createCalls: Array<{ parentId: string; name: string }> = [];
  private sequence = 0;

  async listChildren(parentId: string): Promise<DriveNode[]> {
    return [...this.nodes.values()].filter(node => node.parentId === parentId);
  }

  async createFolder(parentId: string, name: string): Promise<DriveNode> {
    const node: DriveNode = {
      id: `folder-${++this.sequence}`,
      name,
      mimeType: FOLDER_MIME_TYPE,
      parentId
    };
    this.nodes.set(node.id, node);
    this.createCalls.push({ parentId, name });
    return node;
  }

  async getNode(id: string): Promise<DriveNode | null> {
    return this.nodes.get(id) ?? null;
  }

  async readTextFile(fileId: string): Promise<{ mimeType: string; text: string }> {
    if (fileId === guide.driveFileId) {
      return { mimeType: 'text/plain', text: 'Computer Vision includes classification, object detection, and segmentation.' };
    }
    if (fileId === exam.driveFileId) {
      return { mimeType: 'text/plain', text: 'Official-question evidence for Computer Vision task distinctions.' };
    }
    throw new Error(`Unknown fake source file: ${fileId}`);
  }
}

class AcceptanceDocuments implements ArtifactDocumentPort {
  readonly calls: Array<{ parentId: string; name: string; text: string; existingFileId?: string | null }> = [];
  readonly texts = new Map<string, string>();
  private sequence = 0;

  async upsertTextDocument(input: {
    parentId: string;
    name: string;
    text: string;
    existingFileId?: string | null;
  }): Promise<{ fileId: string; url: string }> {
    const fileId = input.existingFileId ?? `doc-${++this.sequence}`;
    this.calls.push(input);
    this.texts.set(fileId, input.text);
    return { fileId, url: `https://docs.google.com/document/d/${fileId}/edit` };
  }
}

function validQuestionBankText(): string {
  const questions = Array.from({ length: 15 }, (_, index) => {
    const n = String(index + 1).padStart(3, '0');
    return {
      questionId: `M1-99-Q${n}`,
      topic: 'Computer Vision',
      stem: `Acceptance stem ${n}`,
      options: ['A Classification', 'B Detection', 'C Segmentation', 'D None'],
      answer: 'B',
      explanation: 'Detection answers both what and where.',
      distractorReasoning: {
        A: 'Classification does not localize the object.',
        C: 'Segmentation is pixel-level rather than a bounding-box task.',
        D: 'Detection is the matching task.'
      },
      sourceIds: [guide.sourceId, exam.sourceId]
    };
  });
  return `Readable question bank\n<QUESTION_BANK_JSON>\n${JSON.stringify({ questions })}\n</QUESTION_BANK_JSON>`;
}

class AcceptanceGeneration implements GenerationPort {
  readonly calls: GenerationRequest[] = [];

  async generate(request: GenerationRequest) {
    this.calls.push(request);
    return {
      text: request.artifactKind === 'UNIT_QUESTION_BANK'
        ? validQuestionBankText()
        : `generated:${request.artifactKind}`,
      provider: 'acceptance-fake',
      model: 'acceptance-model',
      responseId: `resp-${request.artifactKind}`
    };
  }
}

interface AcceptanceContainer extends CliContainer {
  units: Map<string, UnitManifest>;
  drive: AcceptanceDrive;
  documents: AcceptanceDocuments;
  generation: AcceptanceGeneration;
}

function createAcceptanceContainer(): AcceptanceContainer {
  const units = new Map<string, UnitManifest>();
  let subject = structuredClone(initialSubject);
  const drive = new AcceptanceDrive();
  const documents = new AcceptanceDocuments();
  const generation = new AcceptanceGeneration();
  let clockTick = 0;

  return {
    units,
    drive,
    documents,
    generation,
    actor: 'acceptance-human',
    now: () => new Date(Date.UTC(2026, 7, 18, 10, 0, clockTick++)).toISOString(),
    templateRoot,
    store: {
      async loadUnit(unitId) {
        const unit = units.get(unitId);
        if (!unit) throw new Error(`Missing acceptance unit: ${unitId}`);
        return structuredClone(unit);
      },
      async saveUnit(unit) {
        units.set(unit.unitId, structuredClone(unit));
      },
      async loadCourse(courseId) {
        if (courseId !== course.courseId) throw new Error(`Unknown course: ${courseId}`);
        return structuredClone(course);
      },
      async findSubject(level, subjectId) {
        if (level !== subject.level || subjectId !== subject.subjectId) throw new Error('Unknown subject');
        return { catalogKey: 'intermediate-M1', subject: structuredClone(subject) };
      },
      async saveSubject(_catalogKey, next) {
        subject = structuredClone(next);
      },
      async listSources() {
        return [structuredClone(guide), structuredClone(exam)];
      },
      async loadSourceMapping(unitId) {
        if (unitId !== sourceMapping.unitId) throw new Error(`Unknown source mapping: ${unitId}`);
        return structuredClone(sourceMapping);
      }
    },
    getDrive: () => drive,
    getDocuments: () => documents,
    getGeneration: () => generation
  };
}

describe('Phase 1 acceptance lifecycle', () => {
  it('reaches VOICE_PENDING while preserving every human gate invariant', async () => {
    const container = createAcceptanceContainer();

    await runCli([
      'unit', 'create', 'M1-99',
      '--course', course.courseId,
      '--level', 'intermediate',
      '--subject', 'M1',
      '--title', 'Computer Vision',
      '--core-thesis', 'AI 看一張圖，其實可能在回答三種不同問題。'
    ], container);
    expect(container.units.get('M1-99')?.status).toBe('PLANNED');

    await runCli(['source', 'attach', 'M1-99', guide.sourceId], container);
    await runCli(['source', 'attach', 'M1-99', exam.sourceId], container);
    expect(container.units.get('M1-99')?.status).toBe('SOURCE_READY');
    expect(container.units.get('M1-99')?.sources).toEqual([guide.sourceId, exam.sourceId]);

    await runCli(['drive', 'ensure', 'M1-99'], container);
    const firstDriveCreateCount = container.drive.createCalls.length;
    const firstWorkspace = structuredClone(container.units.get('M1-99')?.drive);
    await runCli(['drive', 'ensure', 'M1-99'], container);
    expect(firstDriveCreateCount).toBe(11);
    expect(container.drive.createCalls).toHaveLength(firstDriveCreateCount);
    expect(container.units.get('M1-99')?.drive).toEqual(firstWorkspace);

    await runCli(['generate', 'brief', 'M1-99'], container);
    expect(container.units.get('M1-99')?.status).toBe('BRIEF_READY');
    expect(container.units.get('M1-99')?.artifacts.sourceBrief.items[0]?.driveFileId).toBe('doc-1');

    await runCli(['generate', 'content-pack', 'M1-99'], container);
    const contentReady = container.units.get('M1-99')!;
    expect(contentReady.status).toBe('CONTENT_READY');
    expect(container.generation.calls.map(call => call.artifactKind)).toEqual([
      'SOURCE_BRIEF', 'SLIDES_PROMPT', 'VOICE_PROMPT', 'COURSE_HANDOUT', 'DESKTOP_EXPLAINERS',
      'MOBILE_KEY_CARDS', 'FORMULA_DECISION_CARD', 'OFFICIAL_QUESTION_BREAKDOWN', 'UNIT_QUESTION_BANK'
    ]);
    expect(Object.keys(contentReady.artifacts)).toHaveLength(10);
    expect(contentReady.artifacts.handout.items[0]?.driveFileId).toBe('doc-4');
    expect(container.documents.calls).toHaveLength(9);

    await runCli(['qa', 'run', 'M1-99'], container);
    expect(container.units.get('M1-99')?.status).toBe('NOTEBOOKLM_PENDING');
    expect(container.units.get('M1-99')?.qa.status).toBe('PASSED');

    await runCli(['artifact', 'register', 'M1-99', 'slides', '--url', 'https://example.com/notebooklm/slides'], container);
    expect(container.units.get('M1-99')?.gates.slides?.status).toBe('PENDING');

    await runCli(['transition', 'M1-99', 'SLIDES_REVIEW', '--evidence', 'slides-output-registered'], container);
    expect(container.units.get('M1-99')?.status).toBe('SLIDES_REVIEW');

    await expect(runCli([
      'transition', 'M1-99', 'PUBLISHED', '--evidence', 'attempted-gate-bypass'
    ], container)).rejects.toThrow();
    expect(container.units.get('M1-99')?.status).toBe('SLIDES_REVIEW');
    expect(container.units.get('M1-99')?.gates.finalPublication?.status).toBe('PENDING');

    await runCli([
      'transition', 'M1-99', 'SLIDES_APPROVED', '--evidence', 'human-reviewed-slides'
    ], container);
    await runCli([
      'transition', 'M1-99', 'VOICE_PENDING', '--evidence', 'slides-approved-next-voice'
    ], container);

    const final = container.units.get('M1-99')!;
    expect(final.status).toBe('VOICE_PENDING');
    expect(final.gates.slides?.status).toBe('APPROVED');
    expect(final.gates.slides?.evidence).toContain('human-reviewed-slides');
    expect(final.gates.voice?.status).toBe('PENDING');
    expect(final.gates.finalPublication?.status).toBe('PENDING');
    expect(final.artifacts.slides.items.find(item => item.kind === 'SLIDES_OUTPUT')?.url)
      .toBe('https://example.com/notebooklm/slides');
    expect(final.history.some(entry => entry.action === 'artifact.generated.ready')).toBe(true);
    expect(final.history.some(entry => entry.action === 'gate.approve')).toBe(true);
  });
});
