import type { Command } from 'commander';
import { createDefaultArtifactGroups, createDefaultGates } from '@ipas-course-factory/core';
import type { UnitManifest } from '@ipas-course-factory/schemas';
import type { CliContainer } from '../container.js';

export interface UnitCreateOptions {
  course: string;
  level: string;
  subject: string;
  title: string;
  coreThesis: string;
}

export async function executeUnitCreate(unitId: string, options: UnitCreateOptions, container: CliContainer): Promise<string> {
  const course = await container.store.loadCourse(options.course);
  const found = await container.store.findSubject(options.level, options.subject);
  if (found.subject.courseId !== course.courseId) throw new Error(`Subject ${options.subject} does not belong to ${course.courseId}`);

  const now = container.now();
  const unit: UnitManifest = {
    schemaVersion: 1,
    unitId,
    courseId: course.courseId,
    level: options.level,
    subjectId: options.subject,
    title: options.title,
    coreThesis: options.coreThesis,
    status: 'PLANNED',
    drive: { unitFolderId: null, folders: {} },
    sources: [],
    artifacts: createDefaultArtifactGroups(),
    gates: createDefaultGates(),
    qa: { status: 'NOT_RUN', findings: [] },
    history: [{
      timestamp: now,
      actor: container.actor,
      action: 'unit.created',
      previous: null,
      next: 'PLANNED',
      evidence: [`course:${course.courseId}`, `subject:${options.subject}`]
    }]
  };
  await container.store.saveUnit(unit);

  if (!found.subject.unitIds.includes(unitId)) {
    await container.store.saveSubject(found.catalogKey, {
      ...found.subject,
      unitIds: [...found.subject.unitIds, unitId]
    });
  }
  return `Created ${unitId} | PLANNED`;
}

export function registerUnitCreate(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.command('create <unit-id>')
    .requiredOption('--course <course-id>')
    .requiredOption('--level <level>')
    .requiredOption('--subject <subject-id>')
    .requiredOption('--title <title>')
    .requiredOption('--core-thesis <text>')
    .action(async (unitId: string, options: UnitCreateOptions) => write(await executeUnitCreate(unitId, options, container)));
}
