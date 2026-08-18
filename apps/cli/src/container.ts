import { existsSync } from 'node:fs';
import path from 'node:path';
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

export function resolveRepoRoot(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd()
): string {
  const explicit = env.COURSE_FACTORY_REPO_ROOT?.trim();
  if (explicit) return path.resolve(explicit);

  let current = path.resolve(cwd);
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(`Could not locate iPAS-Course-Factory repo root from ${path.resolve(cwd)}. Set COURSE_FACTORY_REPO_ROOT explicitly.`);
}

function resolveTemplateRoot(repoRoot: string, configured?: string): string {
  const value = configured?.trim();
  if (!value) return path.join(repoRoot, 'templates');
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

export function createCliContainer(env: NodeJS.ProcessEnv = process.env): CliContainer {
  const repoRoot = resolveRepoRoot(env, process.cwd());
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
    templateRoot: resolveTemplateRoot(repoRoot, env.COURSE_FACTORY_TEMPLATE_ROOT),
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
