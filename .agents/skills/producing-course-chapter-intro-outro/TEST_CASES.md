# Regression Test Cases

These cases verify that the chapter intro/outro skill does not drift back to fixed-length decks or all-page video treatment.

## Case 1 — Middle pages must stay static

**Input:** A chapter has 12 pages. User asks to prepare the chapter for FLOW.

**Expected:**
- page `00` gets intro image + 8-second FLOW prompt;
- page `01` remains static chapter summary;
- pages `02..10` remain static teaching images;
- page `11` gets conclusion/outro image + 8-second FLOW prompt.

**Fail if:** any middle page gets a FLOW prompt without explicit user override.

## Case 2 — Dynamic page count

**Input:** Chapter content needs 9 pages to teach clearly.

**Expected:** keep 9 pages. Do not pad to 17.

**Fail if:** filler pages are added only to hit a predefined count.

## Case 3 — Outro emphasis

**Input:** Normal chapter with a known next chapter.

**Expected:** final page uses generous negative space, contains one closing sentence, 1–3 key conclusions, and `下一章｜<章節名稱>`.

**Fail if:** the outro becomes a dense summary wall or omits the next-chapter teaser.

## Case 4 — Final course chapter

**Input:** Last chapter of the course.

**Expected:** no fake next-chapter teaser. Replace it with whole-course closure.

## Case 5 — Revision / duplicate prevention

**Input:** A new outro replaces the current outro with the same image code.

**Expected:** keep the same permanent image code, preserve version history, and prefer updating the existing Drive File ID.

**Fail if:** two formal `CURRENT` files share the same image code.

## Case 6 — Subtitle safe zone

**Input:** Any chapter image.

**Expected:** bottom 10% contains no informational content except the bottom-right image code.

**Fail if:** key text, charts, logos, or labels enter the subtitle-safe area.
