# iPAS-Course-Factory

半自動教材工廠（Course Factory），把官方來源穩定轉換為可追蹤、可驗證、可重製的多載體教材資產。

## Current Stage

- **DEV4｜Validation**
- Phase 1 Control Plane 功能已實作，正在完成 dependency-backed test / typecheck / build 驗證
- Dashboard 屬於 Phase 2，尚未納入本階段

> 在 `pnpm build`、`pnpm test`、`pnpm typecheck` 全部於可安裝依賴的環境通過前，不把 Phase 1 標記為 Production Ready。

## Architecture

- **GitHub = Control Plane**：Course / Subject / Unit Manifest、Source Registry、Source Mapping、Workflow State、Artifact Contract、QA、Prompt Template 與程式碼的 canonical source of truth。
- **Google Drive = Asset Plane**：官方來源檔、生成 Google Docs、NotebookLM Slides/Voice 與 CapCut 最終影片。
- Drive 中「檔案存在」不代表流程完成；完成狀態只由 Unit Manifest 與 Human Gate evidence 決定。

詳細架構：[`docs/architecture/phase1-control-plane.md`](docs/architecture/phase1-control-plane.md)

## Phase 1 Capabilities

目前 Phase 1 支援：

- Course / Subject / Unit YAML manifests 與 schema validation
- S0–S5 Source Governance、勘誤覆蓋與 source lineage
- 10 組教材 Artifact Contract
- 可稽核 workflow state machine
- Slides / Voice / Final Publication 三個人工 Gate
- Google Drive 10 區標準工作區 idempotent provisioning
- Google Docs 穩定 ID upsert，不因重跑重複建立教材文件
- Google Docs / text / PDF 官方來源讀取；PDF 透過可替換的 `PdfTextExtractor`
- 9 種教材 Template Contract 與大師級 Art Direction System
- provider-neutral `GenerationPort`；OpenAI 只存在 adapter 層
- 結構化 QA
- M1-01 / M1-02 既有教材 migration fixtures
- `course-factory` CLI operator surface
- Phase 1 acceptance scenario

## Quick Start

Prerequisites：Node.js `>=22.12.0`、pnpm、可用的 Google OAuth 與模型供應商憑證。

```bash
pnpm install
cp .env.example .env
```

在 `.env` 設定需要的值；**不要提交真實 credential**：

```text
OPENAI_API_KEY=
OPENAI_MODEL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
COURSE_FACTORY_ACTOR=
```

驗證：

```bash
pnpm build
pnpm test:acceptance
pnpm test
pnpm typecheck
pnpm --filter @ipas-course-factory/cli start -- status M1-02
```

`test` / `test:acceptance` / `typecheck` 會先執行 workspace build，確保各 package 指向 `dist` 的 `exports/types` 在 clean clone 也已存在。

M1-01 / M1-02 已作為 reference fixtures 註冊，但因沒有 Control Plane 可驗證的 NotebookLM Slides、Voice、Video output 與人工核准 evidence，兩者都維持在 `CONTENT_READY`，Human Gates 保持 `PENDING`。

## Creating a New Unit

`unit create` 只建立合法 Unit Manifest；生成前還必須完成治理來源註冊與 `sources/mappings/<unitId>.yaml`。Source Mapping 是 Control Plane 規格，不由 CLI 用猜測值自動生成。

完整操作流程：[`docs/workflows/phase1-operator-workflow.md`](docs/workflows/phase1-operator-workflow.md)

Source Governance：[`docs/governance/source-registry.md`](docs/governance/source-registry.md)

## Human-Gated Production Flow

```text
Source -> Brief -> Content Pack -> QA -> NotebookLM Pending
                                      |
                                      v
                              Human Slides Gate
                                      |
                                      v
                               Human Voice Gate
                                      |
                                      v
                           Human Final/Video Gate
                                      |
                                      v
                                  PUBLISHED
```

Phase 1 不會自動產生或自動核准 `SLIDES_OUTPUT`、`VOICE_OUTPUT`、`VIDEO_OUTPUT`。
