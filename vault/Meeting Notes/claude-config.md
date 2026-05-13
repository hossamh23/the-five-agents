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
- **`skills/`** — סקילים שניתן להפעיל דרך כלי ה-Skill. **18 סקילים מותקנים**: 14 מ-Superpowers + 3 של Obsidian + `skill-creator` הרשמי של Anthropic.

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
