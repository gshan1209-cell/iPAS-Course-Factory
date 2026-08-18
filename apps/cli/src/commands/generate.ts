import type { Command } from 'commander';
import { readSourcePack } from '@ipas-course-factory/drive';
import {
  ContentGenerationFailure,
  generatePreNotebookContentPack,
  generateSourceBrief
} from '@ipas-course-factory/generator';
import type { CliContainer } from '../container.js';

async function generationContext(unitId: string, container: CliContainer) {
  const unit = await container.store.loadUnit(unitId);
  const registry = await container.store.listSources();
  const mapping = await container.store.loadSourceMapping(unitId);
  const sourcePack = await readSourcePack(unit.sources, registry, container.getDrive());
  const officialQuestionRefs = mapping.officialQuestionRefs
    .map(ref => `${ref.sourceId}: ${ref.questions.join(', ')}`)
    .join('\n') || 'No official question references mapped.';
  return {
    unit,
    sourcePack,
    generation: container.getGeneration(),
    documents: container.getDocuments(),
    templateVariables: { ...mapping.templateVariables, official_question_refs: officialQuestionRefs },
    actor: container.actor,
    now: container.now,
    templateRoot: container.templateRoot
  };
}

async function persistFailure(container: CliContainer, error: unknown): Promise<never> {
  if (error instanceof ContentGenerationFailure) await container.store.saveUnit(error.unit);
  throw error;
}

export async function executeGenerateBrief(unitId: string, container: CliContainer): Promise<string> {
  try {
    const result = await generateSourceBrief(await generationContext(unitId, container));
    await container.store.saveUnit(result.unit);
    return `${unitId} | Source Brief READY | ${result.unit.status}`;
  } catch (error) {
    return persistFailure(container, error);
  }
}

export async function executeGenerateContentPack(unitId: string, container: CliContainer): Promise<string> {
  try {
    const result = await generatePreNotebookContentPack(await generationContext(unitId, container));
    await container.store.saveUnit(result.unit);
    return `${unitId} | pre-Notebook content pack READY | ${result.unit.status}`;
  } catch (error) {
    return persistFailure(container, error);
  }
}

export function registerGenerate(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.command('brief <unit-id>').action(async (unitId: string) => write(await executeGenerateBrief(unitId, container)));
  parent.command('content-pack <unit-id>').action(async (unitId: string) => write(await executeGenerateContentPack(unitId, container)));
}
