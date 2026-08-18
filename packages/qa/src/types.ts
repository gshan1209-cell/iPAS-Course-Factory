import type { Source, UnitManifest } from '@ipas-course-factory/schemas';

export interface QaFinding {
  code: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  artifactId?: string;
  sourceId?: string;
}

export interface QaReport {
  status: 'PASSED' | 'FAILED';
  findings: QaFinding[];
}

export interface UnitQaContext {
  unit: UnitManifest;
  registry: Source[];
}
