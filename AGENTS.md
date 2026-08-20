# AGENTS.md

## Mission

iPAS-Course-Factory is a semi-automated course-production control plane. Its job is to convert governed source material into traceable, reviewable, reproducible learning artifacts.

## Source of Truth

- GitHub is canonical for schemas, manifests, workflow state, templates, QA rules, and governance.
- Google Drive is the asset plane for official source files and generated course artifacts.
- Never infer completion from Drive file presence alone; completion is declared by the unit manifest and gate state.

## Source Governance

Source priority is fixed:

1. S0 — official exam scope / competency scope
2. S1 — official learning guide
3. S2 — official errata
4. S3 — official announced exam questions
5. S4 — official sample questions
6. S5 — internal teaching supplements

Rules:
- S0-S4 outrank S5.
- Errata must override the affected older source content.
- Do not silently correct, reconcile, or extend official source material with general knowledge.
- If the source does not support a teaching claim, mark it as supplemental or omit it.
- Every source-bound artifact must be traceable to source IDs recorded in the unit manifest.

## Project Skills

When manually checking, importing, synchronizing, or recalculating iPAS official announced exams, official PDF archives, question mappings, key-card weights, or star ratings, read and follow:

- `.agents/skills/updating-ipas-official-exams/SKILL.md`

The skill is authoritative for the manual update workflow and its completion gates. Do not claim the iPAS source set is fully current unless the skill's OFFICIAL_CURRENT, MIRROR_COMPLETE, ANALYSIS_CURRENT, and KEYCARD_CURRENT gates are all satisfied.

## Key-Card Label Contract

All junior and intermediate key-point cards, Master Index files, card templates, and QA flows must follow:

- `docs/KEY_CARD_LABEL_SYSTEM.md`
- `sources/registry/key-card-label-policy.yaml`
- `sources/registry/key-card-weight-policy.yaml`

Keep these dimensions separate:
- star rating / exam ratio = exam priority only;
- category label = learning and memory mode only;
- auxiliary label = exam trait only.

The approved category mapping is fixed: 概念卡→💡核心概念/CONCEPT, 比較卡→⚖️差異比較/COMPARE, 流程卡→🔄流程必背/FLOW, 陷阱卡→⚠️考題陷阱/TRAP, 公式卡→🧮公式計算/FORMULA, 情境卡→🎯情境判斷/CASE, 真題卡→📝歷屆真題/EXAM, 總整理卡→🧠考前速讀/REVIEW.

Approved auxiliary labels: 🔥必考/MUST, ❗易錯/ERROR, 🔁重複出題/REPEAT, 🆕新興考點/NEW.

Do not invent new category codes or reinterpret label colors without first updating the canonical label policy.

## Key-Card Template Contract

All junior and intermediate key-point cards must use the approved master template contract:

- `sources/registry/key-card-template-policy.yaml`

Canonical Drive master:
- file: `iPAS_重點卡_標準格式母版_v1.0.png`
- Drive file ID: `1hkosypExdKsSs0ih_yfItoVm7yzh4etJ`
- Drive folder ID: `10WWj96Yx8jrgv-wRjeFGZq0LML-OftR0`
- standard canvas: `875 × 2517 px`, portrait

Required card structure:
1. header with card ID + stars + historical ratio;
2. card-type label;
3. exam-point title + one-line summary;
4. no more than four core points;
5. a life example is mandatory;
6. common traps, up to three;
7. one memory phrase;
8. up to three related concepts;
9. footer tip.

Production rules:
- one card focuses on one exam point;
- simplify content and use large readable typography;
- star rating remains the only exam-priority indicator;
- label semantics must follow the Card Label System;
- template changes require approval and a new version; do not silently replace historical template evidence.

## Unit Artifact Contract

A production-ready unit tracks these ten artifact groups:

01. Source Brief
02. Course Slides Package — NotebookLM master-style prompt + generated deck + slide review evidence
03. Voice Package — per-slide voice prompt + generated audio + voice review evidence
04. Video output
05. Course handout
06. Desktop explainer visuals
07. Mobile key-point cards
08. Formula / decision card
09. Official-question breakdown
10. Unit question bank

An artifact group may contain multiple sub-artifacts. A group can be intentionally not-applicable only when the manifest records the reason and QA accepts it.

## State Machine

Normal flow:

PLANNED -> SOURCE_READY -> BRIEF_READY -> CONTENT_GENERATING -> CONTENT_READY -> CONTENT_QA -> NOTEBOOKLM_PENDING -> SLIDES_REVIEW -> SLIDES_APPROVED -> VOICE_PENDING -> VOICE_REVIEW -> VOICE_APPROVED -> VIDEO_PENDING -> FINAL_REVIEW -> PUBLISHED

Exception states:
- BLOCKED
- QA_FAILED
- REVISION_REQUIRED

Do not skip a human gate by directly forcing a later state.

## Human Gates

Human review remains mandatory for:
- NotebookLM slide approval
- Voice approval
- Final video/publication approval

The system may prepare prompts and validate metadata, but must not claim generated slides, audio, or video are approved until the manifest records approval evidence.

## Presentation Contract

All iPAS intermediate slide prompts inherit the approved Master Art Direction System:
- one slide = one claim
- judgment/conclusion titles, not directory labels
- no more than three displayed key points by default
- varied page rhythm and information density
- 70% primary visual world + 20% professional information design + 10% special memory point
- series narrative: unknown -> decompose -> understand -> solve -> pass
- recurring series motif: learning-guidance light
- avoid repeated generic AI layouts, decorative robots, excessive neon, and template monotony

## Implementation Principles

- Prefer TypeScript for the control plane, schemas, CLI, QA, and dashboard.
- Keep domain logic independent from Drive, GitHub, NotebookLM, and UI adapters.
- Validate all manifest mutations before persistence.
- Make workflow transitions idempotent and auditable.
- Prefer explicit contracts over implicit folder-name conventions.
- Do not add a database in Phase 1 unless file-backed manifests prove insufficient.
- Do not automate around NotebookLM or CapCut by brittle browser hacks in the initial scope.

## Testing Expectations

At minimum cover:
- schema validation
- state transition legality
- human-gate enforcement
- artifact-group and sub-artifact completeness calculation
- source-priority / errata resolution
- Drive folder planning and idempotency
- QA rule evaluation
- manifest serialization round trips

Any implementation PR must include evidence that relevant tests pass.
