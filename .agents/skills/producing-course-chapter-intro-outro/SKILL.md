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
- chapter emotion / learning tension
- chapter-specific visual metaphor

Choose the final page number from content completeness, not a quota.

## Intro Theme Lock

Every chapter opener must be designed from the chapter's actual subject matter.

Before generating `00`, explicitly define:

1. `chapterTheme` — what this chapter is really about;
2. `coreQuestion` — the tension or question the learner enters with;
3. `chapterMood` — e.g. reflective, urgent, clarifying, investigative, collaborative;
4. `visualMetaphor` — a concrete visual idea derived from the chapter, not from another chapter's opener;
5. `guidingLine` — one concise sentence that pulls the learner into the chapter.

Course-level consistency must remain stable: typography system, palette family, whitespace discipline, subtitle-safe zone, image-code position, and overall art direction.

Chapter-level distinctiveness must change when appropriate: main scene, metaphor, composition, props, focal object, mood, lighting emphasis, and visual storytelling.

**Hard rule:** Do not reuse the same opener scene/layout and merely replace the title. A cloned opener is a QA failure.

## Intro Image `00`

Purpose: establish chapter identity and learning anticipation.

Required:

- course / chapter identity
- short chapter title
- one concise guiding line
- strong visual focus + generous whitespace
- visible connection to the chapter's core problem or metaphor
- 16:9 composition suitable for subtle 8-second motion

FLOW motion should be restrained and derived from the scene: slow push-in, subtle light/shadow or environmental motion, stable text, no flashy effects. The movement must support the chapter mood instead of becoming a generic animation preset.

## Summary Image `01`

Static only. Show the core problem, 2–3 learning outcomes, and one-line summary. Do not design it as a video scene.

## Middle Teaching Images `02..N-1`

Static only. Optimize for teaching completeness and visual clarity. Use diagrams, comparisons, cases, process maps, cards, or other governed layouts as needed. Do not reduce information merely to make these pages animation-friendly.

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
- `INTRO_THEME_MATCHED`
- `INTRO_NOT_TEMPLATE_CLONED`
- `COURSE_VISUAL_SYSTEM_MATCHED`
- `CHAPTER_VISUAL_DISTINCTIVENESS_OK`
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
