---
name: producing-course-chapter-intro-outro
description: Use when producing, revising, or continuing a course chapter that needs a chapter opener, chapter summary, closing page, or 8-second FLOW intro/outro assets.
---

# Producing Course Chapter Intro / Outro

## Core Contract

Use a **dynamic chapter length**. Do not force a fixed slide count.

- `00` = chapter opener / intro image — **8-second FLOW video eligible**
- `01` = chapter summary — **static image only**
- `02..N-1` = teaching content — **static images only**
- `N` = chapter conclusion / outro image — **8-second FLOW video eligible**

**Only `00` and `N` receive FLOW video prompts.** Never make middle teaching pages video-ready unless the user explicitly overrides this rule.

## Before Production

Read the latest governed chapter copy and current presentation policy. Resolve:

- course name + course code
- chapter number + chapter title
- core question
- chapter summary
- main teaching points
- final 1–3 conclusions
- next chapter title, if any

Choose the final page number from content completeness, not a quota.

## Intro Image `00`

Purpose: establish chapter identity and learning anticipation.

Required:

- course / chapter identity
- short chapter title
- one concise guiding line
- strong visual focus + generous whitespace
- 16:9 composition suitable for subtle 8-second motion

FLOW motion should be restrained: slow push-in, subtle light/shadow or environmental motion, stable text, no flashy effects.

## Summary Image `01`

Static only. Show the core problem, 2–3 learning outcomes, and one-line summary. Do not design it as a video scene.

## Outro Image `N`

Purpose: preserve **chapter aftertaste + next-chapter anticipation**.

Required:

- large negative space
- one closing sentence
- 1–3 key conclusions
- next chapter teaser: `下一章｜<章節名稱>`
- if this is the final course chapter, replace the teaser with whole-course closure

FLOW motion should be nearly still: very slow pull-back or micro-motion. Let attention settle on the next-chapter teaser during the final 1–2 seconds.

## Naming and Evidence

Image code:

`<COURSE_CODE>_CH<nn>_<page>`

Image filename:

`<image-code>_<圖片主題>_<一句話說明>.png`

FLOW prompt filename:

`<image-code>_<片頭|片尾>_FLOW8秒影片提示語_v<version>`

Keep the bottom 10% as subtitle-safe space. The image code is the only fixed informational text allowed there and stays at bottom-right.

## Version / Duplicate Rule

The image code is the permanent unique key. One code may have only one `CURRENT` version. When revising, preserve version history and prefer updating the same Drive File ID instead of creating a second formal file with the same code.

## QA Gates

Before delivery, require:

- `DYNAMIC_PAGE_COUNT_LOCKED`
- `INTRO_VIDEO_ONLY_00`
- `SUMMARY_STATIC_01`
- `MIDDLE_PAGES_STATIC_ONLY`
- `OUTRO_VIDEO_ONLY_FINAL_PAGE`
- `OUTRO_NEGATIVE_SPACE_OK`
- `NEXT_CHAPTER_TEASER_MATCHED` or `FINAL_COURSE_CLOSURE`
- `SUBTITLE_SAFE_ZONE_OK`
- `IMAGE_CODE_MATCHED`
- `CURRENT_VERSION_UNIQUE`
- `FLOW_TEXT_STABLE`

If any gate fails, revise before delivery.
