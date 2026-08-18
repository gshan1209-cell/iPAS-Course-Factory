#!/usr/bin/env node
import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createCliContainer, type CliContainer } from './container.js';
import { registerArtifactRegister } from './commands/artifact-register.js';
import { registerDriveEnsure } from './commands/drive-ensure.js';
import { registerGenerate } from './commands/generate.js';
import { registerQaRun } from './commands/qa-run.js';
import { registerSourceAttach } from './commands/source-attach.js';
import { registerStatus } from './commands/status.js';
import { registerTransition } from './commands/transition.js';
import { registerUnitCreate } from './commands/unit-create.js';

export type { CliContainer } from './container.js';

export async function runCli(args: string[], container: CliContainer = createCliContainer()): Promise<string> {
  const output: string[] = [];
  const write = (text: string) => output.push(text.trimEnd());
  const program = new Command();
  program.name('course-factory').exitOverride();
  program.configureOutput({
    writeOut: (text: string) => output.push(text.trimEnd()),
    writeErr: (text: string) => output.push(text.trimEnd())
  });

  const unit = program.command('unit'); registerUnitCreate(unit, container, write);
  const source = program.command('source'); registerSourceAttach(source, container, write);
  const drive = program.command('drive'); registerDriveEnsure(drive, container, write);
  const artifact = program.command('artifact'); registerArtifactRegister(artifact, container, write);
  const generate = program.command('generate'); registerGenerate(generate, container, write);
  const qa = program.command('qa'); registerQaRun(qa, container, write);
  registerStatus(program.command('status'), container, write);
  registerTransition(program.command('transition'), container, write);

  await program.parseAsync(['node', 'course-factory', ...args], { from: 'node' });
  return output.filter(Boolean).join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runCli(process.argv.slice(2)).then(text => {
    if (text) process.stdout.write(`${text}\n`);
  }).catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
