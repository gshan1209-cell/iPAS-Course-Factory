---
name: producing-ipas-key-cards
description: iPAS-specific adapter for the generic multi-exam key-card production workflow. Use whenever producing, continuing, revising, or batch-generating iPAS key-card images.
---

# Producing iPAS Key-Card Images

## Program Binding

This skill is the `IPAS` adapter for the shared exam-card production core.

Before production, read and follow:

1. `.agents/skills/producing-exam-key-cards/SKILL.md`
2. `sources/registry/exam-programs.yaml`
3. `docs/MULTI_EXAM_FACTORY_ARCHITECTURE.md`
4. `sources/registry/key-card-template-policy.yaml`
5. `docs/KEY_CARD_IMAGE_PRODUCTION_PLAN.md`
6. `production/key-cards/batches.yaml`
7. `production/key-cards/registry.yaml`
8. the current governed iPAS Master / atomic-topic record

Also honor:

- `docs/KEY_CARD_DETERMINISTIC_TEXT_POLICY.md`
- `docs/KEY_CARD_MASCOT_POLICY.md`
- `docs/KEY_CARD_DYNAMIC_HEIGHT_POLICY.md`

When the deterministic-text document conflicts with the older rendering subsection inside `KCT-v3.4`, the current `docs/KEY_CARD_DETERMINISTIC_TEXT_POLICY.md` rendering rule takes precedence.

## Fixed Program Context

- `programCode: IPAS`
- current visual profile: `KCT-v3.4`
- current mascot profile: `XIAOXIN-v1`
- existing Drive root remains the iPAS program root

Do not read evidence from another exam program when producing an iPAS card.

## Production Identity

Existing legacy key:

`<LEVEL>-<SUBJECT>-<ATOMIC_TOPIC_ID>-<CARD_NO>`

Example:

`JR-S1-I1-01-C001`

Global key for cross-program coordination:

`IPAS-<LEVEL>-<SUBJECT>-<ATOMIC_TOPIC_ID>-<CARD_NO>`

Example:

`IPAS-JR-S1-I1-01-C001`

Existing legacy keys remain aliases. New cross-program duplicate checks use `globalProductionKey`.

## Hard Rule

**Never call image generation for a production card before a successful one-card registry CLAIM.**

Chat memory is not a production lock.

## Card Selection

If the user names a card, use that iPAS card if eligible.

If the user says `繼續`, `下一張`, or similar:

1. resolve `programCode = IPAS`;
2. read the ACTIVE IPAS batch;
3. read current iPAS Master / atomic-topic data;
4. read production registry;
5. exclude IPAS `QA_PASSED` cards;
6. exclude IPAS cards with active claims;
7. resume unfinished IPAS work when appropriate;
8. otherwise choose the next governed iPAS priority card.

Never select from another program's batch or data.

## Claim Protocol

1. Fetch the registry and retain current blob SHA.
2. Confirm the candidate has `programCode: IPAS`.
3. Confirm the global key is eligible in the current IPAS batch.
4. Write a one-card CLAIM including `programCode`, `globalProductionKey`, claim token, timestamps and batch ID.
5. Only after the write succeeds may production begin.
6. On stale SHA, refetch; do not continue from stale state.

## Duplicate Check

- same IPAS global key + same fingerprint + `QA_PASSED` -> SKIP
- active `CLAIMED` -> SKIP
- `VISUAL_READY` / `RENDERED` -> resume, do not redraw unless the current revision is under explicit visual review
- `SAMPLE_ONLY` -> does not count as final production
- `REVISION_REQUIRED` / `STALE_REGEN_REQUIRED` -> redraw allowed with revision reason

## iPAS Rendering Profile

Continue to enforce:

- KCT-v3.4 canonical template / sample structure
- **card body is image-generated** from the governed content and evidence constraints
- **only the bottom source citation is deterministic text**
- category icon only
- applicable exam labels visible
- 小芯 identity lock with topic-aware pose / outfit / props
- upper-right mascot visual zone
- 1024 px fixed width
- dynamic height instead of shrinking typography
- exact source footer from governed iPAS data, overlaid after image generation

The following body values still come from the governed data layer and must be visually checked after generation:

- level / subject
- section title
- topic title
- star count
- card number
- category icon
- applicable exam labels

Do not programmatically overwrite these body fields with text. Regenerate the image when they are visibly wrong.

Final iPAS card QA requires:

- `EVIDENCE_TEXT_LOCKED = true` — exact deterministic bottom source footer
- `VISUAL_EVIDENCE_MATCHED = true` — body evidence visually matches governed data
- `MASCOT_IDENTITY_LOCKED = true`
- canonical sample structure match

## Completion

Upload final images only to the correct iPAS Drive program / subject location.

Write `programCode: IPAS`, `globalProductionKey`, Drive ID, fingerprint, revision and QA state back to the registry.

Only IPAS-scoped `QA_PASSED` counts toward the IPAS batch.
