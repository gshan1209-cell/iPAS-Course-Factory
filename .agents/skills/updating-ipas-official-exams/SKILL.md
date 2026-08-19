---
name: updating-ipas-official-exams
description: Use when manually checking, importing, synchronizing, or recalculating iPAS AI應用規劃師 official announced exam questions, official PDF archives, question mappings, key-card weights, or star ratings.
---

# Updating iPAS Official Exams

## Overview

Maintain iPAS official announced exams as a traceable, append-only source set. **Official-current, PDF-mirrored, analysis-current, and key-card-current are separate gates; never collapse them into one claim.**

## Canonical References

Read before changing state:
- `AGENTS.md`
- `docs/IPAS_EXAM_SOURCE_GOVERNANCE.md`
- `sources/registry/ipas-official-exams.yaml`
- `sources/registry/key-card-weight-policy.yaml`

Canonical discovery source: the iPAS AI應用規劃師 official learning-resources page recorded in the registry.

## Manual Update Workflow

Run only when the user explicitly asks to update/check/sync iPAS sources. Do not create scheduled monitoring unless explicitly requested again.

1. **DISCOVER** — compare the official learning-resources page with the registry. Do not infer latest state from Drive.
2. **IDENTIFY** — assign stable `sourceId`; same title with a different hash/version becomes a new version, never an overwrite.
3. **VERIFY** — verify official filename, exam date/session, PDF identity/size/hash when obtainable.
4. **MIRROR** — save the **raw official PDF** in project Drive under `00_官方來源_公告試題/初級` or `/中級`. Never recreate/re-render a PDF and call it official.
5. **REGISTER** — append/update registry metadata. Old versions become `SUPERSEDED`; do not delete history.
6. **EXTRACT/MAP** — create `questionUid = <sourceId>-Q<nn>` and map each question to one primary official competency indicator. Secondary concepts may be recorded separately.
7. **RECALC** — compute ratios from ACTIVE S3 announced exams only. Official samples, guides, errata, and internal supplements do not enter historical frequency.
8. **STAR** — write `computedStar`; preserve `overrideStar` and required `overrideReason`; publish `effectiveStar = overrideStar ?? computedStar`. Do the same for card counts.
9. **NEW TOPIC** — when a genuinely new tested concept appears, create a candidate card with `NEW_TOPIC_REVIEW`; do not force it into a legacy card just because frequency is initially low.
10. **SNAPSHOT/QA** — append an analysis snapshot and change log, update subject Master Index files, then run QA before declaring card data current.

## Hard Gates

- Missing raw official PDF => `PENDING_DRIVE_MIRROR`; analysis may be provisional if official content is verifiable, but **full update is not complete**.
- Never report `12/12 mirrored` unless every registry source has an archive Drive file ID.
- Never replace computed history with a manual override.
- Never mix sample-question counts into real-exam ratios.
- Never delete old source versions or old analysis snapshots.

## Completion Report

Always report these independently:
- `OFFICIAL_CURRENT`: official list matches registry.
- `MIRROR_COMPLETE`: every ACTIVE official exam has raw PDF in Drive.
- `ANALYSIS_CURRENT`: all ACTIVE exams are mapped and included in the latest snapshot.
- `KEYCARD_CURRENT`: Master Index effective stars/card counts are updated and QA-ready.

Only say **「已完整更新到最新」** when all four are true.

## Pressure Checks

Before completion, verify:
- New official PDF exists but Drive lacks it -> must not claim mirror complete.
- Same filename/version changed -> append new version, supersede old.
- Official sample added -> no historical-star effect.
- One-time new concept -> candidate card remains possible despite low ratio.
- Human raises/lowers priority -> override is recorded without changing computed value.
