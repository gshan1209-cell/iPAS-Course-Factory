import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveRepoRoot } from '../src/container.js';

describe('resolveRepoRoot', () => {
  it('walks upward from a filtered package cwd to the pnpm workspace root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'course-factory-root-'));
    const nested = path.join(root, 'apps', 'cli');
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n  - packages/*\n');

    expect(resolveRepoRoot({}, nested)).toBe(root);
  });

  it('prefers an explicit COURSE_FACTORY_REPO_ROOT', () => {
    expect(resolveRepoRoot({ COURSE_FACTORY_REPO_ROOT: '/explicit/root' }, '/ignored/cwd'))
      .toBe(path.resolve('/explicit/root'));
  });

  it('fails clearly when no workspace root can be found', () => {
    expect(() => resolveRepoRoot({}, path.parse(process.cwd()).root))
      .toThrow('Could not locate iPAS-Course-Factory repo root');
  });
});
