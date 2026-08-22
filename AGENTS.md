# AGENTS.md

## Mission

iPAS-Course-Factory is the current iPAS program implementation of a semi-automated exam/course production control plane. Its architecture must remain reusable for additional certification and recruitment exam programs without mixing program-specific evidence or hard-coding iPAS semantics into the shared core.

## Source of Truth

- GitHub is canonical for schemas, manifests, workflow state, templates, QA rules, program profiles, and governance.
- Google Drive is the asset plane for official source files and generated course artifacts.
- Never infer completion from Drive file presence alone; completion is declared by the unit manifest and gate state.
- Multi-exam program registration is canonical in `sources/registry/exam-programs.yaml`.

## Multi-Exam Architecture Contract

Read and follow:

- `docs/MULTI_EXAM_FACTORY_ARCHITECTURE.md`
- `sources/registry/exam-programs.yaml`
- `.agents/skills/onboarding-exam-program/SKILL.md`
- `.agents/skills/producing-exam-key-cards/SKILL.md`

Core rule:

**共用核心，考試隔離；規範可繼承，資料不可混用。**

Rules:
- every new certification / recruitment exam must register a unique `programCode` before production;
- globally unique production identities for new records must include `programCode`;
- existing iPAS legacy IDs remain valid aliases and must not be mass-rewritten only for migration;
- source IDs, question frequency, star weighting, topic taxonomy, subject semantics, and Drive roots are program-scoped;
- never copy iPAS assumptions such as `初級/中級`, subject count, source hierarchy, question format, mascot, or visual labels into another exam unless that program profile explicitly approves them;
- shared core behavior belongs in generic policies / skills; exam-specific behavior belongs in the selected program profile or adapter;
- cross-program dashboards may aggregate only after preserving program labels and isolation.

Registered program states:
- `IPAS` — ACTIVE;
- `POSTAL` — PLANNED / source discovery required. Do not infer official Postal tracks, subjects, weights, question counts, or sources before official-source onboarding.

## Source Governance

Source priority is fixed for the current iPAS profile:

1. S0 — official exam scope / competency scope
2. S1 — official learning guide
3. S2 — official errata
4. S3 — official announced exam questions
5. S4 — official sample questions
6. S5 — internal teaching supplements

Rules:
- S0-S4 outrank S5 for iPAS.
- Errata must override the affected older source content.
- Do not silently correct, reconcile, or extend official source material with general knowledge.
- If the source does not support a teaching claim, mark it as supplemental or omit it.
- Every source-bound artifact must be traceable to source IDs recorded in the unit manifest.
- A future program may define a different source-priority profile; do not assume the iPAS S0-S5 meanings are universal.

## Project Skills

When manually checking, importing, synchronizing, or recalculating iPAS official announced exams, official PDF archives, question mappings, key-card weights, or star ratings, read and follow:

- `.agents/skills/updating-ipas-official-exams/SKILL.md`

The skill is authoritative for the iPAS manual update workflow and its completion gates. Do not claim the iPAS source set is fully current unless the skill's OFFICIAL_CURRENT, MIRROR_COMPLETE, ANALYSIS_CURRENT, and KEYCARD_CURRENT gates are all satisfied.

When onboarding a new exam / certification program, read and follow:

- `.agents/skills/onboarding-exam-program/SKILL.md`

When producing key cards for any registered exam program, read and follow:

- `.agents/skills/producing-exam-key-cards/SKILL.md`
- `docs/KEY_CARD_IMAGE_PRODUCTION_PLAN.md`
- `production/key-cards/registry.yaml`

For iPAS-specific production additionally read:

- `.agents/skills/producing-ipas-key-cards/SKILL.md`

The production registry is the cross-chat source of truth. Chat memory is not a production lock. Never generate a production card until its one-card CLAIM has been successfully written to the current registry SHA.

## Key-Card Label Contract

All current iPAS junior and intermediate key-point cards, Master Index files, card templates, and QA flows must follow:

- `docs/KEY_CARD_LABEL_SYSTEM.md`
- `sources/registry/key-card-label-policy.yaml`
- `sources/registry/key-card-weight-policy.yaml`

Keep these dimensions separate:
- star rating / exam ratio = exam priority only;
- category label = learning and memory mode only;
- auxiliary label = exam trait only.

The approved iPAS category mapping is fixed: 概念卡→💡核心概念/CONCEPT, 比較卡→⚖️差異比較/COMPARE, 流程卡→🔄流程必背/FLOW, 陷阱卡→⚠️考題陷阱/TRAP, 公式卡→🧮公式計算/FORMULA, 情境卡→🎯情境判斷/CASE, 真題卡→📝歷屆真題/EXAM, 總整理卡→🧠考前速讀/REVIEW.

Approved iPAS auxiliary labels: 🔥必考/MUST, ❗易錯/ERROR, 🔁重複出題/REPEAT, 🆕新興考點/NEW.

Do not invent new category codes or reinterpret label colors without first updating the canonical label policy. Future programs may approve a different label profile.

## Key-Card Template Contract

All current iPAS junior and intermediate key-point cards must use the approved iPAS master template contract:

- `sources/registry/key-card-template-policy.yaml`
- `sources/registry/key-card-citation-policy.yaml`
- `docs/KEY_CARD_DETERMINISTIC_TEXT_POLICY.md`
- `docs/KEY_CARD_DYNAMIC_HEIGHT_POLICY.md`
- `docs/KEY_CARD_MASCOT_POLICY.md`

Canonical Drive master:
- file: `iPAS_重點卡_標準格式母版_v3.0.png`
- Drive file ID: `1ghcc2Pcn4Yqf_assysJfB0ekXWd7N2TR`
- Drive folder ID: `10WWj96Yx8jrgv-wRjeFGZq0LML-OftR0`
- standard canvas: `1024 × 1536 px`, portrait

Canonical standard sample:
- file: `iPAS_重點卡_標準樣本_初級科目一_C-001_AI的定義與分類_v1.1.png`
- Drive file ID: `184Kk1871jtZSiuU1u8ohRc_R9TK0WN-u`
- role: canonical design/content-density sample for KCT-v3.x
- use the sample for layout proportion, typography scale, visual hierarchy, content density, spacing, icon rhythm, mascot placement, and section balance;
- do not copy the sample's literal star rating, category, exam labels, or source references into another card; those evidence-driven fields must always come from the governed data layer.

Required iPAS card structure:
1. top header: `iPAS` + visible level-subject label + large star icons + card number;
2. second row: left-aligned section title + card-category icon + only applicable exam labels + 小芯 in the upper-right visual area;
3. exam-point title + one-line summary;
4. no more than four concise core points;
5. a life example is mandatory and should prefer a simple visual process;
6. common traps, up to three;
7. one memory phrase;
8. up to three related concepts;
9. compact source footer.

Header rules:
- level/subject must be shown, e.g. `初級-科目一`;
- do not show the text `重點卡` in the header;
- do not show the text `重要度`; use large star icons directly;
- card number must be shown in `C-<nnn>` format and is scoped per subject;
- second-row section title is required and left aligned, e.g. `AI 基礎概念`;
- do not repeat the level-subject label again on the second row;
- visible card number never replaces internal atomic-topic/source/question traceability.

Production rules for iPAS:
- one card focuses on one exam point;
- simplify content and use large mobile-readable typography;
- prefer short sentences and avoid dense paragraphs;
- if content does not fit, increase card height instead of reducing the canonical text scale;
- star rating remains the only exam-priority indicator on the card;
- exam ratio remains in the data layer and must not be shown on the card;
- card category is visible as icon only; do not render category name/code headings on the card face;
- exam labels must remain visible when applicable and must show only applicable labels;
- governed evidence text must be rendered deterministically from the data layer, never authored or rewritten by image generation;
- footer source format is fixed as `指引:「<主題名稱>」；考題:<年份-梯次> <級別科目> Q<nn>、Q<nn>`;
- source footer must be cross-checked against the full data-layer citation/evidence;
- 小芯 may change pose, expression, outfit, props, and topic-themed role, but her identity must remain unmistakably 小芯;
- 小芯 follows the rule `主題可變，身份不變；姿態可變，角色鎖定` and must not cover stars, card number, exam labels, main title, or evidence text;
- final QA requires both `EVIDENCE_TEXT_LOCKED = true` and `MASCOT_IDENTITY_LOCKED = true`;
- template changes require approval and a new version; do not silently replace historical template evidence.

These visual rules are the IPAS profile, not automatically universal for POSTAL or future programs.

## Key-Card Cross-Chat Production Contract

All key-card image production across chats and programs must use GitHub optimistic concurrency and the global registry:

- program registry: `sources/registry/exam-programs.yaml`
- registry: `production/key-cards/registry.yaml`
- batches: `production/key-cards/batches.yaml`
- plan: `docs/KEY_CARD_IMAGE_PRODUCTION_PLAN.md`
- generic skill: `.agents/skills/producing-exam-key-cards/SKILL.md`

Rules:
- new records use `globalProductionKey` format `<PROGRAM>-<TRACK_OR_LEVEL>-<SUBJECT>-<TOPIC_ID>-<CARD_NO>`;
- existing iPAS legacy keys remain aliases;
- claim exactly one card immediately before production; do not pre-claim a whole batch;
- an active `CLAIMED` card belongs to another conversation and must be skipped;
- `QA_PASSED` with the same program-scoped `renderFingerprint` must never be generated again;
- `VISUAL_READY` or `RENDERED` work must be resumed rather than duplicated;
- `SAMPLE_ONLY` is a design reference and does not count as final production;
- regeneration requires `REVISION_REQUIRED` or `STALE_REGEN_REQUIRED` plus a recorded revision reason;
- if a registry write fails because its SHA is stale, re-fetch immediately; never continue from the stale selection;
- only program-scoped `QA_PASSED` counts as complete;
- completion counts come from registry state, not the number of images visible in Drive;
- no claim, batch, fingerprint, or completion calculation may silently cross program boundaries.

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

## Course Text Asset Centralization Contract

All course-level text assets must follow:

- `docs/COURSE_TEXT_ASSET_CENTRALIZATION_POLICY.md`

Core rule:

**同一教材用途的文字資產，必須跨章集中到同一個課程層級資料夾管理；不得再分散存放於各章節資料夾。**

Rules:
- organize governed text assets by asset type, not by chapter folder;
- preserve chapter identity in filenames such as `CH00`, `CH01`, and so on;
- reuse one canonical course-level folder for each text asset type;
- move authoritative files instead of keeping duplicated chapter-level copies;
- existing approved folder meanings must not be silently repurposed;
- new text categories such as video copy, video prompts, handout copy, or social copy must inherit the same centralized pattern;
- chapter folders remain for chapter-local generated assets, sources, images, audio, video, and other approved non-centralized artifacts;
- Google Drive is the asset plane, while GitHub remains canonical for the policy and workflow contract.

Current approved pattern includes `01_簡報文案`, `02_簡報Prompt`, `03_語音文案`, and `04_語音Prompt`.

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

All current iPAS intermediate slide prompts inherit the approved Master Art Direction System:
- one slide = one claim
- judgment/conclusion titles, not directory labels
- no more than three displayed key points by default
- varied page rhythm and information density
- 70% primary visual world + 20% professional information design + 10% special memory point
- series narrative: unknown -> decompose -> understand -> solve -> pass
- recurring series motif: learning-guidance light
- avoid repeated generic AI layouts, decorative robots, excessive neon, and template monotony

Future programs may define their own presentation profile while inheriting reusable layout and QA mechanics.

## Implementation Principles

- Prefer TypeScript for the control plane, schemas, CLI, QA, and dashboard.
- Keep domain logic independent from Drive, GitHub, NotebookLM, and UI adapters.
- Keep shared core logic independent from any one exam program.
- Validate all manifest mutations before persistence.
- Make workflow transitions idempotent and auditable.
- Prefer explicit contracts over implicit folder-name conventions.
- Prefer program profile fields over hard-coded exam enums.
- Do not add a database in Phase 1 unless file-backed manifests prove insufficient.
- Do not automate around NotebookLM or CapCut by brittle browser hacks in the initial scope.

## Testing Expectations

At minimum cover:
- schema validation
- state transition legality
- human-gate enforcement
- artifact-group and sub-artifact completeness calculation
- source-priority / errata resolution
- program namespace isolation
- cross-program duplicate-key prevention
- program-scoped weighting / completion calculations
- Drive folder planning and idempotency
- QA rule evaluation
- manifest serialization round trips

Any implementation PR must include evidence that relevant tests pass.
