# Key-Card Deterministic Text Policy

Status: ACTIVE  
Effective: 2026-08-20  
Template policy: `KCT-v3.3`

## Purpose

iPAS key-point cards use AI-generated visual assets, but source-bound and evidence-bearing text must never be entrusted to image-generation text rendering. This policy prevents drift in star ratings, card numbers, card categories, exam labels, guide topics, question references, and source footers.

## Core Rule

**Evidence text is data, not decoration.**

All governed evidence fields must be read from the current data layer, injected through a deterministic text renderer, and compared back to the same data record after rendering.

## Production Architecture

Use a hybrid pipeline:

1. Resolve the governed card record from the Master / atomic-topic data layer.
2. Validate all locked evidence fields before visual composition.
3. Generate or select only non-evidence visual assets with image generation.
4. Compose the fixed KCT layout.
5. Inject locked fields as deterministic text layers.
6. Render the final card.
7. Compare rendered locked text with the governed record.
8. Fail QA if any locked value differs.

Image generation may produce:
- mascot / character assets;
- icons;
- non-text illustrations;
- decorative backgrounds;
- visual process elements.

Image generation must not author or rewrite:
- card number;
- level / subject;
- section title when it is governed by the card record;
- star value;
- card category code or meaning;
- exam labels;
- guide topic;
- exam question references;
- source footer.

## Locked Fields

The following fields are `EXACT_TEXT` or deterministic-value fields:

- `level-subject`
- `section-title`
- `atomic-topic-title`
- `star-rating`
- `card-number`
- `card-category-code-and-icon`
- `exam-labels`
- `guide-topic`
- `exam-question-refs`
- `source-footer`

Rules:
- no paraphrasing;
- no automatic correction;
- no inferred question numbers;
- no source substitution;
- no borrowing values from a visual sample;
- no filling missing evidence from model knowledge.

If a locked value is missing, the card is blocked instead of guessed.

## Source Footer

Card-face source format remains compact:

`指引:「<主題名稱>」；考題:<年份-梯次> <級別科目> Q<nn>、Q<nn>`

Example for `I1-01`:

`指引:「AI 的定義與分類」；考題:115-1 初級科一 Q14、Q34、Q36、Q38；115-2 初級科一 Q1、Q3、Q4`

The compact footer is display text only. Full URLs, Drive IDs, official PDF references, and audit evidence remain in the data layer.

## Visual Label Rules

- Card category: icon only on the card face; do not show `卡片類別`, category name, or category code as visible text.
- Exam labels: must remain visible when applicable; show only applicable labels.
- Do not display a heading such as `考試標籤`.
- Star icons remain the only exam-priority signal shown on the card; exam-rate percentages remain data-only.

## Mascot Rule

The governed mascot `小芯` is fixed in the upper-right visual area using the approved asset. It must not cover:
- stars;
- card number;
- exam labels;
- main title.

Do not redraw the mascot into a materially different identity during batch production.

## Height and Typography

The existing dynamic-height policy remains authoritative:

> 寧可拉高卡片，不可縮小字體。

Width remains 1024 px. Use STANDARD 1024×1536 when content fits; otherwise increase height dynamically. Do not shrink the source footer or evidence text to force-fit the card.

## QA Gate

A card cannot pass final QA unless `EVIDENCE_TEXT_LOCKED = true`.

Fail the card if:
- any locked field differs from the governed record;
- a question number was altered or omitted;
- the guide topic was replaced;
- the star count or exam labels differ;
- the card category icon does not match the governed category;
- the source footer was paraphrased;
- image-generated text is used for evidence fields.

## Relationship to Other Policies

This policy must be applied together with:
- `sources/registry/key-card-template-policy.yaml`
- `sources/registry/key-card-citation-policy.yaml`
- `sources/registry/key-card-label-policy.yaml`
- `sources/registry/key-card-weight-policy.yaml`
- `docs/KEY_CARD_DYNAMIC_HEIGHT_POLICY.md`
