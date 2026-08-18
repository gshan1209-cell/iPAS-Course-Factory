import type { Command } from 'commander';
import { hasOfficialSource, transitionUnit } from '@ipas-course-factory/core';
import type { CliContainer } from '../container.js';

export async function executeSourceAttach(unitId: string, sourceId: string, container: CliContainer): Promise<string> {
  let unit = await container.store.loadUnit(unitId);
  const registry = await container.store.listSources();
  if (!registry.some(source => source.sourceId === sourceId)) throw new Error(`Unknown source ID: ${sourceId}`);
  if (!unit.sources.includes(sourceId)) unit = { ...unit, sources: [...unit.sources, sourceId] };

  if (unit.status === 'PLANNED' && hasOfficialSource(unit.sources, registry)) {
    unit = transitionUnit(unit, 'SOURCE_READY', {
      actor: container.actor, now: container.now(), evidence: unit.sources.map(id => `source:${id}`)
    });
  }
  await container.store.saveUnit(unit);
  return `${unitId} | sources=${unit.sources.length} | ${unit.status}`;
}

export function registerSourceAttach(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.command('attach <unit-id> <source-id>')
    .action(async (unitId: string, sourceId: string) => write(await executeSourceAttach(unitId, sourceId, container)));
}
