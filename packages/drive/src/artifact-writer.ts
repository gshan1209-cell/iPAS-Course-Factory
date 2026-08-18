import type { docs_v1, drive_v3 } from 'googleapis';

export const GOOGLE_DOC_MIME_TYPE = 'application/vnd.google-apps.document' as const;

export interface ArtifactDocumentPort {
  upsertTextDocument(input: {
    parentId: string;
    name: string;
    text: string;
    existingFileId?: string | null;
  }): Promise<{ fileId: string; url: string }>;
}

export class StaleArtifactDocumentError extends Error {
  constructor(public readonly fileId: string, reason = 'file is missing or no longer matches the mapped document') {
    super(`Stale artifact document '${fileId}': ${reason}`);
    this.name = 'StaleArtifactDocumentError';
  }
}

function statusOf(error: unknown): number | undefined {
  return (error as { code?: number }).code
    ?? (error as { response?: { status?: number } }).response?.status;
}

export class GoogleDocsArtifactWriter implements ArtifactDocumentPort {
  constructor(
    private readonly drive: drive_v3.Drive,
    private readonly docs: docs_v1.Docs
  ) {}

  async upsertTextDocument(input: {
    parentId: string;
    name: string;
    text: string;
    existingFileId?: string | null;
  }): Promise<{ fileId: string; url: string }> {
    if (input.existingFileId) {
      await this.assertExistingDocument(input.existingFileId, input.parentId, input.name);
      await this.replaceDocumentText(input.existingFileId, input.text);
      return this.result(input.existingFileId);
    }

    const created = await this.drive.files.create({
      requestBody: {
        name: input.name,
        mimeType: GOOGLE_DOC_MIME_TYPE,
        parents: [input.parentId]
      },
      fields: 'id,name,mimeType,parents'
    });
    const fileId = created.data.id;
    if (!fileId) throw new Error('Google Drive did not return a document file ID');

    try {
      if (input.text.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: fileId,
          requestBody: { requests: [{ insertText: { location: { index: 1 }, text: input.text } }] }
        });
      }
      return this.result(fileId);
    } catch (error) {
      try {
        await this.drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true });
      } catch {
        // Preserve the original write failure; cleanup is best-effort.
      }
      throw error;
    }
  }

  private async assertExistingDocument(fileId: string, parentId: string, name: string): Promise<void> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,parents,trashed',
        supportsAllDrives: true
      });
      const file = response.data;
      const matches = file.id === fileId
        && file.name === name
        && file.mimeType === GOOGLE_DOC_MIME_TYPE
        && file.parents?.includes(parentId)
        && !file.trashed;
      if (!matches) throw new StaleArtifactDocumentError(fileId);
    } catch (error) {
      if (error instanceof StaleArtifactDocumentError) throw error;
      if (statusOf(error) === 404) throw new StaleArtifactDocumentError(fileId, 'file was not found');
      throw error;
    }
  }

  private async replaceDocumentText(documentId: string, text: string): Promise<void> {
    let document: docs_v1.Schema$Document;
    try {
      document = (await this.docs.documents.get({ documentId })).data;
    } catch (error) {
      if (statusOf(error) === 404) throw new StaleArtifactDocumentError(documentId, 'Google Doc was not found');
      throw error;
    }

    const endIndex = Math.max(1, ...(document.body?.content ?? []).map(item => item.endIndex ?? 1));
    const requests: docs_v1.Schema$Request[] = [];
    if (endIndex > 2) {
      requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } });
    }
    if (text.length > 0) {
      requests.push({ insertText: { location: { index: 1 }, text } });
    }
    if (requests.length > 0) {
      await this.docs.documents.batchUpdate({ documentId, requestBody: { requests } });
    }
  }

  private result(fileId: string) {
    return { fileId, url: `https://docs.google.com/document/d/${fileId}/edit` };
  }
}
