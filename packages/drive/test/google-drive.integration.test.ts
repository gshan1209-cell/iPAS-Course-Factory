import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { google, type docs_v1, type drive_v3 } from 'googleapis';
import { GoogleDocsArtifactWriter } from '../src/artifact-writer.js';
import { ensureUnitWorkspace } from '../src/ensure-workspace.js';
import { createGoogleAuthFromEnv } from '../src/google-auth.js';
import { GoogleDriveAdapter } from '../src/google-drive-adapter.js';

const integrationRoot = process.env.COURSE_FACTORY_INTEGRATION_DRIVE_ROOT?.trim();
const integrationDescribe = integrationRoot ? describe : describe.skip;

integrationDescribe('Google Drive integration', () => {
  let drive: drive_v3.Drive;
  let docs: docs_v1.Docs;
  let adapter: GoogleDriveAdapter;
  let disposableRootId: string;

  beforeAll(async () => {
    const auth = createGoogleAuthFromEnv();
    drive = google.drive({ version: 'v3', auth });
    docs = google.docs({ version: 'v1', auth });
    adapter = new GoogleDriveAdapter(drive);
    const disposable = await adapter.createFolder(
      integrationRoot!,
      `__course_factory_integration_${Date.now()}`
    );
    disposableRootId = disposable.id;
  });

  afterAll(async () => {
    if (drive && disposableRootId) {
      await drive.files.update({
        fileId: disposableRootId,
        requestBody: { trashed: true },
        supportsAllDrives: true
      });
    }
  });

  it('ensures the workspace idempotently and retains one Google Doc ID across updates', async () => {
    const firstWorkspace = await ensureUnitWorkspace(adapter, {
      parentFolderId: disposableRootId,
      unitFolderName: 'M1-INTEGRATION',
      mappedUnitFolderId: null,
      mappedFolders: {}
    });
    const secondWorkspace = await ensureUnitWorkspace(adapter, {
      parentFolderId: disposableRootId,
      unitFolderName: 'M1-INTEGRATION',
      mappedUnitFolderId: firstWorkspace.unitFolderId,
      mappedFolders: firstWorkspace.folders
    });
    expect(secondWorkspace).toEqual(firstWorkspace);

    const writer = new GoogleDocsArtifactWriter(drive, docs);
    const first = await writer.upsertTextDocument({
      parentId: firstWorkspace.folders.handout,
      name: 'integration-handout',
      text: 'version 1'
    });
    const second = await writer.upsertTextDocument({
      parentId: firstWorkspace.folders.handout,
      name: 'integration-handout',
      text: 'version 2',
      existingFileId: first.fileId
    });
    expect(second.fileId).toBe(first.fileId);
  });
});
