import { describe, expect, it } from 'vitest';
import type { Source, SourceMapping, Subject, UnitManifest } from '@ipas-course-factory/schemas';
import { createDefaultArtifactGroups } from '@ipas-course-factory/core';
import { runCli, type CliContainer } from '../src/index.js';

const guide: Source = {
  sourceId: 'guide', tier: 'S1', title: 'Guide', provider: 'iPAS', driveFileId: 'guide-file',
  scope: ['CV'], effectiveDate: null, supersedes: [], corrects: []
};
const mapping: SourceMapping = {
  schemaVersion: 1, unitId: 'M1-99', sourceIds: ['guide'], scope: ['CV'],
  officialQuestionRefs: [],
  templateVariables: {
    official_scope: 'CV', exam_focus: 'CV tasks', known_traps: 'task confusion', visual_motif: 'scan light'
  }
};
const subject: Subject = {
  schemaVersion: 1, subjectId: 'M1', courseId: 'ipas-ai-planner', level: 'intermediate', name: 'Subject 1',
  badge: 'AI PLANNER', unitIds: [], driveFolderId: 'subject-root'
};

function seededUnit(status: UnitManifest['status'] = 'CONTENT_READY'): UnitManifest {
  return {
    schemaVersion: 1, unitId: 'M1-02', courseId: 'ipas-ai-planner', level: 'intermediate', subjectId: 'M1',
    title: 'Transformer', coreThesis: 'relationships matter', status,
    drive: { unitFolderId: 'unit-root', folders: {} }, sources: ['guide'], artifacts: createDefaultArtifactGroups(), gates: {},
    qa: { status: 'NOT_RUN', findings: [] }, history: []
  };
}

function fakeContainer(): CliContainer & { units: Map<string, UnitManifest> } {
  const units = new Map<string, UnitManifest>([['M1-02', seededUnit()]]);
  const subjects = new Map<string, Subject>([['intermediate:M1', structuredClone(subject)]]);
  let docSeq = 0;
  return {
    units,
    actor: 'tester', now: () => '2026-08-18T09:00:00.000Z', templateRoot: '/templates',
    store: {
      async loadUnit(id) { const value = units.get(id); if (!value) throw new Error(`missing unit:${id}`); return structuredClone(value); },
      async saveUnit(unit) { units.set(unit.unitId, structuredClone(unit)); },
      async loadCourse() { return { schemaVersion: 1, courseId: 'ipas-ai-planner', name: 'iPAS', provider: 'iPAS', authority: 'iPAS', levels: ['intermediate'], status: 'ACTIVE', driveRootFolderId: 'course-root' }; },
      async findSubject(level, subjectId) { const value = subjects.get(`${level}:${subjectId}`); if (!value) throw new Error('missing subject'); return { catalogKey: 'intermediate-M1', subject: structuredClone(value) }; },
      async saveSubject(_catalogKey, value) { subjects.set(`${value.level}:${value.subjectId}`, structuredClone(value)); },
      async listSources() { return [guide]; },
      async loadSourceMapping() { return mapping; }
    },
    getDrive() {
      return {
        async listChildren() { return []; },
        async createFolder(parentId, name) { return { id: `folder-${name}`, name, mimeType: 'application/vnd.google-apps.folder', parentId }; },
        async getNode() { return null; },
        async readTextFile(fileId) { return { mimeType: 'text/plain', text: `source:${fileId}` }; }
      };
    },
    getDocuments() {
      return { async upsertTextDocument(input) { const fileId = input.existingFileId ?? `doc-${++docSeq}`; return { fileId, url: `https://docs.google.com/document/d/${fileId}/edit` }; } };
    },
    getGeneration() {
      return { async generate(request) { return { text: `generated:${request.artifactKind}`, provider: 'fake', model: 'fake', responseId: 'r' }; } };
    }
  };
}

describe('course-factory CLI', () => {
  it('status prints unit state and artifact completeness', async () => {
    const output = await runCli(['status', 'M1-02'], fakeContainer());
    expect(output).toContain('M1-02');
    expect(output).toContain('CONTENT_READY');
    expect(output).toContain('/10');
  });

  it('unit create writes a PLANNED unit and updates the subject catalog', async () => {
    const c = fakeContainer();
    const output = await runCli([
      'unit', 'create', 'M1-99', '--course', 'ipas-ai-planner', '--level', 'intermediate', '--subject', 'M1',
      '--title', 'Computer Vision', '--core-thesis', 'three visual questions'
    ], c);
    expect(output).toContain('M1-99');
    expect(c.units.get('M1-99')?.status).toBe('PLANNED');
  });

  it('source attach advances PLANNED to SOURCE_READY only with an official source', async () => {
    const c = fakeContainer();
    c.units.set('M1-99', { ...seededUnit('PLANNED'), unitId: 'M1-99', sources: [] });
    await runCli(['source', 'attach', 'M1-99', 'guide'], c);
    expect(c.units.get('M1-99')?.status).toBe('SOURCE_READY');
    expect(c.units.get('M1-99')?.sources).toEqual(['guide']);
  });

  it('artifact register records Slides output without approving its gate', async () => {
    const c = fakeContainer();
    await runCli(['artifact', 'register', 'M1-02', 'slides', '--url', 'https://example.com/slides'], c);
    expect(c.units.get('M1-02')?.artifacts.slides.items.find(item => item.kind === 'SLIDES_OUTPUT')?.url).toBe('https://example.com/slides');
    expect(c.units.get('M1-02')?.gates.slides?.status).not.toBe('APPROVED');
  });

  it('reruns QA from a recovered CONTENT_QA state', async () => {
    const c = fakeContainer();
    c.units.set('M1-02', seededUnit('CONTENT_QA'));

    const output = await runCli(['qa', 'run', 'M1-02'], c);

    expect(output).toContain('QA PASSED');
    expect(c.units.get('M1-02')?.status).toBe('NOTEBOOKLM_PENDING');
  });

  it('requires REVISION_REQUIRED and the history-derived recovery state', async () => {
    const c = fakeContainer();
    const failed = seededUnit('QA_FAILED');
    failed.qa = {
      status: 'FAILED',
      findings: [{ code: 'TEST_FAILURE', severity: 'ERROR', message: 'fixture failure' }]
    };
    failed.history = [{
      timestamp: '2026-08-18T08:59:00.000Z',
      actor: 'qa-bot',
      action: 'workflow.transition',
      previous: 'CONTENT_QA',
      next: 'QA_FAILED',
      evidence: ['qa:TEST_FAILURE', 'fixture failure']
    }];
    c.units.set('M1-02', failed);

    await expect(runCli([
      'transition', 'M1-02', 'PUBLISHED', '--evidence', 'attempted bypass'
    ], c)).rejects.toThrow();
    expect(c.units.get('M1-02')?.status).toBe('QA_FAILED');

    await runCli([
      'transition', 'M1-02', 'REVISION_REQUIRED', '--evidence', 'failure reviewed'
    ], c);
    expect(c.units.get('M1-02')?.status).toBe('REVISION_REQUIRED');

    await expect(runCli([
      'transition', 'M1-02', 'BRIEF_READY', '--evidence', 'wrong recovery target'
    ], c)).rejects.toThrow();
    expect(c.units.get('M1-02')?.status).toBe('REVISION_REQUIRED');

    await runCli([
      'transition', 'M1-02', 'CONTENT_QA', '--evidence', 'correction applied'
    ], c);
    expect(c.units.get('M1-02')?.status).toBe('CONTENT_QA');

    await runCli(['qa', 'run', 'M1-02'], c);
    expect(c.units.get('M1-02')?.status).toBe('NOTEBOOKLM_PENDING');
  });
});
