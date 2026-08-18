import type { drive_v3 } from 'googleapis';
import { FOLDER_MIME_TYPE, type DriveNode, type DrivePort } from './port.js';

const escapeQueryValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function normalizeFile(file: drive_v3.Schema$File, parentId: string): DriveNode {
  if (!file.id || !file.name || !file.mimeType) {
    throw new Error('Google Drive returned an incomplete file resource');
  }
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    parentId: file.parents?.[0] ?? parentId
  };
}

export class GoogleDriveAdapter implements DrivePort {
  constructor(private readonly drive: drive_v3.Drive) {}

  async listChildren(parentId: string): Promise<DriveNode[]> {
    const files: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;
    do {
      const response = await this.drive.files.list({
        q: `'${escapeQueryValue(parentId)}' in parents and trashed = false`,
        fields: 'nextPageToken,files(id,name,mimeType,parents)',
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      files.push(...(response.data.files ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
    return files.map(file => normalizeFile(file, parentId));
  }

  async createFolder(parentId: string, name: string): Promise<DriveNode> {
    const response = await this.drive.files.create({
      requestBody: { name, mimeType: FOLDER_MIME_TYPE, parents: [parentId] },
      fields: 'id,name,mimeType,parents'
    });
    return normalizeFile(response.data, parentId);
  }

  async getNode(id: string): Promise<DriveNode | null> {
    try {
      const response = await this.drive.files.get({
        fileId: id,
        fields: 'id,name,mimeType,parents',
        supportsAllDrives: true
      });
      return normalizeFile(response.data, response.data.parents?.[0] ?? '');
    } catch (error: unknown) {
      const status = (error as { code?: number; response?: { status?: number } }).code
        ?? (error as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
      throw error;
    }
  }
}
