import { google } from 'googleapis';
import type { Course, Source, SourceMapping, Subject, UnitManifest } from '@ipas-course-factory/schemas';
import { YamlManifestStore } from '@ipas-course-factory/core';
import {
  GoogleDocsArtifactWriter,
  GoogleDriveAdapter,
  createGoogleAuthFromEnv,
  type ArtifactDocumentPort,
  type DrivePort,
  type SourceFilePort
} from '@ipas-course-factory/drive';
import { createOpenAIGenerationAdapterFromEnv, type GenerationPort } from '@ipas-course-factory/generator';

export interface ManifestStorePort {
  loadUnit(unitId: string): Promise<UnitManifest>;
  saveUnit(unit: UnitManifest): Promise<void>;
  loadCourse(courseId: string): Promise<Course>;
  findSubject(level: string, subjectId: string): Promise<{ catalogKey: string; subject: Subject }>;
  saveSubject(catalogKey: string, subject: Subject): Promise<void>;
  listSources(): Promise<Source[]>;
  loadSourceMapping(unitId: string): Promise<SourceMapping>;
}

export interface CliContainer {
  store: ManifestStorePort;
  actor: string;
  now(): string;
  templateRoot: string;
  getDrive(): DrivePort & SourceFilePort;
  getDocuments(): ArtifactDocumentPort;
  getGeneration(): GenerationPort;
}

export function createCliContainer(env: NodeJS.ProcessEnv = process.env): CliContainer {
  const repoRoot = env.COURSE_FACTORY_REPO_ROOT?.trim() || process.cwd();
  const store = new YamlManifestStore(repoRoot);
  let drive: GoogleDriveAdapter | undefined;
  let documents: GoogleDocsArtifactWriter | undefined;
  let generation: GenerationPort | undefined;

  const googleServices = () => {
    const auth = createGoogleAuthFromEnv(env);
    return {
      drive: google.drive({ version: 'v3', auth }),
      docs: google.docs({ version: 'v1', auth })
    };
  };

  return {
    store,
    actor: env.COURSE_FACTORY_ACTOR?.trim() || env.USER?.trim() || 'operator',
    now: () => new Date().toISOString(),
    templateRoot: env.COURSE_FACTORY_TEMPLATE_ROOT?.trim() || `${repoRoot}/templates`,
    getDrive() {
      if (!drive) drive = new GoogleDriveAdapter(googleServices().drive);
      return drive;
    },
    getDocuments() {
      if (!documents) {
        const services = googleServices();
        documents = new GoogleDocsArtifactWriter(services.drive, services.docs);
      }
      return documents;
    },
    getGeneration() {
      if (!generation) generation = createOpenAIGenerationAdapterFromEnv(env);
      return generation;
    }
  };
}
