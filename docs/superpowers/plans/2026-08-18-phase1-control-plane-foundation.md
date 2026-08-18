# Phase 1 Control Plane Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working control plane for `iPAS-Course-Factory` so an operator can register an iPAS unit, attach governed sources, provision the standard Google Drive workspace idempotently, generate and persist the complete pre-NotebookLM content pack through a replaceable generation adapter, run QA, and track the unit through mandatory human-gated workflow states.

**Architecture:** Use a TypeScript monorepo with validated file-backed manifests as canonical state. Domain rules live in pure packages behind explicit ports; Google Drive/Docs and model generation live in adapters. The CLI is a thin operator surface over application services. Phase 1 deliberately excludes the dashboard and brittle NotebookLM/CapCut browser automation.

**Tech Stack:** TypeScript, pnpm workspaces, Zod, YAML, Vitest, Commander, Google APIs client, `pdfjs-dist`, Handlebars, and the official OpenAI JavaScript SDK behind a provider-neutral `GenerationPort`.

**Spec:** `docs/superpowers/specs/2026-08-18-ipas-course-factory-design.md`

## Global Constraints

- GitHub is canonical for schemas, manifests, workflow state, templates, QA rules, and governance.
- Google Drive is the asset plane; Drive file existence alone never advances workflow state.
- Phase 1 uses file-backed YAML/JSON manifests; do not add a database.
- S0-S4 official sources outrank S5 internal teaching supplements.
- S2 errata overrides only the affected content it explicitly corrects; S0 remains the overall exam-scope boundary.
- Every source-bound artifact retains source lineage through source IDs.
- Human gates remain mandatory for slide approval, voice approval, and final publication approval.
- Standard unit workspace has exactly ten numbered artifact groups; Slides and Voice groups contain both prompt and generated-output sub-artifacts.
- Normal workflow includes `SLIDES_REVIEW -> SLIDES_APPROVED -> VOICE_PENDING -> VOICE_REVIEW -> VOICE_APPROVED -> VIDEO_PENDING`.
- Drive folder creation and generated-document writes must be idempotent.
- Duplicate Drive folder ambiguity must block rather than silently merge.
- Domain logic must not import Google Drive, Google Docs, GitHub, NotebookLM, CapCut, OpenAI, or CLI-specific APIs.
- Do not automate NotebookLM or CapCut with browser hacks in Phase 1.
- Generated Slides output, Voice output, and Video output remain human-produced external artifacts in Phase 1.
- Every task is implemented test-first and ends with relevant tests passing before commit.

---

## Target File Structure

```text
.
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.workspace.ts
├── .gitignore
├── .env.example
├── apps/
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── container.ts
│       │   └── commands/
│       │       ├── unit-create.ts
│       │       ├── source-attach.ts
│       │       ├── drive-ensure.ts
│       │       ├── artifact-register.ts
│       │       ├── generate.ts
│       │       ├── qa-run.ts
│       │       ├── status.ts
│       │       └── transition.ts
│       └── test/cli.test.ts
├── packages/
│   ├── schemas/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── course.ts
│   │   │   ├── subject.ts
│   │   │   ├── source.ts
│   │   │   ├── artifact.ts
│   │   │   ├── gate.ts
│   │   │   └── unit.ts
│   │   └── test/schemas.test.ts
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── manifest-store.ts
│   │   │   ├── source-governance.ts
│   │   │   ├── workflow.ts
│   │   │   ├── artifacts.ts
│   │   │   └── unit-service.ts
│   │   └── test/
│   │       ├── manifest-store.test.ts
│   │       ├── source-governance.test.ts
│   │       ├── workflow.test.ts
│   │       ├── artifacts.test.ts
│   │       ├── unit-service.test.ts
│   │       └── migration-fixtures.test.ts
│   ├── drive/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── port.ts
│   │   │   ├── folder-plan.ts
│   │   │   ├── ensure-workspace.ts
│   │   │   ├── google-auth.ts
│   │   │   ├── google-drive-adapter.ts
│   │   │   ├── source-reader.ts
│   │   │   └── artifact-writer.ts
│   │   └── test/
│   │       ├── ensure-workspace.test.ts
│   │       ├── source-reader.test.ts
│   │       └── artifact-writer.test.ts
│   ├── generator/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── port.ts
│   │   │   ├── template-registry.ts
│   │   │   ├── render.ts
│   │   │   ├── content-pack.ts
│   │   │   └── openai-adapter.ts
│   │   └── test/
│   │       ├── render.test.ts
│   │       ├── openai-adapter.test.ts
│   │       └── content-pack.test.ts
│   └── qa/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── source-qa.ts
│       │   ├── manifest-qa.ts
│       │   ├── content-qa.ts
│       │   ├── exam-qa.ts
│       │   └── run-unit-qa.ts
│       └── test/qa.test.ts
├── catalog/
│   ├── courses/ipas-ai-planner.yaml
│   ├── subjects/intermediate-M1.yaml
│   └── units/
│       ├── M1-01.yaml
│       └── M1-02.yaml
├── sources/
│   ├── registry/ipas-intermediate.yaml
│   └── mappings/
│       ├── M1-01.yaml
│       └── M1-02.yaml
├── templates/
│   ├── source-brief/default.hbs
│   ├── slides/master-art-direction/ipas-intermediate.hbs
│   ├── voice/ipas-intermediate.hbs
│   ├── handout/ipas-intermediate.hbs
│   ├── desktop-card/ipas-intermediate.hbs
│   ├── mobile-card/ipas-intermediate.hbs
│   ├── formula-card/ipas-intermediate.hbs
│   ├── exam-breakdown/ipas-intermediate.hbs
│   └── question-bank/ipas-intermediate.hbs
├── docs/
│   ├── architecture/phase1-control-plane.md
│   ├── governance/source-registry.md
│   └── workflows/phase1-operator-workflow.md
└── tests/
    ├── phase1.acceptance.test.ts
    └── fixtures/
        ├── valid-unit.yaml
        └── duplicate-drive-tree.json
```

---

### Task 1: Bootstrap the TypeScript Monorepo and Test Harness

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `packages/schemas/package.json`
- Create: `packages/schemas/tsconfig.json`
- Create: `packages/schemas/src/index.ts`
- Create: `packages/schemas/test/schemas.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: root scripts `build`, `test`, `typecheck`; package alias `@ipas-course-factory/schemas`.

- [ ] **Step 1: Initialize pnpm workspace and install development dependencies**

Run:

```bash
pnpm init
pnpm add -Dw typescript vitest @types/node
```

Edit root `package.json` to contain these scripts while preserving dependency versions written by pnpm:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "typecheck": "pnpm -r typecheck"
  }
}
```

Create:

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 2: Write the first failing test**

```ts
// packages/schemas/test/schemas.test.ts
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../src/index.js';

describe('schemas package', () => {
  it('exposes schema version 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
```

Create `packages/schemas/src/index.ts` as an empty file, then run:

```bash
pnpm test packages/schemas/test/schemas.test.ts
```

Expected: FAIL because `SCHEMA_VERSION` is not exported.

- [ ] **Step 3: Add shared TypeScript configuration and minimal package implementation**

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

```json
// packages/schemas/package.json
{
  "name": "@ipas-course-factory/schemas",
  "private": true,
  "type": "module",
  "exports": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```json
// packages/schemas/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*.ts"]
}
```

```ts
// packages/schemas/src/index.ts
export const SCHEMA_VERSION = 1 as const;
```

```ts
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';
export default defineWorkspace(['packages/*', 'apps/*', 'tests']);
```

```gitignore
# .gitignore
node_modules/
dist/
coverage/
.env
.course-factory/
.DS_Store
```

```dotenv
# .env.example
OPENAI_API_KEY=
OPENAI_MODEL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
COURSE_FACTORY_CATALOG_ROOT=./catalog
COURSE_FACTORY_SOURCE_ROOT=./sources
COURSE_FACTORY_TEMPLATE_ROOT=./templates
COURSE_FACTORY_INTEGRATION_DRIVE_ROOT=
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm test packages/schemas/test/schemas.test.ts
pnpm typecheck
```

Expected: PASS.

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts .gitignore .env.example packages/schemas
git commit -m "build: bootstrap TypeScript course factory workspace"
```

---

### Task 2: Define the Canonical Schemas

**Files:**
- Modify: `packages/schemas/package.json`
- Create: `packages/schemas/src/course.ts`
- Create: `packages/schemas/src/subject.ts`
- Create: `packages/schemas/src/source.ts`
- Create: `packages/schemas/src/artifact.ts`
- Create: `packages/schemas/src/gate.ts`
- Create: `packages/schemas/src/unit.ts`
- Modify: `packages/schemas/src/index.ts`
- Replace: `packages/schemas/test/schemas.test.ts`
- Create: `tests/fixtures/valid-unit.yaml`

**Interfaces:**
- Produces: `CourseSchema`, `SubjectSchema`, `SourceSchema`, `ArtifactGroupSchema`, `GateSchema`, `UnitManifestSchema` and inferred `Course`, `Subject`, `Source`, `ArtifactGroup`, `Gate`, `UnitManifest`, `UnitStatus` types.

- [ ] **Step 1: Add Zod and write failing validation tests**

Run:

```bash
pnpm --filter @ipas-course-factory/schemas add zod
```

```ts
// packages/schemas/test/schemas.test.ts
import { describe, expect, it } from 'vitest';
import { UnitManifestSchema } from '../src/index.js';

const valid = {
  schemaVersion: 1,
  unitId: 'M1-02',
  courseId: 'ipas-ai-planner',
  level: 'intermediate',
  subjectId: 'M1',
  title: 'Transformer 與 BERT',
  coreThesis: '有了向量還不夠，模型還要知道一句話裡哪些詞彼此最重要。',
  status: 'CONTENT_READY',
  drive: { unitFolderId: null, folders: {} },
  sources: [],
  artifacts: {},
  gates: {},
  qa: { status: 'NOT_RUN', findings: [] },
  history: []
};

describe('UnitManifestSchema', () => {
  it('accepts a valid unit manifest', () => {
    expect(UnitManifestSchema.parse(valid).unitId).toBe('M1-02');
  });

  it('rejects an unknown workflow state', () => {
    expect(() => UnitManifestSchema.parse({ ...valid, status: 'DONE' })).toThrow();
  });

  it('rejects NOT_APPLICABLE without a reason', () => {
    expect(() => UnitManifestSchema.parse({
      ...valid,
      artifacts: {
        formula: {
          group: 'FORMULA_DECISION_CARD',
          status: 'NOT_APPLICABLE',
          reason: null,
          items: []
        }
      }
    })).toThrow('NOT_APPLICABLE requires reason');
  });
});
```

Run: `pnpm test packages/schemas/test/schemas.test.ts`

Expected: FAIL because the schemas do not exist.

- [ ] **Step 2: Implement Source, Artifact, and Gate schemas**

```ts
// packages/schemas/src/source.ts
import { z } from 'zod';

export const SourceTierSchema = z.enum(['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);

export const SourceSchema = z.object({
  sourceId: z.string().min(1),
  tier: SourceTierSchema,
  title: z.string().min(1),
  provider: z.string().min(1),
  driveFileId: z.string().min(1),
  scope: z.array(z.string()).default([]),
  effectiveDate: z.string().date().nullable().default(null),
  supersedes: z.array(z.string()).default([]),
  corrects: z.array(z.string()).default([])
});

export type Source = z.infer<typeof SourceSchema>;
```

```ts
// packages/schemas/src/artifact.ts
import { z } from 'zod';

export const ArtifactStatusSchema = z.enum([
  'NOT_STARTED', 'GENERATING', 'READY', 'QA_FAILED',
  'REVISION_REQUIRED', 'APPROVED', 'NOT_APPLICABLE'
]);

export const ArtifactItemSchema = z.object({
  artifactId: z.string().min(1),
  kind: z.string().min(1),
  status: ArtifactStatusSchema,
  driveFileId: z.string().min(1).nullable().default(null),
  url: z.string().url().nullable().default(null),
  sourceIds: z.array(z.string()).default([]),
  generatedAt: z.string().datetime().nullable().default(null),
  qaStatus: z.enum(['NOT_RUN', 'PASSED', 'FAILED']).default('NOT_RUN'),
  version: z.string().min(1).default('1.0'),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const ArtifactGroupSchema = z.object({
  group: z.enum([
    'SOURCE_BRIEF', 'SLIDES_PACKAGE', 'VOICE_PACKAGE', 'VIDEO_OUTPUT',
    'COURSE_HANDOUT', 'DESKTOP_EXPLAINERS', 'MOBILE_KEY_CARDS',
    'FORMULA_DECISION_CARD', 'OFFICIAL_QUESTION_BREAKDOWN', 'UNIT_QUESTION_BANK'
  ]),
  status: ArtifactStatusSchema,
  reason: z.string().min(1).nullable().default(null),
  items: z.array(ArtifactItemSchema).default([])
}).superRefine((value, ctx) => {
  if (value.status === 'NOT_APPLICABLE' && !value.reason) {
    ctx.addIssue({ code: 'custom', message: 'NOT_APPLICABLE requires reason', path: ['reason'] });
  }
});
```

```ts
// packages/schemas/src/gate.ts
import { z } from 'zod';

export const GateSchema = z.object({
  gateType: z.enum(['SLIDES', 'VOICE', 'FINAL_PUBLICATION']),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  approvedBy: z.string().nullable().default(null),
  approvedAt: z.string().datetime().nullable().default(null),
  evidence: z.array(z.string()).default([])
});
```

- [ ] **Step 3: Implement Course, Subject, and Unit schemas**

```ts
// packages/schemas/src/course.ts
import { z } from 'zod';

export const CourseSchema = z.object({
  schemaVersion: z.literal(1),
  courseId: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  authority: z.string().min(1),
  levels: z.array(z.string()).min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  driveRootFolderId: z.string().min(1)
}).strict();
```

```ts
// packages/schemas/src/subject.ts
import { z } from 'zod';

export const SubjectSchema = z.object({
  schemaVersion: z.literal(1),
  subjectId: z.string().min(1),
  courseId: z.string().min(1),
  level: z.string().min(1),
  name: z.string().min(1),
  badge: z.string().min(1),
  unitIds: z.array(z.string()).default([])
}).strict();
```

```ts
// packages/schemas/src/unit.ts
import { z } from 'zod';
import { ArtifactGroupSchema } from './artifact.js';
import { GateSchema } from './gate.js';

export const UnitStatusSchema = z.enum([
  'PLANNED', 'SOURCE_READY', 'BRIEF_READY', 'CONTENT_GENERATING', 'CONTENT_READY',
  'CONTENT_QA', 'NOTEBOOKLM_PENDING', 'SLIDES_REVIEW', 'SLIDES_APPROVED',
  'VOICE_PENDING', 'VOICE_REVIEW', 'VOICE_APPROVED', 'VIDEO_PENDING',
  'FINAL_REVIEW', 'PUBLISHED', 'BLOCKED', 'QA_FAILED', 'REVISION_REQUIRED'
]);

export const UnitManifestSchema = z.object({
  schemaVersion: z.literal(1),
  unitId: z.string().min(1),
  courseId: z.string().min(1),
  level: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().min(1),
  coreThesis: z.string().min(1),
  status: UnitStatusSchema,
  drive: z.object({
    unitFolderId: z.string().nullable(),
    folders: z.record(z.string(), z.string()).default({})
  }).strict(),
  sources: z.array(z.string()),
  artifacts: z.record(z.string(), ArtifactGroupSchema),
  gates: z.record(z.string(), GateSchema),
  qa: z.object({
    status: z.enum(['NOT_RUN', 'PASSED', 'FAILED']),
    findings: z.array(z.object({
      code: z.string(),
      severity: z.enum(['INFO', 'WARNING', 'ERROR']),
      message: z.string(),
      artifactId: z.string().optional(),
      sourceId: z.string().optional()
    }).strict())
  }).strict(),
  history: z.array(z.object({
    timestamp: z.string().datetime(),
    actor: z.string(),
    action: z.string(),
    previous: z.string().nullable(),
    next: z.string().nullable(),
    evidence: z.array(z.string())
  }).strict())
}).strict();
```

- [ ] **Step 4: Export schemas/types and verify strictness**

`packages/schemas/src/index.ts` must export `SCHEMA_VERSION`, every schema above, and inferred types. Add a test that an unknown top-level field is rejected by `UnitManifestSchema`.

Run:

```bash
pnpm test packages/schemas/test/schemas.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schemas tests/fixtures/valid-unit.yaml pnpm-lock.yaml
git commit -m "feat: define course factory domain schemas"
```

---

### Task 3: Implement Validated YAML Manifest Persistence

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/manifest-store.ts`
- Create: `packages/core/test/manifest-store.test.ts`

**Interfaces:**
- Consumes: schemas package.
- Produces: `YamlManifestStore` with `loadUnit()`, `saveUnit()`, `loadCourse()`, `loadSubject()`, `listSources()`.

- [ ] **Step 1: Create core package, add `yaml`, and write failing round-trip test**

Run:

```bash
pnpm --filter @ipas-course-factory/core add yaml @ipas-course-factory/schemas@workspace:*
```

Use this test:

```ts
import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { YamlManifestStore } from '../src/manifest-store.js';

it('validates and round-trips a unit manifest', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'course-factory-'));
  const store = new YamlManifestStore(root);
  const unit = {
    schemaVersion: 1 as const,
    unitId: 'M1-99',
    courseId: 'ipas-ai-planner',
    level: 'intermediate',
    subjectId: 'M1',
    title: 'Fixture',
    coreThesis: 'Fixture thesis',
    status: 'PLANNED' as const,
    drive: { unitFolderId: null, folders: {} },
    sources: [], artifacts: {}, gates: {},
    qa: { status: 'NOT_RUN' as const, findings: [] },
    history: []
  };
  await store.saveUnit(unit);
  expect((await store.loadUnit('M1-99')).unitId).toBe('M1-99');
  expect(await readFile(path.join(root, 'catalog/units/M1-99.yaml'), 'utf8')).toContain('unitId: M1-99');
});
```

Expected: FAIL because the store does not exist.

- [ ] **Step 2: Implement validation on every read/write**

```ts
// packages/core/src/manifest-store.ts
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import {
  CourseSchema, SubjectSchema, SourceSchema, UnitManifestSchema,
  type Course, type Subject, type Source, type UnitManifest
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

  async loadSubject(subjectId: string): Promise<Subject> {
    return this.read(`catalog/subjects/${subjectId}.yaml`, SubjectSchema);
  }

  async listSources(): Promise<Source[]> {
    const dir = path.join(this.root, 'sources/registry');
    const files = (await readdir(dir)).filter(name => name.endsWith('.yaml')).sort();
    const groups = await Promise.all(files.map(async name => SourceSchema.array().parse(
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
```

- [ ] **Step 3: Add invalid-save and serialization tests**

Test that `saveUnit()` rejects `status: 'DONE'` and that save/load/save is semantically identical after parsing.

Run:

```bash
pnpm test packages/core/test/manifest-store.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core pnpm-lock.yaml
git commit -m "feat: persist validated YAML manifests"
```

---

### Task 4: Implement Source Governance and Errata Precedence

**Files:**
- Create: `packages/core/src/source-governance.ts`
- Create: `packages/core/test/source-governance.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `resolveAuthoritativeSources(sources)`, `validateSourceLineage(sourceIds, registry)`, `hasOfficialSource(sourceIds, registry)`.

- [ ] **Step 1: Write failing precedence tests**

```ts
import { expect, it } from 'vitest';
import { resolveAuthoritativeSources } from '../src/source-governance.js';

it('places an errata source before the source it explicitly corrects', () => {
  const guide = { sourceId: 'guide', tier: 'S1', title: 'Guide', provider: 'iPAS', driveFileId: 'g', scope: ['NLP'], effectiveDate: null, supersedes: [], corrects: [] } as const;
  const errata = { sourceId: 'errata', tier: 'S2', title: 'Errata', provider: 'iPAS', driveFileId: 'e', scope: ['NLP'], effectiveDate: '2026-04-10', supersedes: [], corrects: ['guide'] } as const;
  expect(resolveAuthoritativeSources([guide, errata]).map(x => x.sourceId)).toEqual(['errata', 'guide']);
});

it('keeps S5 behind official tiers', () => {
  const result = resolveAuthoritativeSources([
    { sourceId: 'internal', tier: 'S5', title: 'Internal', provider: 'JunCloud', driveFileId: 'i', scope: [], effectiveDate: null, supersedes: [], corrects: [] },
    { sourceId: 'sample', tier: 'S4', title: 'Sample', provider: 'iPAS', driveFileId: 's', scope: [], effectiveDate: null, supersedes: [], corrects: [] }
  ]);
  expect(result.map(x => x.sourceId)).toEqual(['sample', 'internal']);
});
```

- [ ] **Step 2: Implement deterministic ranking**

Use general priority `S0 -> S1 -> S2 -> S3 -> S4 -> S5`, but add one exception: if A explicitly `corrects` or `supersedes` B, A sorts before B. This preserves S0 as scope authority while allowing S2 to override affected S1 text.

```ts
const tierWeight = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4, S5: 5 } as const;

export function resolveAuthoritativeSources(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    if (a.corrects.includes(b.sourceId) || a.supersedes.includes(b.sourceId)) return -1;
    if (b.corrects.includes(a.sourceId) || b.supersedes.includes(a.sourceId)) return 1;
    return tierWeight[a.tier] - tierWeight[b.tier] || a.sourceId.localeCompare(b.sourceId);
  });
}
```

- [ ] **Step 3: Implement lineage and official-source checks**

```ts
export function validateSourceLineage(sourceIds: string[], registry: Source[]): string[] {
  const known = new Set(registry.map(source => source.sourceId));
  return sourceIds.filter(id => !known.has(id));
}

export function hasOfficialSource(sourceIds: string[], registry: Source[]): boolean {
  const selected = registry.filter(source => sourceIds.includes(source.sourceId));
  return selected.some(source => source.tier !== 'S5');
}
```

Test unknown IDs and an S5-only unit.

- [ ] **Step 4: Verify and commit**

Run: `pnpm test packages/core/test/source-governance.test.ts`

```bash
git add packages/core/src/source-governance.ts packages/core/test/source-governance.test.ts packages/core/src/index.ts
git commit -m "feat: enforce source governance and errata precedence"
```

---

### Task 5: Implement the Auditable Workflow State Machine

**Files:**
- Create: `packages/core/src/workflow.ts`
- Create: `packages/core/test/workflow.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `canTransition(from, to, reason?)`, `transitionUnit(unit, to, context)`.

- [ ] **Step 1: Write failing transition tests**

Tests must cover:
- `SLIDES_APPROVED -> VOICE_PENDING` allowed;
- `VOICE_PENDING -> VOICE_REVIEW -> VOICE_APPROVED -> VIDEO_PENDING` allowed;
- `SLIDES_REVIEW -> PUBLISHED` rejected;
- transition to current state is idempotent;
- entering `BLOCKED`, `QA_FAILED`, or `REVISION_REQUIRED` without reason is rejected.

- [ ] **Step 2: Implement the normal transition map**

```ts
export const NORMAL_NEXT = {
  PLANNED: 'SOURCE_READY',
  SOURCE_READY: 'BRIEF_READY',
  BRIEF_READY: 'CONTENT_GENERATING',
  CONTENT_GENERATING: 'CONTENT_READY',
  CONTENT_READY: 'CONTENT_QA',
  CONTENT_QA: 'NOTEBOOKLM_PENDING',
  NOTEBOOKLM_PENDING: 'SLIDES_REVIEW',
  SLIDES_REVIEW: 'SLIDES_APPROVED',
  SLIDES_APPROVED: 'VOICE_PENDING',
  VOICE_PENDING: 'VOICE_REVIEW',
  VOICE_REVIEW: 'VOICE_APPROVED',
  VOICE_APPROVED: 'VIDEO_PENDING',
  VIDEO_PENDING: 'FINAL_REVIEW',
  FINAL_REVIEW: 'PUBLISHED',
  PUBLISHED: undefined
} as const;
```

Exception-state recovery always requires an explicit target plus evidence; never infer a recovery state.

- [ ] **Step 3: Implement immutable audit history**

```ts
export function transitionUnit(
  unit: UnitManifest,
  next: UnitStatus,
  context: { actor: string; now: string; evidence?: string[]; reason?: string }
): UnitManifest {
  if (!canTransition(unit.status, next, context.reason)) {
    throw new IllegalTransitionError(unit.status, next);
  }
  if (unit.status === next) return unit;
  const evidence = [...(context.evidence ?? [])];
  if (context.reason) evidence.push(context.reason);
  return {
    ...unit,
    status: next,
    history: [...unit.history, {
      timestamp: context.now,
      actor: context.actor,
      action: 'workflow.transition',
      previous: unit.status,
      next,
      evidence
    }]
  };
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm test packages/core/test/workflow.test.ts`

```bash
git add packages/core/src/workflow.ts packages/core/test/workflow.test.ts packages/core/src/index.ts
git commit -m "feat: add auditable unit workflow state machine"
```

---

### Task 6: Implement Artifact Packages, Completeness, and Human Gate Invariants

**Files:**
- Create: `packages/core/src/artifacts.ts`
- Create: `packages/core/test/artifacts.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `createDefaultArtifactGroups()`, `calculateArtifactCompleteness(unit)`, `registerExternalArtifact(unit, input)`, `approveGate(unit, input)`.

- [ ] **Step 1: Write failing artifact-contract tests**

Tests must verify:
1. exactly ten artifact groups;
2. Slides package contains `SLIDES_PROMPT` and `SLIDES_OUTPUT`;
3. Voice package contains `VOICE_PROMPT` and `VOICE_OUTPUT`;
4. `NOT_APPLICABLE` counts complete only with a reason;
5. Slides approval requires a Slides output URL or Drive file ID;
6. Voice approval requires a Voice output URL or Drive file ID;
7. Final approval requires a Video output URL or Drive file ID.

- [ ] **Step 2: Implement stable artifact keys**

```ts
export const ARTIFACT_KEYS = [
  'sourceBrief', 'slides', 'voice', 'video', 'handout',
  'desktopExplainers', 'mobileCards', 'formulaDecisionCard',
  'officialQuestionBreakdown', 'questionBank'
] as const;
```

`createDefaultArtifactGroups()` must return all ten keys. Slides/Voice start with two items each: prompt and output. Video starts with one `VIDEO_OUTPUT` item.

- [ ] **Step 3: Implement completeness calculation**

```ts
export function calculateArtifactCompleteness(unit: UnitManifest) {
  const groups = ARTIFACT_KEYS.map(key => unit.artifacts[key]);
  const complete = groups.filter(group => group && (
    group.status === 'READY' || group.status === 'APPROVED' ||
    (group.status === 'NOT_APPLICABLE' && Boolean(group.reason))
  )).length;
  return {
    complete,
    total: ARTIFACT_KEYS.length,
    percent: Math.round((complete / ARTIFACT_KEYS.length) * 100)
  };
}
```

- [ ] **Step 4: Implement external output registration**

```ts
export interface RegisterExternalArtifactInput {
  groupKey: 'slides' | 'voice' | 'video';
  kind: 'SLIDES_OUTPUT' | 'VOICE_OUTPUT' | 'VIDEO_OUTPUT';
  driveFileId?: string;
  url?: string;
  actor: string;
  now: string;
}
```

Reject registration when both `driveFileId` and `url` are absent.

- [ ] **Step 5: Implement gate approval invariants**

`approveGate()` requires:
- `approvedBy` non-empty;
- `approvedAt` ISO datetime;
- at least one evidence string;
- corresponding generated external output registered.

It updates the gate only; workflow state still advances through `transitionUnit()` so gate approval and state transition remain separately auditable.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test packages/core/test/artifacts.test.ts`

```bash
git add packages/core/src/artifacts.ts packages/core/test/artifacts.test.ts packages/core/src/index.ts
git commit -m "feat: enforce artifact packages and human gates"
```

---

### Task 7: Implement Idempotent Google Drive Workspace Provisioning

**Files:**
- Create: `packages/drive/package.json`
- Create: `packages/drive/tsconfig.json`
- Create: `packages/drive/src/index.ts`
- Create: `packages/drive/src/port.ts`
- Create: `packages/drive/src/folder-plan.ts`
- Create: `packages/drive/src/ensure-workspace.ts`
- Create: `packages/drive/src/google-auth.ts`
- Create: `packages/drive/src/google-drive-adapter.ts`
- Create: `packages/drive/test/ensure-workspace.test.ts`
- Create: `tests/fixtures/duplicate-drive-tree.json`

**Interfaces:**

```ts
export interface DriveNode {
  id: string;
  name: string;
  mimeType: string;
  parentId: string;
}

export interface DrivePort {
  listChildren(parentId: string): Promise<DriveNode[]>;
  createFolder(parentId: string, name: string): Promise<DriveNode>;
  getNode(id: string): Promise<DriveNode | null>;
}
```

- [ ] **Step 1: Create drive package and install Google client**

Run:

```bash
pnpm --filter @ipas-course-factory/drive add googleapis @ipas-course-factory/schemas@workspace:* @ipas-course-factory/core@workspace:*
```

- [ ] **Step 2: Write failing idempotency/duplicate tests with an in-memory fake**

Test:
1. no unit root -> create one root and ten children;
2. second ensure -> create zero new nodes;
3. duplicate exact-name folder -> throw `AmbiguousDriveFolderError` containing both IDs;
4. stale mapped ID -> throw `StaleDriveMappingError` rather than silently replace it.

- [ ] **Step 3: Implement the exact folder contract**

```ts
export const STANDARD_UNIT_FOLDERS = {
  source: '01_Source',
  slides: '02_課程簡報',
  voice: '03_語音',
  video: '04_影片',
  handout: '05_講義',
  desktopExplainers: '06_電腦詳解圖',
  mobileCards: '07_手機重點卡',
  formulaDecisionCard: '08_公式卡',
  officialQuestionBreakdown: '09_真題拆解',
  questionBank: '10_題庫'
} as const;
```

- [ ] **Step 4: Implement exact-match ensure behavior**

For unit root and every child:
- mapped ID exists -> validate and reuse;
- no mapped ID -> list exact-name children;
- zero matches -> create;
- one match -> reuse;
- more than one -> throw ambiguity error.

No fuzzy matching and no automatic renaming.

- [ ] **Step 5: Implement OAuth refresh-token auth factory**

`createGoogleAuthFromEnv()` reads exactly:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

If any are missing, throw `GoogleAuthConfigurationError` listing only missing environment variable names. Never log credential values.

- [ ] **Step 6: Implement `GoogleDriveAdapter`**

Use Drive v3 `files.list`, `files.get`, and `files.create` for `DrivePort`. Search children with parent ID and non-trashed constraints, but still apply exact string equality in application code.

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm test packages/drive/test/ensure-workspace.test.ts
pnpm typecheck
```

```bash
git add packages/drive tests/fixtures/duplicate-drive-tree.json pnpm-lock.yaml
git commit -m "feat: provision idempotent Drive unit workspaces"
```

---

### Task 8: Implement Governed Source Reading and Idempotent Google Docs Artifact Writing

**Files:**
- Modify: `packages/drive/package.json`
- Modify: `packages/drive/src/port.ts`
- Create: `packages/drive/src/source-reader.ts`
- Create: `packages/drive/src/artifact-writer.ts`
- Modify: `packages/drive/src/google-drive-adapter.ts`
- Create: `packages/drive/test/source-reader.test.ts`
- Create: `packages/drive/test/artifact-writer.test.ts`

**Interfaces:**

```ts
export interface SourceText {
  sourceId: string;
  tier: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
  title: string;
  text: string;
}

export interface ArtifactDocumentPort {
  upsertTextDocument(input: {
    parentId: string;
    name: string;
    text: string;
    existingFileId?: string | null;
  }): Promise<{ fileId: string; url: string }>;
}
```

- [ ] **Step 1: Install PDF extraction dependency and write failing source-reader tests**

Run:

```bash
pnpm --filter @ipas-course-factory/drive add pdfjs-dist
```

Test an ordered source pack with S1 guide, S2 errata correcting it, and S3 exam. Expected normalized items preserve source IDs, tiers, titles, and text.

- [ ] **Step 2: Implement source-text extraction contract**

For Google-native Docs: export `text/plain`.
For stored UTF-8 text/markdown: download bytes and decode UTF-8.
For PDF: download bytes and extract text with `pdfjs-dist` behind this interface:

```ts
export interface PdfTextExtractor {
  extract(bytes: Uint8Array): Promise<string>;
}
```

Implement `PdfJsTextExtractor` in the drive package. Google adapter code must contain no iPAS-specific parsing rules.

- [ ] **Step 3: Implement `readSourcePack()`**

```ts
export async function readSourcePack(
  sourceIds: string[],
  registry: Source[],
  reader: SourceFilePort
): Promise<SourceText[]> { /* deterministic ordered read */ }
```

Unknown source ID throws `UnknownSourceError` before any generation call.

- [ ] **Step 4: Write failing artifact-writer idempotency tests**

Fake document port test:
1. no `existingFileId` -> create one document;
2. same artifact with returned file ID -> update same document, no new document;
3. stale `existingFileId` -> throw `StaleArtifactDocumentError`, do not create duplicate silently.

- [ ] **Step 5: Implement Google Docs upsert**

For create:
1. Drive `files.create` with MIME type `application/vnd.google-apps.document` and parent folder;
2. Docs `documents.batchUpdate` with `insertText` at index 1.

For update:
1. `documents.get` to obtain body end index;
2. if body has content, `deleteContentRange` from index 1 to `endIndex - 1`;
3. `insertText` new content at index 1.

Return stable Google Doc file ID and web URL. Do not create a new file when an existing valid mapped file ID is supplied.

- [ ] **Step 6: Add guarded real-Drive integration test**

Create `packages/drive/test/google-drive.integration.test.ts`. Skip unless `COURSE_FACTORY_INTEGRATION_DRIVE_ROOT` is non-empty. Test must create a disposable unit folder, ensure workspace twice, create/update one Google Doc twice, assert the same file ID is retained, and trash the disposable root in teardown.

Run when configured:

```bash
pnpm test packages/drive/test/google-drive.integration.test.ts
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm test packages/drive/test/source-reader.test.ts packages/drive/test/artifact-writer.test.ts
pnpm typecheck
```

```bash
git add packages/drive pnpm-lock.yaml
git commit -m "feat: read sources and persist generated Drive documents"
```

---

### Task 9: Implement the Template Registry and Provider-Neutral Generation Adapter

**Files:**
- Create: `packages/generator/package.json`
- Create: `packages/generator/tsconfig.json`
- Create: `packages/generator/src/index.ts`
- Create: `packages/generator/src/port.ts`
- Create: `packages/generator/src/template-registry.ts`
- Create: `packages/generator/src/render.ts`
- Create: `packages/generator/src/openai-adapter.ts`
- Create: `packages/generator/test/render.test.ts`
- Create: `packages/generator/test/openai-adapter.test.ts`
- Create all nine template files listed in Target File Structure.

**Interfaces:**

```ts
export interface GenerationRequest {
  artifactKind: string;
  systemInstructions: string;
  prompt: string;
  sourceIds: string[];
}

export interface GenerationResult {
  text: string;
  provider: string;
  model: string;
  responseId: string | null;
}

export interface GenerationPort {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
```

- [ ] **Step 1: Create generator package and install dependencies**

Run:

```bash
pnpm --filter @ipas-course-factory/generator add handlebars openai @ipas-course-factory/schemas@workspace:* @ipas-course-factory/core@workspace:*
```

- [ ] **Step 2: Write failing required-variable tests**

```ts
it('fails before rendering when core_thesis is missing', async () => {
  await expect(renderTemplate('sourceBrief', {
    course: 'iPAS', unit: 'M1-03'
  })).rejects.toThrow('Missing template variable: core_thesis');
});
```

- [ ] **Step 3: Implement all nine explicit template contracts**

```ts
export const TEMPLATE_CONTRACTS = {
  sourceBrief: {
    path: 'source-brief/default.hbs',
    required: ['course', 'level', 'subject', 'unit', 'core_thesis', 'official_scope', 'source_pack', 'exam_focus']
  },
  slides: {
    path: 'slides/master-art-direction/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'known_traps', 'visual_motif']
  },
  voice: {
    path: 'voice/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'slide_outline', 'exam_focus', 'known_traps']
  },
  handout: {
    path: 'handout/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'known_traps']
  },
  desktopExplainers: {
    path: 'desktop-card/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'visual_motif']
  },
  mobileCards: {
    path: 'mobile-card/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'known_traps', 'visual_motif']
  },
  formulaDecisionCard: {
    path: 'formula-card/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'source_pack', 'exam_focus', 'known_traps']
  },
  officialQuestionBreakdown: {
    path: 'exam-breakdown/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'source_pack', 'exam_focus', 'official_question_refs']
  },
  questionBank: {
    path: 'question-bank/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'source_pack', 'exam_focus', 'known_traps']
  }
} as const;
```

- [ ] **Step 4: Implement Handlebars rendering with pre-validation**

`renderTemplate(contractKey, variables)` validates every required value is present and non-empty before loading/compiling the template.

- [ ] **Step 5: Encode the approved Master Art Direction contract in the slide template**

`templates/slides/master-art-direction/ipas-intermediate.hbs` must explicitly require:
- one slide = one claim;
- judgment/conclusion title, not directory label;
- default maximum three displayed key points;
- narrative `未知 -> 拆解 -> 理解 -> 解題 -> 通關`;
- series motif = progressively clarifying learning-guidance light;
- unit motif = `{{visual_motif}}`;
- 70% primary visual world / 20% professional information design / 10% special memory point;
- varied page rhythm/density;
- visuals must perform a teaching task;
- important concepts include plain-language explanation, practical example, exam focus, common trap, mnemonic;
- prohibit repetitive identical templates, generic decorative AI robots, excessive neon tech backgrounds, purposeless full-bleed illustration, and empty business language.

- [ ] **Step 6: Implement OpenAI adapter behind `GenerationPort`**

Only `packages/generator/src/openai-adapter.ts` imports `openai`. Read `OPENAI_API_KEY` and require non-empty `OPENAI_MODEL`; no model name is a domain constant.

Use the official Responses API call shape:

```ts
const response = await client.responses.create({
  model,
  instructions: request.systemInstructions,
  input: request.prompt
});

return {
  text: response.output_text,
  provider: 'openai',
  model,
  responseId: response.id
};
```

Throw `EmptyGenerationError` when `response.output_text.trim()` is empty.

- [ ] **Step 7: Unit-test the adapter with an injected fake client**

Test model mapping, instructions/input mapping, response ID capture, and empty-response failure without network calls.

- [ ] **Step 8: Verify and commit**

Run:

```bash
pnpm test packages/generator/test/render.test.ts packages/generator/test/openai-adapter.test.ts
pnpm typecheck
```

```bash
git add packages/generator templates pnpm-lock.yaml
git commit -m "feat: add governed templates and generation adapter"
```

---

### Task 10: Implement Content-Pack Orchestration, Drive Persistence, and Artifact Lineage

**Files:**
- Create: `packages/generator/src/content-pack.ts`
- Create: `packages/generator/test/content-pack.test.ts`
- Modify: `packages/generator/src/index.ts`
- Create: `packages/core/src/unit-service.ts`
- Create: `packages/core/test/unit-service.test.ts`

**Interfaces:**
- Consumes: `GenerationPort`, `ArtifactDocumentPort`, source pack, Unit manifest, Drive folder IDs.
- Produces: `generateSourceBrief()` and `generatePreNotebookContentPack()` with updated Artifact items and stable Drive file IDs.

- [ ] **Step 1: Write failing orchestration tests with fake generation/document ports**

The full pre-Notebook pack must request exactly these generated outputs:
1. `SOURCE_BRIEF`
2. `SLIDES_PROMPT`
3. `VOICE_PROMPT`
4. `COURSE_HANDOUT`
5. `DESKTOP_EXPLAINERS`
6. `MOBILE_KEY_CARDS`
7. `FORMULA_DECISION_CARD`
8. `OFFICIAL_QUESTION_BREAKDOWN`
9. `UNIT_QUESTION_BANK`

Assert it does **not** generate `SLIDES_OUTPUT`, `VOICE_OUTPUT`, or `VIDEO_OUTPUT`.

- [ ] **Step 2: Define deterministic output document mapping**

Use these names/folders:
- Source Brief -> `01_Source` -> `中級_<subjectId>_<unitId>_SourceBrief_v1.0`
- Slides Prompt -> `02_課程簡報` -> `中級_<subjectId>_<unitId>_NotebookLM大師級簡報Prompt_v1.0`
- Voice Prompt -> `03_語音` -> `中級_<subjectId>_<unitId>_NotebookLM逐頁語音Prompt_v1.0`
- Handout -> `05_講義` -> `中級_<subjectId>_<unitId>_課程講義_v1.0`
- Desktop -> `06_電腦詳解圖` -> `中級_<subjectId>_<unitId>_電腦詳解圖腳本_v1.0`
- Mobile -> `07_手機重點卡` -> `中級_<subjectId>_<unitId>_手機重點卡腳本_v1.0`
- Formula/Decision -> `08_公式卡` -> `中級_<subjectId>_<unitId>_公式或判斷卡_v1.0`
- Exam Breakdown -> `09_真題拆解` -> `中級_<subjectId>_<unitId>_正式題拆解_v1.0`
- Question Bank -> `10_題庫` -> `中級_<subjectId>_<unitId>_單元題庫_v1.0`

Do not write generated prompt files into `04_影片`.

- [ ] **Step 3: Implement Source Brief state flow**

`generateSourceBrief()`:
1. requires current state `SOURCE_READY`;
2. renders Source Brief template;
3. calls `GenerationPort`;
4. upserts the Google Doc in `01_Source`;
5. records source IDs, provider/model/response ID in artifact metadata;
6. marks Source Brief group `READY`;
7. transitions unit `SOURCE_READY -> BRIEF_READY`.

If any step after model generation fails, do not claim `BRIEF_READY`; preserve evidence of the failure in QA/history.

- [ ] **Step 4: Implement remaining content-pack state flow**

`generatePreNotebookContentPack()`:
1. requires `BRIEF_READY`;
2. transitions to `CONTENT_GENERATING`;
3. generates each remaining eight pre-Notebook artifacts sequentially;
4. upserts each Google Doc to its mapped folder using existing file ID when present;
5. records exact source lineage on every item;
6. marks each group `READY` only after Drive write succeeds;
7. transitions `CONTENT_GENERATING -> CONTENT_READY` only when all eight succeed.

Any partial failure leaves completed items intact and transitions to `QA_FAILED` with artifact ID and reason evidence; rerun must update existing successful documents rather than duplicate them.

- [ ] **Step 5: Store structured QA metadata with generated items**

For important concepts, artifact metadata includes:

```json
{
  "teachingChecklist": {
    "plainLanguage": true,
    "practicalExample": true,
    "examFocus": true,
    "commonTrap": true,
    "mnemonic": true
  }
}
```

For question bank, store structured `questions` metadata in addition to rendered markdown. Minimum question record:

```json
{
  "questionId": "M1-03-Q001",
  "topic": "Object Detection",
  "stem": "...",
  "options": ["A ...", "B ...", "C ...", "D ..."],
  "answer": "B",
  "explanation": "...",
  "distractorReasoning": { "A": "...", "C": "...", "D": "..." },
  "sourceIds": ["source-id"]
}
```

The generation adapter may produce the content, but orchestration validates this structure before marking the question-bank artifact ready.

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm test packages/generator/test/content-pack.test.ts packages/core/test/unit-service.test.ts
pnpm typecheck
```

```bash
git add packages/generator/src/content-pack.ts packages/generator/test/content-pack.test.ts packages/core/src/unit-service.ts packages/core/test/unit-service.test.ts
git commit -m "feat: generate and persist traceable content packs"
```

---

### Task 11: Implement Structured QA and Gate-Blocking Rules

**Files:**
- Create: `packages/qa/package.json`
- Create: `packages/qa/tsconfig.json`
- Create: `packages/qa/src/index.ts`
- Create: `packages/qa/src/types.ts`
- Create: `packages/qa/src/source-qa.ts`
- Create: `packages/qa/src/manifest-qa.ts`
- Create: `packages/qa/src/content-qa.ts`
- Create: `packages/qa/src/exam-qa.ts`
- Create: `packages/qa/src/run-unit-qa.ts`
- Create: `packages/qa/test/qa.test.ts`

**Interfaces:**

```ts
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
```

- [ ] **Step 1: Create package and write failing QA-code tests**

Tests must assert these error codes:
- `SOURCE_OFFICIAL_MISSING`
- `SOURCE_ID_UNKNOWN`
- `ERRATA_MAPPING_UNRESOLVED`
- `ARTIFACT_GROUP_MISSING`
- `GATE_OUTPUT_MISSING`
- `CONTENT_LINEAGE_MISSING`
- `CONTENT_CHECKLIST_INCOMPLETE`
- `EXAM_ANSWER_MISSING`
- `EXAM_EXPLANATION_MISSING`
- `EXAM_TOPIC_MISSING`
- `EXAM_SOURCE_LINEAGE_MISSING`

- [ ] **Step 2: Implement Source QA**

Rules:
- at least one S0-S4 source required for an exam-bound unit;
- every manifest source ID must resolve;
- every `corrects`/`supersedes` ID in attached sources must resolve;
- S5-only source pack is an ERROR, not a warning.

- [ ] **Step 3: Implement Manifest/Gate QA**

Rules:
- all ten artifact keys exist;
- approved Slides gate requires Slides output;
- approved Voice gate requires Voice output;
- approved Final gate requires Video output;
- workflow state cannot be later than the corresponding unapproved gate.

- [ ] **Step 4: Implement Content QA**

For generated source-bound items:
- non-empty source IDs required;
- important teaching artifacts require every `teachingChecklist` boolean true.

This check is structural only. The code must not claim semantic correctness from keyword matching.

- [ ] **Step 5: Implement Exam QA**

For each question record require:
- question ID;
- topic;
- stem;
- at least two options;
- answer;
- explanation;
- non-empty source IDs;
- `distractorReasoning` object for every incorrect option when the artifact contract requests distractor analysis.

- [ ] **Step 6: Implement aggregate runner**

```ts
export function runUnitQa(context: UnitQaContext): QaReport {
  const findings = [
    ...runSourceQa(context),
    ...runManifestQa(context),
    ...runContentQa(context),
    ...runExamQa(context)
  ];
  return {
    status: findings.some(f => f.severity === 'ERROR') ? 'FAILED' : 'PASSED',
    findings
  };
}
```

Only `ERROR` blocks progression; warnings remain visible.

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm test packages/qa/test/qa.test.ts
pnpm typecheck
```

```bash
git add packages/qa pnpm-lock.yaml
git commit -m "feat: add structured course factory QA gates"
```

---

### Task 12: Seed the iPAS Intermediate Catalog, Source Registry, and M1-01/M1-02 Migration Fixtures

**Files:**
- Create: `catalog/courses/ipas-ai-planner.yaml`
- Create: `catalog/subjects/intermediate-M1.yaml`
- Create: `catalog/units/M1-01.yaml`
- Create: `catalog/units/M1-02.yaml`
- Create: `sources/registry/ipas-intermediate.yaml`
- Create: `sources/mappings/M1-01.yaml`
- Create: `sources/mappings/M1-02.yaml`
- Create: `packages/core/test/migration-fixtures.test.ts`

**Interfaces:**
- Produces two real reference manifests that validate without changing existing Drive folders.

- [ ] **Step 1: Write failing fixture-validation test**

```ts
it.each(['M1-01', 'M1-02'])('loads migrated %s manifest', async unitId => {
  const store = new YamlManifestStore(repoRoot);
  expect((await store.loadUnit(unitId)).unitId).toBe(unitId);
});
```

- [ ] **Step 2: Add course and subject catalog**

```yaml
# catalog/courses/ipas-ai-planner.yaml
schemaVersion: 1
courseId: ipas-ai-planner
name: iPAS AI 應用規劃師
provider: 經濟部產業人才能力鑑定
authority: iPAS
levels: [intermediate]
status: ACTIVE
driveRootFolderId: 15ei4NnV4FRfaWORZifUPONzsZ6Ki_1ke
```

```yaml
# catalog/subjects/intermediate-M1.yaml
schemaVersion: 1
subjectId: M1
courseId: ipas-ai-planner
level: intermediate
name: 人工智慧技術應用與規劃
badge: AI PLANNER
unitIds: [M1-01, M1-02]
```

- [ ] **Step 3: Register the official source files already used by M1-01/M1-02**

Use these exact IDs:
- `ipas-mid-s1-subject1-guide` -> Drive `1AgLmuHDx06UIa6C7uj5rRHNQc3n8X-1q`
- `ipas-mid-s2-errata-2026-04-10` -> Drive `1oscVIEx5nKzv52407Qx5Sh7wJLi6N6mM`
- `ipas-mid-s3-exam-2025-round2-subject1` -> Drive `1GNiEPNBD8Z-HF5gIW9OLk0Cwcoow_RZJ`
- `ipas-mid-s4-sample-2025-09-v2` -> Drive `1y8cqmk5YmYG3BHsyy4lOHDR99Hv4UsWx`

The errata registry entry uses scope strings only for corrections supported by the errata source and lists `ipas-mid-s1-subject1-guide` in `corrects`.

- [ ] **Step 4: Add M1-01 Drive mappings**

Root `1G7MEI7EbVsNV7iIOikvX5ItoHboIYUai` with:
- source `1kJQMwmE8Rmb7qfUoB7LMqOvPDPXMZ84R`
- slides `1DJBF6zLjYPTLzIEt9iSCDvx7q-TVVfaf`
- voice `1T5VXWJPY0bxLB6H_aSdtODb2slt5Kq9m`
- video `1kR5j2S2Pf5ziITqoRxategJyASjC_owO`
- handout `1O60G8HCH3ysl4i6HNowV6_s2ajdtmgnY`
- desktopExplainers `1fDJtuNkb9qTaoZCbm86fsDNAfrS1aI9E`
- mobileCards `1b63hyMNPbsgRdvlt3sqTo7nhqVLM46ZQ`
- formulaDecisionCard `1eosCgAmqsbukLEgG_vRXurDTayT1nar1`
- officialQuestionBreakdown `1hNJ8o2c_nSc7eTxiDGzLarrbq9HAG50y`
- questionBank `1pFgtcFPhP-xbPnDf3c3YQYUPRLStDksY`

M1-01 source mapping scope: NLP representation, Word2Vec/GloVe, TF-IDF, N-gram; official-question references Q1, Q4, Q5, Q6 from the registered S3 exam source.

- [ ] **Step 5: Add M1-02 Drive mappings**

Root `1mVZFQ3Hj0WXLRqo7d0iTHDC8W1QLn-5t` with:
- source `1zuQiZa4rFt4Zrg1OZlR94OP10wmQj-fx`
- slides `1CvDNjcEw_a_lkAD3PB9d2ignhVtupuFS`
- voice `1NNh-mv_zHviHYi70t7wy1I-pRF20o1v_`
- video `1Whllv7NkebrM863G2pvKVUvSe9dod3bV`
- handout `1yQPCSVGtSZWu8Tuf4LkaChfBo38RLa0R`
- desktopExplainers `1xQoaawOJstC1_DrtVwIMd9XkbyBAsCi2`
- mobileCards `1bV_F80K8FVToqaCq4udGfdZjHBR11uXk`
- formulaDecisionCard `1rzODGl3yaR73QpQwbY6Yltz2hMXxBmSc`
- officialQuestionBreakdown `15sXSkiZqlBAEDjISXCESQZh-fLoiXO03`
- questionBank `1XOdOzlaWLZInhDv52sGs5CZ1AyL0pc06`

M1-02 source mapping scope: Self-Attention, long-range dependency, BERT MLM, BERT/GPT distinction; official-question references Q2 and Q3 from the S3 exam source.

- [ ] **Step 6: Record only truthfully evidenced migration states**

Existing generated prompt/handout/card documents may be marked `READY` when their Drive file IDs are known. Do **not** mark `SLIDES_OUTPUT`, `VOICE_OUTPUT`, `VIDEO_OUTPUT`, or their gates approved unless corresponding output IDs/URLs and explicit human approval evidence are available. Therefore migrated M1-01/M1-02 must stop at the highest state justified by recorded evidence, even if older conversation text informally described the unit as complete.

- [ ] **Step 7: Validate fixtures and commit**

Run:

```bash
pnpm test packages/core/test/migration-fixtures.test.ts
pnpm typecheck
```

```bash
git add catalog sources packages/core/test/migration-fixtures.test.ts
git commit -m "data: register iPAS intermediate reference units and sources"
```

---

### Task 13: Implement the Thin CLI Operator Surface

**Files:**
- Create: `apps/cli/package.json`
- Create: `apps/cli/tsconfig.json`
- Create: `apps/cli/src/index.ts`
- Create: `apps/cli/src/container.ts`
- Create all eight command files in Target File Structure.
- Create: `apps/cli/test/cli.test.ts`

**Interfaces:**
- Commands:
  - `course-factory unit create <unit-id>`
  - `course-factory source attach <unit-id> <source-id>`
  - `course-factory drive ensure <unit-id>`
  - `course-factory artifact register <unit-id> <slides|voice|video> --url <url>`
  - `course-factory generate brief <unit-id>`
  - `course-factory generate content-pack <unit-id>`
  - `course-factory qa run <unit-id>`
  - `course-factory status <unit-id>`
  - `course-factory transition <unit-id> <state> --evidence <text>`

- [ ] **Step 1: Create CLI package and install Commander/internal packages**

Run:

```bash
pnpm --filter @ipas-course-factory/cli add commander @ipas-course-factory/core@workspace:* @ipas-course-factory/drive@workspace:* @ipas-course-factory/generator@workspace:* @ipas-course-factory/qa@workspace:*
```

- [ ] **Step 2: Write failing dependency-injected CLI tests**

```ts
it('status prints unit state and artifact completeness', async () => {
  const output = await runCli(['status', 'M1-02'], fakeContainer());
  expect(output).toContain('M1-02');
  expect(output).toMatch(/\d+\/10/);
});
```

- [ ] **Step 3: Implement container wiring**

`apps/cli/src/container.ts` is the only CLI file allowed to construct concrete Google/OpenAI adapters. Command modules receive services/ports.

- [ ] **Step 4: Implement `unit create`**

Required flags:
- `--course`
- `--level`
- `--subject`
- `--title`
- `--core-thesis`

It writes a valid `PLANNED` unit with default artifact groups and pending human gates. It does not create Drive folders.

- [ ] **Step 5: Implement source and Drive commands**

`source attach` validates the source ID, avoids duplicate source IDs, saves manifest, and advances `PLANNED -> SOURCE_READY` only when official-source requirements are satisfied.

`drive ensure` provisions/reuses the standard workspace and writes stable IDs back to the manifest.

- [ ] **Step 6: Implement artifact registration**

`artifact register` is used for human-produced Slides/Voice/Video outputs. Accept `--url` and optionally `--drive-file-id`; require at least one. It updates the correct output item but does not approve the gate.

- [ ] **Step 7: Implement generation/QA commands**

`generate brief` requires `SOURCE_READY`.
`generate content-pack` requires `BRIEF_READY`.
`qa run` requires `CONTENT_READY`, transitions to `CONTENT_QA`, writes QA report, then:
- PASS -> `NOTEBOOKLM_PENDING`;
- FAIL -> `QA_FAILED` with finding codes as evidence.

- [ ] **Step 8: Implement status and human transition commands**

`status` prints:
- unit ID/title;
- current state;
- artifact completion `x/10`;
- gate statuses;
- QA status/error count;
- Drive folder URL when available.

`transition` has no `--force`. For `SLIDES_APPROVED`, `VOICE_APPROVED`, or `PUBLISHED`, it validates corresponding gate approval/output prerequisites before state transition.

- [ ] **Step 9: Verify and commit**

Run:

```bash
pnpm test apps/cli/test/cli.test.ts
pnpm typecheck
```

```bash
git add apps/cli pnpm-lock.yaml
git commit -m "feat: add Phase 1 course factory CLI"
```

---

### Task 14: Add End-to-End Phase 1 Acceptance Tests

**Files:**
- Create: `tests/phase1.acceptance.test.ts`
- Modify: `package.json`

**Interfaces:**
- Uses fakes for external network services and the real domain/application services.

- [ ] **Step 1: Write failing acceptance scenario**

The scenario must:
1. create `M1-99`;
2. attach fake S1 guide and S3 exam sources;
3. reach `SOURCE_READY`;
4. ensure Drive workspace twice and prove no duplicates;
5. generate/persist Source Brief through fake ports;
6. generate/persist remaining eight pre-Notebook artifacts;
7. run QA and reach `NOTEBOOKLM_PENDING`;
8. register a Slides output URL;
9. transition to `SLIDES_REVIEW`;
10. prove `SLIDES_REVIEW -> PUBLISHED` is rejected;
11. approve Slides with evidence;
12. transition to `SLIDES_APPROVED` and then `VOICE_PENDING`;
13. leave Voice and Final gates pending.

- [ ] **Step 2: Add acceptance script**

Add without removing existing scripts:

```json
"test:acceptance": "vitest run tests/phase1.acceptance.test.ts"
```

- [ ] **Step 3: Run all verification**

```bash
pnpm test:acceptance
pnpm test
pnpm typecheck
pnpm build
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/phase1.acceptance.test.ts package.json
git commit -m "test: prove Phase 1 control plane workflow"
```

---

### Task 15: Document Operator Setup and Phase 1 Completion Evidence

**Files:**
- Modify: `README.md`
- Create: `docs/workflows/phase1-operator-workflow.md`
- Create: `docs/governance/source-registry.md`
- Create: `docs/architecture/phase1-control-plane.md`

**Interfaces:**
- Documents only behavior that exists after Tasks 1-14.

- [ ] **Step 1: Verify commands before documenting them**

Run and confirm these exact commands exist:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @ipas-course-factory/cli start -- status M1-02
```

If the CLI start script uses a different exact script name implemented in Task 13, update both `apps/cli/package.json` and this documentation command in the same commit so README and implementation match.

- [ ] **Step 2: Update README quick start**

Document:
1. `pnpm install`;
2. copy `.env.example` to `.env`;
3. configure OpenAI/Google OAuth values;
4. run tests/build;
5. inspect M1-02 status;
6. point to operator workflow.

Never include real credentials.

- [ ] **Step 3: Document safe operator workflow**

```text
unit create
-> source attach
-> SOURCE_READY
-> drive ensure
-> generate brief
-> BRIEF_READY
-> generate content-pack
-> CONTENT_READY
-> qa run
-> NOTEBOOKLM_PENDING
-> human creates NotebookLM slides
-> artifact register slides
-> SLIDES_REVIEW
-> human approves Slides
-> SLIDES_APPROVED
-> VOICE_PENDING
-> human creates Voice
-> artifact register voice
-> VOICE_REVIEW
-> human approves Voice
-> VOICE_APPROVED
-> VIDEO_PENDING
-> human assembles CapCut video
-> artifact register video
-> FINAL_REVIEW
-> human final approval
-> PUBLISHED
```

- [ ] **Step 4: Document source governance and architecture**

Explain S0-S5, scoped errata precedence, source lineage, GitHub control plane / Drive asset plane, generated Google Docs persistence, and why Phase 1 intentionally has no database/dashboard/browser automation.

- [ ] **Step 5: Final verification and commit**

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all PASS.

```bash
git add README.md docs/workflows docs/governance docs/architecture
git commit -m "docs: document Phase 1 course factory operation"
```

---

## Phase 1 Review Boundaries

Do not deliver Phase 1 as one giant unreviewed implementation. Use these review checkpoints:

1. **Foundation PR:** Tasks 1-6 — workspace, schemas, persistence, source governance, workflow, artifact/gate rules.
2. **Adapters PR:** Tasks 7-10 — Drive/Docs, source reading, templates/model adapter, content-pack orchestration.
3. **QA & Fixtures PR:** Tasks 11-12 — QA framework and M1-01/M1-02 migration fixtures.
4. **Operator PR:** Tasks 13-15 — CLI, acceptance tests, operator docs.

Each implementation PR is based on the previous merged Phase 1 PR. Do not stack all four against the original main commit.

## Phase 1 Exit Criteria

Phase 1 is complete only when all are evidenced:

- `pnpm test` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
- `M1-01.yaml` and `M1-02.yaml` validate against canonical schemas.
- Source registry resolves every source ID referenced by M1-01/M1-02.
- Errata precedence tests pass.
- Legal, illegal, exception, and idempotent workflow tests pass.
- Voice review/approval states are tested.
- Artifact completeness uses ten groups and handles `NOT_APPLICABLE` only with reasons.
- Slides/Voice packages separately track prompt and external output.
- Drive workspace ensure is idempotent.
- Duplicate Drive folder ambiguity blocks with actionable IDs.
- Generated Google Docs update in place when existing file IDs are present.
- Guarded real-Drive integration test can provision/re-check a disposable unit and update one document when credentials are configured.
- PDF source reading uses `pdfjs-dist` behind `PdfTextExtractor`.
- Required template variables fail before model calls.
- All nine template contracts are explicit.
- Only generator adapter imports OpenAI SDK; core depends only on `GenerationPort`.
- Model name comes from `OPENAI_MODEL`, not domain code.
- Pre-Notebook generation persists nine generated artifacts to correct Drive folders.
- Pre-Notebook generation never auto-generates Slides output, Voice output, or Video output.
- Every generated source-bound artifact records source IDs.
- QA errors block progression to `NOTEBOOKLM_PENDING`.
- Human gate approval requires evidence and corresponding external output.
- Acceptance test reaches `NOTEBOOKLM_PENDING`, rejects a skipped gate, and completes valid Slides approval flow.
- No Phase 2 dashboard code exists.

## Self-Review Result

### Spec coverage
- Control plane / asset plane: Tasks 3, 7-10, 12, 15.
- File-backed manifests: Tasks 2-3.
- Course/Subject/Unit/Source/Artifact/Gate: Tasks 2, 6.
- S0-S5 governance and errata precedence: Tasks 4, 8, 11-12.
- State machine/history: Task 5.
- Ten artifact groups and prompt/output sub-artifacts: Task 6.
- Drive folder contract/idempotency/duplicate blocking: Task 7.
- Source ingestion and generated Docs persistence: Task 8.
- Master Art Direction/template contracts: Task 9.
- Provider-neutral model generation and pre-Notebook pack: Tasks 9-10.
- QA: Task 11.
- M1-01/M1-02 migration fixtures: Task 12.
- CLI: Task 13.
- Acceptance/testing: Task 14.
- Operator documentation: Task 15.
- Dashboard explicitly deferred: Global Constraints, Exit Criteria.

### Placeholder scan
No `TBD`, `TODO`, “implement later”, unspecified template contracts, unspecified PDF parser, or “similar to Task N” instructions remain in this plan.

### Type/interface consistency
Canonical interfaces/functions used throughout:
- `UnitManifest`
- `UnitStatus`
- `DrivePort`
- `ArtifactDocumentPort`
- `GenerationPort`
- `YamlManifestStore`
- `ensureUnitWorkspace()`
- `readSourcePack()`
- `resolveAuthoritativeSources()`
- `transitionUnit()`
- `createDefaultArtifactGroups()`
- `calculateArtifactCompleteness()`
- `registerExternalArtifact()`
- `approveGate()`
- `generateSourceBrief()`
- `generatePreNotebookContentPack()`
- `runUnitQa()`

### Provider isolation
Only `packages/generator/src/openai-adapter.ts` may import the OpenAI SDK. Core/domain code sees only `GenerationPort`. Google implementation details stay in `packages/drive`. CLI constructs concrete adapters only in `apps/cli/src/container.ts`.
