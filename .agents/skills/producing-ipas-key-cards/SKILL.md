---
name: producing-ipas-key-cards
description: Use whenever producing, continuing, revising, or batch-generating iPAS key-card images, especially across multiple ChatGPT conversations. Prevents duplicate production through the GitHub registry claim workflow.
---

# Producing iPAS Key-Card Images

## Purpose

Produce iPAS key-card images safely across multiple conversations without duplicate generation.

## Mandatory Read Order

Before generating any production card, read:

1. `sources/registry/key-card-template-policy.yaml`
2. `docs/KEY_CARD_IMAGE_PRODUCTION_PLAN.md`
3. `production/key-cards/registry.yaml`
4. the current governed Master / atomic-topic record for the candidate card

Also honor:

- `docs/KEY_CARD_DETERMINISTIC_TEXT_POLICY.md`
- `docs/KEY_CARD_MASCOT_POLICY.md`
- `docs/KEY_CARD_DYNAMIC_HEIGHT_POLICY.md`

## Hard Rule

**Never call image generation for a production card before a successful registry CLAIM.**

Chat memory is not a production lock.

## Card Selection

If the user names a card, use that card.

If the user says only `繼續`, `下一張`, `產生第一批`, or similar:

1. read the current Master / atomic-topic data layer;
2. read the current production registry;
3. exclude `QA_PASSED` cards;
4. exclude cards with an unexpired `CLAIMED` lease;
5. prefer resuming existing `VISUAL_READY`, `RENDERED`, `REVISION_REQUIRED`, or `STALE_REGEN_REQUIRED` work when appropriate;
6. otherwise choose the next governed priority card.

Do not choose the next card from memory alone.

## Production Key

Build exactly one stable key per card:

`<LEVEL>-<SUBJECT>-<ATOMIC_TOPIC_ID>-<CARD_NO>`

Example: `JR-S1-I1-01-C001`.

## Claim Protocol

1. Fetch `production/key-cards/registry.yaml` and retain its current blob SHA.
2. Confirm the card is eligible.
3. Create a claim token such as `20260820T111500+0800_a1b2c3d4`.
4. Set card state to `CLAIMED` with:
   - `claimToken`
   - `claimedAt`
   - `leaseUntil` (default +60 minutes)
   - `claimedBy: chatgpt-session`
5. Update the registry using the fetched SHA.
6. Only after the update succeeds may image production start.
7. If the update fails because the SHA is stale, re-fetch the registry. Another conversation may have claimed or completed the card. Never generate from the stale plan.

Claims are one-card-at-a-time. Do not reserve a whole 10-card batch.

## Duplicate Check

Before generating, inspect state and fingerprint:

- `QA_PASSED` + same fingerprint -> SKIP and select another card.
- active `CLAIMED` -> SKIP; another session owns it.
- `VISUAL_READY` / `RENDERED` -> resume existing asset/QA instead of redrawing.
- `SAMPLE_ONLY` -> sample does not count as completed production; final deterministic render may proceed after claim.
- `REVISION_REQUIRED` / `STALE_REGEN_REQUIRED` -> regeneration is allowed with recorded reason and new artifact revision.

## Render Fingerprint

Compute SHA-256 from canonical sorted-key JSON containing:

- production key
- current KCT version
- source / analysis snapshot
- locked evidence fields
- governed teaching content
- life example
- traps
- memory phrase
- related concepts
- mascot theme role
- explicit visual revision key, only when a deliberate alternate version was approved

Do not include random image seeds.

## Rendering Architecture

Use the KCT hybrid pipeline:

1. generate/select non-text visual assets;
2. keep 小芯 identity-locked while allowing topic-aware pose/outfit/props;
3. compose the fixed card layout;
4. inject evidence fields through deterministic text layers;
5. do not let image generation author locked evidence text;
6. use dynamic height rather than shrinking typography.

## Evidence Locks

Final card must have exact governed values for:

- level/subject
- section title
- atomic topic title
- star rating
- card number
- category icon
- applicable exam labels
- guide topic
- question references
- source footer

If any required locked value is missing, block production instead of guessing.

## Completion Protocol

After rendering:

1. upload the final PNG to the proper Drive `04_重點卡` location;
2. record exact Drive file ID in the registry;
3. record `renderFingerprint` and `artifactRevision`;
4. run both QA gates:
   - `EVIDENCE_TEXT_LOCKED`
   - `MASCOT_IDENTITY_LOCKED`
5. set `QA_PASSED` only if both pass;
6. otherwise set `REVISION_REQUIRED` with a reason.

Only `QA_PASSED` counts as production complete.

## Revision

A redraw requires one recorded reason:

- SOURCE_CHANGED
- TEMPLATE_CHANGED
- CONTENT_CORRECTION
- QA_REJECTED
- USER_APPROVED_REDESIGN
- MASCOT_IDENTITY_FIX
- EVIDENCE_TEXT_FIX

Increment artifact revision and record `supersedes`.

## Cross-Chat Rule

Every new conversation must re-read the registry immediately before selecting or claiming a card. Never rely on what another conversation was expected to do.
