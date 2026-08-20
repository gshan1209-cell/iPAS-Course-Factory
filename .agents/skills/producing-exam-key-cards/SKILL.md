---
name: producing-exam-key-cards
description: Generic cross-program key-card production skill. Use for any registered exam or certification program to prevent duplicate generation across chats while keeping evidence isolated by program and subject.
---

# Producing Exam Key Cards

## Core Rule

**先選 Program，再鎖 Level/Track + Subject，再選 Batch；先 CLAIM，再產圖。**

Chat memory is never a production lock.

## Mandatory Read Order

1. `sources/registry/exam-programs.yaml`
2. `docs/MULTI_EXAM_FACTORY_ARCHITECTURE.md`
3. `docs/KEY_CARD_SUBJECT_ISOLATION_POLICY.md`
4. the selected program profile / source policies
5. `docs/KEY_CARD_IMAGE_PRODUCTION_PLAN.md`
6. `production/key-cards/batches.yaml`
7. `production/key-cards/registry.yaml`
8. the governed Master / topic record for the selected program and subject

## Program Isolation

Before selecting a card, resolve `programCode`.

Never mix:
- source IDs across programs;
- question frequency across programs;
- star calculations across programs;
- topic IDs without program context;
- Drive roots across programs.

## Subject Isolation

Every subject is treated as an independent examination unit unless the registered program explicitly defines otherwise.

Before selecting a production card, resolve:

- `programCode`;
- `levelOrTrack`;
- `subjectCode`.

Hard rules:

- one formal card belongs to exactly one subject;
- content, evidence, stars, labels, citations and traps must be validated against the current subject only;
- card-number sequences are independent per subject and start from `C-001`;
- changing subject resets the visible card-number sequence;
- visible `C-<nnn>` values may repeat across subjects;
- full production identity remains unique because the global key includes subject;
- claims, batches, QA state, completion counting and storage are subject-scoped;
- cross-subject related concepts may be referenced, but another subject's cards may not substitute for required content in the current subject;
- cross-subject evidence, frequency, star rating, citation or QA reuse is forbidden without destination-subject validation.

Formal subject QA gates inherit from `docs/KEY_CARD_SUBJECT_ISOLATION_POLICY.md`.

## Global Production Key

For all new production records use:

`<PROGRAM>-<TRACK_OR_LEVEL>-<SUBJECT>-<TOPIC_ID>-<CARD_NO>`

Existing iPAS legacy keys without `IPAS-` may remain as aliases, but new cross-program coordination uses `globalProductionKey`.

The visible card number is only unique inside its subject. The global production key is the cross-subject identity.

## Claim Protocol

1. Fetch the registry and current SHA.
2. Select one eligible record within the requested program, level/track, subject and ACTIVE batch.
3. Confirm the batch subject scope matches the selected card subject.
4. Confirm no active claim / QA-passed duplicate exists for the same global key and fingerprint.
5. Write a one-card CLAIM using the current SHA.
6. Only after claim success may generation begin.
7. If the write loses a SHA race, refetch and select again.

## Fingerprint

Fingerprint input must include:
- `programCode`;
- `levelOrTrack`;
- `subjectCode`;
- `globalProductionKey`;
- program-specific source / analysis snapshot;
- template / visual profile version;
- governed evidence fields;
- teaching content;
- mascot / visual role;
- approved visual revision key.

## Rendering

Use the selected program's visual profile.

Shared rendering rules may be inherited, but do not assume iPAS-specific mascot, labels, stars, footer format, or subject terminology unless the program profile explicitly inherits them.

Never render a card with a level/subject label that differs from the governed subject scope.

## Completion

Only program-and-subject-scoped `QA_PASSED` counts as complete.

Backup assets and samples never count as production completion.
