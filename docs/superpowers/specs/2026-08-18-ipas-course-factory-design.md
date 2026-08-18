# iPAS-Course-Factory Design Spec v1.0

Date: 2026-08-18
Status: Proposed design approved in chat; implementation not started
Repository: `gshan1209-cell/iPAS-Course-Factory`

## 1. Problem Statement

The current iPAS intermediate course workflow is already repeatable but still depends on manual orchestration. For each unit, the same work is repeated: establish folders, gather official sources, extract source scope, create a Source Brief, create a master-level NotebookLM slide prompt, create a per-slide voice prompt, create a handout, prepare desktop and mobile learning assets, prepare formula/decision cards, decompose official questions, create a unit question bank, and then track what remains for NotebookLM and CapCut.

The goal is not maximum unattended generation. The goal is a semi-automated course factory that makes the repeatable 80% deterministic while preserving human review where visual, audio, and publication quality matter.

## 2. Product Decision

Adopt **B — Semi-Automated Course Factory**.

Automate:
- course / subject / unit registration
- standard Drive structure planning and creation
- source registration and source mapping
- Source Brief generation contract
- NotebookLM slide-prompt generation contract
- NotebookLM voice-prompt generation contract
- handout generation contract
- desktop explainer script generation contract
- mobile card script generation contract
- formula / decision-card generation contract
- official-question decomposition contract
- unit question-bank generation contract
- QA and completeness checks
- workflow state tracking

Keep human-controlled:
- NotebookLM slide generation/review
- voice generation/review
- CapCut video assembly
- final publication approval

## 3. Success Criteria

A unit is system-managed when:
1. it has a valid Unit Manifest;
2. all source IDs are registered and traceable;
3. the standard Drive structure can be created idempotently;
4. all expected artifact groups and their sub-artifacts have tracked status;
5. workflow transitions are legal and auditable;
6. automatic QA can report missing or invalid artifacts;
7. human-gate states cannot be bypassed silently;
8. a dashboard can later read the same manifests without a separate source of truth.

A successful Phase 1 should allow a command equivalent to:

`create unit --course ipas-ai-planner --level intermediate --subject M1 --unit M1-03`

and produce a governed unit workspace ready for content generation.

## 4. Architectural Principles

### 4.1 GitHub is the control plane

GitHub stores:
- schemas
- manifests
- templates
- workflow definitions
- QA rules
- governance
- implementation code

### 4.2 Google Drive is the asset plane

Drive stores:
- official source files
- generated Google Docs
- NotebookLM slide outputs
- audio
- rendered visual assets
- video outputs

Drive file existence is not itself workflow truth. The Unit Manifest records canonical artifact and gate state.

### 4.3 File-backed manifests before database

Phase 1 uses version-controlled YAML/JSON manifests. A database is deferred until there is an evidenced need for concurrent transactional writes, high-volume querying, or cross-course analytics that file-backed manifests cannot satisfy cleanly.

### 4.4 Domain core isolated from adapters

Workflow, source precedence, artifact contracts, and QA rules must not depend directly on Google Drive, GitHub, UI, or NotebookLM-specific APIs.

## 5. Recommended Technology Direction

Use a TypeScript monorepo for the control plane.

Recommended logical packages:
- `packages/core` — domain models, state machine, completeness rules
- `packages/schemas` — runtime and JSON-schema validation
- `packages/drive` — Google Drive adapter
- `packages/generator` — template rendering / artifact build contracts
- `packages/qa` — source, content, slide, exam, and manifest QA

Recommended apps:
- `apps/cli` — Phase 1 operator interface
- `apps/dashboard` — Phase 2 visual control plane

The exact framework/library versions are implementation decisions and are intentionally not fixed in this design spec.

## 6. Repository Structure

```text
iPAS-Course-Factory/
├── AGENTS.md
├── README.md
├── docs/
│   ├── superpowers/specs/
│   ├── architecture/
│   ├── workflows/
│   └── governance/
├── catalog/
│   ├── courses/
│   ├── subjects/
│   └── units/
├── sources/
│   ├── registry/
│   └── mappings/
├── templates/
│   ├── source-brief/
│   ├── slides/master-art-direction/
│   ├── voice/
│   ├── handout/
│   ├── desktop-card/
│   ├── mobile-card/
│   ├── formula-card/
│   ├── exam-breakdown/
│   └── question-bank/
├── workflows/
│   ├── create-unit/
│   ├── generate-content/
│   ├── run-qa/
│   └── publish-unit/
├── schemas/
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── drive/
│   ├── generator/
│   └── qa/
├── apps/
│   ├── cli/
│   └── dashboard/
└── tests/
```

Phase 1 does not need to create every empty directory up front. Directories should appear when they hold an actual contract or implementation artifact.

## 7. Core Domain Model

### 7.1 Course

Represents a certification/course family.

Minimum fields:
- `courseId`
- `name`
- `provider`
- `levels[]`
- `status`

### 7.2 Subject

Minimum fields:
- `subjectId`
- `courseId`
- `level`
- `name`
- `badge`
- `unitIds[]`

### 7.3 Unit

The Unit Manifest is the central digital work order.

Recommended shape:

```yaml
schemaVersion: 1
unitId: M1-02
courseId: ipas-ai-planner
level: intermediate
subjectId: M1
title: Transformer 與 BERT
coreThesis: >
  有了向量還不夠，模型還要知道一句話裡哪些詞彼此最重要。
status: CONTENT_READY

drive:
  unitFolderId: null
  folders: {}

sources: []
artifacts: {}
gates: {}
qa: {}
history: []
```

### 7.4 Source

Minimum fields:
- `sourceId`
- `tier`
- `title`
- `provider`
- `driveFileId`
- `scope`
- `effectiveDate` where relevant
- `supersedes[]` / `corrects[]` where relevant

### 7.5 Artifact Group and Sub-Artifact

The ten numbered unit outputs are **artifact groups**, because some folders contain both a generated prompt and a later human-reviewed production output.

Minimum group fields:
- `artifactType`
- `status`
- `subArtifacts[]`
- `sourceIds[]`
- `qaStatus`
- `version`

Minimum sub-artifact fields:
- `role` such as `prompt`, `slides`, `audio`, `video`, `script`, or `reviewEvidence`
- `status`
- `driveFileId` or URL when applicable
- `generatedAt`
- `version`

This distinction is required so the system can track both the NotebookLM slide prompt and the actual generated deck, and both the voice prompt and the actual generated audio.

### 7.6 Gate

Minimum fields:
- `gateType`
- `status`
- `approvedBy`
- `approvedAt`
- `evidence`

## 8. Source Governance

Priority tiers:
- S0 — official exam / competency scope
- S1 — official learning guide
- S2 — official errata
- S3 — official announced exam questions
- S4 — official sample questions
- S5 — internal teaching supplement

Rules:
1. S0-S4 are authoritative for exam-bound claims.
2. S2 corrections override affected older source text.
3. S5 may improve pedagogy but cannot override official claims.
4. Generated content must preserve official terminology where exam relevance exists.
5. Unsupported claims must be explicitly marked supplemental or removed.
6. Artifact generation must retain source lineage through source IDs.

## 9. Artifact Contract

Each production unit tracks ten artifact groups:

1. Source Brief
2. Course Slides Package — NotebookLM master-style prompt + generated deck + slide review evidence
3. Voice Package — per-slide voice prompt + generated audio + voice review evidence
4. Video output
5. Course handout
6. Desktop explainer visuals
7. Mobile key-point cards
8. Formula / decision card
9. Official-question breakdown
10. Unit question bank

Each artifact-group or sub-artifact status uses at least:
- `NOT_STARTED`
- `GENERATING`
- `READY`
- `QA_FAILED`
- `REVISION_REQUIRED`
- `APPROVED`
- `NOT_APPLICABLE`

`NOT_APPLICABLE` requires a recorded reason.

Completeness must distinguish **content readiness** from **publication readiness**. For example, a slide prompt can be `READY` while the generated deck remains `NOT_STARTED`; the group is therefore not yet publication-complete.

## 10. Workflow State Machine

Normal states:

```text
PLANNED
  -> SOURCE_READY
  -> BRIEF_READY
  -> CONTENT_GENERATING
  -> CONTENT_READY
  -> CONTENT_QA
  -> NOTEBOOKLM_PENDING
  -> SLIDES_REVIEW
  -> SLIDES_APPROVED
  -> VOICE_PENDING
  -> VOICE_REVIEW
  -> VOICE_APPROVED
  -> VIDEO_PENDING
  -> FINAL_REVIEW
  -> PUBLISHED
```

Exception states:
- `BLOCKED`
- `QA_FAILED`
- `REVISION_REQUIRED`

Rules:
- transitions must be validated centrally;
- transitions must be idempotent where safe;
- a transition records timestamp, actor, previous state, new state, and evidence/reason;
- human gates cannot be skipped by a generated artifact appearing in Drive;
- `SLIDES_APPROVED` requires slide-review evidence;
- `VOICE_APPROVED` requires voice-review evidence;
- `PUBLISHED` requires final publication approval evidence;
- recovery paths return through explicit revision/QA states, not direct state mutation.

## 11. Standard Drive Contract

Default unit folder:

```text
<unit-folder>/
├── 01_Source
├── 02_課程簡報
├── 03_語音
├── 04_影片
├── 05_講義
├── 06_電腦詳解圖
├── 07_手機重點卡
├── 08_公式卡
├── 09_真題拆解
└── 10_題庫
```

Drive creation rules:
- creation must be idempotent;
- an existing mapped folder is reused;
- ambiguous duplicate folders are a QA/blocking condition, not silently merged;
- generated Drive IDs are written back to the Unit Manifest;
- folder names are presentation conventions, while manifest IDs are the actual identity.

## 12. Template Engine

Templates use explicit structured variables rather than ad-hoc copying.

Minimum shared variables:
- `course`
- `level`
- `subject`
- `unit`
- `core_thesis`
- `official_scope`
- `source_pack`
- `exam_focus`
- `known_traps`
- `visual_motif`

Template outputs must declare required inputs. Generation fails clearly when required data is absent.

## 13. iPAS Master Art Direction Contract

All iPAS intermediate slide prompts inherit the approved presentation system.

### Narrative

`未知 -> 拆解 -> 理解 -> 解題 -> 通關`

### Series visual motif

A learning-guidance light that becomes progressively clearer.

### Slide rules
- one slide = one claim
- title expresses a judgment or memorable conclusion
- default maximum of three displayed key points
- important concepts include plain-language explanation, practical/life example, exam focus, common trap, and mnemonic
- page formats and density vary intentionally
- every visual must perform a teaching task
- data/formulas/evidence are integrated into the visual world

### Style ratio
- 70% primary visual world
- 20% professional information design
- 10% special memory point

### Avoid
- repetitive identical page templates
- generic decorative AI robots
- excessive neon technology backgrounds
- purposeless full-bleed illustration
- empty business language

### Unit sub-motifs
The series motif stays stable while units may add a teaching-specific motif, e.g.:
- NLP: text becoming vectors
- Transformer: glowing token-to-token relationships
- Computer Vision: recognition frames and layered perception
- MLOps: model lifecycle tracks

## 14. QA Architecture

### 14.1 Source QA

Checks:
- official source presence
- source tier validity
- errata applied where mapped
- source IDs resolvable
- unsupported source claims flagged

### 14.2 Content QA

Checks for important concepts:
- plain-language explanation
- example
- exam focus
- trap
- mnemonic

Also checks:
- terminology alignment
- unit scope boundaries
- duplicated or contradictory teaching claims

### 14.3 Slide-Prompt QA

Checks:
- one claim per slide
- judgment-style titles
- excessive point counts
- monotonous layout instructions
- missing narrative progression
- missing visual motif
- prohibited generic AI visual instructions

### 14.4 Exam QA

Checks:
- answer present
- explanation present
- distractor reasoning present when required
- topic classification present
- source linkage recorded for official-question breakdowns

### 14.5 Manifest QA

Checks:
- schema validity
- legal workflow state
- artifact-group and sub-artifact completeness
- gate consistency
- approval evidence presence for human-gated states
- Drive mapping consistency

## 15. Human Gates

### Gate 1 — Slides

NotebookLM slide output enters `SLIDES_REVIEW`. Human approval records review evidence inside the Course Slides Package and transitions to `SLIDES_APPROVED`.

### Gate 2 — Voice

Generated audio enters `VOICE_REVIEW`. Human review covers pace, pronunciation, terminology, and teaching naturalness. Approval evidence is recorded inside the Voice Package before transition to `VOICE_APPROVED`.

### Gate 3 — Final Publication

Final video and required learning assets are checked together. Only explicit approval allows `PUBLISHED`.

## 16. Operator Experience — Phase 1 CLI

The first operator surface should be a CLI rather than a dashboard-first architecture.

Representative commands:

```text
course-factory unit create M1-03
course-factory source attach M1-03 <source-id>
course-factory drive ensure M1-03
course-factory generate brief M1-03
course-factory generate content-pack M1-03
course-factory qa run M1-03
course-factory status M1-03
```

The CLI is a thin adapter over domain services; it must not own business rules.

## 17. Dashboard — Phase 2

Dashboard reads the same manifests and QA results.

Initial views:
- overall course progress
- subject progress
- unit status
- artifact completeness
- blocking QA findings
- human gate status
- Drive quick links

No independent dashboard database is required initially.

## 18. Error Handling

### Source errors
Missing/ambiguous authoritative sources -> block source-dependent generation.

### Drive errors
Network/API errors -> retry-safe operation; do not duplicate folders on retry.
Ambiguous duplicate folder identity -> `BLOCKED` with actionable diagnostics.

### Generation errors
Missing template inputs -> fail before output creation.
Partial generation -> record artifact-level failure without incorrectly advancing unit state.

### QA errors
QA findings are structured, severity-ranked, and tied to artifact/source IDs.
Critical findings prevent gate progression.

### Human-gate errors
Missing approval evidence prevents gate completion even when files exist.

## 19. Auditing and History

Every meaningful mutation should be reconstructable from Git history plus manifest history.

Manifest history entry recommendation:
- timestamp
- actor
- action
- previous state/value
- new state/value
- evidence/reference

Do not store sensitive credentials or raw access tokens in manifests.

## 20. Testing Strategy

Phase 1 requires automated tests for:
- Course/Subject/Unit schema validation
- Source schema and source-tier validation
- errata precedence
- legal and illegal state transitions
- transition idempotency
- slide and voice gate enforcement
- artifact-group/sub-artifact completeness calculation
- Drive folder plan idempotency
- duplicate-folder detection behavior
- template required-input validation
- QA rule evaluation
- manifest serialization round trip

Adapter tests should isolate external APIs with fakes/mocks. A small explicit integration test suite may exercise real Drive in a controlled test folder when credentials are configured.

## 21. Phased Delivery

### Phase 1 — Control Plane Foundation

Deliver:
- repository foundation
- domain schemas
- course/subject/unit manifests
- source registry
- state machine
- artifact registry with sub-artifact tracking
- Drive folder planner/adapter
- template contracts
- QA framework
- CLI
- tests

Exit criterion: a new unit can be registered, mapped to sources, provisioned in Drive, checked for readiness, and tracked through pre-NotebookLM content readiness without manual state bookkeeping.

### Phase 2 — Dashboard

Deliver:
- course/subject/unit status views
- progress calculations
- artifact completeness views
- QA findings
- gate status
- Drive links

### Phase 3 — Production Assistant

Deliver operator helpers for the human workflow:
- copy/open approved NotebookLM prompts
- register generated slide output URL
- enter `SLIDES_REVIEW` and record slide approval evidence
- register generated voice output
- enter `VOICE_REVIEW` and record voice approval evidence
- register CapCut/video output
- collect final approval evidence

Do not use brittle browser automation to bypass unsupported NotebookLM/CapCut APIs.

### Phase 4 — Scale Out

Generalize catalog and templates so the engine can support other certifications and internal courses without changing core workflow logic.

## 22. Out of Scope for Initial Release

- fully autonomous NotebookLM interaction
- fully autonomous CapCut editing
- automatic publishing without human approval
- database-first architecture
- multi-tenant billing/authentication
- generalized LMS features
- arbitrary web research as an ungoverned source

## 23. Initial iPAS Catalog Target

The system should first ingest the already-approved intermediate curriculum:
- Subject 1: 10 units + review
- Subject 2: 11 units + review
- Subject 3: 12 units + review

Existing manually produced Subject 1 Unit 01 and Unit 02 should later be registered as migration/reference fixtures rather than regenerated blindly.

## 24. Key Design Decision Summary

1. Semi-automated, not fully autonomous.
2. GitHub control plane; Drive asset plane.
3. File-backed manifests first; database deferred.
4. TypeScript domain core and adapters.
5. CLI first; dashboard second.
6. Source governance and errata precedence are first-class domain rules.
7. Ten artifact groups define the unit contract, with sub-artifacts tracking prompts and human-produced outputs.
8. Human gates remain mandatory for slides, voice, and final publication.
9. Approved Master Art Direction is a reusable contract, not a one-off prompt.
10. Existing M1-01 and M1-02 are migration fixtures for validating Phase 1.

## 25. Acceptance of Design

This design is ready to proceed to an implementation plan when:
- no unresolved placeholders remain;
- scope boundaries are consistent with the semi-automated B decision;
- state/gate semantics are internally consistent;
- Phase 1 can be implemented and tested independently of Phase 2;
- the user accepts this written spec as the implementation baseline.
