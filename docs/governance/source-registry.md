# Source Registry & Governance

## Purpose

教材工廠的目標不是讓模型「知道很多」，而是讓每個 exam-bound claim 都能回到明確的治理來源。GitHub Source Registry 是來源 identity 與 precedence 的 canonical record；Google Drive 保存來源資產本體。

## Source Tiers

| Tier | 定義 | 用途 |
|---|---|---|
| S0 | 官方考試範圍／能力範圍 | 定義考試 scope boundary |
| S1 | 官方學習指引 | 核心教材事實與官方用語 |
| S2 | 官方勘誤 | 修正它明確指出的舊內容 |
| S3 | 官方公告試題 | 真題考法與題型 evidence |
| S4 | 官方樣題 | 補充題型 evidence |
| S5 | 內部教學補充 | 改善理解，但不得推翻 S0–S4 |

Exam-bound unit 至少要有一個 S0–S4 Source；只有 S5 不能通過 Source QA。

## Scoped Errata Precedence

S2 不是「全球順位最高」。規則是：

1. S0 仍定義 scope boundary。
2. S2 對它在 `corrects` / `supersedes` 中**明確指向**的來源取得修正優先權。
3. S2 不會因為是勘誤表，就覆蓋與該勘誤無關的其他來源或範圍。
4. `corrects` / `supersedes` 指向不存在的 Source ID 時，QA 產生 `ERRATA_MAPPING_UNRESOLVED` 並阻擋流程。

例如目前 M1-01 的 TF-IDF 範例涉及 2026-04-10 勘誤，因此 lineage 包含 S2；M1-02 Transformer/BERT 沒有證據需要該 TF-IDF 勘誤，所以不為了「保險」而把 S2 全域附加。

## Registry Contract

Source record 至少包含：

```yaml
sourceId: ipas-mid-s1-subject1-guide
tier: S1
title: AI應用規劃師（中級）科目一學習指引
provider: 經濟部產業人才能力鑑定
driveFileId: <Drive file ID>
scope:
  - 人工智慧技術應用與規劃
effectiveDate: null
supersedes: []
corrects: []
```

Identity 使用 `sourceId`，不是檔名或 Drive 顯示名稱。

## Unit Source Mapping

每個可生成的 Unit 應有 `sources/mappings/<unitId>.yaml`，把「Source Registry 有哪些來源」進一步縮成「這個 Unit 實際用哪些來源」。

```yaml
schemaVersion: 1
unitId: M1-03
sourceIds:
  - ipas-mid-s1-subject1-guide
  - ipas-mid-s3-exam-2025-round2-subject1
scope:
  - Computer Vision
officialQuestionRefs:
  - sourceId: ipas-mid-s3-exam-2025-round2-subject1
    questions: [Qxx]
templateVariables:
  official_scope: <officially-supported unit scope>
  exam_focus: <exam focus supported by sources>
  known_traps: <source-supported/common exam confusions>
  visual_motif: <unit visual teaching motif>
```

`Source Mapping` 不應由 LLM 用未知資訊自行猜完。它是內容產製前的治理 Gate。

## Source Lineage

每個 generated source-bound Artifact item 都要保存 `sourceIds[]`。題庫的每一題也保存自己的 `sourceIds[]`。

因此系統可以回答：
- 這份講義依據哪些官方文件？
- 這張卡的考點來自哪個範圍？
- 這題若需要修正，應追哪一份勘誤？

Drive file existence 本身不能取代 lineage。

## Supplemental Content

S5 可以：
- 加白話例子
- 加理解型比喻
- 加非考試性的延伸說明

S5 不可以：
- 覆蓋官方定義
- 把未被官方來源支持的內容寫成必考結論
- 靜默修正官方來源

若官方來源不支持一個主張，教材應標為「補充」或移除，而不是用一般知識補成官方事實。
