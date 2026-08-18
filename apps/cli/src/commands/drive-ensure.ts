import type { Command } from 'commander';
import { ensureUnitWorkspace, type UnitFolderMapping } from '@ipas-course-factory/drive';
import type { CliContainer } from '../container.js';

function folderName(unitId: string, title: string): string {
  const safe = title.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
  return `${unitId}_${safe}`;
}

export async function executeDriveEnsure(unitId: string, container: CliContainer): Promise<string> {
  let unit = await container.store.loadUnit(unitId);
  const { subject } = await container.store.findSubject(unit.level, unit.subjectId);
  if (!subject.driveFolderId) throw new Error(`Subject ${unit.subjectId} has no driveFolderId`);

  const mapping = await ensureUnitWorkspace(container.getDrive(), {
    parentFolderId: subject.driveFolderId,
    unitFolderName: folderName(unit.unitId, unit.title),
    mappedUnitFolderId: unit.drive.unitFolderId,
    mappedFolders: unit.drive.folders as Partial<UnitFolderMapping>
  });
  unit = {
    ...unit,
    drive: { unitFolderId: mapping.unitFolderId, folders: { ...mapping.folders } },
    history: [...unit.history, {
      timestamp: container.now(), actor: container.actor, action: 'drive.workspace.ensure',
      previous: unit.drive.unitFolderId, next: mapping.unitFolderId,
      evidence: Object.values(mapping.folders).map(id => `drive:${id}`)
    }]
  };
  await container.store.saveUnit(unit);
  return `${unitId} | Drive https://drive.google.com/drive/folders/${mapping.unitFolderId}`;
}

export function registerDriveEnsure(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.command('ensure <unit-id>')
    .action(async (unitId: string) => write(await executeDriveEnsure(unitId, container)));
}
