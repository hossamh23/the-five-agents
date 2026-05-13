---
type: topic
owner: ראובן
area: team / governance
tags: [team, agents, claude-md]
---

# Team Structure

## Overview

הפרויקט `the-five-agents` הוא צוות סוכנים ליצירת תוכן. **ראובן** הוא המנכ"ל (router) — כל בקשת משתמש מגיעה אליו והוא מנתב אותה לאחד או יותר מאנשי הצוות:

- **יעל** (`yael`) — כותבת תוכן (טקסט, ניסוח, עריכה, התאמה לקהל ופורמט). מוגדרת ב-`.claude/agents/yael.md`.
- **יובל** (`yuval`) — מעצב תמונות (רעיונות חזותיים, יצירת תמונות, התאמה לתוכן). מוגדר ב-`.claude/agents/yuval.md`.
- **חן** (`chen`) — חוקרת (איסוף מידע, אימות עובדות, מחקר רקע). מוגדרת ב-`.claude/agents/chen.md`.

המוח של ראובן יושב ב-`CLAUDE.md` בשורש הפרויקט. הוא כולל הוראות ניתוב מפורשות (טבלה של "סוג בקשה → סוכן") שמעבירות בקשות לסוכן הנכון. הסוכנים עצמם הם Claude Code subagents קונבנציונליים — הפעלה דרך כלי `Agent` עם `subagent_type`.

> [!note] על הסוכן החמישי
> שם הפרויקט הוא "the-five-agents" אבל בפועל כיום יש 4 (ראובן + 3). הסוכן החמישי עדיין לא הוגדר — דורש החלטה (אופציות אפשריות: עורך/QA, אנליסט-נתונים).

### קבצים בנושא

| קובץ | תפקיד | בעלים |
|---|---|---|
| `CLAUDE.md` | מוח/ראוטר של ראובן + מטריצת ניתוב | ראובן |
| `.claude/agents/yael.md` | system prompt של יעל | יעל (עורך ראשי: ראובן) |
| `.claude/agents/yuval.md` | system prompt של יובל | יובל (עורך ראשי: ראובן) |
| `.claude/agents/chen.md` | system prompt של חן | חן (עורכת ראשית: ראובן) |

## Open Questions

- מי הסוכן החמישי? אופציות: עורך/QA, אנליסט-נתונים, או מקצוע אחר.
- ה-v1 defaults של חן/יובל נכתבו ללא brand book ספציפי — מתי יוגדר מותג קונקרטי שיחליף את ברירות המחדל? (יעל עברה ל-v2 ב-2026-05-13 — ה-style guide שלה ב-`yael/style-guide.md` ניתן לעדכון בלי לגעת בסוכן.)
- האם להוסיף ל-`yuval` כלי ליצירת תמונה אמיתי (MCP image-gen, ImageMagick וכו') או להישאר ברמת prompts?
- האם להוסיף ל-`chen` רשימה לבנה של מקורות (`allowedDomains` ב-WebFetch) ברגע שייקבע תחום פעילות?
- האם להפוך את הסולם 🟢🟡🔴 של חן לכלל ניסוחי גם אצל יעל (לציין סמך/אי-סמך במאמר עצמו)?
- האם `Content/` ו-`Output/` צריכים להיכנס ל-`.gitignore`? כרגע **כן** נדחפים. `Output/` עלול לגדול עם הזמן.
- מילות מפתח לזיהוי בקשות עבור `chen` ו-`yuval` ב-CLAUDE.md — מתי להוסיף? (לעת עתה רק `yael` יש לה.)
- האם יעל תזדקק אי-פעם ל-WebFetch (להבאת מקור חיצוני שצוטט במאמר המקורי)? כרגע חסום — אם כן, הפתרון הוא delegation ל-`chen`, לא הוספת כלי ליעל.
- **🐛 Bug לבדיקה:** יעל דיווחה ש-`yael/style-guide.md` לא קיים (במצב smoke test 2026-05-13) — בפועל הוא קיים. לבדוק בסשן הבא (אחרי שה-system prompt טוען yael v2) אם הבעיה ממשיכה. אם כן — אולי הסוכן רואה cwd שונה מהפרויקט, או שצריך לציין נתיב מלא מ-`/Users/.../` ב-system prompt של יעל.
- "תלמידים שלי" במאמר CRM — הוסר על ידי יעל. דורש אישור סופי. (ראה `vault/Publishing Log/maamar-crm.md`.)
- **Smoke test ל-flow `yael → yuval → merge`** — לא רץ עדיין; דורש `OPENAI_API_KEY` אמיתי ב-`.env`. כשירוץ — לאמת ש-yuval מצליחה לקרוא ל-`gpt-image-gen` ושראובן עושה substitution נכון ב-md+html.
- **API budget cap** ל-gpt-image-2 — אין כרגע. אם יוצרים הרבה תמונות, צריך מנגנון מעקב/הגבלה.
- **`yuval/reference/` ריקה** — כל תמונה תסתמך רק על ה-style-guide הכתוב. מתי לזרוע 3–5 תמונות ייחוס?
- **Chen trigger keywords** ב-CLAUDE.md עדיין חסרות.

## Session Log

### 2026-05-13 — תיעוד מבני ראשוני של הצוות [planned]
- **What was done:** רישום מבנה הצוות מתוך `CLAUDE.md` כ-topic note ראשון ב-vault. הוגדרו תפקידים, בעלים, ושאלות פתוחות.
- **Decisions:** ראובן הוא היחיד שמוגדר עם תוכן כרגע — שאר הסוכנים (יעל/יובל/חן) קיימים שמית ב-`CLAUDE.md` אבל אין להם עדיין קבצי `agents/*.md`. ההגדרות יבואו בעתיד.
- **Notes / Caveats:** "five agents" בשם הפרויקט אבל בפועל 4 — סוכן חמישי עדיין פתוח.
- **Related:** [[claude-config]], [[vault-bootstrap]]

### 2026-05-13 — כתיבת agent definitions + מטריצת ניתוב [shipped]
- **What was done:**
  - נוצרו 3 sub-agents תחת `.claude/agents/`: `yael.md`, `yuval.md`, `chen.md`. כל אחד עם frontmatter (name, description למצ'ינג סמנטי, tools רלוונטיים) וגוף בעברית — תחומי אחריות, גבולות (מה לא לעשות), פרוטוקול ה-vault, ומסומן "טיוטה ראשונה" להזמין עריכה.
  - tools per agent: יעל/יובל קיבלו filesystem בלבד; חן קיבלה גם `WebSearch` ו-`WebFetch` כי זה כלי העבודה שלה.
  - `CLAUDE.md` עודכן: הוסרה ה"## הערה" המיושנת, נוספה "## הוראות ניתוב" עם טבלת מיפוי "סוג בקשה → סוכן" וכללי delegation (העברת הקשר, מתי לפצל במקביל, מתי לענות ישירות בלי delegation).
- **Decisions:**
  - **delegation = Agent tool**: הסוכנים הם Claude Code subagents קונבנציונליים, לא מנגנון חדש. השימוש דרך `Agent` עם `subagent_type` שם הסוכן.
  - **חוקי handoff מפורשים**: כל סוכן יודע למי מעבירים החוצה — `yael` ל-`yuval`, `chen` ל-`yael`. ראובן הוא ה-router, לא הסוכנים בינם.
  - **טיוטה ראשונה**: לא הומצא טון/קול/פלטה — נכתב סקלטון שמזמין עריכה. עדיף לתת לראובן (המשתמש) להחליט מאשר שאני אנחש.
- **Notes / Caveats:**
  - הסוכן החמישי לא הוגדר — שאלה פתוחה.
  - כשראובן ירצה לערוך — הקבצים הם `.claude/agents/<name>.md`. שמירה מחדש = הסוכן מקבל גרסה חדשה בהפעלה הבאה.
- **Related:** [[claude-config]], [[vault-bootstrap]]

### 2026-05-13 — Smoke test ראשון של ה-flow של יעל v2 [shipped]
- **What was done:** הלקוח הפיל מאמר RTF (`Content/מאמר CRM.rtf`, ~1557 מילים, עברית, על CRM) וביקש שכתוב דרך יעל. ראובן (אני) המיר RTF→md ב-`Content/maamar-crm.md` (yael בלי Bash → context-handoff מוקדם), ואז delegation דרך `Agent` עם `subagent_type: yael`. יעל החזירה `Output/maamar-crm.md` (1344 מילים, קיצוץ 14%) + `Output/maamar-crm.html` (תבנית עם dir="auto" inline CSS), וגם יצרה `vault/Publishing Log/maamar-crm.md` עם Overview/Open Questions/Session Log.
- **Decisions:**
  - **המרת RTF היא של ראובן, לא יעל.** מאחר שיעל בלי Bash, כל הכנת source ל-flow היא תפקיד הראוטר. במקרה זה — `textutil -convert txt` (built-in ב-macOS) לפני delegation.
  - **שמות slug-friendly באחריות ראובן.** הלקוח שמר את הקובץ בשם הלא-slug `מאמר CRM.rtf` (רווח + עברית); ראובן יצר את ה-canonical filename `maamar-crm` בהמרה.
  - **delegation prompt עם override מפורש:** ציינתי ליעל "הגרסה על הדיסק קודמת ל-system prompt" — כי הסשן הנוכחי טען את yael v1 עם Bash. עם זה לא ברור עד כמה זה השפיע בפועל (ראה bug למטה).
- **Notes / Caveats:**
  - **🐛 Bug אפשרי: יעל דיווחה ש-`yael/style-guide.md` לא קיים על הדיסק** — אבל הוא **כן** קיים (4198 בתים). אותו דבר ל-`yael/reference/_index.md`. השערה: יעל רצה עם system prompt של v1 שלא מכיר את הנתיב הזה, ולא ניסתה באמת Read עליו, או ש-tools של subagent רואים cwd שונה. **בדיקה לסשן הבא:** אחרי שה-system prompt טוען את yael v2 בהפעלה הבאה, להריץ smoke test נוסף ולוודא שהיא קוראת את style-guide בפועל.
  - **התוצר עצמו בסדר** — הקול תואם את style-guide (כי v1 yael הכיל את אותם עקרונות לפני שהם הוצאו). אם הסגנון יתעדכן ב-style-guide בעתיד, ה-bug הזה יהפוך משמעותי — יעל לא תיישם את העדכון.
  - יעל החליפה "איתי זרם" ב-"דני כהן" — בדיחה תרבותית הוחלפה בדוגמה ניטרלית. אם רוצים לשמור את הטון המקומי, צריך לציין זאת ב-style-guide או ב-`yael/reference/`.
  - "תלמידים שלי" הוסר — נראה soft-promo לקורס. דורש אישור הלקוח.
- **Related:** [[claude-config]], [[obsidian-skills]]

### 2026-05-13 — יעל v2: flow-focused לשכתוב מאמרים [shipped]
- **What was done:**
  - הוגדרה מחדש `.claude/agents/yael.md` (v2 → flow-focused): שלף מאמר מ-`Content/<name>.md`, קרא `yael/style-guide.md` ו-`yael/reference/`, שכתב בסגנון הבית, וכתוב שני קבצים ל-`Output/`: `<name>.md` + `<name>.html` עצמאי (CSS inline, system fonts, `dir="auto"` ל-RTL/LTR אוטומטי, max-width 720px). יעל מחזירה לראובן summary של 3–5 בולטים (נושא, שינויים, מה הוסר, wordcount, דגלים).
  - הסרת Bash מ-`tools`: עכשיו `Read, Write, Edit, Glob, Grep` בלבד. אין WebSearch/WebFetch/Agent.
  - יצירת `yael/style-guide.md` (היגרה ה-WIP שהיה קודם ב-yael.md — חמשת העקרונות, אורכי יעד, מסנן כותרת, do-not list — והתווסף בלוק "כללי שכתוב ספציפיים ל-flow `Content/` → `Output/`" שמטפל ב-CTAs/קישורים של מחבר מקורי).
  - יצירת תיקיות חדשות: `yael/reference/`, `Content/`, `Output/`, כל אחת עם `_index.md` שמסביר את התפקיד (משמש גם כ-keep-in-git).
  - עדכון `CLAUDE.md`: שורת ניתוב חדשה ל-flow השכתוב, החלפת השורה הגנרית של יעל בכזו שכוללת תרגום/סיכום, וסעיף חדש "מילות מפתח לזיהוי בקשות" עם trigger keywords (עברית + אנגלית) ל-`yael`.
- **Decisions:**
  - **הפרדת flow מ-voice.** הסוכן (`yael.md`) מתאר את ה-**איך** (שלף → קרא style → שכתב → פלוט md+html → summary). ה-**מה** (קול, אורכים, אסור) יושב ב-`yael/style-guide.md`. ניתן לעדכן מותג בלי לגעת בסוכן.
  - **HTML inline-CSS בלבד.** אין Bash → אין Pandoc/wkhtmltopdf. ה-template חי בטקסט של yael.md כדי שיעל תוכל לכתוב HTML ידנית. `dir="auto"` בלי לקבוע ידנית.
  - **`_index.md` במקום `.gitkeep`** — דו-תפקידי: שומר את התיקייה ב-git + מסמך על תפקיד התיקייה.
  - **Trigger keywords משוכפלים** ב-frontmatter description של yael.md (לטובת matching סמנטי) וגם ב-CLAUDE.md (לטובת ראובן שיודע מה מטה).
- **Notes / Caveats:**
  - הטיוטה הלא-קומיטדה של yael.md הוחלפה לחלוטין — תוכנה ניצול ב-style-guide. בעלי גישה לעבר יכולים `git show HEAD:.claude/agents/yael.md` או לראות ב-history.
  - `Output/` יכול לגדול עם הזמן (HTML × md לכל מאמר). אם זה הופך לבעיה — להוסיף ל-`.gitignore`. כרגע נשמר ב-git (Open Question).
  - יעל לא יכולה ליצור תמונות או להביא תמונות חיצוניות. אם המאמר במקור הכיל תמונות — יעל לא מעבירה אותן ל-HTML. אם נצטרך — delegation ל-`yuval`.
  - מילות המפתח של `chen` ו-`yuval` עדיין לא נוספו ל-CLAUDE.md.
- **Related:** [[claude-config]], [[obsidian-skills]], [[vault-bootstrap]]

### 2026-05-13 — יובל v2 + יעל v2.1 + flow תוכן+תמונה [shipped]
- **What was done:**
  - **סקיל חדש `gpt-image-gen`** (ראה [[claude-config]]) — מעטף ל-OpenAI Images API, מודל `gpt-image-2`. project-scope, הופיע ברשימת הסקילים בלי prefix.
  - **יובל v2** — `.claude/agents/yuval.md` הוגדר מחדש כ-flow-focused: סורק `yuval/reference/` (Glob על PNG/JPG), קורא `yuval/style-guide.md`, מנסח prompt באנגלית בפורמט קבוע (Subject/Composition/Lighting/Medium/Style/Mood/Palette/Aspect/Avoid), קורא ל-`gpt-image-gen` דרך Bash, שומר ב-`yuval/outputs/<YYYY-MM-DD>-<slug>.png` + sidecar `.txt` של ה-prompt, ומאמת עם `test -s` ו-`file ... | grep PNG`. כלים: `Read, Write, Bash, Glob` (אין Edit/WebSearch).
  - **`yuval/style-guide.md`** נוצר מ-WIP של yuval.md (4 עקרונות עיצוב + פלטה v1 + טיפוגרפיה + סגנון צילום + פורמט prompts + do-not list). תוספות: סעיפים "אסור" נוספו עם "פנים של אנשים אמיתיים מזוהים" ו"לוגואים של מותגים חיצוניים".
  - **`yuval/reference/_index.md` + `yuval/outputs/_index.md`** — placeholders עם הנחיות הפקדה ושמות.
  - **יעל v2.1** — `.claude/agents/yael.md` קיבל שני עדכונים: (א) שלב חדש בין כתיבת קבצים ל-summary — סימון `{{IMAGE_NEEDED: "..."}}` placeholders עם הנחיות (1–3 לכל מאמר 1000–1500 מילים; תיאור עצמאי שמובן בלי המאמר); (ב) ה-summary עכשיו כולל רשימה של כל ה-placeholders עם מיקום ותקציר; (ג) ל-HTML template הוסף `img { max-width: 100%; height: auto; margin: 1.5rem auto; display: block; border-radius: 6px; }`.
  - **CLAUDE.md** עודכן: (1) שלוש שורות routing הוחלפו (`רעיון ויזואלי` → `יצירת תמונה דרך gpt-image-2`; `תוכן end-to-end` → `מאמר + תמונות` עם flow yael→yuval; `החלטת מותג ויזואלית` → אזכור style-guide+reference); (2) מילות מפתח עברית+אנגלית של `yuval` נוספו לסעיף הקיים; (3) סעיף חדש **`## Flow: תוכן + תמונות (yael → yuval merge)`** בן 5 שלבים שמסביר איך ראובן מתאם בין יעל ליובל ועושה substitution ל-`<img>` ב-md+html; (4) "מבנה התיקיות" הורחב עם `yael/`, `yuval/`, `Content/`, `Output/`.
- **Decisions:**
  - **שם המודל `gpt-image-2`** — לפי הוראה מפורשת של המשתמש; אסור להחליף. הסקיל כולל אזהרה מודגשת בגוף.
  - **אותה הפרדת flow/style** של yael — yuval.md = איך (Flow + Bash), yuval/style-guide.md = מה (פלטה, טיפוגרפיה, סגנון).
  - **ראובן הוא ה-merger, לא יובל.** יובל יוצר תמונה אחת. ראובן הוא זה שמעתיק ל-`Output/<article>-images/` ועושה search-and-replace על ה-placeholders. הסיבה: יובל אינו צריך הקשר של מאמר ספציפי או של MD/HTML — תפקידו נקי.
  - **תמונות נשמרות גם ב-`yuval/outputs/`** (היסטוריה + איטרציה) **וגם ב-`Output/<article>-images/`** (self-containment של ה-Output). דופליקציה מודעת.
  - **לא נגעתי ב-`.env` / `.env.example`** — `OPENAI_API_KEY=` כבר קיים בשניהם מהבוטסטרפ של הסביבה.
- **Notes / Caveats:**
  - **Smoke test לא רץ** — דורש OPENAI_API_KEY אמיתי. עד שירוץ — ה-flow לא אומת end-to-end.
  - **persistence של system prompt v1** — כמו בסשן הקודם עם yael, ייתכן ש-yuval בסשן הנוכחי עוד טעון עם v1 (description גנרי, tools כולל Edit). יעבוד נכון רק בסשן הבא.
  - **דופליקציה של PNGs**: `yuval/outputs/` + `Output/<article>-images/` — שתי תיקיות, אותו קובץ. עלות disk קטנה, אבל אם יוצרים הרבה — אולי כדאי symlink.
- **Related:** [[claude-config]], [[environment-variables]]
