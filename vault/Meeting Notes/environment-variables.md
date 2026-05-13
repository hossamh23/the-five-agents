---
type: topic
owner: ראובן
area: infra / secrets
tags: [env, secrets, infra, gitignore]
---

# Environment Variables

## Overview

ניהול משתני סביבה וקבצים מוחרגים בפרויקט. שלושה קבצים קשורים:

- **`.env.example`** — תבנית פומבית עם placeholders. **כן** נדחפת ל-git כדי שכל מפתח/סוכן יידע אילו משתנים נדרשים.
- **`.env`** — הערכים האמיתיים, **לא** נדחף ל-git (מופיע ב-`.gitignore`).
- **`.gitignore`** — מחריג כרגע: `.DS_Store`, `.env`, `.env.local`, `.env.*.local`.

המשתנים שכרגע מתועדים ב-`.env.example`:

| משתנה | מטרה |
|---|---|
| `ANTHROPIC_API_KEY` | מפתח API ל-Claude |
| `OPENAI_API_KEY` | מפתח API ל-OpenAI |
| `GITHUB_TOKEN` | טוקן GitHub (push, API) |
| `NODE_ENV` | `development` / `production` |

### קבצים בנושא

| קובץ | תפקיד | בעלים | נדחף ל-git? |
|---|---|---|---|
| `.env.example` | תבנית למפתח/סוכן | ראובן | ✅ |
| `.env` | סודות מקומיים | ראובן | ❌ |
| `.gitignore` | חוקי החרגה | ראובן | ✅ |

## Open Questions

- ה-placeholders הנוכחיים הם ניחוש — אילו מפתחות **באמת** נדרשים לפרויקט? (אין עדיין קוד שצורך אותם)
- `.env` המקומי כרגע ריק מערכים אמיתיים. כדאי שראובן ימלא אותו.
- האם צריך `.env.development` / `.env.production` נפרדים?

## Session Log

### 2026-05-13 — יצירת `.env` ו-`.env.example` ראשוניים [shipped]
- **What was done:** יצירת `.env.example` עם 4 placeholders, `.env` ריק לעבודה מקומית, ועדכון `.gitignore` כדי לחסום את `.env*`.
- **Decisions:** ה-placeholders שנבחרו (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, `NODE_ENV`) הם ניחוש על בסיס סוג הפרויקט — לא על בסיס קוד קיים שצורך אותם. ראובן יעדכן כשייכתב קוד אמיתי.
- **Notes / Caveats:** הקבצים האלה עדיין **לא** נדחפו ל-GitHub (החלטה של ראובן להמתין).
- **Related:** [[git-and-repo-setup]], [[claude-config]]

### 2026-05-13 — דחיפה של `.env.example` ו-`.gitignore` ל-GitHub [shipped]
- **What was done:** קומיט `88114af` עם `.env.example` + עדכון ה-`.gitignore` נדחף ל-`origin/main`. `.env` עצמו נשאר מחוץ ל-git כצפוי.
- **Decisions:** קומיט קצר וממוקד — `.env*` בלבד, נפרד מ-Obsidian setup שירוץ אחריו.
- **Related:** [[git-and-repo-setup]]
