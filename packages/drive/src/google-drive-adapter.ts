import type { drive_v3 } from 'googleapis';
import { FOLDER_MIME_TYPE, type DriveNode, type DrivePort, type SourceFilePort } from './port.js';
import {
  PdfJsTextExtractor,
  UnsupportedSourceMimeTypeError,
  type PdfTextExtractor
} from './source-reader.js';

const GOOGLE_DOC_MIME_TYPE = 'application/vnd.google-apps.document';
const PDF_MIME_TYPE = 'application/pdf';
const UTF8_APPLICATION_MIME_TYPES = new Set(['application/json', 'application/yaml', 'application/x-yaml']);
const escapeQueryValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function normalizeFile(file: drive_v3.Schema$File, parentId: string): DriveNode {
  if (!file.id || !file.name || !file.mimeType) {
    throw new Error('Google Drive returned an incomplete file resource');
  }
  return { id: file.id, name: file.name, mimeType: file.mimeType, parentId: file.parents?.[0] ?? parentId };
}

function toBytes(data: unknown): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new Error('Google Drive returned unsupported binary response data');
}

export class GoogleDriveAdapter implements DrivePort, SourceFilePort {
  constructor(
    private readonly drive: drive_v3.Drive,
    private readonly pdfExtractor: PdfTextExtractor = new PdfJsTextExtractor()
  ) {}

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
      const response = await this.drive.files.get({ fileId: id, fields: 'id,name,mimeType,parents', supportsAllDrives: true });
      return normalizeFile(response.data, response.data.parents?.[0] ?? '');
    } catch (error: unknown) {
      const status = (error as { code?: number; response?: { status?: number } }).code
        ?? (error as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
      throw error;
    }
  }

  async readTextFile(fileId: string): Promise<{ mimeType: string; text: string }> {
    const metadata = await this.drive.files.get({ fileId, fields: 'id,mimeType', supportsAllDrives: true });
    const mimeType = metadata.data.mimeType;
    if (!mimeType) throw new Error(`Drive source '${fileId}' has no MIME type`);

    if (mimeType === GOOGLE_DOC_MIME_TYPE) {
      const response = await this.drive.files.export(
        { fileId, mimeType: 'text/plain' },
        { responseType: 'arraybuffer' }
      );
      return { mimeType, text: new TextDecoder('utf-8').decode(toBytes(response.data)) };
    }

    const response = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    const bytes = toBytes(response.data);
    if (mimeType === PDF_MIME_TYPE) {
      return { mimeType, text: await this.pdfExtractor.extract(bytes) };
    }
    if (mimeType.startsWith('text/') || UTF8_APPLICATION_MIME_TYPES.has(mimeType)) {
      return { mimeType, text: new TextDecoder('utf-8').decode(bytes) };
    }
    throw new UnsupportedSourceMimeTypeError(mimeType);
  }
}
