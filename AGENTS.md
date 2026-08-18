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
