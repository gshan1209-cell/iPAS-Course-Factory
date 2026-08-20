# Key-Card Subject Isolation Policy

Status: ACTIVE  
Effective: 2026-08-20  
Scope: all key-card production; mandatory for IPAS

## Core Principle

**重點卡必須以「單科獨立考試」為前提，做到科目獨立、編號獨立、內容獨立、QA 獨立、存放獨立，不得跨科混淆。**

A subject is an independent examination unit. A learner may prepare for and take one subject independently, so no subject may depend on another subject's cards to be complete.

## Subject Scope Identity

Every production run must resolve all of the following before card selection:

- `programCode`
- `levelOrTrack`
- `subjectCode`

The subject scope key is:

`<PROGRAM>-<LEVEL_OR_TRACK>-<SUBJECT>`

Examples:

- `IPAS-JR-S1`
- `IPAS-JR-S2`
- `IPAS-MID-S1`
- `IPAS-MID-S2`
- `IPAS-MID-S3`

No card may be selected, claimed, rendered, QA-passed, counted, or stored until its subject scope is resolved.

## Five Independent Domains

### 1. Subject-Independent Content

- One formal card belongs to exactly one subject.
- Core teaching content must be written from that subject's governed syllabus / Master / atomic-topic record.
- A concept that also appears in another subject must still be independently explained when it is examinable in the current subject.
- Cross-subject related concepts may appear only as optional related references; they must not replace the current subject's required explanation.
- Do not copy another subject's wording, scope, traps, examples, or emphasis without validating them against the current subject's governed data.

### 2. Subject-Independent Numbering

Visible card numbers are scoped **per subject**.

- every subject starts from `C-001`;
- numbering continues only inside the same subject;
- changing subject resets the visible sequence to `C-001`;
- visible card numbers may repeat across subjects;
- cross-subject uniqueness is provided by the full production key, not by `C-<nnn>` alone.

Required global production key:

`<PROGRAM>-<LEVEL_OR_TRACK>-<SUBJECT>-<TOPIC_ID>-<CARD_NO>`

Examples:

- `IPAS-JR-S1-I1-01-C001`
- `IPAS-JR-S2-I2-01-C001`

These are different cards even though both visibly display `C-001`.

Filename default:

`C-<nnn>_<主題名稱>.png`

The Drive path / registry record must carry the subject scope so identical visible numbers across subjects cannot be confused.

### 3. Subject-Independent Registry / Batch / Claim

- `CLAIMED`, `VISUAL_READY`, `RENDERED`, `QA_PASSED`, `REVISION_REQUIRED`, and other production states are subject-scoped.
- A claim in one subject never reserves the same visible card number in another subject.
- A batch must declare one subject scope; do not mix multiple subjects in one production batch.
- QA-passed counts and completion metrics must be calculated per subject before any higher-level aggregation.
- Never continue a card-number sequence from another subject.

### 4. Subject-Independent Evidence and QA

The following must come from the current subject only:

- official capability / syllabus mapping;
- historical question mapping;
- exam-session citations;
- question-frequency calculations;
- star rating / priority;
- exam labels;
- traps and distractor patterns;
- source footer evidence.

The same concept may legitimately have different stars, labels, citations, traps, or teaching emphasis in different subjects.

Formal QA gates:

- `SUBJECT_SCOPE_LOCKED = true`
- `CARD_NUMBER_SCOPE_PER_SUBJECT = true`
- `CONTENT_SUBJECT_MATCHED = true`
- `EVIDENCE_SUBJECT_MATCHED = true`
- `QA_SUBJECT_SCOPED = true`
- `DRIVE_SUBJECT_MATCHED = true`

Any cross-subject mismatch is a hard QA failure and must not become `QA_PASSED`.

### 5. Subject-Independent Storage

Formal artifacts must be stored under the correct level / subject location.

Recommended hierarchy:

`<program key-card root>/<level>/<subject>/...`

Rules:

- do not place a formal card in another subject's folder;
- backup / mistake cards must retain subject identity in their metadata or filename;
- backup / mistake cards never count as subject completion;
- moving a card between subjects does not make it valid for the destination subject; it must be revalidated against destination-subject data first.

## Cross-Subject Reuse Rule

Visual style, mascot identity, layout mechanics, and generic teaching patterns may be reused.

The following may **not** be reused as authoritative evidence across subjects without destination-subject validation:

- exam frequency;
- star rating;
- exam labels;
- citation sessions;
- question references;
- topic scope;
- answer logic;
- QA state.

**Reuse the factory mechanics, not the subject evidence.**

## Legacy / Migration Rule

Artifacts produced under a historical cross-subject running-number sequence remain legacy / backup artifacts until explicitly mapped to a subject-scoped formal identity.

Do not automatically treat a legacy `C-031` from another subject as the current subject's `C-031`. Under this policy, the current subject maintains its own sequence beginning at `C-001`.

## Production Gate

Before image generation, the producer must be able to state all three values unambiguously:

`Program + Level/Track + Subject`

If any one is unresolved or conflicts with the selected Master, batch, registry record, filename, or Drive destination, stop production and resolve the subject scope first.
