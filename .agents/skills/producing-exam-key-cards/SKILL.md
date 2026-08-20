---
name: producing-exam-key-cards
description: Generic cross-program key-card production skill. Use for any registered exam or certification program to prevent duplicate generation across chats while keeping evidence isolated by program.
---

# Producing Exam Key Cards

## Core Rule

**先選 Program，再選 Batch；先 CLAIM，再產圖。**

Chat memory is never a production lock.

## Mandatory Read Order

1. `sources/registry/exam-programs.yaml`
2. `docs/MULTI_EXAM_FACTORY_ARCHITECTURE.md`
3. the selected program profile / source policies
4. `docs/KEY_CARD_IMAGE_PRODUCTION_PLAN.md`
5. `production/key-cards/batches.yaml`
6. `production/key-cards/registry.yaml`
7. the governed Master / topic record for the selected program

## Program Isolation

Before selecting a card, resolve `programCode`.

Never mix:
- source IDs across programs;
- question frequency across programs;
- star calculations across programs;
- topic IDs without program context;
- Drive roots across programs.

## Global Production Key

For all new production records use:

`<PROGRAM>-<TRACK_OR_LEVEL>-<SUBJECT>-<TOPIC_ID>-<CARD_NO>`

Existing iPAS legacy keys without `IPAS-` may remain as aliases, but new cross-program coordination uses `globalProductionKey`.

## Claim Protocol

1. Fetch the registry and current SHA.
2. Select one eligible record within the requested program and ACTIVE batch.
3. Confirm no active claim / QA-passed duplicate exists for the same global key and fingerprint.
4. Write a one-card CLAIM using the current SHA.
5. Only after claim success may generation begin.
6. If the write loses a SHA race, refetch and select again.

## Fingerprint

Fingerprint input must include:
- `programCode`;
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

## Completion

Only program-scoped `QA_PASSED` counts as complete.

Backup assets and samples never count as production completion.
