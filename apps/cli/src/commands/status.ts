import type { Command } from 'commander';
import { calculateArtifactCompleteness } from '@ipas-course-factory/core';
import type { CliContainer } from '../container.js';

export async function executeStatus(unitId: string, container: CliContainer): Promise<string> {
  const unit = await container.store.loadUnit(unitId);
  const completion = calculateArtifactCompleteness(unit);
  const gates = ['slides', 'voice', 'finalPublication']
    .map(key => `${key}=${unit.gates[key]?.status ?? 'PENDING'}`).join(' | ');
  const errors = unit.qa.findings.filter(finding => finding.severity === 'ERROR').length;
  const drive = unit.drive.unitFolderId ? `https://drive.google.com/drive/folders/${unit.drive.unitFolderId}` : 'not-provisioned';
  return [
    `${unit.unitId} | ${unit.title}`,
    `state=${unit.status}`,
    `artifacts=${completion.complete}/${completion.total}`,
    `gates: ${gates}`,
    `qa=${unit.qa.status} | errors=${errors}`,
    `drive=${drive}`
  ].join('\n');
}

export function registerStatus(parent: Command, container: CliContainer, write: (text: string) => void): void {
  parent.argument('<unit-id>').action(async (unitId: string) => write(await executeStatus(unitId, container)));
}
