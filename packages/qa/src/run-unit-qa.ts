import { runContentQa } from './content-qa.js';
import { runExamQa } from './exam-qa.js';
import { runManifestQa } from './manifest-qa.js';
import { runSourceQa } from './source-qa.js';
import type { QaReport, UnitQaContext } from './types.js';

export function runUnitQa(context: UnitQaContext): QaReport {
  const findings = [
    ...runSourceQa(context),
    ...runManifestQa(context),
    ...runContentQa(context),
    ...runExamQa(context)
  ];
  return {
    status: findings.some(finding => finding.severity === 'ERROR') ? 'FAILED' : 'PASSED',
    findings
  };
}
