# Key-Card Image Production Plan

Status: ACTIVE  
Effective: 2026-08-20  
Template baseline: `KCT-v3.4`

## Goal

Allow iPAS key-card images to be produced from multiple ChatGPT conversations without generating the same card twice.

The coordination source of truth is GitHub, not chat memory.

## Core Principle

**先登記、再產圖；先鎖卡、再生成。**

No conversation may generate a production key-card image until it has successfully claimed that card in:

`production/key-cards/registry.yaml`

Logical batches are coordinated through:

`production/key-cards/batches.yaml`

A batch is a progress/packaging unit only. It does not reserve all cards in the batch.

## Unique Production Key

Each production card has exactly one stable key:

`<LEVEL>-<SUBJECT>-<ATOMIC_TOPIC_ID>-<CARD_NO>`

Examples:

- `JR-S1-I1-01-C001`
- `JR-S2-I2-04-C017`
- `MID-S3-M3-06-C023`

The key must not be derived from the chat title or generated image filename.

## Cross-Chat Workflow

Every conversation that produces cards must follow this sequence:

1. Read `sources/registry/key-card-template-policy.yaml`.
2. Read `production/key-cards/batches.yaml` and identify the current ACTIVE batch.
3. Read `production/key-cards/registry.yaml` and remember its current GitHub blob SHA.
4. Resolve the next eligible card from the governed Master / atomic-topic data layer using the ACTIVE batch scope.
5. Build the card's `productionKey`.
6. Check the registry:
   - `QA_PASSED` + same fingerprint -> skip; never regenerate.
   - active `CLAIMED` -> skip; another conversation owns it.
   - `RENDERED` / `VISUAL_READY` -> resume the existing work; do not start a second copy.
   - `REVISION_REQUIRED` or `STALE_REGEN_REQUIRED` -> a new revision is allowed.
   - no record / `PLANNED` / `SAMPLE_ONLY` -> attempt claim when production is needed.
7. Claim one card by updating the registry using the current blob SHA and record the ACTIVE `batchId`.
8. If the GitHub update fails because the SHA is stale, another conversation changed the registry first. Re-fetch and choose again. Never generate before the claim succeeds.
9. Produce only the claimed card.
10. Upload the final artifact to the proper Drive `04_重點卡` location.
11. Write Drive ID, fingerprint, artifact revision, timestamps and QA state back to the registry.
12. Add the production key to the batch's QA-passed list only after final QA passes.
13. A card counts as complete only at `QA_PASSED`.

## Batch Plan

Default logical batch size is 10 cards.

Current first batch:

- `KC-JR-S1-B001`
- scope: `初級-科目一`
- target: 10 QA-passed production cards
- selection: dynamically read from the latest governed Master / atomic-topic data, highest governed priority first

Do not pre-fill future batches from chat memory. When an active batch finishes, reconcile the latest Master and registry, then create the next batch.

## Claim / Lease Rule

Claim granularity is one card.

Default claim lease: 60 minutes.

A claim contains:

- `claimToken`
- `claimedAt`
- `leaseUntil`
- `claimedBy`
- `batchId`

If the lease is still active, another conversation must not take the card.

If the lease expires, another conversation may reclaim it after first re-reading the registry. The old claim remains in `claimHistory` for auditability.

Do not pre-claim an entire batch. Claim the next card immediately before producing it. This keeps multiple chats parallel without blocking ten cards at once.

## Render Fingerprint

Duplicate prevention uses a deterministic `renderFingerprint`.

Compute SHA-256 from canonical JSON containing:

- `productionKey`
- current template policy version
- source / analysis snapshot ID
- all locked evidence fields
- governed card title and teaching body
- life example
- traps
- memory phrase
- related concepts
- mascot theme-role identifier
- explicit visual revision key, only when a deliberate alternate version was approved

Do not include random image-generation seed values in the default fingerprint.

### Duplicate decision

- same `productionKey` + same `renderFingerprint` + `QA_PASSED` -> **SKIP**
- same key + same fingerprint + `RENDERED` -> resume QA; **do not redraw**
- same key + changed fingerprint because governed source/template/content changed -> `STALE_REGEN_REQUIRED`
- same key + user explicitly approved a design revision -> increment artifact revision and regenerate

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

`SAMPLE_ONLY` is never treated as a completed production card.

## Artifact Naming

Final card filename:

`<級別>_<科目>_<CARD_NO>_<ATOMIC_TOPIC_ID>_<短主題>_v<artifactRevision>.png`

Example:

`初級_科目一_C-001_I1-01_AI的定義與分類_v1.0.png`

The registry key, not the filename, is the primary duplicate-prevention identity.

## Production Priority

When the user does not name a specific card, select the next candidate in this order:

1. current ACTIVE batch scope;
2. governed production priority / star order;
3. card number / atomic-topic order;
4. exclude `QA_PASSED`;
5. exclude cards with an active claim;
6. resume unfinished existing work before starting new work when practical.

Do not infer a new card list from chat memory. Read the current governed Master / atomic-topic data layer.

## Evidence and Visual Rules

The following remain mandatory:

- `EVIDENCE_TEXT_LOCKED = true`
- `MASCOT_IDENTITY_LOCKED = true`
- card category is icon-only
- applicable exam labels remain visible
- 小芯 stays in the upper-right visual zone and may vary pose / outfit / props by topic under identity lock
- width stays 1024 px
- use dynamic height instead of shrinking typography
- evidence text is deterministic and never authored by image generation

## Revision Rules

A new image is not a duplicate when there is an explicit reason recorded as one of:

- `SOURCE_CHANGED`
- `TEMPLATE_CHANGED`
- `CONTENT_CORRECTION`
- `QA_REJECTED`
- `USER_APPROVED_REDESIGN`
- `MASCOT_IDENTITY_FIX`
- `EVIDENCE_TEXT_FIX`

Every new revision must include `supersedes` pointing to the prior artifact revision.

## Cross-Chat Safety Rule

A new conversation must never assume that the previous conversation finished or stopped.

Before saying `繼續產圖`, it must read both the batch queue and registry and decide from current state.

If a user opens several chats at the same time, GitHub SHA-based optimistic concurrency is the collision guard: only one claim update against the same registry SHA can win. A losing conversation must re-fetch and claim another card.

## Completion Accounting

Production dashboard counts are derived from registry and batch states:

- active batch target
- claimed now
- rendered awaiting QA
- QA passed
- revision required
- stale regeneration required

Never calculate completion from Drive image count alone.
