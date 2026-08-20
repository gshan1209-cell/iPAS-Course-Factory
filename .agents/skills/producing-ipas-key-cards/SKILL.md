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
4. `docs/KEY_CARD_SUBJECT_ISOLATION_POLICY.md`
5. `sources/registry/key-card-template-policy.yaml`
6. `sources/registry/key-card-weight-policy.yaml`
7. `sources/registry/key-card-citation-policy.yaml`
8. `docs/KEY_CARD_IMAGE_PRODUCTION_PLAN.md`
9. `production/key-cards/batches.yaml`
10. `production/key-cards/registry.yaml`
11. the current governed iPAS Master / atomic-topic record for the selected subject

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

## Single-Subject Examination Isolation

**重點卡必須以「單科獨立考試」為前提，做到科目獨立、編號獨立、內容獨立、QA 獨立、存放獨立，不得跨科混淆。**

For iPAS, every subject is an independent examination unit.

Before card selection, lock all three dimensions:

- `programCode = IPAS`
- `levelCode = JR | MID`
- `subjectCode = S1 | S2 | S3` as applicable to the selected level

Hard rules:

- one formal card belongs to exactly one iPAS subject;
- a card for one subject must not depend on another subject's card to be exam-complete;
- subject content must come from that subject's governed Master / atomic-topic record;
- historical question mapping, star rating, exam labels, source footer and traps must be validated using the current subject only;
- cross-subject related concepts may be shown only as related references, never as a substitute for current-subject teaching content;
- batches are subject-scoped and must not mix subjects;
- registry states, claims and completion counts are subject-scoped;
- Drive storage is subject-scoped;
- subject mismatch is a hard QA failure.

Required subject QA gates:

- `SUBJECT_SCOPE_LOCKED = true`
- `CARD_NUMBER_SCOPE_PER_SUBJECT = true`
- `CONTENT_SUBJECT_MATCHED = true`
- `EVIDENCE_SUBJECT_MATCHED = true`
- `QA_SUBJECT_SCOPED = true`
- `DRIVE_SUBJECT_MATCHED = true`

## Production Identity

Existing legacy key:

`<LEVEL>-<SUBJECT>-<ATOMIC_TOPIC_ID>-<CARD_NO>`

Example:

`JR-S1-I1-01-C001`

Global key for cross-program and cross-subject coordination:

`IPAS-<LEVEL>-<SUBJECT>-<ATOMIC_TOPIC_ID>-<CARD_NO>`

Example:

`IPAS-JR-S1-I1-01-C001`

Existing legacy keys remain aliases. New cross-program duplicate checks use `globalProductionKey`.

### Per-Subject Card Numbering

Visible card numbers are independent for each subject.

- every subject starts from `C-001`;
- numbering continues only inside the same subject;
- changing subject resets the visible sequence to `C-001`;
- the same visible number may exist in different subjects;
- do not continue `C-031`, `C-041`, or any other visible sequence from another subject;
- full uniqueness comes from the global production key, which includes level and subject.

Examples:

- `IPAS-JR-S1-I1-01-C001`
- `IPAS-JR-S2-I2-01-C001`

Both may display `C-001` because they belong to different subjects.

Default filename:

`C-<nnn>_<主題名稱>.png`

The file must be stored under the correct level / subject folder so repeated visible numbers cannot be confused.

## Hard Rule

**Never call image generation for a production card before a successful one-card registry CLAIM.**

Chat memory is not a production lock.

## Card Selection

If the user names a card, use that iPAS card if eligible **inside the locked subject scope**.

If the user says `繼續`, `下一張`, or similar:

1. resolve `programCode = IPAS`;
2. resolve and lock the requested iPAS level + subject;
3. read the ACTIVE IPAS batch for that subject;
4. read current iPAS Master / atomic-topic data for that subject;
5. read production registry;
6. exclude IPAS `QA_PASSED` cards in that subject;
7. exclude IPAS cards with active claims in that subject;
8. resume unfinished IPAS work in that subject when appropriate;
9. otherwise choose the next governed iPAS priority card in that subject.

Never select from another program's batch, another iPAS subject, or another subject's Master data.

## Claim Protocol

1. Fetch the registry and retain current blob SHA.
2. Confirm the candidate has `programCode: IPAS`.
3. Confirm level + subject match the locked subject scope.
4. Confirm the global key is eligible in the current subject-scoped IPAS batch.
5. Write a one-card CLAIM including `programCode`, `globalProductionKey`, level, subject, claim token, timestamps and batch ID.
6. Only after the write succeeds may production begin.
7. On stale SHA, refetch; do not continue from stale state.

## Duplicate Check

- same IPAS global key + same fingerprint + `QA_PASSED` -> SKIP
- active `CLAIMED` -> SKIP
- `VISUAL_READY` / `RENDERED` -> resume, do not redraw unless the current revision is under explicit visual review
- `SAMPLE_ONLY` -> does not count as final production
- `REVISION_REQUIRED` / `STALE_REGEN_REQUIRED` -> redraw allowed with revision reason
- same visible `C-<nnn>` in another subject -> **not a duplicate**, because numbering is per subject

## Star / Exam-Frequency Semantics

Formal definition:

**星級是依歷屆公告試題之出題比例換算出的考試優先度，可作為出題率高低的簡化參考，但不等同於精確出題百分比。**

Production rules:

- valid star range is `1..5` only;
- the header has exactly `5` star slots, never 6;
- filled stars show the governed effective star rating;
- star rating is the only exam-priority visual on the card;
- exact historical hit count and exact exam-rate percentage remain in the data layer and are not displayed on the card;
- `必考 / 易錯 / 重複出題 / 新興考點` are exam-trait labels and must not replace or alter the star rating;
- a star rating may be used as a rough exam-frequency reference band, but must never be described as an exact percentage;
- when announced-exam data changes, use the current governed snapshot and recompute according to `sources/registry/key-card-weight-policy.yaml`;
- within one snapshot, `computedStar` must not drift;
- star frequency must never mix questions from another subject;
- when atomic QMAP is still pending, never claim that a parent frequency or parent star is the atomic topic's exact frequency or computed atomic star. Parent priority may be used only as a governed priority reference when policy allows it.

Current parent-level ratio bands:

- `★★★★★` = `>=15%`
- `★★★★` = `10% to <15%`
- `★★★` = `6% to <10%`
- `★★` = `3% to <6%`
- `★` = `<3%`

QA must fail when:

- more than five star slots are visible;
- fewer or more than exactly five header star positions are rendered;
- filled star count does not match the governed effective star value;
- a precise exam-rate percentage appears on the card face;
- star meaning is replaced by an auxiliary label;
- star evidence includes another subject's questions;
- an atomic topic is presented with an exact frequency/star not supported by atomic QMAP or an explicit governed override.

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

A wrong subject label is a hard failure; never repair a cross-subject card merely by renaming the file.

## iPAS Source Footer Contract

The bottom deterministic footer must use the compact session-only format:

`指引:「<主題名稱>」；考題:<年份-梯次>、<年份-梯次>…`

Rules:

- display only exam sessions that contain at least one mapped question for the current subject and current card;
- deduplicate repeated sessions;
- keep sessions in chronological order;
- do not display `Q<nn>` question numbers;
- do not display question counts;
- do not repeat level / subject after `考題:`;
- do not display exam-rate percentages;
- do not import citation sessions from another subject;
- retain exact question numbers, level / subject and full audit evidence in the data layer only.

Examples:

- `指引:「AI 的定義與分類」；考題:115-1、115-2`
- `指引:「機器學習基本原理」；考題:114-4、115-1、115-2`

Final iPAS card QA requires:

- `SUBJECT_SCOPE_LOCKED = true`
- `CARD_NUMBER_SCOPE_PER_SUBJECT = true`
- `CONTENT_SUBJECT_MATCHED = true`
- `EVIDENCE_SUBJECT_MATCHED = true`
- `QA_SUBJECT_SCOPED = true`
- `DRIVE_SUBJECT_MATCHED = true`
- `EVIDENCE_TEXT_LOCKED = true` — exact deterministic bottom source footer
- `VISUAL_EVIDENCE_MATCHED = true` — body evidence visually matches governed data
- `MASCOT_IDENTITY_LOCKED = true`
- `STAR_SLOT_COUNT_EXACTLY_FIVE = true`
- `EXAM_RATE_HIDDEN = true`
- `SOURCE_FOOTER_SESSION_ONLY = true`
- canonical sample structure match

QA must fail if the subject scope mismatches, the visible card number continues from another subject, the footer contains another subject's evidence, or the footer contains any question number, question count, duplicate session, unsupported session, or level/subject text after `考題:`.

## Completion

Upload final images only to the correct iPAS Drive program / level / subject location.

Write `programCode: IPAS`, level, subject, `globalProductionKey`, Drive ID, fingerprint, revision and QA state back to the registry.

Only IPAS-and-subject-scoped `QA_PASSED` counts toward that subject's batch.

Do not aggregate subjects until each subject's metrics remain separately identifiable.
