import { describe, expect, it } from 'vitest';
import { GoogleDocsArtifactWriter, StaleArtifactDocumentError } from '../src/artifact-writer.js';

function fakeClients() {
  const state = new Map<string, { id: string; name: string; mimeType: string; parents: string[]; text: string }>();
  let sequence = 0;
  const creates: string[] = [];
  const drive = {
    files: {
      async create({ requestBody }: any) {
        const id = `doc-${++sequence}`;
        state.set(id, { id, name: requestBody.name, mimeType: requestBody.mimeType, parents: requestBody.parents, text: '' });
        creates.push(id);
        return { data: state.get(id)! };
      },
      async get({ fileId }: any) {
        const file = state.get(fileId);
        if (!file) throw { code: 404 };
        return { data: file };
      },
      async update({ fileId, requestBody }: any) {
        const file = state.get(fileId);
        if (!file) throw { code: 404 };
        if (requestBody.trashed) state.delete(fileId);
        return { data: file };
      }
    }
  };
  const docs = {
    documents: {
      async get({ documentId }: any) {
        const file = state.get(documentId);
        if (!file) throw { code: 404 };
        return { data: { body: { content: [{ endIndex: file.text.length + 2 }] } } };
      },
      async batchUpdate({ documentId, requestBody }: any) {
        const file = state.get(documentId);
        if (!file) throw { code: 404 };
        for (const request of requestBody.requests ?? []) {
          if (request.deleteContentRange) file.text = '';
          if (request.insertText) file.text = request.insertText.text;
        }
        return { data: {} };
      }
    }
  };
  return { drive, docs, state, creates };
}

describe('GoogleDocsArtifactWriter', () => {
  it('creates once, then updates the same document ID', async () => {
    const fake = fakeClients();
    const writer = new GoogleDocsArtifactWriter(fake.drive as never, fake.docs as never);
    const first = await writer.upsertTextDocument({ parentId: 'folder', name: 'Handout', text: 'v1' });
    const second = await writer.upsertTextDocument({ parentId: 'folder', name: 'Handout', text: 'v2', existingFileId: first.fileId });

    expect(fake.creates).toHaveLength(1);
    expect(second.fileId).toBe(first.fileId);
    expect(fake.state.get(first.fileId)?.text).toBe('v2');
  });

  it('rejects a stale existing file ID and does not create a replacement', async () => {
    const fake = fakeClients();
    const writer = new GoogleDocsArtifactWriter(fake.drive as never, fake.docs as never);
    await expect(writer.upsertTextDocument({
      parentId: 'folder', name: 'Handout', text: 'v2', existingFileId: 'missing-doc'
    })).rejects.toThrow(StaleArtifactDocumentError);
    expect(fake.creates).toHaveLength(0);
  });
});
