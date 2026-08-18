import { STANDARD_UNIT_FOLDERS, type UnitFolderKey, type UnitFolderMapping } from './folder-plan.js';
import { FOLDER_MIME_TYPE, type DriveNode, type DrivePort } from './port.js';

export interface EnsureUnitWorkspaceInput {
  parentFolderId: string;
  unitFolderName: string;
  mappedUnitFolderId?: string | null;
  mappedFolders?: Partial<UnitFolderMapping>;
}

export interface UnitWorkspaceMapping {
  unitFolderId: string;
  folders: UnitFolderMapping;
}

export class AmbiguousDriveFolderError extends Error {
  constructor(parentId: string, name: string, ids: string[]) {
    super(`Ambiguous Drive folder '${name}' under '${parentId}': ${ids.join(', ')}`);
    this.name = 'AmbiguousDriveFolderError';
  }
}

export class StaleDriveMappingError extends Error {
  constructor(id: string, expectedParentId: string, expectedName: string) {
    super(`Stale Drive mapping '${id}'; expected folder '${expectedName}' under '${expectedParentId}'`);
    this.name = 'StaleDriveMappingError';
  }
}

function isExpectedFolder(node: DriveNode, parentId: string, name: string): boolean {
  return node.mimeType === FOLDER_MIME_TYPE && node.parentId === parentId && node.name === name;
}

async function resolveFolder(
  drive: DrivePort,
  parentId: string,
  name: string,
  mappedId?: string | null
): Promise<DriveNode> {
  if (mappedId) {
    const mapped = await drive.getNode(mappedId);
    if (!mapped || !isExpectedFolder(mapped, parentId, name)) {
      throw new StaleDriveMappingError(mappedId, parentId, name);
    }
    return mapped;
  }

  const matches = (await drive.listChildren(parentId)).filter(node => isExpectedFolder(node, parentId, name));
  if (matches.length > 1) {
    throw new AmbiguousDriveFolderError(parentId, name, matches.map(node => node.id).sort());
  }
  if (matches.length === 1) return matches[0]!;
  return drive.createFolder(parentId, name);
}

export async function ensureUnitWorkspace(
  drive: DrivePort,
  input: EnsureUnitWorkspaceInput
): Promise<UnitWorkspaceMapping> {
  const unitRoot = await resolveFolder(
    drive,
    input.parentFolderId,
    input.unitFolderName,
    input.mappedUnitFolderId
  );

  const folders = {} as UnitFolderMapping;
  for (const [key, name] of Object.entries(STANDARD_UNIT_FOLDERS) as [UnitFolderKey, string][]) {
    const folder = await resolveFolder(drive, unitRoot.id, name, input.mappedFolders?.[key]);
    folders[key] = folder.id;
  }

  return { unitFolderId: unitRoot.id, folders };
}
