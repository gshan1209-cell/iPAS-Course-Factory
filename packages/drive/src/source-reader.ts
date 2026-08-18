import { resolveAuthoritativeSources } from '@ipas-course-factory/core';
import type { Source, SourceTier } from '@ipas-course-factory/schemas';
import type { SourceFilePort } from './port.js';

export interface SourceText {
  sourceId: string;
  tier: SourceTier;
  title: string;
  text: string;
}

export interface PdfTextExtractor {
  extract(bytes: Uint8Array): Promise<string>;
}

export class UnknownSourceError extends Error {
  constructor(public readonly sourceId: string) {
    super(`Unknown source ID: ${sourceId}`);
    this.name = 'UnknownSourceError';
  }
}

export class UnsupportedSourceMimeTypeError extends Error {
  constructor(public readonly mimeType: string) {
    super(`Unsupported source MIME type: ${mimeType}`);
    this.name = 'UnsupportedSourceMimeTypeError';
  }
}

export class PdfJsTextExtractor implements PdfTextExtractor {
  async extract(bytes: Uint8Array): Promise<string> {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = getDocument({ data: bytes });
    const document = await loadingTask.promise;
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: unknown) => typeof item === 'object' && item !== null && 'str' in item
            ? String((item as { str: unknown }).str)
            : '')
          .filter(Boolean)
          .join(' ');
        pages.push(text);
      }
      return pages.join('\n\n');
    } finally {
      await document.destroy();
    }
  }
}

export async function readSourcePack(
  sourceIds: string[],
  registry: Source[],
  reader: SourceFilePort
): Promise<SourceText[]> {
  const byId = new Map(registry.map(source => [source.sourceId, source]));
  const selected = sourceIds.map(sourceId => {
    const source = byId.get(sourceId);
    if (!source) throw new UnknownSourceError(sourceId);
    return source;
  });

  const ordered = resolveAuthoritativeSources(selected);
  return Promise.all(ordered.map(async source => {
    const file = await reader.readTextFile(source.driveFileId);
    return { sourceId: source.sourceId, tier: source.tier, title: source.title, text: file.text };
  }));
}
