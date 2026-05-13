---
type: topic
owner: ראובן
area: vault / memory / docs
tags: [vault, obsidian, bootstrap, docs]
---

# Vault Bootstrap

## Overview

ה-vault תחת `vault/` הוא הזיכרון לטווח ארוך של הפרויקט. הוא ארגון של **קובץ אחד לנושא**, עם Overview קבוע + Open Questions + Session Log כרונולוגי. הפרוטוקול מוגדר ב-`.claude/skills/obsidian-vault-workflow/SKILL.md`.

מבנה התיקיות ש-skill מציב:

```
vault/
├── Meeting Notes/      ← קוד, ארכיטקטורה, החלטות, אינפרא
├── Content Briefs/     ← בריפים יצירתיים (Yael)
├── Publishing Log/     ← ריצות פרסום ופוסט-מורטמים
└── Brand Guidelines/   ← קול, ויזואל, טון, UI primitives
```

כל תיקייה כוללת `_index.md` שמרכז את ה-topics שבה עם תיאור בשורה.

### מה נוצר בסשן הראשון (2026-05-13)

קבצי topic תחת `vault/Meeting Notes/`:

- [[team-structure]] — `CLAUDE.md` והצוות
- [[claude-config]] — `.claude/`
- [[environment-variables]] — `.env`, `.env.example`, `.gitignore`
- [[git-and-repo-setup]] — git ו-GitHub
- [[superpowers-skills]] — 14 הסקילים מ-`obra/superpowers`
- [[obsidian-skills]] — 3 סקילי Obsidian
- [[vault-bootstrap]] — הקובץ הזה

שלוש התיקיות האחרות (Content Briefs / Publishing Log / Brand Guidelines) נוצרו עם `_index.md` ריק שמסביר את הייעוד — תוכן יתווסף ברגע שיעל/יובל/חן יתחילו לעבוד.

## Open Questions

- האם להחיל את הפרוטוקול אוטומטית בכל הפעלת Claude Code? — דורש הוק ב-`settings.json` (raאה ההערה לראובן בסוף הסשן הזה).
- כשמתחיל פיתוח קוד אמיתי — להוסיף `vault/Decisions/` או להישאר עם Meeting Notes?
- האם כדאי `topics.base` שיציג את כל ה-topics לפי frontmatter? (`obsidian-bases`)

## Session Log

### 2026-05-13 — אתחול ה-vault ובניית מפת הקבצים [shipped]
- **What was done:** סריקת כל הפרויקט (`CLAUDE.md`, `.env*`, `.gitignore`, `.claude/`, 17 skills). יצירת `vault/Meeting Notes/` עם 7 topic files ו-`_index.md` ראשי. יצירת `_index.md` placeholders ב-Content Briefs / Publishing Log / Brand Guidelines. כל topic file כולל frontmatter (owner, area, tags), Overview, Open Questions, ו-Session Log לפי הפרוטוקול.
- **Decisions:**
  - כל קובץ מופה לבעלים אחד מתוך `CLAUDE.md`: ראובן (אינפרא/ניתוב), יעל (תוכן), יובל (ויזואל), חן (מחקר). רוב הקבצים הם של ראובן כי כל מה שקיים כיום הוא אינפרא.
  - השתמשתי בקיבוץ "קובץ אחד לנושא" ולא "קובץ אחד לכל קובץ פיזי" — זה התקן של הפרוטוקול. קבצים מקובצים נכנסים לטבלת **קבצים בנושא** בכל topic.
  - תיקיות `Content Briefs` / `Publishing Log` / `Brand Guidelines` נוצרו אבל **בלי** topic notes — רק `_index.md` שמסביר את הייעוד.
- **Notes / Caveats:**
  - ה-vault הזה עדיין לא נדחף ל-GitHub. הקומיט הבא יכלול אותו + את `.env.example` + עדכון `.gitignore` שעדיין unstaged משיחה קודמת.
  - הבקשה של ראובן "להפעיל את הסקיל בכל סשן/פקודה" — זו התנהגות אוטומטית שדורשת **hook** ב-`.claude/settings.json` (לא תיתמך על ידי זיכרון רגיל). פירוט בתשובה לסיום הסשן.
- **Related:** [[team-structure]], [[claude-config]], [[environment-variables]], [[git-and-repo-setup]], [[superpowers-skills]], [[obsidian-skills]]
