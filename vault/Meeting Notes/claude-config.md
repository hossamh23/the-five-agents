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
- **`agents/`** — הגדרות סוכנים מותאמים אישית (יעל/יובל/חן). **כרגע ריק**.
- **`commands/`** — סלאש-קומנדים מותאמים. **כרגע ריק**.
- **`skills/`** — סקילים שניתן להפעיל דרך כלי ה-Skill. **17 סקילים מותקנים**: 14 מ-Superpowers + 3 של Obsidian.

> [!info] settings.local.json נכון להיום
> מכיל permission יחיד שאישרה את `mkdir -p` של תיקיות `agents/`, `skills/`, `commands/` בשלב האתחול.

### קבצים בנושא

| קובץ / תיקייה | תפקיד | בעלים |
|---|---|---|
| `.claude/settings.local.json` | הרשאות bash מקומיות | ראובן |
| `.claude/agents/` | (ריק) הגדרות יעל/יובל/חן | ראובן |
| `.claude/commands/` | (ריק) סלאש-קומנדים | ראובן |
| `.claude/skills/` | 17 סקילים מותקנים | כל הצוות |

## Open Questions

- האם `.claude/settings.local.json` צריך להיכנס ל-git? כרגע הוא **כן** נדחף (לא מופיע ב-`.gitignore`). זה בכוונה? Anthropic ממליצה לרוב לא לדחוף `settings.local.json`.
- מתי נוסיף settings בלי `.local` (כלומר `.claude/settings.json` משותף לכל הצוות)?
- כתיבת ה-agent definitions עבור יעל/יובל/חן — מתי?

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
