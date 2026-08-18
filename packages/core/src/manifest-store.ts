import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import {
  CourseSchema,
  SubjectSchema,
  SourceMappingSchema,
  SourceSchema,
  UnitManifestSchema,
  type Course,
  type Subject,
  type Source,
  type SourceMapping,
  type UnitManifest
} from '@ipas-course-factory/schemas';

export class YamlManifestStore {
  constructor(private readonly root: string) {}

  async loadUnit(unitId: string): Promise<UnitManifest> {
    return this.read(`catalog/units/${unitId}.yaml`, UnitManifestSchema);
  }

  async saveUnit(unit: UnitManifest): Promise<void> {
    const valid = UnitManifestSchema.parse(unit);
    await this.write(`catalog/units/${unit.unitId}.yaml`, valid);
  }

  async loadCourse(courseId: string): Promise<Course> {
    return this.read(`catalog/courses/${courseId}.yaml`, CourseSchema);
  }

  async loadSubject(catalogKey: string): Promise<Subject> {
    return this.read(`catalog/subjects/${catalogKey}.yaml`, SubjectSchema);
  }

  async findSubject(level: string, subjectId: string): Promise<{ catalogKey: string; subject: Subject }> {
    const dir = path.join(this.root, 'catalog/subjects');
    const files = (await readdir(dir)).filter((name: string) => name.endsWith('.yaml')).sort();
    for (const name of files) {
      const subject = SubjectSchema.parse(YAML.parse(await readFile(path.join(dir, name), 'utf8')));
      if (subject.level === level && subject.subjectId === subjectId) {
        return { catalogKey: name.slice(0, -5), subject };
      }
    }
    throw new Error(`Subject not found for level=${level}, subjectId=${subjectId}`);
  }

  async saveSubject(catalogKey: string, subject: Subject): Promise<void> {
    const valid = SubjectSchema.parse(subject);
    await this.write(`catalog/subjects/${catalogKey}.yaml`, valid);
  }

  async loadSourceMapping(unitId: string): Promise<SourceMapping> {
    return this.read(`sources/mappings/${unitId}.yaml`, SourceMappingSchema);
  }

  async listSources(): Promise<Source[]> {
    const dir = path.join(this.root, 'sources/registry');
    const files = (await readdir(dir)).filter((name: string) => name.endsWith('.yaml')).sort();
    const groups = await Promise.all(files.map(async (name: string) => SourceSchema.array().parse(
      YAML.parse(await readFile(path.join(dir, name), 'utf8'))
    )));
    return groups.flat();
  }

  private async read<T>(relative: string, schema: { parse(value: unknown): T }): Promise<T> {
    const text = await readFile(path.join(this.root, relative), 'utf8');
    return schema.parse(YAML.parse(text));
  }

  private async write(relative: string, value: unknown): Promise<void> {
    const file = path.join(this.root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, YAML.stringify(value), 'utf8');
  }
}
