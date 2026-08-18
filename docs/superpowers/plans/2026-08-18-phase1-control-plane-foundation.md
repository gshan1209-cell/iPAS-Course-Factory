# Phase 1 Control Plane Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working control plane for `iPAS-Course-Factory` so an operator can register an iPAS unit, attach governed sources, provision the standard Google Drive workspace idempotently, generate the pre-NotebookLM content pack through a replaceable generation adapter, run QA, and track the unit through human-gated workflow states.

**Architecture:** Use a TypeScript monorepo with file-backed manifests as the canonical state. Keep domain rules in pure packages behind explicit ports; Google Drive and model generation live in adapters. The CLI is a thin operator surface over application services. Phase 1 deliberately excludes the dashboard and brittle NotebookLM/CapCut browser automation.

**Tech Stack:** TypeScript, pnpm workspaces, Zod, YAML, Vitest, Commander, Google Drive API client, OpenAI JavaScript SDK behind a provider-neutral `GenerationPort`, Handlebars templates.

**Spec:** `docs/superpowers/specs/2026-08-18-ipas-course-factory-design.md`

## Global Constraints

- GitHub is canonical for schemas, manifests, workflow state, templates, QA rules, and governance.
- Google Drive is the asset plane; Drive file existence alone never advances workflow state.
- Phase 1 uses file-backed YAML/JSON manifests; do not add a database.
- S0-S4 official sources outrank S5 internal teaching supplements.
- S2 errata overrides the affected older source content.
- Source-bound artifacts retain source lineage through source IDs.
- Human gates remain mandatory for slide approval, voice approval, and final publication approval.
- Standard unit workspace has exactly ten numbered artifact groups, while Slides and Voice groups may contain prompt/output sub-artifacts.
- Normal workflow includes `SLIDES_REVIEW -> SLIDES_APPROVED -> VOICE_PENDING -> VOICE_REVIEW -> VOICE_APPROVED -> VIDEO_PENDING`.
- Drive folder creation must be idempotent and duplicate ambiguity must block rather than silently merge.
- Domain logic must not import Google Drive, GitHub, NotebookLM, CapCut, OpenAI, or CLI-specific APIs.
- Do not automate NotebookLM or CapCut with browser hacks in Phase 1.
- Every task is implemented test-first and ends with relevant tests passing before commit.

---

## File Map

The implementation should converge on this focused structure. Do not create empty directories that have no file yet.

```text
.
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.workspace.ts
├── .gitignore
├── .env.example
├── apps/
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── container.ts
│           └── commands/
│               ├── unit-create.ts
│               ├── source-attach.ts
│               ├── drive-ensure.ts
│               ├── generate.ts
│               ├── qa-run.ts
│               ├── status.ts
│               └── transition.ts
├── packages/
│   ├── schemas/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/index.ts
│   │   └── test/schemas.test.ts
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── manifest-store.ts
│   │   │   ├── source-governance.ts
│   │   │   ├── workflow.ts
│   │   │   ├── artifacts.ts
│   │   │   └── unit-service.ts
│   │   └── test/
│   │       ├── source-governance.test.ts
│   │       ├── workflow.test.ts
│   │       ├── artifacts.test.ts
│   │       └── unit-service.test.ts
│   ├── drive/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── port.ts
│   │   │   ├── folder-plan.ts
│   │   │   ├── ensure-workspace.ts
│   │   │   ├── google-drive-adapter.ts
│   │   │   ├── google-auth.ts
│   │   │   └── source-reader.ts
│   │   └── test/
│   │       ├── ensure-workspace.test.ts
│   │       └── source-reader.test.ts
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
│       └── test/
│           └── qa.test.ts
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
└── tests/
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
- Create: `packages/schemas/test/smoke.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: workspace scripts `build`, `test`, `typecheck`; package alias `@ipas-course-factory/schemas`.

- [ ] **Step 1: Write the failing workspace smoke test**

```ts
// packages/schemas/test/smoke.test.ts
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../src/index.js';

describe('schemas package', () => {
  it('exposes schema version 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
```

- [ ] **Step 2: Create minimal workspace configuration without exporting `SCHEMA_VERSION`, then verify failure**

```json
// package.json
{
  "name": "ipas-course-factory",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
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

Run: `pnpm install && pnpm test packages/schemas/test/smoke.test.ts`

Expected: FAIL because `SCHEMA_VERSION` is not exported.

- [ ] **Step 3: Add the shared TypeScript/Vitest config and minimal implementation**

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
export default defineWorkspace(['packages/*', 'apps/*']);
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
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test packages/schemas/test/smoke.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts .gitignore .env.example packages/schemas
git commit -m "build: bootstrap TypeScript course factory workspace"
```

---

### Task 2: Define Validated Course, Subject, Unit, Source, Artifact, and Gate Schemas

**Files:**
- Modify: `packages/schemas/package.json`
- Replace: `packages/schemas/src/index.ts`
- Create: `packages/schemas/src/course.ts`
- Create: `packages/schemas/src/subject.ts`
- Create: `packages/schemas/src/source.ts`
- Create: `packages/schemas/src/artifact.ts`
- Create: `packages/schemas/src/gate.ts`
- Create: `packages/schemas/src/unit.ts`
- Create: `packages/schemas/test/schemas.test.ts`
- Create: `tests/fixtures/valid-unit.yaml`

**Interfaces:**
- Consumes: `SCHEMA_VERSION = 1`.
- Produces: `CourseSchema`, `SubjectSchema`, `SourceSchema`, `ArtifactGroupSchema`, `GateSchema`, `UnitManifestSchema`, and inferred TypeScript types.

- [ ] **Step 1: Add Zod and write failing schema tests**

Add dependency: `zod` to `packages/schemas`.

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

  it('rejects unknown workflow state', () => {
    expect(() => UnitManifestSchema.parse({ ...valid, status: 'DONE' })).toThrow();
  });

  it('rejects NOT_APPLICABLE artifact without reason', () => {
    expect(() => UnitManifestSchema.parse({
      ...valid,
      artifacts: {
        formula: { group: 'FORMULA_DECISION_CARD', status: 'NOT_APPLICABLE', reason: null, items: [] }
      }
    })).toThrow();
  });
});
```

Run: `pnpm test packages/schemas/test/schemas.test.ts`

Expected: FAIL because schemas do not exist.

- [ ] **Step 2: Implement exact enums and reusable schemas**

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
  version: z.string().min(1).default('1.0')
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
```

- [ ] **Step 3: Implement gate and unit workflow schemas**

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
  }),
  sources: z.array(z.string()),
  artifacts: z.record(z.string(), ArtifactGroupSchema),
  gates: z.record(z.string(), GateSchema),
  qa: z.object({
    status: z.enum(['NOT_RUN', 'PASSED', 'FAILED']),
    findings: z.array(z.object({
      code: z.string(), severity: z.enum(['INFO', 'WARNING', 'ERROR']), message: z.string()
    }))
  }),
  history: z.array(z.object({
    timestamp: z.string().datetime(), actor: z.string(), action: z.string(),
    previous: z.string().nullable(), next: z.string().nullable(), evidence: z.array(z.string())
  }))
});
```

- [ ] **Step 4: Implement Course/Subject schemas and barrel exports**

Course must include `driveRootFolderId` because Phase 1 must know where unit folders are provisioned.

```ts
// packages/schemas/src/course.ts
import { z } from 'zod';
export const CourseSchema = z.object({
  schemaVersion: z.literal(1),
  courseId: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  levels: z.array(z.string()).min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  driveRootFolderId: z.string().min(1)
});
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
});
```

Export all schemas and inferred types from `packages/schemas/src/index.ts`.

- [ ] **Step 5: Run schema tests and typecheck**

Run: `pnpm test packages/schemas/test/schemas.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/schemas tests/fixtures/valid-unit.yaml
git commit -m "feat: define course factory domain schemas"
```

---

### Task 3: Implement YAML Manifest Persistence with Validation

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/manifest-store.ts`
- Create: `packages/core/test/unit-service.test.ts`

**Interfaces:**
- Consumes: `UnitManifestSchema`, `CourseSchema`, `SubjectSchema`, `SourceSchema`.
- Produces: `YamlManifestStore` with `loadUnit(unitId)`, `saveUnit(manifest)`, `loadCourse(courseId)`, `loadSubject(subjectId)`, and `listSources()`.

- [ ] **Step 1: Add `yaml` dependency and write failing round-trip test**

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
    unitId: 'M1-99', courseId: 'ipas-ai-planner', level: 'intermediate', subjectId: 'M1',
    title: 'Fixture', coreThesis: 'Fixture thesis', status: 'PLANNED' as const,
    drive: { unitFolderId: null, folders: {} }, sources: [], artifacts: {}, gates: {},
    qa: { status: 'NOT_RUN' as const, findings: [] }, history: []
  };
  await store.saveUnit(unit);
  expect((await store.loadUnit('M1-99')).unitId).toBe('M1-99');
  expect(await readFile(path.join(root, 'catalog/units/M1-99.yaml'), 'utf8')).toContain('unitId: M1-99');
});
```

Run: `pnpm test packages/core/test/unit-service.test.ts`

Expected: FAIL because `YamlManifestStore` does not exist.

- [ ] **Step 2: Implement validated YAML read/write**

```ts
// packages/core/src/manifest-store.ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
    const raw = await this.readRaw('sources/registry/ipas-intermediate.yaml');
    return SourceSchema.array().parse(YAML.parse(raw));
  }

  private async read<T>(relative: string, schema: { parse(value: unknown): T }): Promise<T> {
    return schema.parse(YAML.parse(await this.readRaw(relative)));
  }

  private readRaw(relative: string): Promise<string> {
    return readFile(path.join(this.root, relative), 'utf8');
  }

  private async write(relative: string, value: unknown): Promise<void> {
    const file = path.join(this.root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, YAML.stringify(value), 'utf8');
  }
}
```

- [ ] **Step 3: Add invalid-save test**

Test that `saveUnit()` rejects a manifest with `status: 'DONE'` and does not write a file.

Run: `pnpm test packages/core/test/unit-service.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core
git commit -m "feat: persist validated YAML manifests"
```

---

### Task 4: Implement Source Governance and Errata Precedence

**Files:**
- Create: `packages/core/src/source-governance.ts`
- Create: `packages/core/test/source-governance.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Source[]`.
- Produces: `rankSources(sources)`, `resolveAuthoritativeSources(sources)`, `validateSourceLineage(sourceIds, registry)`.

- [ ] **Step 1: Write failing precedence tests**

```ts
import { expect, it } from 'vitest';
import { resolveAuthoritativeSources } from '../src/source-governance.js';

it('places errata ahead of the source it corrects', () => {
  const guide = { sourceId: 'guide', tier: 'S1', title: 'Guide', provider: 'iPAS', driveFileId: 'g', scope: ['NLP'], effectiveDate: null, supersedes: [], corrects: [] } as const;
  const errata = { sourceId: 'errata', tier: 'S2', title: 'Errata', provider: 'iPAS', driveFileId: 'e', scope: ['NLP'], effectiveDate: '2026-04-10', supersedes: [], corrects: ['guide'] } as const;
  expect(resolveAuthoritativeSources([guide, errata]).map(x => x.sourceId)).toEqual(['errata', 'guide']);
});

it('keeps S5 behind all official tiers', () => {
  const ids = resolveAuthoritativeSources([
    { sourceId: 'internal', tier: 'S5', title: 'Internal', provider: 'JunCloud', driveFileId: 'i', scope: [], effectiveDate: null, supersedes: [], corrects: [] },
    { sourceId: 'sample', tier: 'S4', title: 'Sample', provider: 'iPAS', driveFileId: 's', scope: [], effectiveDate: null, supersedes: [], corrects: [] }
  ]).map(x => x.sourceId);
  expect(ids).toEqual(['sample', 'internal']);
});
```

Run: `pnpm test packages/core/test/source-governance.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement deterministic ranking**

```ts
const tierWeight = { S0: 0, S2: 1, S1: 2, S3: 3, S4: 4, S5: 5 } as const;

export function resolveAuthoritativeSources(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    const aCorrectsB = a.corrects.includes(b.sourceId) || a.supersedes.includes(b.sourceId);
    const bCorrectsA = b.corrects.includes(a.sourceId) || b.supersedes.includes(a.sourceId);
    if (aCorrectsB) return -1;
    if (bCorrectsA) return 1;
    return tierWeight[a.tier] - tierWeight[b.tier] || a.sourceId.localeCompare(b.sourceId);
  });
}
```

Clarification: S0 remains the overall scope boundary; S2 overrides affected text in sources it explicitly corrects. S2 does not globally outrank unrelated S0 scope declarations.

- [ ] **Step 3: Add lineage validation**

```ts
export function validateSourceLineage(sourceIds: string[], registry: Source[]): string[] {
  const known = new Set(registry.map(source => source.sourceId));
  return sourceIds.filter(id => !known.has(id));
}
```

Add a test that unknown source ID `missing` is returned while valid IDs are not.

- [ ] **Step 4: Run tests and commit**

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
- Consumes: `UnitManifest`, target `UnitStatus`, actor, evidence.
- Produces: `canTransition(from, to)`, `transitionUnit(unit, to, context)` returning a new manifest.

- [ ] **Step 1: Write failing legal/illegal/idempotent transition tests**

```ts
it('allows SLIDES_APPROVED -> VOICE_PENDING', () => {
  expect(canTransition('SLIDES_APPROVED', 'VOICE_PENDING')).toBe(true);
});

it('rejects SLIDES_REVIEW -> PUBLISHED', () => {
  expect(canTransition('SLIDES_REVIEW', 'PUBLISHED')).toBe(false);
});

it('treats a transition to the current state as idempotent', () => {
  expect(canTransition('CONTENT_READY', 'CONTENT_READY')).toBe(true);
});
```

Also test `VOICE_PENDING -> VOICE_REVIEW -> VOICE_APPROVED -> VIDEO_PENDING`.

Run: `pnpm test packages/core/test/workflow.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement the normal transition map**

```ts
const normalNext: Record<NormalUnitStatus, NormalUnitStatus | undefined> = {
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
};
```

`BLOCKED`, `QA_FAILED`, and `REVISION_REQUIRED` are exception states. Entering them must include a non-empty reason. Returning from them requires an explicit target state and evidence; never infer the recovery target.

- [ ] **Step 3: Implement immutable audit history mutation**

```ts
export function transitionUnit(
  unit: UnitManifest,
  next: UnitStatus,
  context: { actor: string; now: string; evidence?: string[]; reason?: string }
): UnitManifest {
  if (!canTransition(unit.status, next, context.reason)) throw new IllegalTransitionError(unit.status, next);
  if (unit.status === next) return unit;
  return {
    ...unit,
    status: next,
    history: [...unit.history, {
      timestamp: context.now,
      actor: context.actor,
      action: 'workflow.transition',
      previous: unit.status,
      next,
      evidence: context.evidence ?? (context.reason ? [context.reason] : [])
    }]
  };
}
```

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test packages/core/test/workflow.test.ts`

```bash
git add packages/core/src/workflow.ts packages/core/test/workflow.test.ts packages/core/src/index.ts
git commit -m "feat: add auditable unit workflow state machine"
```

---

### Task 6: Implement Artifact Packages, Completeness, and Human Gate Rules

**Files:**
- Create: `packages/core/src/artifacts.ts`
- Create: `packages/core/test/artifacts.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: Unit artifact/gate state.
- Produces: `createDefaultArtifactGroups()`, `calculateArtifactCompleteness(unit)`, `approveGate(unit, gateType, approval)`.

- [ ] **Step 1: Write failing artifact-contract tests**

Tests must verify:
1. default contract contains ten groups;
2. Slides package contains `SLIDES_PROMPT` and `SLIDES_OUTPUT` items;
3. Voice package contains `VOICE_PROMPT` and `VOICE_OUTPUT` items;
4. `NOT_APPLICABLE` counts complete only with a reason;
5. `SLIDES` approval requires at least one Slides output item with a URL or Drive file ID;
6. `VOICE` approval requires at least one Voice output item with a URL or Drive file ID.

```ts
expect(Object.keys(createDefaultArtifactGroups())).toHaveLength(10);
expect(createDefaultArtifactGroups().slides.items.map(x => x.kind)).toEqual(['SLIDES_PROMPT', 'SLIDES_OUTPUT']);
```

Run: `pnpm test packages/core/test/artifacts.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement default artifact groups**

Create stable keys:

```ts
export const ARTIFACT_KEYS = [
  'sourceBrief', 'slides', 'voice', 'video', 'handout',
  'desktopExplainers', 'mobileCards', 'formulaDecisionCard',
  'officialQuestionBreakdown', 'questionBank'
] as const;
```

Each default group starts `NOT_STARTED`, except output sub-items remain `NOT_STARTED` after prompt items become ready.

- [ ] **Step 3: Implement completeness calculation**

```ts
export function calculateArtifactCompleteness(unit: UnitManifest): { complete: number; total: number; percent: number } {
  const groups = ARTIFACT_KEYS.map(key => unit.artifacts[key]);
  const complete = groups.filter(group => group && (
    ['READY', 'APPROVED'].includes(group.status) ||
    (group.status === 'NOT_APPLICABLE' && Boolean(group.reason))
  )).length;
  return { complete, total: ARTIFACT_KEYS.length, percent: Math.round(complete / ARTIFACT_KEYS.length * 100) };
}
```

- [ ] **Step 4: Implement gate approval invariants**

`approveGate()` must reject approval without `approvedBy`, `approvedAt`, and at least one evidence string. For Slides/Voice, it also validates corresponding generated output exists.

- [ ] **Step 5: Run tests and commit**

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
- Consumes: `Course.driveRootFolderId`, `UnitManifest`.
- Produces: `DrivePort`, `STANDARD_UNIT_FOLDERS`, `ensureUnitWorkspace(unit, course, drive)` returning updated Drive IDs without persisting manifest itself.

```ts
export interface DriveNode { id: string; name: string; mimeType: string; parentId: string; }
export interface DrivePort {
  listChildren(parentId: string): Promise<DriveNode[]>;
  createFolder(parentId: string, name: string): Promise<DriveNode>;
  getNode(id: string): Promise<DriveNode | null>;
}
```

- [ ] **Step 1: Write failing idempotency and duplicate tests with an in-memory fake**

Test sequence:
1. no root exists -> create one unit folder + ten child folders;
2. run again -> no additional folders created;
3. two exact-name children under same parent -> throw `AmbiguousDriveFolderError`;
4. mapped folder ID that no longer exists -> throw `StaleDriveMappingError` rather than create silently.

Run: `pnpm test packages/drive/test/ensure-workspace.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement the exact standard folder contract**

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

- [ ] **Step 3: Implement exact-match ensure logic**

For each expected folder:
- trust a mapped ID only after `getNode()` confirms it exists;
- otherwise list exact-name children;
- 0 matches -> create;
- 1 match -> reuse;
- >1 matches -> block with both IDs in the error message.

Do not use fuzzy folder names.

- [ ] **Step 4: Implement real Google Drive adapter and auth factory**

Use the Google API client behind `DrivePort`. `createGoogleAuthFromEnv()` accepts user OAuth refresh-token credentials from:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

If any are missing, throw one actionable configuration error listing the missing variable names. Do not log secrets.

- [ ] **Step 5: Run unit tests and optional guarded integration test**

Run unit tests: `pnpm test packages/drive/test/ensure-workspace.test.ts`

Optional real-Drive verification only when `COURSE_FACTORY_INTEGRATION_DRIVE_ROOT` is set:

```bash
COURSE_FACTORY_INTEGRATION_DRIVE_ROOT=<test-folder-id> pnpm test -- --runInBand drive.integration
```

The integration test creates a uniquely named test unit folder, calls ensure twice, asserts ten children exactly, then removes the test folder in teardown.

- [ ] **Step 6: Commit**

```bash
git add packages/drive tests/fixtures/duplicate-drive-tree.json
git commit -m "feat: provision idempotent Drive unit workspaces"
```

---

### Task 8: Implement Governed Source Text Reading from Drive

**Files:**
- Create: `packages/drive/src/source-reader.ts`
- Create: `packages/drive/test/source-reader.test.ts`
- Modify: `packages/drive/src/port.ts`
- Modify: `packages/drive/src/google-drive-adapter.ts`

**Interfaces:**
- Extends `DrivePort` with `readTextFile(fileId): Promise<{ mimeType: string; text: string }>`.
- Produces: `readSourcePack(sourceIds, registry, drive)` returning ordered source text using source governance order.

- [ ] **Step 1: Write failing source-pack ordering test**

Create fake source texts for S1 guide, S2 errata correcting the guide, and S3 exam. Assert result order is errata before affected guide and includes source metadata headers.

Expected normalized output item:

```ts
{
  sourceId: 'ipas-mid-errata-2026-04-10',
  tier: 'S2',
  title: 'AI應用規劃師(中級)_學習指引勘誤表',
  text: '...'
}
```

- [ ] **Step 2: Implement text-read contract**

For Google Docs, export `text/plain`.
For stored text/markdown files, download and decode UTF-8.
For PDF, download bytes and pass them through a `PdfTextExtractor` injected into the adapter. The Google adapter must not contain exam-specific parsing rules.

```ts
export interface PdfTextExtractor {
  extract(bytes: Uint8Array): Promise<string>;
}
```

Use one maintained PDF text extraction library in the adapter package; keep it behind this interface so it is replaceable.

- [ ] **Step 3: Implement source pack read and missing-source error**

Unknown source ID must fail before any generation call with `UnknownSourceError(sourceId)`.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test packages/drive/test/source-reader.test.ts`

```bash
git add packages/drive/src packages/drive/test/source-reader.test.ts
git commit -m "feat: read governed source packs from Drive"
```

---

### Task 9: Implement the Template Registry and Provider-Neutral Generation Port

**Files:**
- Create: `packages/generator/package.json`
- Create: `packages/generator/tsconfig.json`
- Create: `packages/generator/src/index.ts`
- Create: `packages/generator/src/port.ts`
- Create: `packages/generator/src/template-registry.ts`
- Create: `packages/generator/src/render.ts`
- Create: `packages/generator/src/openai-adapter.ts`
- Create: `packages/generator/test/render.test.ts`
- Create templates under all nine prompt-producing `templates/` directories.

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

- [ ] **Step 1: Write failing required-variable tests**

```ts
it('fails before rendering when core_thesis is missing', async () => {
  await expect(renderTemplate('source-brief/default.hbs', {
    course: 'iPAS', unit: 'M1-03'
  })).rejects.toThrow('Missing template variable: core_thesis');
});
```

Run: `pnpm test packages/generator/test/render.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement a template registry with explicit required variables**

```ts
export const TEMPLATE_CONTRACTS = {
  sourceBrief: {
    path: 'source-brief/default.hbs',
    required: ['course', 'level', 'subject', 'unit', 'core_thesis', 'official_scope', 'source_pack', 'exam_focus']
  },
  slides: {
    path: 'slides/master-art-direction/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'known_traps', 'visual_motif']
  }
  // add the remaining seven template contracts explicitly in this file
} as const;
```

The implementation must enumerate all nine template contracts; do not generate contract names dynamically.

- [ ] **Step 3: Implement Handlebars rendering with pre-validation**

`renderTemplate(contractKey, variables)` validates required variables are present and non-empty before compiling Handlebars.

- [ ] **Step 4: Write the iPAS master-style slide template**

The template must encode these fixed instructions from the design spec:
- one slide = one claim;
- judgment/conclusion title;
- default max three displayed points;
- narrative `未知 -> 拆解 -> 理解 -> 解題 -> 通關`;
- learning-guidance-light series motif plus `{{visual_motif}}` unit motif;
- 70/20/10 style ratio;
- varied page density;
- no generic decorative AI robots, repetitive templates, excessive neon, or purposeless full-bleed illustration;
- important concepts include plain explanation, practical example, exam focus, trap, mnemonic.

- [ ] **Step 5: Implement OpenAI adapter behind `GenerationPort`**

Use the official OpenAI JavaScript SDK Responses API. The adapter reads `OPENAI_API_KEY` and requires `OPENAI_MODEL`; no model name is hard-coded into domain logic. The call shape is:

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

Throw `EmptyGenerationError` if `response.output_text.trim()` is empty.

- [ ] **Step 6: Test the adapter without network calls**

Inject a minimal client interface into `OpenAIGenerationAdapter`; fake `responses.create()` in tests and assert request/model mapping and empty-response behavior.

- [ ] **Step 7: Run tests and commit**

Run: `pnpm test packages/generator/test/render.test.ts && pnpm typecheck`

```bash
git add packages/generator templates
git commit -m "feat: add governed template and generation adapters"
```

---

### Task 10: Implement Content-Pack Orchestration and Artifact Lineage

**Files:**
- Create: `packages/generator/src/content-pack.ts`
- Create: `packages/generator/test/content-pack.test.ts`
- Modify: `packages/generator/src/index.ts`
- Modify: `packages/core/src/unit-service.ts`

**Interfaces:**
- Consumes: Unit manifest, source pack text, template variables, `GenerationPort`.
- Produces: `generatePreNotebookContentPack(input)` returning nine generated text artifacts and updated artifact lineage; video remains pending.

- [ ] **Step 1: Write failing orchestration test with fake generator**

The fake returns `generated:<artifactKind>`. Assert the orchestration requests exactly these pre-Notebook outputs:

1. `SOURCE_BRIEF`
2. `SLIDES_PROMPT`
3. `VOICE_PROMPT`
4. `COURSE_HANDOUT`
5. `DESKTOP_EXPLAINERS`
6. `MOBILE_KEY_CARDS`
7. `FORMULA_DECISION_CARD`
8. `OFFICIAL_QUESTION_BREAKDOWN`
9. `UNIT_QUESTION_BANK`

Assert `VIDEO_OUTPUT`, `SLIDES_OUTPUT`, and `VOICE_OUTPUT` are not generated automatically.

- [ ] **Step 2: Implement ordered generation with partial-failure safety**

```ts
export interface GeneratedTextArtifact {
  kind: string;
  text: string;
  sourceIds: string[];
  provider: string;
  model: string;
  responseId: string | null;
}
```

Generate one artifact at a time and return successfully completed artifacts plus a failure object. Do not advance unit status to `CONTENT_READY` unless all nine required pre-Notebook outputs succeed.

- [ ] **Step 3: Implement content state progression**

The service transitions:
- `BRIEF_READY -> CONTENT_GENERATING` before the remaining content pack;
- `CONTENT_GENERATING -> CONTENT_READY` only after all required generated text artifacts are ready;
- any generation failure sets artifact status `QA_FAILED` or `REVISION_REQUIRED` as appropriate and moves the unit to `QA_FAILED` with evidence.

Source Brief can be generated separately so `SOURCE_READY -> BRIEF_READY` remains meaningful.

- [ ] **Step 4: Add source lineage to every generated artifact**

Every generated item gets the exact `sourceIds` used for its prompt. A test must fail if generated artifact creation is attempted with an empty source list for source-bound iPAS artifacts.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test packages/generator/test/content-pack.test.ts packages/core/test/unit-service.test.ts`

```bash
git add packages/generator/src/content-pack.ts packages/generator/test/content-pack.test.ts packages/core/src/unit-service.ts
git commit -m "feat: orchestrate traceable pre-Notebook content packs"
```

---

### Task 11: Implement Structured QA Findings and Gate-Blocking Rules

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

- [ ] **Step 1: Write failing QA tests for load-bearing rules**

Tests must assert these exact error codes:
- `SOURCE_OFFICIAL_MISSING` when a source-bound unit has no S0-S4 source;
- `SOURCE_ID_UNKNOWN` for unresolved source lineage;
- `ERRATA_MAPPING_UNRESOLVED` when an attached errata `corrects` unknown IDs;
- `ARTIFACT_GROUP_MISSING` when one of ten groups is absent;
- `GATE_OUTPUT_MISSING` when a human gate is approved without generated output;
- `CONTENT_LINEAGE_MISSING` when generated artifact has no source IDs;
- `EXAM_ANSWER_MISSING` for question-bank records missing answer;
- `EXAM_EXPLANATION_MISSING` for missing explanation.

Run: `pnpm test packages/qa/test/qa.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement source and manifest QA**

`runSourceQa(unit, registry)` and `runManifestQa(unit)` return findings only; they do not mutate manifests.

- [ ] **Step 3: Implement machine-checkable content QA metadata**

Because prose quality cannot be reliably guaranteed by string heuristics, generated content artifacts must carry a small metadata checklist produced by the generation orchestration:

```ts
{
  plainLanguage: true,
  practicalExample: true,
  examFocus: true,
  commonTrap: true,
  mnemonic: true
}
```

`content-qa.ts` validates presence of these flags for concepts designated `importantConcepts` in the unit generation input. It must not claim semantic correctness from keyword matching alone.

- [ ] **Step 4: Implement exam QA contract**

Represent generated question-bank entries in structured JSON alongside rendered markdown. Minimum fields:

```ts
{
  questionId: 'M1-03-Q001',
  topic: 'Object Detection',
  stem: '...',
  options: ['A ...', 'B ...', 'C ...', 'D ...'],
  answer: 'B',
  explanation: '...',
  distractorReasoning: { A: '...', C: '...', D: '...' },
  sourceIds: ['...']
}
```

Validate answer, explanation, topic, and source linkage.

- [ ] **Step 5: Implement aggregate QA and blocking rule**

```ts
export function runUnitQa(context: UnitQaContext): QaReport {
  const findings = [
    ...runSourceQa(context),
    ...runManifestQa(context),
    ...runContentQa(context),
    ...runExamQa(context)
  ];
  return { status: findings.some(f => f.severity === 'ERROR') ? 'FAILED' : 'PASSED', findings };
}
```

Only `ERROR` blocks progression; warnings remain visible.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm test packages/qa/test/qa.test.ts && pnpm typecheck`

```bash
git add packages/qa
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
- Consumes: schemas and known existing Drive fixture IDs.
- Produces: two real-world reference manifests that validate against Phase 1 schemas without changing existing Drive folders.

- [ ] **Step 1: Write failing fixture-validation test**

```ts
it.each(['M1-01', 'M1-02'])('loads migrated %s manifest', async unitId => {
  const store = new YamlManifestStore(repoRoot);
  expect((await store.loadUnit(unitId)).unitId).toBe(unitId);
});
```

Run: `pnpm test packages/core/test/migration-fixtures.test.ts`

Expected: FAIL because fixtures do not exist.

- [ ] **Step 2: Add course and subject catalog**

Use the existing iPAS intermediate Drive root ID:

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

If `authority` is not part of `CourseSchema`, either remove it from the fixture or add it as an optional schema field in Task 2 before this task; do not allow unknown fields silently.

- [ ] **Step 3: Register the authoritative source files already used by the two units**

Registry IDs and Drive IDs:
- `ipas-mid-s1-subject1-guide` -> `1AgLmuHDx06UIa6C7uj5rRHNQc3n8X-1q`
- `ipas-mid-s2-errata-2026-04-10` -> `1oscVIEx5nKzv52407Qx5Sh7wJLi6N6mM`
- `ipas-mid-s3-exam-2025-round2-subject1` -> `1GNiEPNBD8Z-HF5gIW9OLk0Cwcoow_RZJ`
- `ipas-mid-s4-sample-2025-09-v2` -> `1y8cqmk5YmYG3BHsyy4lOHDR99Hv4UsWx`

The errata source must explicitly map `corrects` only to known registry IDs. Do not claim it corrects the entire guide unless the source mapping says so; use scoped correction references where the source permits.

- [ ] **Step 4: Migrate M1-01 Drive mappings without creating folders**

Use existing root folder `1G7MEI7EbVsNV7iIOikvX5ItoHboIYUai` and these known children:
- Source `1kJQMwmE8Rmb7qfUoB7LMqOvPDPXMZ84R`
- Slides `1DJBF6zLjYPTLzIEt9iSCDvx7q-TVVfaf`
- Voice `1T5VXWJPY0bxLB6H_aSdtODb2slt5Kq9m`
- Video `1kR5j2S2Pf5ziITqoRxategJyASjC_owO`
- Handout `1O60G8HCH3ysl4i6HNowV6_s2ajdtmgnY`
- Desktop `1fDJtuNkb9qTaoZCbm86fsDNAfrS1aI9E`
- Mobile `1b63hyMNPbsgRdvlt3sqTo7nhqVLM46ZQ`
- Formula `1eosCgAmqsbukLEgG_vRXurDTayT1nar1`
- Exam `1hNJ8o2c_nSc7eTxiDGzLarrbq9HAG50y`
- Question bank `1pFgtcFPhP-xbPnDf3c3YQYUPRLStDksY`

Map source scopes to the official-question areas already used in this unit: NLP representation, Word2Vec/GloVe, TF-IDF, and N-gram.

- [ ] **Step 5: Migrate M1-02 Drive mappings without creating folders**

Use existing root folder `1mVZFQ3Hj0WXLRqo7d0iTHDC8W1QLn-5t` and these children:
- Source `1zuQiZa4rFt4Zrg1OZlR94OP10wmQj-fx`
- Slides `1CvDNjcEw_a_lkAD3PB9d2ignhVtupuFS`
- Voice `1NNh-mv_zHviHYi70t7wy1I-pRF20o1v_`
- Video `1Whllv7NkebrM863G2pvKVUvSe9dod3bV`
- Handout `1yQPCSVGtSZWu8Tuf4LkaChfBo38RLa0R`
- Desktop `1xQoaawOJstC1_DrtVwIMd9XkbyBAsCi2`
- Mobile `1bV_F80K8FVToqaCq4udGfdZjHBR11uXk`
- Formula/decision `1rzODGl3yaR73QpQwbY6Yltz2hMXxBmSc`
- Exam `15sXSkiZqlBAEDjISXCESQZh-fLoiXO03`
- Question bank `1XOdOzlaWLZInhDv52sGs5CZ1AyL0pc06`

Map source scopes to Self-Attention, long-range dependency, BERT MLM, and BERT/GPT distinctions.

- [ ] **Step 6: Mark migration state truthfully**

Do not mark generated Slides/Voice outputs as approved merely because prompt documents exist. M1-01 and M1-02 should be migrated to the highest state justified by actual tracked artifacts and explicit human approval evidence. If approval evidence is absent, keep the relevant gate `PENDING` and do not advance past it.

- [ ] **Step 7: Run validation tests and commit**

Run: `pnpm test packages/core/test/migration-fixtures.test.ts && pnpm typecheck`

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
- Create command files listed in File Map
- Create: `apps/cli/test/cli.test.ts`

**Interfaces:**
- Consumes: core services, Drive adapter, generator, QA, manifest store.
- Produces these commands:
  - `course-factory unit create <unit-id>`
  - `course-factory source attach <unit-id> <source-id>`
  - `course-factory drive ensure <unit-id>`
  - `course-factory generate brief <unit-id>`
  - `course-factory generate content-pack <unit-id>`
  - `course-factory qa run <unit-id>`
  - `course-factory status <unit-id>`
  - `course-factory transition <unit-id> <state> --evidence <text>`

- [ ] **Step 1: Write failing CLI tests using dependency injection**

Example:

```ts
it('status prints workflow state and artifact completeness', async () => {
  const output = await runCli(['status', 'M1-02'], fakeContainer());
  expect(output).toContain('M1-02');
  expect(output).toContain('CONTENT_READY');
  expect(output).toMatch(/\d+\/10/);
});
```

Run: `pnpm test apps/cli/test/cli.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement container wiring**

`container.ts` is the only CLI file allowed to construct concrete adapters. Commands receive interfaces/services.

- [ ] **Step 3: Implement `unit create`**

Required flags when creating a brand-new unit:
- `--course`
- `--level`
- `--subject`
- `--title`
- `--core-thesis`

It writes a valid `PLANNED` manifest with default artifact groups and pending gates. It does not create Drive folders until `drive ensure` is called.

- [ ] **Step 4: Implement source and Drive commands**

`source attach` validates source ID exists before mutating manifest.
`drive ensure` calls `ensureUnitWorkspace`, writes returned IDs, and is safe to re-run.

- [ ] **Step 5: Implement generation and QA commands**

`generate brief` requires `SOURCE_READY` and at least one authoritative S0-S4 source.
`generate content-pack` requires `BRIEF_READY`.
`qa run` writes report status/findings to manifest and transitions `CONTENT_READY -> CONTENT_QA`; if QA passes it may transition `CONTENT_QA -> NOTEBOOKLM_PENDING`, otherwise `CONTENT_QA -> QA_FAILED` with evidence.

- [ ] **Step 6: Implement explicit human transition command**

`transition` is the mechanism for registering human gate progression. For `SLIDES_APPROVED` or `VOICE_APPROVED`, require an evidence argument and corresponding output artifact URL/Drive ID already registered.

Do not provide `--force` in Phase 1.

- [ ] **Step 7: Run tests and commit**

Run: `pnpm test apps/cli/test/cli.test.ts && pnpm typecheck`

```bash
git add apps/cli
git commit -m "feat: add Phase 1 course factory CLI"
```

---

### Task 14: Add End-to-End Phase 1 Acceptance Tests

**Files:**
- Create: `tests/phase1.acceptance.test.ts`
- Modify: root `package.json`

**Interfaces:**
- Consumes: all Phase 1 packages via fakes for external network services.
- Produces: an executable acceptance proof for the Phase 1 exit criterion.

- [ ] **Step 1: Write the failing end-to-end scenario**

The scenario must:
1. create `M1-99`;
2. attach a fake S1 guide and S3 exam source;
3. transition to `SOURCE_READY` only after source validation;
4. ensure Drive workspace twice against a fake Drive and assert no duplicates;
5. generate Source Brief through fake generator;
6. generate the remaining eight pre-Notebook artifacts through fake generator;
7. run QA and reach `NOTEBOOKLM_PENDING`;
8. register a Slides output URL;
9. transition to `SLIDES_REVIEW`;
10. prove `SLIDES_REVIEW -> PUBLISHED` is rejected;
11. approve Slides with evidence and reach `SLIDES_APPROVED`;
12. leave Voice and Final gates pending.

- [ ] **Step 2: Add acceptance script**

```json
"scripts": {
  "test:acceptance": "vitest run tests/phase1.acceptance.test.ts"
}
```

Preserve existing root scripts.

- [ ] **Step 3: Run the acceptance test and full suite**

Run:

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
- Consumes: implemented commands and contracts.
- Produces: onboarding and verification instructions that match actual behavior.

- [ ] **Step 1: Write documentation verification checklist before docs**

Checklist must be validated manually against actual commands:
- clean clone setup works;
- `.env.example` contains every required runtime variable without secrets;
- `pnpm test`, `pnpm typecheck`, and `pnpm build` commands match package scripts;
- CLI examples use implemented command names;
- source tiers S0-S5 match `AGENTS.md`;
- ten Drive folders match code constants;
- state flow includes Voice review/approval;
- no dashboard instructions appear in Phase 1 operator workflow.

- [ ] **Step 2: Update README with minimal quick start**

Include:

```bash
pnpm install
cp .env.example .env
pnpm test
pnpm build
pnpm --filter @ipas-course-factory/cli start -- status M1-02
```

Use the actual CLI package name from `apps/cli/package.json`.

- [ ] **Step 3: Document the operator workflow**

Show this exact safe sequence:

```text
unit create
-> source attach
-> source validation
-> drive ensure
-> generate brief
-> generate content-pack
-> qa run
-> NOTEBOOKLM_PENDING
-> register slides output
-> SLIDES_REVIEW
-> human slides approval
-> VOICE_PENDING
```

Document that NotebookLM and CapCut remain manual in Phase 1.

- [ ] **Step 4: Document source governance and architecture**

Explain S0-S5, scoped errata precedence, source lineage, GitHub control plane / Drive asset plane, and why a database is intentionally deferred.

- [ ] **Step 5: Run final verification and commit**

Run:

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

## Phase 1 Review Gates

The implementation should not be delivered as one giant unreviewed change. Recommended review boundaries:

1. **Foundation PR:** Tasks 1-6 — workspace, schemas, persistence, source governance, workflow, artifact/gate rules.
2. **Adapters PR:** Tasks 7-10 — Drive, source reading, template/generation adapter, content-pack orchestration.
3. **QA & Fixtures PR:** Tasks 11-12 — QA framework and M1-01/M1-02 migration fixtures.
4. **Operator PR:** Tasks 13-15 — CLI, acceptance tests, docs.

Each PR must be based on the previously merged Phase 1 PR so reviewers see a small coherent delta. If using one implementation branch for execution, still preserve these four review checkpoints before proceeding to the next group.

## Phase 1 Exit Criteria

Phase 1 is complete only when all of the following are evidenced:

- `pnpm test` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
- `M1-01.yaml` and `M1-02.yaml` validate against the canonical schemas.
- Source registry resolves every source ID referenced by M1-01/M1-02.
- Errata precedence tests pass.
- Legal/illegal/idempotent workflow transition tests pass.
- Voice review and approval states are tested.
- Artifact completeness uses ten groups and correctly handles `NOT_APPLICABLE` reasons.
- Drive workspace ensure is idempotent in unit tests.
- Duplicate Drive folder ambiguity blocks with actionable IDs.
- A guarded real-Drive integration test can provision and re-check a disposable unit workspace when credentials are configured.
- Source reading can normalize the official Drive source types needed by the iPAS source pack.
- Template rendering fails before model calls when required variables are missing.
- Generation is provider-neutral in core code and concrete provider details exist only in the generator adapter.
- The pre-Notebook content pack does not auto-generate Slides output, Voice output, or video.
- QA errors prevent progression to `NOTEBOOKLM_PENDING`.
- Human gate approval requires evidence and corresponding generated output.
- Phase 1 acceptance test reaches `NOTEBOOKLM_PENDING`, rejects a skipped human gate, and records a valid Slides approval path.
- Operator docs match implemented commands.
- No Phase 2 dashboard code is introduced.

## Self-Review Notes

### Spec coverage

- Control plane / asset plane split: Tasks 3, 7, 12, 15.
- File-backed manifests: Tasks 2-3.
- Course/Subject/Unit/Source/Artifact/Gate models: Tasks 2, 6.
- Source governance and errata: Tasks 4, 8, 11-12.
- State machine and history: Task 5.
- Ten artifact groups and prompt/output sub-artifacts: Task 6.
- Drive contract/idempotency/duplicate handling: Task 7.
- Template engine/master art direction: Task 9.
- Pre-Notebook generation: Task 10.
- QA architecture: Task 11.
- M1-01/M1-02 migration fixtures: Task 12.
- CLI operator surface: Task 13.
- Testing/acceptance: Tasks 1-14.
- Phase 2 Dashboard excluded: Global Constraints, Task 15, Exit Criteria.

### Type consistency

Canonical names used throughout the plan:
- `UnitManifest`
- `UnitStatus`
- `DrivePort`
- `GenerationPort`
- `YamlManifestStore`
- `ensureUnitWorkspace()`
- `resolveAuthoritativeSources()`
- `transitionUnit()`
- `createDefaultArtifactGroups()`
- `calculateArtifactCompleteness()`
- `runUnitQa()`

### Implementation note on OpenAI

Only `packages/generator/src/openai-adapter.ts` may import the OpenAI SDK. Core packages depend only on `GenerationPort`. The model is configuration (`OPENAI_MODEL`) rather than a domain constant, so changing providers/models does not mutate workflow or source-governance logic.
