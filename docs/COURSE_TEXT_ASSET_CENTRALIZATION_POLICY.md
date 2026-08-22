# Course Text Asset Centralization Policy

Version: v1.0  
Status: APPROVED  
Scope: Course Factory shared policy

## 1. Purpose

This policy defines how course text assets are stored in Google Drive and referenced by the Course Factory control plane.

Core rule:

**同一教材用途的文字資產，必須跨章集中到同一個課程層級資料夾管理；不得再分散存放於各章節資料夾。**

The policy applies to all current and future course programs unless a program-specific profile explicitly overrides it.

## 2. Canonical storage principle

For a course with chapters such as `CH00` to `CH10`:

- text assets are organized by **asset type**, not by chapter;
- one asset-type folder contains the corresponding files for all chapters;
- chapter identity remains in the filename;
- chapter folders are reserved for chapter-specific generated assets, source materials, images, audio, video, or other artifacts that are not governed as centralized text assets;
- the same text asset must not be duplicated in both the centralized folder and a chapter folder.

## 3. Approved top-level text folders

The current standard is:

1. `01_簡報文案`
   - all slide copy / slide scripts across every chapter
2. `02_簡報Prompt`
   - all NotebookLM or slide-generation prompts across every chapter
3. `03_語音文案`
   - all narration source text / voice scripts across every chapter
4. `04_語音Prompt`
   - all NotebookLM voice prompts / voice-generation prompts across every chapter

Future text asset types must follow the same model. Examples include:

- `05_影片文案`
- `06_影片Prompt`
- `07_講義文案`
- `08_社群文案`

The exact numbering may be extended, but an existing number or meaning must not be silently repurposed.

## 4. Folder hierarchy

Canonical structure:

```text
<COURSE_ROOT>/
├─ 01_簡報文案/
├─ 02_簡報Prompt/
├─ 03_語音文案/
├─ 04_語音Prompt/
├─ CH00_<章節名稱>/
├─ CH01_<章節名稱>/
├─ CH02_<章節名稱>/
└─ ...
```

Do not create this pattern:

```text
CH01/
├─ 簡報文案/
├─ 簡報Prompt/
├─ 語音文案/
└─ 語音Prompt/
```

unless a documented exception has been approved.

## 5. Naming contract

Centralization changes the folder location, not the chapter identity.

Every text asset filename must retain enough information to identify:

- course or series code;
- chapter number;
- chapter title when applicable;
- asset type;
- version.

Preferred pattern:

```text
<COURSE_CODE>_CH<NN>_<CHAPTER_TITLE>_<ASSET_TYPE>_v<MAJOR.MINOR>
```

Examples:

```text
GBXM_CH03_別再花兩小時找資料_簡報文案_v1.0
GBXM_CH03_別再花兩小時找資料_NotebookLM簡報Prompt_v1.0
GBXM_CH03_別再花兩小時找資料_語音來源_v1.0
GBXM_CH03_別再花兩小時找資料_NotebookLM語音Prompt_v1.0
```

Existing valid filenames do not need to be renamed only because this policy is adopted.

## 6. Move-not-copy rule

When migrating an existing course:

1. identify the asset type;
2. create or reuse the canonical top-level asset folder;
3. **move** the authoritative file into that folder;
4. do not leave a duplicate authoritative copy in the original chapter folder;
5. preserve the file ID when possible;
6. preserve filename and version unless a separate naming migration has been approved.

The goal is one authoritative Drive location per text asset.

## 7. Chapter folder contract

After centralization, chapter folders should contain only assets that are naturally chapter-local, such as:

- final slide images;
- generated presentations when the course profile stores them per chapter;
- audio files;
- video files;
- chapter-specific source files;
- chapter-specific visual references;
- other non-text production artifacts approved by the course profile.

They must not be used as the primary storage location for centrally governed text assets.

## 8. Source of truth

- GitHub is the source of truth for this policy, naming contracts, manifests, and workflow state.
- Google Drive is the asset plane where the governed folders and files physically live.
- Drive folder presence alone does not define workflow completion.
- If a manifest exists for the course, it should reference the centralized asset location or file ID rather than infer location from chapter-folder nesting.

## 9. Agent behavior

Agents working on course production must:

- inspect the course root before creating a new text asset folder;
- reuse an existing centralized folder when one exists;
- never create per-chapter copies of a centrally managed text asset by default;
- place a new asset into the correct centralized folder immediately;
- keep chapter number and asset type in the filename;
- avoid silently changing existing folder semantics;
- report migrations or exceptions when they materially change the approved structure.

## 10. Exceptions

An exception is allowed only when the asset is truly chapter-local and cannot reasonably be managed as a course-level collection.

Any exception must record:

- reason;
- affected asset type;
- affected chapter(s);
- alternative storage location;
- whether the exception is temporary or permanent.

Convenience alone is not an acceptable reason for creating duplicated chapter-level text folders.

## 11. Current approved example

For the GBXM course root, the approved centralized text folders are:

- `01_簡報文案`
- `02_簡報Prompt`
- `03_語音文案`
- `04_語音Prompt`

All `CH00` to `CH10` files of the same text-asset type are managed together in the corresponding top-level folder.

## 12. Compliance statement

A course structure is compliant only when:

- each governed text asset type has one canonical course-level folder;
- files remain chapter-identifiable by name;
- authoritative text files are not duplicated across chapter folders;
- future text-asset types follow the same centralized pattern;
- any deviations are explicitly documented and approved.
