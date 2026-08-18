# Phase 1 Exception Recovery

Exception state 不得作為跳過正常 workflow / Human Gate 的捷徑。

## Rules

- `BLOCKED`、`QA_FAILED` 不可直接跳回任意 normal state。
- 第一個 recovery step 固定是 `REVISION_REQUIRED`，必須提供 evidence/reason。
- `REVISION_REQUIRED` 的下一個狀態由 Unit audit history 推導，不接受 operator 任意選一個較晚狀態。
- 如果失敗發生在 `CONTENT_GENERATING`，安全 recovery target 特別收斂為 `BRIEF_READY`，讓 content pack 可以重新生成。
- 如果 QA 已進 `CONTENT_QA` 才失敗，recovery 回 `CONTENT_QA`，`qa run` 支援在該狀態重跑。
- `PUBLISHED`、`SLIDES_APPROVED`、`VOICE_APPROVED` 仍必須透過各自 Human Gate；Exception recovery 不會批准 Gate。

## QA Failure Example

```bash
pnpm --filter @ipas-course-factory/cli start -- transition M1-03 REVISION_REQUIRED \
  --evidence "QA findings reviewed; correction started"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 CONTENT_QA \
  --evidence "correction applied; return to recorded QA state"

pnpm --filter @ipas-course-factory/cli start -- qa run M1-03
```

如果 history 推導出的 recovery target 不是 `CONTENT_QA`，第二條命令會被 state machine 拒絕。

## Generation Failure Example

若 content generation 在 `CONTENT_GENERATING` 失敗，流程會進 `QA_FAILED`。完成修正後：

```bash
pnpm --filter @ipas-course-factory/cli start -- transition M1-03 REVISION_REQUIRED \
  --evidence "generation failure investigated"

pnpm --filter @ipas-course-factory/cli start -- transition M1-03 BRIEF_READY \
  --evidence "generation dependency fixed; regenerate content pack"

pnpm --filter @ipas-course-factory/cli start -- generate content-pack M1-03
```

這個 `BRIEF_READY` 不是 operator 自由指定，而是 state machine 根據原始失敗點計算出的安全 target。
