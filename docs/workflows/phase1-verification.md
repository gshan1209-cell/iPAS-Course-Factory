# Phase 1 Verification Evidence

## Required Merge Gate

PR 只有在以下命令於**可安裝完整依賴的環境**全部通過後，才能從 Draft 轉 Ready / merge：

```bash
pnpm install
pnpm build
pnpm test:acceptance
pnpm test
pnpm typecheck
pnpm --filter @ipas-course-factory/cli start -- status M1-02
```

`test` / `test:acceptance` / `typecheck` 會自行先執行 build，避免 clean clone 因 workspace package `exports/types` 指向尚未生成的 `dist` 而失敗。

若設定 disposable integration Drive root，再執行：

```bash
COURSE_FACTORY_INTEGRATION_DRIVE_ROOT=<test-folder-id> \
  pnpm test packages/drive/test/google-drive.integration.test.ts
```

Integration test 必須在 teardown 將 disposable test root 移到 Trash。

## Dependency-Backed Validation

GitHub Actions `Phase 1 Validation` 已提供可安裝完整依賴的乾淨 Linux runner。

Run #9 (`32119527290`) 在 Node.js `22.16.0` / pnpm `10.34.5` 上完成以下步驟：

- dependency install / lockfile generation — PASS
- `pnpm build` — PASS
- `pnpm test:acceptance` — PASS
- `pnpm test` — PASS
- `pnpm typecheck` — PASS
- `pnpm --filter @ipas-course-factory/cli start -- status M1-02` — PASS

同一 run 已將生成的 `pnpm-lock.yaml` 提交回 feature branch。此文件提交會觸發後續 validation run；後續 run 必須在 lockfile 已存在且不再變更的 final branch tree 上再次全綠，才視為 merge gate 完成。

## Local Sandbox Boundary

目前 ChatGPT container 仍無法解析 `github.com` / npm registry，因此本地 sandbox 不能重跑 dependency-backed suite。這不再是 PR 的驗證 blocker，因為 GitHub-hosted validation runner 已可提供獨立、可重製的 CI 證據。

本地可做的補充檢查仍限於：
- GitHub diff / architecture review
- workflow logs / step-level evidence review
- source / manifest / Human Gate invariant 靜態檢查

## Required Exit Evidence

最終 review 至少需要：
- `pnpm-lock.yaml` committed and stable
- `pnpm build` PASS
- `pnpm test:acceptance` PASS
- `pnpm test` PASS
- `pnpm typecheck` PASS
- CLI M1-02 smoke PASS
- M1-01 / M1-02 canonical manifest validation PASS（由 acceptance/full suite 覆蓋）
- guarded Drive integration result（只有 credentials configured 時要求）
- final PR diff review
- no Dashboard code in Phase 1
- no committed credentials
- no bypassed Human Gate

在上述 final-tree CI 全綠前：
- PR 維持 Draft
- Issue 不關閉
- Phase 1 維持 DEV4
