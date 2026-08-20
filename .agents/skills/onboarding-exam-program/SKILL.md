---
name: onboarding-exam-program
description: Use when adding a new certification, recruitment exam, public-sector exam, or other exam program to the shared course factory. Creates an isolated program profile without copying semantic assumptions from an existing exam.
---

# Onboarding a New Exam Program

## Core Rule

**共用核心，考試隔離；先建 Profile，再進教材產製。**

Never clone iPAS semantics into a new program by default.

## Mandatory Read

1. `docs/MULTI_EXAM_FACTORY_ARCHITECTURE.md`
2. `sources/registry/exam-programs.yaml`
3. current shared production / QA policies

## Workflow

1. Register a unique `programCode`.
2. Identify the official program name and official authority from official sources.
3. Register official source entry points.
4. Define level / track / category model.
5. Define subject model.
6. Define official question UID format.
7. Define topic taxonomy.
8. Define which source types count toward historical frequency / weighting.
9. Define citation profile.
10. Create an isolated Drive root and source archive.
11. Define or inherit card / slide / mascot visual profiles.
12. Define program-specific QA gates.
13. Run a pilot unit.
14. Activate only after all onboarding gates pass.

## Activation Gates

- PROGRAM_REGISTERED
- OFFICIAL_SOURCES_REGISTERED
- SUBJECT_MODEL_READY
- TOPIC_TAXONOMY_READY
- QUESTION_ID_POLICY_READY
- STORAGE_READY
- QA_PROFILE_READY

## Postal Rule

`POSTAL` is the next planned program.

Do not infer its official tracks, subjects, weights, question counts, or source structure from iPAS. Fill those fields only after official-source discovery.

## Namespace

Every production artifact must include the program namespace in its global identity.

Global key pattern:

`<PROGRAM>-<TRACK_OR_LEVEL>-<SUBJECT>-<TOPIC_ID>-<ARTIFACT_ID>`

No global production key may omit `programCode` for newly onboarded programs.
