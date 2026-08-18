import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import { TEMPLATE_CONTRACTS, type TemplateContractKey } from './template-registry.js';

export type TemplateVariables = Record<string, unknown>;

export class MissingTemplateVariableError extends Error {
  constructor(public readonly variable: string) {
    super(`Missing template variable: ${variable}`);
    this.name = 'MissingTemplateVariableError';
  }
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

export function validateTemplateVariables(contractKey: TemplateContractKey, variables: TemplateVariables): void {
  for (const required of TEMPLATE_CONTRACTS[contractKey].required) {
    if (isMissing(variables[required])) throw new MissingTemplateVariableError(required);
  }
}

function resolveTemplateRoot(explicit?: string): string {
  const configured = explicit?.trim() || process.env.COURSE_FACTORY_TEMPLATE_ROOT?.trim();
  return path.resolve(configured || path.join(process.cwd(), 'templates'));
}

export async function renderTemplate(
  contractKey: TemplateContractKey,
  variables: TemplateVariables,
  options: { templateRoot?: string } = {}
): Promise<string> {
  validateTemplateVariables(contractKey, variables);
  const contract = TEMPLATE_CONTRACTS[contractKey];
  const source = await readFile(path.join(resolveTemplateRoot(options.templateRoot), contract.path), 'utf8');
  return Handlebars.compile(source, { noEscape: true })(variables);
}
