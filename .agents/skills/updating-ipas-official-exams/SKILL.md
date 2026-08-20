---
name: updating-ipas-official-exams
description: Use when manually checking, importing, synchronizing, or recalculating iPAS AI應用規劃師 official announced exam questions, official PDF archives, question mappings, atomic topics, key-card weights, star ratings, or key-card labels.
---

# Updating iPAS Official Exams

## Overview

Maintain iPAS official announced exams as a traceable, append-only source set. **Official-current, PDF-mirrored, parent-mapped, atomic-mapped, and key-card-current are separate gates; never collapse them into one claim.**

## Canonical References

Read before changing state:
- `AGENTS.md`
- `docs/IPAS_EXAM_SOURCE_GOVERNANCE.md`
- `docs/KEY_CARD_LABEL_SYSTEM.md`
- `sources/registry/ipas-official-exams.yaml`
- `sources/registry/atomic-topic-policy.yaml`
- `sources/registry/key-card-weight-policy.yaml`
- `sources/registry/key-card-label-policy.yaml`
- `sources/registry/key-card-citation-policy.yaml`

Canonical discovery source: the iPAS AI應用規劃師 official learning-resources page recorded in the registry.

## Manual Update Workflow

Run only when the user explicitly asks to update/check/sync iPAS sources. Do not create scheduled monitoring unless explicitly requested again.

1. **DISCOVER** — compare the official learning-resources page with the registry. Do not infer latest state from Drive.
2. **IDENTIFY** — assign stable `sourceId`; same title with a different hash/version becomes a new version, never an overwrite.
3. **VERIFY** — verify official filename, exam date/session, PDF identity/size/hash when obtainable.
4. **MIRROR** — save the **raw official PDF** in project Drive under `00_官方來源_公告試題/初級` or `/中級`. Never recreate/re-render a PDF and call it official.
5. **REGISTER** — append/update registry metadata. Old versions become `SUPERSEDED`; do not delete history.
6. **PARENT MAP** — create `questionUid = <sourceId>-Q<nn>` and map every question to exactly one primary L1 official competency indicator / parent topic. Secondary concepts may be recorded separately.
7. **ATOMIC MAP** — maintain L2 atomic topics under each L1 parent and map every official question to one primary atomic topic. Secondary atomic topics may be recorded separately. **Never copy a parent frequency or star to every child atomic topic.**
8. **RECALC** — compute L2 atomic-topic counts and ratios from ACTIVE S3 announced exams only. Official samples, guides, errata, and internal supplements do not enter historical frequency.
9. **STAR** — write atomic `computedStar`; preserve `overrideStar` and required `overrideReason`; publish `effectiveStar = overrideStar ?? computedStar`. Parent star is priority context only, not the child star.
10. **LABEL** — map the planned card type to the approved Card Label System one-to-one. Star = exam priority; category label = learning/memory mode; auxiliary labels = exam traits. Never use category color to imply priority.
11. **NEW TOPIC** — when a genuinely new tested concept appears, create a candidate L2 atomic topic with `NEW_TOPIC_REVIEW` and auxiliary label `🆕 NEW`; do not force it into an unrelated legacy topic because its frequency is initially low.
12. **CARD PLAN** — use L2 atomic topics as the default L3 card unit. Default one card per atomic topic; split further only when distinct exam patterns require separate cards.
13. **SNAPSHOT/QA** — append an analysis snapshot and change log, update subject Master Index files, then run QA before declaring card data current.

## Hard Gates

- Missing raw official PDF => `PENDING_DRIVE_MIRROR`; analysis may proceed from verifiable official content, but **full update is not complete**.
- Never report mirror complete unless every registry source has an archive Drive file ID.
- Never report atomic analysis complete until all ACTIVE S3 questions have a primary L2 atomic-topic mapping.
- Never assign a child atomic-topic count/star by inheriting the L1 parent count/star.
- Never replace computed history with a manual override.
- Never mix sample-question counts into real-exam ratios.
- Never delete old source versions, atomic topics with history, or old analysis snapshots.
- Never invent a new card category, display label, icon, or system code outside `key-card-label-policy.yaml`.

## Completion Report

Always report these independently:
- `OFFICIAL_CURRENT`: official list matches registry.
- `MIRROR_COMPLETE`: every ACTIVE official exam has raw PDF in Drive.
- `PARENT_QMAP_COMPLETE`: every ACTIVE exam question has one primary L1 parent mapping.
- `ATOMIC_QMAP_COMPLETE`: every ACTIVE exam question has one primary L2 atomic-topic mapping.
- `KEYCARD_CURRENT`: L2 counts/stars, L3 card plan, citations and approved labels are updated and QA-ready.

Only say **「已完整更新到最新」** when all five are true.

## Pressure Checks

Before completion, verify:
- New official PDF exists but Drive lacks it -> must not claim mirror complete.
- Same filename/version changed -> append new version, supersede old.
- Official sample added -> no historical-star effect.
- Parent mapping is 600/600 but atomic mapping is incomplete -> analysis is not yet key-card current.
- One-time new concept -> candidate atomic topic remains possible despite low ratio and gets `NEW` until QA resolves it.
- Human raises/lowers priority -> override is recorded without changing computed value.
- Card type changes -> visual label/code must follow the canonical one-to-one mapping without changing computed star.
