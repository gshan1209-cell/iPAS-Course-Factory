# iPAS Official Exam Source Governance v1.0

Status: ACTIVE  
Canonical discovery source: `https://ipd.nat.gov.tw/ipas/certification/AIAP/learning-resources`  
Applies to: initial + intermediate AI Application Planner key-card and question-bank workflows.

## 1. Purpose

Prevent source drift while allowing new official exams to:
- add new key cards,
- change computed exam-frequency weights,
- raise or lower star ratings,
- preserve every prior evidence snapshot and manual override.

GitHub is the control plane for manifests, policies, mappings, QA and change history.
Google Drive is the asset plane for mirrored official PDFs and generated teaching artifacts.

## 2. Source Priority

Use the repository-wide source priority from `AGENTS.md`:

- S0 — official exam / competency scope
- S1 — official learning guide
- S2 — official errata
- S3 — official announced exam questions
- S4 — official sample questions
- S5 — internal teaching supplements

Only **S3 actual announced exams** contribute directly to historical exam-frequency percentages.
S4 sample questions may create candidate cards or trend signals, but MUST NOT be mixed into the actual-exam denominator.

## 3. Canonical Discovery

The only canonical list used to discover new AI Application Planner exam papers is the official iPAS learning-resources page.

A Drive file, a third-party mirror, a search-engine result, or an internal spreadsheet is never sufficient evidence that the official list is complete.

## 4. Stable Source Identity

Every exam source gets an immutable `source_id`.

Identity is based on:
1. level,
2. subject,
3. year,
4. session,
5. official filename/version token.

If the official site replaces a file under the same human-readable title but the byte size or cryptographic hash changes:
- DO NOT overwrite history silently,
- mark the old record `SUPERSEDED`,
- create a new source version,
- retain both hashes and both retrieval records.

## 5. Drive Mirroring

Every verified official S3 PDF should be mirrored to Drive.

Mirror status is separate from source status:
- `ACTIVE` means the official source is current and valid.
- `MIRRORED` means the raw PDF is present in Drive.
- A temporarily missing Drive mirror does not erase or invalidate an official source record.

## 6. Question Identity and Mapping

Normalize every question using:

`question_uid = source_id + "-Q" + zero-padded question number`

Each question must map to:
- one `primary_competency_indicator`,
- zero or more `secondary_competency_indicators`,
- question type,
- mapping confidence,
- QA status.

A question is counted exactly once in the primary historical-frequency denominator.

## 7. Weight and Star Recalculation

Recalculation input:
- all `ACTIVE`,
- `include_in_weight = true`,
- S3 announced exams for the target level/subject.

Policy version: `STAR-v1.1`.

Default thresholds:
- 5 stars: >= 15%
- 4 stars: >= 10% and < 15%
- 3 stars: >= 6% and < 10%
- 2 stars: >= 3% and < 6%
- 1 star: < 3%

Every recalculation creates a new immutable `analysis_snapshot_id`.

Do not overwrite the prior snapshot.

## 8. Flexible Overrides Without Losing Evidence

For star ratings:
- `computed_star`: generated from the active exam corpus
- `override_star`: optional human-reviewed adjustment
- `override_reason`: mandatory when override exists
- `effective_star`: override if present, otherwise computed

For card count:
- `computed_card_count`
- `override_card_count`
- `override_reason`
- `effective_card_count`

The approved 19-column Key Card Master Index remains stable. Override/evidence fields live in sidecar policy/change-log data and the effective value is published back to the Master Index.

## 9. New Topics

When a new official exam introduces a topic not represented by the current card taxonomy:
1. create a candidate topic/card ID,
2. map it to an S0 competency indicator if possible,
3. mark `NEW_TOPIC_REVIEW`,
4. do not force it into an unrelated legacy card,
5. after QA, either add a new card or extend an existing card,
6. record the decision in the change log.

This prevents low-sample new topics from disappearing merely because their first historical frequency is small.

## 10. Change Log

Record at least:
- `change_id`
- date
- source or analysis snapshot
- subject
- card/topic ID
- change type
- old value
- new value
- reason
- evidence
- QA status
- operator

Allowed change types include:
- `SOURCE_ADDED`
- `SOURCE_SUPERSEDED`
- `TOPIC_ADDED`
- `STAR_UP`
- `STAR_DOWN`
- `STAR_OVERRIDE`
- `CARD_COUNT_UP`
- `CARD_COUNT_DOWN`
- `MAPPING_CHANGED`

## 11. Update Gate

Workflow:

`DISCOVER -> IDENTIFY -> VERIFY -> MIRROR -> EXTRACT -> MAP -> RECALC -> OVERRIDE -> DIFF -> PUBLISH`

A new official PDF must not drive formal card production until mapping QA is complete.

## 12. Current Baseline (2026-08-20)

Official iPAS page currently lists:
- Initial: 6 announced exam PDFs
- Intermediate: 6 announced exam PDFs
- Total: 12 announced exam PDFs

The official page also advertises the next intermediate exam for 2026-11-14, so the registry is expected to grow.

The machine-readable baseline is maintained in:
`sources/registry/ipas-official-exams.yaml`.
