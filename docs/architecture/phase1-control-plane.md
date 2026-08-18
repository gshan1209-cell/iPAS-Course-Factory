# Phase 1 Control Plane Architecture

## Goal

Phase 1 建立一個 file-backed、可稽核、可重跑的半自動教材 Control Plane。它負責可確定的 80%：治理來源、建立工作區、產生文字教材、保存 lineage、跑 QA、追蹤狀態；視覺、語音與最終發布保留人工品質判斷。

## System Boundary

```text
GitHub / Control Plane
  catalog + source registry + source mappings
  schemas + manifests + workflow + QA
  templates + generation contracts
  CLI
           |
           | stable IDs / lineage / state
           v
Google Drive / Asset Plane
  official sources
  generated Google Docs
  NotebookLM Slides
  NotebookLM Voice
  CapCut Video
```

GitHub Manifest 是 workflow truth。Drive 是 asset truth。兩者透過 stable ID 關聯，但不能用「Drive 有檔案」推論「已人工核准」。

## Packages

### `packages/schemas`

Canonical Zod contracts：Course、Subject、Source、SourceMapping、Artifact、Gate、Unit。Unknown canonical fields 以 strict schema 拒絕，避免 typo 被靜默吞掉。

### `packages/core`

純 domain / application rules：
- YAML Manifest Store
- Source precedence / lineage
- workflow state machine
- 10 Artifact groups
- external Artifact registration
- Human Gate approval
- generation result mutation helpers

Core 不 import Google 或 OpenAI SDK。

### `packages/drive`

Google adapter boundary：
- 10 區 workspace provisioning
- exact-name duplicate blocking
- stale mapping detection
- Google Docs / UTF-8 / PDF source reading
- PDF extraction behind `PdfTextExtractor`
- idempotent Google Docs upsert

### `packages/generator`

- 9 個 explicit Template Contracts
- Handlebars rendering + required-variable prevalidation
- provider-neutral `GenerationPort`
- isolated OpenAI adapter
- Source Brief / pre-Notebook content orchestration
- question-bank structured metadata validation

只有 adapter 知道模型 SDK；model ID 由 `OPENAI_MODEL` 注入。

### `packages/qa`

結構化 QA：Source、Manifest/Gate、Content lineage/checklist、Exam metadata。QA 只宣稱它能證明的 structural invariants，不以關鍵字假裝理解整份教材語意。

### `apps/cli`

Operator adapter。CLI command modules 呼叫 services/ports，不保存 business rules；只有 `container.ts` 建 concrete Google/OpenAI adapters。

## Workflow State Machine

```text
PLANNED
-> SOURCE_READY
-> BRIEF_READY
-> CONTENT_GENERATING
-> CONTENT_READY
-> CONTENT_QA
-> NOTEBOOKLM_PENDING
-> SLIDES_REVIEW
-> SLIDES_APPROVED
-> VOICE_PENDING
-> VOICE_REVIEW
-> VOICE_APPROVED
-> VIDEO_PENDING
-> FINAL_REVIEW
-> PUBLISHED
```

Exception states：`BLOCKED`、`QA_FAILED`、`REVISION_REQUIRED`。

Transition 是 centrally validated、idempotent where safe、且寫 audit history。Exception recovery 需要 reason/evidence。

## Artifact Contract

固定 10 groups：

1. Source Brief
2. Slides Package = Prompt + external Output
3. Voice Package = Prompt + external Output
4. Video Output
5. Course Handout
6. Desktop Explainers
7. Mobile Key Cards
8. Formula / Decision Card
9. Official Question Breakdown
10. Unit Question Bank

`CONTENT_READY` 表示九個 pre-Notebook generated text artifacts 已準備好；它**不表示** Slides/Voice/Video 已完成。Artifact completeness 與 workflow state 是不同維度。

## Human Gates

三個 output 都必須先 external registration，再人工核准：

- Slides Gate：需要 `SLIDES_OUTPUT`
- Voice Gate：需要 `VOICE_OUTPUT`
- Final Publication Gate：需要 `VIDEO_OUTPUT`

Gate approval 要有 operator identity、ISO UTC datetime、evidence。CLI 沒有 `--force`。

## Idempotency

### Drive workspace

- mapped ID 先驗證 identity
- unmapped 時用 exact name 搜尋
- 0 個 -> create
- 1 個 -> reuse
- >1 個 -> BLOCK with IDs

### Generated Google Docs

- 初次 create 並回寫 stable file ID
- 重跑有 existing file ID 時 update in place
- stale ID -> error，不靜默 create replacement

這兩個 invariant 用來避免教材工廠在換聊天／重跑後產生重複資產。

## Source Reading

- Google Docs -> export text/plain
- UTF-8 text/markdown -> download/decode
- PDF -> `pdfjs-dist` through `PdfTextExtractor`

Drive adapter 沒有 iPAS-specific parsing rule；Source Governance 留在 domain。

## Why File-Backed First

Phase 1 使用 Git-versioned YAML，而不是先建 DB，因為：
- 目前單元數與寫入頻率適合 file-backed workflow
- Git diff 本身就是 review/audit evidence
- Dashboard Phase 2 可以直接讀相同 Manifest
- 等出現 concurrent transactional writes 或大規模跨課程 analytics 的實證需求，再引入 DB

## Deliberately Out of Scope

Phase 1 不包含：
- Dashboard
- autonomous NotebookLM interaction
- autonomous CapCut editing
- browser automation hacks
- automatic publication without human approval
- database-first architecture

這些功能若未來加入，必須透過既有 domain ports / state machine / gate contract，不得繞過 Control Plane。
