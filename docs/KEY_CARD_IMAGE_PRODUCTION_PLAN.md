# Key-Card Image Production Plan

Status: ACTIVE  
Effective: 2026-08-20  
Architecture: Multi-Exam / Program-Aware

## Goal

Allow key-card images for multiple exams / certifications to be produced from multiple ChatGPT conversations without duplicate generation or cross-program evidence contamination.

The coordination source of truth is GitHub, not chat memory.

Program registry:

`sources/registry/exam-programs.yaml`

Production registry:

`production/key-cards/registry.yaml`

Batch queue:

`production/key-cards/batches.yaml`

## Core Principle

**先選 Program，再選 Batch；先登記、再產圖；先鎖卡、再生成。**

No conversation may generate a production key-card image until the target program is resolved and that card has been successfully claimed in the production registry.

## Program Isolation

Every production run must resolve `programCode` first.

Hard rules:

- source evidence may not cross program boundaries;
- question frequency / star calculations may not cross program boundaries;
- Drive roots must be program-specific;
- topic / subject codes must be interpreted inside the selected program profile;
- visual defaults may be inherited, but semantic assumptions may not.

Current registered programs:

- `IPAS` — ACTIVE
- `POSTAL` — PLANNED; production blocked until official-source onboarding gates pass

## Global Production Key

Every new production card has a globally unique key:

`<PROGRAM>-<TRACK_OR_LEVEL>-<SUBJECT>-<TOPIC_ID>-<CARD_NO>`

Examples:

- `IPAS-JR-S1-I1-01-C001`
- `IPAS-MID-S3-M3-06-C023`
- future Postal keys start with `POSTAL-`

Existing iPAS legacy keys such as `JR-S1-I1-01-C001` remain readable aliases and must not be mass-rewritten solely for migration.

The global key, not chat title or filename, is the duplicate-prevention identity.

## Cross-Chat Workflow

Every conversation that produces cards must follow this sequence:

1. Read `sources/registry/exam-programs.yaml`.
2. Resolve the requested `programCode`.
3. Read the selected program's source / taxonomy / visual policies.
4. Read `production/key-cards/batches.yaml` and identify the ACTIVE batch for that program.
5. Read `production/key-cards/registry.yaml` and retain the current GitHub blob SHA.
6. Resolve the next eligible card from the selected program's governed Master / topic data.
7. Build `globalProductionKey`.
8. Check the registry:
   - `QA_PASSED` + same fingerprint -> skip; never regenerate.
   - active `CLAIMED` -> skip; another conversation owns it.
   - `RENDERED` / `VISUAL_READY` -> resume existing work; do not duplicate.
   - `REVISION_REQUIRED` / `STALE_REGEN_REQUIRED` -> new revision allowed.
   - no record / `PLANNED` / `SAMPLE_ONLY` -> attempt claim when production is allowed.
9. Claim exactly one card using the current registry SHA and record `programCode` + batch ID.
10. If the update loses a SHA race, re-fetch and choose again. Never generate before claim success.
11. Produce only the claimed card.
12. Upload the final artifact to that program's correct Drive location.
13. Write Drive ID, fingerprint, artifact revision, timestamps, program code and QA state back to the registry.
14. Add the global production key to the program batch's QA-passed list only after final QA passes.
15. A card counts as complete only at `QA_PASSED`.

## Batch Plan

Default logical batch size is 10 cards unless the program profile overrides it.

Current iPAS batch:

- legacy batch: `KC-JR-S1-B001`
- global batch: `IPAS-KC-JR-S1-B001`
- program: `IPAS`
- scope: `初級-科目一`
- target: 10 QA-passed cards

Postal batches must not be created until the Postal program profile passes its source / subject / taxonomy / storage readiness gates.

A batch is a progress / packaging unit only. It does not reserve all cards in the batch.

## Claim / Lease Rule

Claim granularity is one card.

Default claim lease: 60 minutes.

A claim contains:

- `programCode`
- `globalProductionKey`
- `claimToken`
- `claimedAt`
- `leaseUntil`
- `claimedBy`
- `batchId`

If the lease is active, another conversation must not take the card.

If the lease expires, another conversation may reclaim it only after re-reading the registry. Keep claim history for auditability.

Do not pre-claim an entire batch.

## Render Fingerprint

Duplicate prevention uses deterministic SHA-256 over canonical sorted-key JSON.

Fingerprint inputs must include:

- `programCode`
- `globalProductionKey`
- selected program visual / template profile version
- program-specific source / analysis snapshot ID
- all locked evidence fields
- governed teaching content
- life example
- traps
- memory phrase
- related concepts
- mascot / visual theme-role identifier
- explicit visual revision key when a deliberate alternate version was approved

Do not include:

- random image seed
- chat title
- conversation memory

### Duplicate decision

- same global key + same fingerprint + `QA_PASSED` -> **SKIP**
- same global key + same fingerprint + `RENDERED` -> resume QA; **do not redraw**
- same global key + changed fingerprint because governed source / profile / content changed -> `STALE_REGEN_REQUIRED`
- same global key + explicit approved redesign -> increment artifact revision and regenerate

## Allowed States

- `PLANNED`
- `CLAIMED`
- `VISUAL_READY`
- `RENDERED`
- `QA_PASSED`
- `REVISION_REQUIRED`
- `STALE_REGEN_REQUIRED`
- `SUPERSEDED`
- `SAMPLE_ONLY`

Only `QA_PASSED` is production complete.

## Artifact Naming

Recommended global filename:

`<PROGRAM>_<級別或類組>_<科目>_<CARD_NO>_<TOPIC_ID>_<短主題>_v<artifactRevision>.png`

Existing iPAS legacy filename conventions remain accepted for historical compatibility.

## Program Visual Profiles

The shared core provides rendering mechanics, not one universal brand.

For iPAS, continue to use the approved iPAS profile including KCT, deterministic evidence text, dynamic height and 小芯 rules.

For future programs such as Postal, visual identity may:

- inherit iPAS-like card mechanics;
- reuse generic layout concepts;
- approve a different mascot;
- approve a different color / label / citation profile;
- omit mascot entirely if the program profile chooses.

Do not silently assume that iPAS-specific visual rules are universal.

## Revision Rules

A new image is not a duplicate when a recorded reason exists:

- `SOURCE_CHANGED`
- `TEMPLATE_CHANGED`
- `CONTENT_CORRECTION`
- `QA_REJECTED`
- `USER_APPROVED_REDESIGN`
- `MASCOT_IDENTITY_FIX`
- `EVIDENCE_TEXT_FIX`
- `PROGRAM_PROFILE_CHANGED`

Every new revision must include `supersedes`.

## Cross-Chat Safety Rule

A new conversation must never assume another conversation finished or stopped.

Before `繼續產圖`, it must read:

1. program registry;
2. program-scoped batch queue;
3. production registry;
4. current governed data for that program.

GitHub SHA optimistic concurrency remains the collision guard.

## Completion Accounting

Completion dashboards are always program-scoped first, then optionally aggregated globally.

Per-program metrics:

- total planned
- active batch target
- claimed now
- rendered awaiting QA
- QA passed
- revision required
- stale regeneration required

Never calculate completion from Drive image count alone.
Never merge completion metrics from different programs without preserving program labels.
