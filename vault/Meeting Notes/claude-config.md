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
