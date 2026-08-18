import type { Command } from 'commander';
import { registerExternalArtifact } from '@ipas-course-factory/core';
import type { CliContainer } from '../container.js';

const mapping = {
  slides: { groupKey: 'slides', kind: 'SLIDES_OUTPUT' },
  voice: { groupKey: 'voice', kind: 'VOICE_OUTPUT' },
  video: { groupKey: 'video', kind: 'VIDEO_OUTPUT' }
} as const;

type ExternalKind = keyof typeof mapping;

export async function executeArtifactRegister(
  unitId: string,
  type: ExternalKind,
  options: { url?: string; driveFileId?: string },
  container: CliContainer
): Promise<string> {
  if (!options.url?.trim() && !options.driveFileId?.trim()) throw new Error('artifact register requires --url or --drive-file-id');
  const unit = await container.store.loadUnit(unitId);
  const target = mapping[type];
  const updated = registerExternalArtifact(unit, {
    groupKey: target.groupKey,
    kind: target.kind,
    url: options.url,
    driveFileId: options.driveFileId,
    actor: container.actor,
    now: container.now()
  });
  await container.store.saveUnit(updated);
  return `${unitId} | ${target.kind} registered | gate not approved`;
}

export function registerArtifactRegister(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.command('register <unit-id> <type>')
    .addHelpText('after', ' type: slides | voice | video')
    .option('--url <url>')
    .option('--drive-file-id <file-id>')
    .action(async (unitId: string, type: string, options: { url?: string; driveFileId?: string }) => {
      if (!(type in mapping)) throw new Error(`Unknown artifact type: ${type}`);
      write(await executeArtifactRegister(unitId, type as ExternalKind, options, container));
    });
}
