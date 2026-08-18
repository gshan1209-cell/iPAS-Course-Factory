# Phase 1 Verification Evidence

## Required Merge Gate

PR 只有在以下命令於**可安裝完整依賴的環境**全部通過後，才能從 Draft 轉 Ready / merge：

```bash
pnpm install
pnpm test:acceptance
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @ipas-course-factory/cli start -- status M1-02
```

若設定 disposable integration Drive root，再執行：

```bash
COURSE_FACTORY_INTEGRATION_DRIVE_ROOT=<test-folder-id> \
  pnpm test packages/drive/test/google-drive.integration.test.ts
```

Integration test 必須在 teardown 將 disposable test root 移到 Trash。

## Current Validation Boundary

目前開發 sandbox 無法連 npm registry，因此不能：
- 取得／安裝 pnpm workspace dependencies
- 生成可信的 `pnpm-lock.yaml`
- 執行完整 Vitest + Zod + Google SDK + Handlebars + OpenAI SDK test suite

這是**驗證環境限制，不等於測試已通過**。

在此限制下已完成的檢查只能視為 pre-validation evidence：
- task-by-task TypeScript static contract checks where dependencies could be safely stubbed
- pure-domain/runtime smoke assertions
- fake Drive / Generation / CLI path checks
- GitHub diff / architecture review

在 dependency-backed commands 全部 PASS 前：
- PR 維持 Draft
- Issue 不關閉
- Phase 1 不標示 DEV5 / Production Ready

## Required Exit Evidence

最終 review 應至少附：
- `pnpm test:acceptance` PASS
- `pnpm test` PASS
- `pnpm typecheck` PASS
- `pnpm build` PASS
- M1-01 / M1-02 canonical manifest validation PASS
- guarded Drive integration result（若 credentials configured）
- final PR diff review
- no Dashboard code in Phase 1
- no committed credentials
- no bypassed Human Gate
