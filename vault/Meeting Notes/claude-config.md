---
type: topic
owner: ראובן
area: tooling / claude-code
tags: [claude-code, config, infra]
---

# Claude Config (.claude/)

## Overview

תיקיית `.claude/` היא התשתית של Claude Code בפרויקט. היא מחזיקה ארבעה רכיבים:

- **`settings.local.json`** — קונפיגורציה מקומית (לא משותפת ב-git לרוב), בעיקר רשימת ה-permissions שאושרו ב-bash. שמור ל-Read.
- **`agents/`** — הגדרות סוכנים מותאמים אישית: `yael.md`, `yuval.md`, `chen.md`. ראה [[team-structure]] לפרטים על תוכן ההגדרות.
- **`commands/`** — סלאש-קומנדים מותאמים. **כרגע ריק**.
- **`skills/`** — סקילים שניתן להפעיל דרך כלי ה-Skill. **19 סקילים מותקנים**: 14 מ-Superpowers + 3 של Obsidian + `skill-creator` הרשמי של Anthropic + `gpt-image-gen` (מעטפת ל-OpenAI Images API, מודל `gpt-image-2`).

> [!info] settings.local.json נכון להיום
> מכיל permission יחיד שאישרה את `mkdir -p` של תיקיות `agents/`, `skills/`, `commands/` בשלב האתחול.

### קבצים בנושא

| קובץ / תיקייה | תפקיד | בעלים |
|---|---|---|
| `.claude/settings.local.json` | הרשאות bash מקומיות | ראובן |
| `.claude/agents/{yael,yuval,chen}.md` | system prompts של הסוכנים | ראובן (עורך) + הסוכן הרלוונטי |
| `.claude/commands/` | (ריק) סלאש-קומנדים | ראובן |
| `.claude/skills/` | 17 סקילים מותקנים | כל הצוות |

## Open Questions

- האם `.claude/settings.local.json` צריך להיכנס ל-git? כרגע הוא **כן** נדחף (לא מופיע ב-`.gitignore`). זה בכוונה? Anthropic ממליצה לרוב לא לדחוף `settings.local.json`.
- מתי נוסיף settings בלי `.local` (כלומר `.claude/settings.json` משותף לכל הצוות)?
- כתיבת ה-agent definitions עבור יעל/יובל/חן — מתי?
- `skill-creator` הותקן כ-vendored copy (`clone` מ-`anthropics/skills@main`, בלי pinning ל-tag). מתי/איך לרענן upstream? לשקול: cron sync, או pin ל-commit SHA ב-README.
- `gpt-image-gen` קורא ל-OpenAI Images API עם מודל `gpt-image-2` — אין rate limit / budget cap. אם usage יגדל — להוסיף מנגנון מעקב (קצב, $).

## Session Log

### 2026-05-13 — תיעוד מבנה `.claude/` ראשוני [planned]
- **What was done:** מיפוי כל מה שיש ב-`.claude/`: settings, תיקיות ריקות (agents/commands), סקילים מותקנים.
- **Decisions:** לסמן `settings.local.json` כשאלה פתוחה לעניין git tracking — לא משנים כרגע, רק מסמנים.
- **Notes / Caveats:** הסקילים נדחפו כבר ל-`origin/main` בקומיט `3aebbe8` — ראה [[git-and-repo-setup]].
- **Related:** [[team-structure]], [[superpowers-skills]], [[obsidian-skills]], [[git-and-repo-setup]]

### 2026-05-13 — הוספת `.claude/settings.json` עם UserPromptSubmit hook [shipped]
- **What was done:** נוצר `.claude/settings.json` (משותף, נכנס ל-git — שונה מ-`settings.local.json`) עם hook ב-`UserPromptSubmit` שמזריק system-reminder להפעיל את `obsidian-vault-workflow` לפני כל תגובה. הפלט עבר ולידציה (`jq -e`) ו-round-trip בש"ל.
- **Decisions:**
  - מיקום: `.claude/settings.json` ולא `settings.local.json` — כי זו התנהגות שצריכה להיות זהה לכל המפתחים/הסוכנים בפרויקט, לא מקומית.
  - שיטה: `printf` של JSON סטטי עם `hookSpecificOutput.additionalContext` — לא דורש סקריפט חיצוני, אין תלויות.
  - הפעלה: `UserPromptSubmit` (לא `SessionStart`) — כל הודעה ממשתמש מקבלת תזכורת, לא רק תחילת סשן.
- **Notes / Caveats:** ה-watcher של Claude Code מגלה את הקובץ רק כש-`.claude/` היה חי בתחילת הסשן — ייתכן שנדרש לפתוח `/hooks` פעם אחת או לעשות restart כדי שהוק יתחיל לרוץ בסשן הזה. בסשנים הבאים — אוטומטי.
- **Related:** [[vault-bootstrap]], [[obsidian-skills]], [[git-and-repo-setup]]

### 2026-05-13 — אימות שה-hook יורה בפועל [shipped]
- **What was done:** בהודעת המשתמש הבאה אחרי הקומיט, ה-`UserPromptSubmit` hook ירה והזריק את ה-`additionalContext` בדיוק כמתוכנן (ראיתי `<system-reminder>` עם הטקסט המלא שהגדרתי ב-`settings.json`).
- **Decisions:** אין מה לשנות — הקונפיגורציה עובדת. ה-caveat בכניסה הקודמת ("ייתכן שנדרש לפתוח `/hooks`") התברר כלא רלוונטי במקרה הזה — ה-watcher קלט את הקובץ בלי התערבות.
- **Notes / Caveats:** עדיין לא נבדק בסשן חדש לגמרי — רק באותו סשן שיצר את הקובץ. סביר שזה יעבוד, אבל מומלץ לאמת בסשן הבא של ראובן.
- **Related:** [[vault-bootstrap]]

### 2026-05-13 — התקנת `skill-creator` ב-project scope [shipped]
- **What was done:**
  - ניסיון ראשון: `claude plugin install skill-creator@claude-plugins-official --scope project` נכשל — אין `claude` CLI על המכונה (הסשן רץ מתוך Claude desktop app בלבד, לא דרך ה-CLI). שלב 2 ו-3 שביקש המשתמש (`marketplace add`, ואחר כך install מ-marketplace אחר) ייכשלו מאותה סיבה — לא רק "plugin not found".
  - מסלול חלופי (בהחלטת ראובן "תחליט לבד את הכי נכון"): `git clone --depth 1 https://github.com/anthropics/skills.git /tmp/...` ואז `cp -R skills/skill-creator .claude/skills/skill-creator`. תיקייה מלאה (18 קבצים: `SKILL.md`, `agents/`, `assets/`, `eval-viewer/`, `references/`, `scripts/`, `LICENSE.txt`).
  - אימות: ב-`<system-reminder>` הבא של הסשן ה-skill `skill-creator` הופיע ברשימת ה-skills הזמינים **בלי prefix** (לעומת `anthropic-skills:skill-creator` שכבר היה — זה ה-bundle של ה-desktop app, user-scope). ההופעה ללא prefix = ה-watcher של Claude Code קלט אותו כ-project-scope skill.
- **Decisions:**
  - **שיטה: clone ידני, לא npm-install של claude CLI.** הסיבה: המכונה לא מותקן עליה ה-CLI, ההתקנה דרך `npm install -g` הייתה דורשת sudo או הרשאות ל-`/usr/local/lib`. ה-clone הידני מגיע לאותה תוצאה (skill ב-project scope, נכנס ל-git) בלי לגעת ב-system state.
  - **מיקום: `.claude/skills/skill-creator/`** — תואם בדיוק לתבנית של 17 הסקילים האחרים (Superpowers + Obsidian), במקום מנגנון plugin/marketplace נפרד. מקסימום פשטות, מקסימום portability — `git clone` של ה-repo מספיק כדי שכל מפתח/סוכן יקבל את הסקיל.
  - **לא נגענו ב-`settings.json` של plugins/marketplaces** — לא נדרש כשהסקיל יושב ישירות ב-`.claude/skills/`.
- **Notes / Caveats:**
  - `skill-creator` הרשמי של Anthropic ≠ הסקילים מ-`obra/superpowers` (אלה ב-[[superpowers-skills]]). אם בעתיד נביא עוד סקילים מ-`anthropics/skills` כדאי לשקול לפצל ל-topic נפרד `anthropic-skills.md` (כרגע אחד בודד — בתוך claude-config מספיק).
  - גרסה: clone של `main` ב-`anthropics/skills` נכון ל-2026-05-13. אין pinning ל-tag — אם הסקיל ישתנה upstream נצטרך לרענן ידנית.
  - `LICENSE.txt` של Anthropic נכלל בתיקייה — לא הוסר.
- **Related:** [[superpowers-skills]], [[obsidian-skills]], [[git-and-repo-setup]]

### 2026-05-13 — הוספת סקיל `gpt-image-gen` (OpenAI gpt-image-2) [shipped]
- **What was done:**
  - נוצר `.claude/skills/gpt-image-gen/SKILL.md` (single-file, ללא subdirs — תואם תבנית `brainstorming/SKILL.md`). frontmatter `name` + `description` בלבד.
  - הסקיל מעטף קריאה ל-`POST https://api.openai.com/v1/images/generations` עם `"model": "gpt-image-2"`, `size=1024x1024`, `quality=medium`, `output_format=png`. מפענח `b64_json` ל-PNG.
  - שני מסלולי decode: **ראשי** דרך `jq` + `base64 --decode` (POSIX). **fallback** דרך `python3 -c "import json,base64..."` ל-Git Bash בחלונות.
  - דורש `OPENAI_API_KEY` ב-env. דפוס טעינה מומלץ: `set -a; source .env; set +a` לפני הקריאה.
  - אימות: ב-`<system-reminder>` של הסשן ה-skill `gpt-image-gen` הופיע ברשימת ה-skills בלי prefix — project-scope.
- **Decisions:**
  - **שם המודל `gpt-image-2`** — לפי הוראת המשתמש (שוחרר 21/04/2026, אחרי ה-knowledge cutoff שלי). ה-SKILL.md כולל בלוק אזהרה מפורש "אל תחליף את שם המודל". אם קריאה נכשלת — בעיה ב-key/parameters/quota, לא במודל.
  - **lookup ל-`.env`** מתוך הסקיל ולא env injection חיצוני — מצמצם תלות, ה-skill עצמאי.
  - **אין retry אוטומטי** — הסקיל מחזיר שגיאה מיידית. ה-caller (יובל בעיקר) מחליט.
  - **תיעוד ה-prompt באחריות ה-caller**, לא הסקיל. הסקיל = שכבת transport; היסטוריה היא של יובל (sidecar `.txt` ליד כל PNG).
- **Notes / Caveats:**
  - **Smoke test לא רץ עדיין** — דורש OPENAI_API_KEY אמיתי ב-`.env` (כרגע ריק). הקריאה מוכנה מבחינת syntax אבל לא נבדקה end-to-end.
  - **עלות:** gpt-image-2 לא חינמי. ב-quality=medium ייתכן ~$0.04 ל-תמונה (לא מאומת). אם usage יתפוצץ — צריך budget cap.
  - **תיעוד הסקיל בעברית** — חורג מהקונבנציה של 17 הסקילים האחרים שכולם באנגלית. שיקול: ה-skill הזה ייקרא ע"י יובל (גם עברי), ול-Reuven (גם עברי). השארנו עברי.
- **Related:** [[team-structure]], [[environment-variables]]
