# Multi-Exam Course Factory Architecture

Status: ACTIVE  
Effective: 2026-08-20

## Goal

Evolve the current iPAS course factory into a reusable exam / certification production platform without breaking existing iPAS assets, IDs, workflows, or evidence.

The architecture must support iPAS today, Postal recruitment next, and future certification / recruitment / public-sector exams through program profiles instead of copied systems.

## Core Principle

**共用核心，考試隔離；規範可繼承，資料不可混用。**

The factory is divided into two layers.

### 1. Shared Core

Reusable across all exams:

- source-governance framework;
- artifact state machine;
- source / question / topic traceability;
- cross-chat production registry and CLAIM lock;
- render fingerprint duplicate prevention;
- deterministic evidence text rendering;
- dynamic-height key-card layout behavior;
- batch coordination;
- artifact versioning;
- QA gates;
- backup-asset separation;
- Drive / GitHub control-plane split;
- dashboard accounting rules.

The core must not assume:

- `初級 / 中級`;
- exactly three subjects;
- iPAS source page structure;
- iPAS question numbering;
- iPAS star thresholds;
- iPAS mascot or visual branding;
- iPAS Drive folder IDs;
- any fixed exam cadence.

### 2. Exam Program Profile

Every certification or recruitment exam is a tenant / program profile.

A program profile owns:

- `programCode`;
- official name and authority;
- official source entry points;
- level / track / category model;
- subject model;
- official question UID format;
- source priority profile;
- topic taxonomy (L1/L2/L3 or another hierarchy);
- historical denominator and weight logic;
- citation display profile;
- Drive root and asset folders;
- card / slide visual profile;
- optional mascot profile;
- exam-specific QA gates.

Program registry:

`sources/registry/exam-programs.yaml`

## Namespace Model

Every globally unique production identity must include `programCode`.

Recommended card key:

`<PROGRAM>-<TRACK_OR_LEVEL>-<SUBJECT>-<TOPIC_ID>-<CARD_NO>`

Examples:

- `IPAS-JR-S1-I1-01-C001`
- `IPAS-MID-S3-M3-06-C023`
- future Postal keys begin with `POSTAL-...`

Existing iPAS legacy keys such as `JR-S1-I1-01-C001` remain valid historical aliases. Do not mass-rewrite existing evidence merely to add the prefix.

New cross-program references must use the global key.

## Data Isolation

Hard isolation rules:

1. iPAS questions may not increase Postal frequency counts.
2. Postal questions may not change iPAS star ratings.
3. source IDs belong to exactly one program.
4. one program's subject code has no meaning in another program unless explicitly mapped.
5. visual assets may be shared only as reusable design assets, never as evidence.
6. official source hierarchies are program-specific even when the shared core offers a common schema.

## Inheritance

Programs may inherit shared defaults, then override only what differs.

Example:

- Core provides deterministic evidence rendering.
- iPAS provides KCT-v3.4, 小芯, iPAS labels, citation rules.
- Postal may inherit the rendering engine but later approve a different visual theme, mascot, labels, citation footer, or subject hierarchy.

A program must not inherit semantic assumptions merely because the UI looks similar.

## Program Lifecycle

New program onboarding states:

`PLANNED -> SOURCE_DISCOVERY -> SOURCE_REGISTERED -> SUBJECT_MODEL_READY -> TAXONOMY_READY -> STORAGE_READY -> QA_PROFILE_READY -> PILOT -> ACTIVE`

Activation gates:

- `PROGRAM_REGISTERED`
- `OFFICIAL_SOURCES_REGISTERED`
- `SUBJECT_MODEL_READY`
- `TOPIC_TAXONOMY_READY`
- `QUESTION_ID_POLICY_READY`
- `STORAGE_READY`
- `QA_PROFILE_READY`

Do not produce final exam-frequency cards before the required source and taxonomy gates are satisfied.

## Postal Recruitment — Next Program

`POSTAL` is registered as `PLANNED` only.

At this stage the system intentionally does **not** define:

- official recruitment title;
- tracks / categories;
- subjects;
- question counts;
- historical denominator;
- scoring weights;
- source URLs.

These must be filled from official sources during the Postal onboarding phase. iPAS structure must not be copied into Postal by assumption.

## Key-Card Production Compatibility

Cross-chat duplicate prevention becomes program-aware.

The registry may preserve legacy iPAS `productionKey`, but every new record must carry:

- `programCode`;
- `globalProductionKey`;
- program-scoped batch ID;
- program-scoped source / analysis snapshot.

Fingerprint input must include `programCode` so two exams can never collide even if all local IDs are identical.

## Storage Strategy

Each program receives its own Drive root.

Recommended logical structure inside a program root:

- `00_治理與官方來源`
- program subjects / tracks
- `04_共用素材`
- `05_題庫與考前衝刺`
- program-specific backup assets

GitHub stores reusable schemas and program profiles. Drive stores program-specific source and generated assets.

No Postal files should be placed inside iPAS subject folders.

## Future Extraction Path

The current repository may continue serving as the iPAS implementation while shared policies are gradually made program-neutral.

If multiple programs become active, the shared core may later be extracted into a higher-level repository without changing program keys or evidence IDs.

Recommended eventual separation:

- Exam-Course-Factory-Core — shared contracts / schemas / QA / production coordination
- iPAS-Course-Factory — IPAS program profile + assets
- Postal-Exam-Course-Factory — POSTAL program profile + assets

Extraction is optional; namespace and profile design must work before extraction.

## Anti-Drift Rule

Whenever a new exam is introduced, first ask:

1. Is this behavior truly universal?
2. Or is it specific to one program?

Universal behavior belongs in the core.
Program-specific behavior belongs in the program profile.

Never hard-code the second exam into iPAS-specific filenames, enums, IDs, or assumptions.
