import { describe, expect, it } from 'vitest';
import {
  AmbiguousDriveFolderError,
  StaleDriveMappingError,
  ensureUnitWorkspace
} from '../src/ensure-workspace.js';
import { FOLDER_MIME_TYPE, type DriveNode, type DrivePort } from '../src/port.js';

class FakeDrive implements DrivePort {
  readonly nodes = new Map<string, DriveNode>();
  readonly createCalls: Array<{ parentId: string; name: string }> = [];
  private sequence = 0;

  async listChildren(parentId: string): Promise<DriveNode[]> {
    return [...this.nodes.values()].filter(node => node.parentId === parentId);
  }

  async createFolder(parentId: string, name: string): Promise<DriveNode> {
    const node = { id: `created-${++this.sequence}`, name, mimeType: FOLDER_MIME_TYPE, parentId };
    this.nodes.set(node.id, node);
    this.createCalls.push({ parentId, name });
    return node;
  }

  async getNode(id: string): Promise<DriveNode | null> {
    return this.nodes.get(id) ?? null;
  }

  add(node: DriveNode) { this.nodes.set(node.id, node); }
}

describe('ensureUnitWorkspace', () => {
  it('creates one unit root and exactly ten standard children when absent', async () => {
    const drive = new FakeDrive();
    const mapping = await ensureUnitWorkspace(drive, {
      parentFolderId: 'subject-root',
      unitFolderName: '03_AI看一張圖_其實在回答三種不同問題',
      mappedUnitFolderId: null,
      mappedFolders: {}
    });

    expect(drive.createCalls).toHaveLength(11);
    expect(typeof mapping.unitFolderId).toBe('string');
    expect(Object.keys(mapping.folders)).toHaveLength(10);
  });

  it('is idempotent on a second ensure and creates zero new nodes', async () => {
    const drive = new FakeDrive();
    const first = await ensureUnitWorkspace(drive, {
      parentFolderId: 'subject-root', unitFolderName: 'M1-03', mappedUnitFolderId: null, mappedFolders: {}
    });
    const before = drive.createCalls.length;

    const second = await ensureUnitWorkspace(drive, {
      parentFolderId: 'subject-root', unitFolderName: 'M1-03',
      mappedUnitFolderId: first.unitFolderId, mappedFolders: first.folders
    });

    expect(drive.createCalls).toHaveLength(before);
    expect(second).toEqual(first);
  });

  it('blocks duplicate exact-name folders and reports both IDs', async () => {
    const drive = new FakeDrive();
    drive.add({ id: 'root', name: 'M1-03', mimeType: FOLDER_MIME_TYPE, parentId: 'subject-root' });
    drive.add({ id: 'dup-a', name: '01_Source', mimeType: FOLDER_MIME_TYPE, parentId: 'root' });
    drive.add({ id: 'dup-b', name: '01_Source', mimeType: FOLDER_MIME_TYPE, parentId: 'root' });

    await expect(ensureUnitWorkspace(drive, {
      parentFolderId: 'subject-root', unitFolderName: 'M1-03', mappedUnitFolderId: 'root', mappedFolders: {}
    })).rejects.toThrow(AmbiguousDriveFolderError);

    await expect(ensureUnitWorkspace(drive, {
      parentFolderId: 'subject-root', unitFolderName: 'M1-03', mappedUnitFolderId: 'root', mappedFolders: {}
    })).rejects.toThrow(/dup-a.*dup-b|dup-b.*dup-a/);
  });

  it('blocks a stale mapped ID instead of silently replacing it', async () => {
    const drive = new FakeDrive();
    await expect(ensureUnitWorkspace(drive, {
      parentFolderId: 'subject-root', unitFolderName: 'M1-03', mappedUnitFolderId: 'missing-root', mappedFolders: {}
    })).rejects.toThrow(StaleDriveMappingError);
    expect(drive.createCalls).toHaveLength(0);
  });
});
