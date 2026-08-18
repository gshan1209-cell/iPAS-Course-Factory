import type { Command } from 'commander';
import { assertUnitStatus, transitionUnit } from '@ipas-course-factory/core';
import { runUnitQa } from '@ipas-course-factory/qa';
import type { CliContainer } from '../container.js';

export async function executeQaRun(unitId: string, container: CliContainer): Promise<string> {
  let unit = await container.store.loadUnit(unitId);
  if (unit.status === 'CONTENT_READY') {
    unit = transitionUnit(unit, 'CONTENT_QA', {
      actor: container.actor, now: container.now(), evidence: ['qa:run']
    });
  } else {
    assertUnitStatus(unit, 'CONTENT_QA');
  }

  const report = runUnitQa({ unit, registry: await container.store.listSources() });
  unit = { ...unit, qa: { status: report.status, findings: report.findings } };

  if (report.status === 'PASSED') {
    unit = transitionUnit(unit, 'NOTEBOOKLM_PENDING', {
      actor: container.actor, now: container.now(), evidence: ['qa:PASSED']
    });
  } else {
    const codes = report.findings.filter(finding => finding.severity === 'ERROR').map(finding => finding.code);
    unit = transitionUnit(unit, 'QA_FAILED', {
      actor: container.actor, now: container.now(), evidence: codes.map(code => `qa:${code}`),
      reason: `QA failed: ${codes.join(', ')}`
    });
  }
  await container.store.saveUnit(unit);
  return `${unitId} | QA ${report.status} | ${unit.status} | errors=${report.findings.filter(finding => finding.severity === 'ERROR').length}`;
}

export function registerQaRun(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.command('run <unit-id>').action(async (unitId: string) => write(await executeQaRun(unitId, container)));
}
