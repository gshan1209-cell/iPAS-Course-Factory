# Phase 1 Operator Workflow

本文件描述 **實際已存在的 Phase 1 CLI 行為**。原則是：重複性工作自動化，NotebookLM Slides、Voice、CapCut Video 與最終發布保留人工 Gate。

## 1. Preflight

在 repo root：

```bash
pnpm install
cp .env.example .env
pnpm test
pnpm typecheck
pnpm build
```

必要的外部 adapter 設定：

```text
OPENAI_API_KEY
OPENAI_MODEL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

可選：

```text
COURSE_FACTORY_REPO_ROOT=.
COURSE_FACTORY_ACTOR=<operator identity>
COURSE_FACTORY_TEMPLATE_ROOT=./templates
COURSE_FACTORY_INTEGRATION_DRIVE_ROOT=<disposable integration-test parent folder>
```

Credential 不得寫入 Manifest、Source Registry、commit 或文件。

## 2. Control-Plane Preparation

新單元不是只靠一句 CLI 指令就可以可信地產教材。生成前必須有兩種治理資料：

1. `sources/registry/*.yaml`：正式 Source identity、tier、Drive file ID、scope、勘誤關係。
2. `sources/mappings/<unitId>.yaml`：這個單元實際使用哪些 Source，以及 `official_scope`、`exam_focus`、`known_traps`、`visual_motif`、正式題 references。

不要用泛用知識自動猜這些欄位。Source Mapping 應在內容產製前 review / commit。

## 3. Create Unit

```bash
pnpm --filter @ipas-course-factory/cli start -- unit create M1-03 \
  --course ipas-ai-planner \
  --level intermediate \
  --subject M1 \
  --title "Computer Vision" \
  --core-thesis "AI 看一張圖，其實可能在回答三種不同問題。"
```

結果：
- 建立 `PLANNED` Unit Manifest
- 建立 10 組預設 Artifact groups
- Slides / Voice / Final Publication gates 全為 `PENDING`
- 不建立 Drive workspace
- 不生成教材

## 4. Attach Governed Sources

Source ID 必須先存在 Source Registry。

```bash
pnpm --filter @ipas-course-factory/cli start -- source attach M1-03 ipas-mid-s1-subject1-guide
pnpm --filter @ipas-course-factory/cli start -- source attach M1-03 ipas-mid-s3-exam-2025-round2-subject1
```

只要已附加至少一個 S0–S4 官方來源，`PLANNED -> SOURCE_READY`。S5-only 不足以讓 exam-bound unit 進入 `SOURCE_READY`。

## 5. Ensure Drive Workspace

科目 catalog 必須已有 `driveFolderId`。

```bash
pnpm --filter @ipas-course-factory/cli start -- drive ensure M1-03
```

系統建立／重用：

```text
01_Source
02_課程簡報
03_語音
04_影片
05_講義
06_電腦詳解圖
07_手機重點卡
08_公式卡
09_真題拆解
10_題庫
```

同一 Unit 重跑是 idempotent。若 exact-name 出現兩個資料夾，系統 BLOCK 並列出衝突 ID，不自行猜哪個是正確資料夾；stale mapped ID 也不會靜默補建。

## 6. Generate Source Brief

確認 `sources/mappings/M1-03.yaml` 已存在並通過 review，再執行：

```bash
pnpm --filter @ipas-course-factory/cli start -- generate brief M1-03
```

流程：

```text
SOURCE_READY
-> read governed source pack
-> render Source Brief template
-> GenerationPort
-> stable Google Doc upsert into 01_Source
-> record source lineage + provider/model/responseId
-> BRIEF_READY
```

## 7. Generate Pre-Notebook Content Pack

```bash
pnpm --filter @ipas-course-factory/cli start -- generate content-pack M1-03
```

生成並寫入 Drive：

1. Slides Prompt
2. Voice Prompt
3. Course Handout
4. Desktop Explainers
5. Mobile Cards
6. Formula / Decision Card
7. Official Question Breakdown
8. Unit Question Bank

Source Brief 加上以上八項，共九個 pre-Notebook generated text artifacts。

系統**不會**自動生成：
- `SLIDES_OUTPUT`
- `VOICE_OUTPUT`
- `VIDEO_OUTPUT`

成功後：`CONTENT_READY`。

## 8. Run QA

```bash
pnpm --filter @ipas-course-factory/cli start -- qa run M1-03
```

```text
CONTENT_READY -> CONTENT_QA
```

- QA PASS：`NOTEBOOKLM_PENDING`
- QA FAIL：`QA_FAILED`

只有 `ERROR` 阻擋 progression。QA 不用關鍵字假裝判斷語意正確性；它檢查可證明的 Source、Manifest、Artifact、Gate、lineage、teaching checklist 與題庫結構。

## 9. Slides Human Gate

人工把核准的 Slides Prompt 交給 NotebookLM，產生 Slides 後登記外部輸出：

```bash
pnpm --filter @ipas-course-factory/cli start -- artifact register M1-03 slides \
  --url "<NotebookLM-or-Drive-slides-url>"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 SLIDES_REVIEW \
  --evidence "slides output registered"
```

人工 review 通過：

```bash
pnpm --filter @ipas-course-factory/cli start -- transition M1-03 SLIDES_APPROVED \
  --evidence "human reviewed slides"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 VOICE_PENDING \
  --evidence "slides approved; start voice production"
```

`SLIDES_APPROVED` 不是單純狀態改寫：CLI 會先確認 Slides external output 已登記，寫入人工 Gate approval evidence，再做合法 state transition。

## 10. Voice Human Gate

NotebookLM 產生語音後：

```bash
pnpm --filter @ipas-course-factory/cli start -- artifact register M1-03 voice \
  --url "<voice-output-url>"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 VOICE_REVIEW \
  --evidence "voice output registered"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 VOICE_APPROVED \
  --evidence "human reviewed voice"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 VIDEO_PENDING \
  --evidence "voice approved; start video assembly"
```

Voice Gate 檢查節奏、發音、專有名詞與教學自然度；Control Plane 只記錄 output identity 與 approval evidence。

## 11. Video / Final Publication Gate

人工使用 CapCut 組合 Slides、Voice 與其他素材。完成後：

```bash
pnpm --filter @ipas-course-factory/cli start -- artifact register M1-03 video \
  --url "<final-video-url>"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 FINAL_REVIEW \
  --evidence "video output registered"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 PUBLISHED \
  --evidence "human final publication approval"
```

`PUBLISHED` 前一定要有 Video external output 與 Final Publication Gate evidence；沒有 `--force`。

## 12. Inspect Status

```bash
pnpm --filter @ipas-course-factory/cli start -- status M1-03
```

輸出包含：
- Unit ID / title
- current workflow state
- Artifact completion `x/10`
- Slides / Voice / Final gate state
- QA status / error count
- Drive folder URL

## Canonical Lifecycle

```text
unit create
-> Source Registry + Source Mapping ready
-> source attach
-> SOURCE_READY
-> drive ensure
-> generate brief
-> BRIEF_READY
-> generate content-pack
-> CONTENT_READY
-> qa run
-> NOTEBOOKLM_PENDING
-> human creates NotebookLM slides
-> artifact register slides
-> SLIDES_REVIEW
-> human approves Slides
-> SLIDES_APPROVED
-> VOICE_PENDING
-> human creates Voice
-> artifact register voice
-> VOICE_REVIEW
-> human approves Voice
-> VOICE_APPROVED
-> VIDEO_PENDING
-> human assembles CapCut video
-> artifact register video
-> FINAL_REVIEW
-> human final approval
-> PUBLISHED
```
