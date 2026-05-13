---
type: topic
owner: כל הצוות
area: tooling / obsidian / memory
tags: [obsidian, skills, vault, memory]
---

# Obsidian Skills

## Overview

שלושה סקילים שמטפלים בעבודה עם Obsidian — שני סקילי תוכן (markdown, bases) וסקיל זרימה (vault-workflow) שהוא **חובה לכל משימה**. הוסיף אותם ראובן ידנית מחוץ ל-Superpowers.

הפרויקט עצמו מוגדר כ-Obsidian vault: יש `.obsidian/` בשורש, וה-vault התוכני יושב תחת `vault/`.

### הסקילים (3)

| Skill | תיאור | מתי להפעיל | בעלים תפעולי |
|---|---|---|---|
| `obsidian-vault-workflow` | פרוטוקול read-before / write-after לכל משימה. מחייב topic file לכל נושא, _index.md בכל תיקייה, session log עם status tags. | **כל משימה** — בתחילתה ובסופה. | כולם |
| `obsidian-markdown` | יצירה ועריכה של Obsidian Flavored Markdown: wikilinks, embeds, callouts, frontmatter properties, tags. | כל עריכת `.md` ב-vault. | כולם |
| `obsidian-bases` | יצירה ועריכה של קבצי `.base` של Obsidian: views, filters, formulas, summaries. | כשמכינים מבט table/card מבוסס frontmatter. | ראובן |

### קבצים בנושא

| קובץ / תיקייה | תפקיד | בעלים |
|---|---|---|
| `.claude/skills/obsidian-vault-workflow/SKILL.md` | הפרוטוקול המלא | כולם |
| `.claude/skills/obsidian-markdown/SKILL.md` | תחביר OFM | כולם |
| `.claude/skills/obsidian-bases/SKILL.md` | פורמט `.base` | ראובן |
| `.obsidian/` | קונפיגורציה של Obsidian (workspace, plugins) | ראובן |
| `vault/` | התוכן עצמו — Meeting Notes, Content Briefs וכו' | כולם (כל אחד בתחום שלו) |

> [!important] חוק הברזל של ה-vault
> לפני כל משימה — לפתוח את הקובץ הרלוונטי ב-vault ולקרוא Overview + Open Questions + Session Log. אחרי כל משימה — לעדכן Open Questions ולהוסיף `### YYYY-MM-DD — <title> [status]` בסוף ה-Session Log עם wikilinks תחת **Related**.

## Open Questions

- ה-skill `obsidian-vault-workflow` כתוב במונחי "AI Content OS" (פרויקט אחר של אותו מחבר). האם להתאים את הטקסט לפרויקט הזה?
- האם לכתוב סקיל-Obsidian נוסף ייעודי לזרימת תוכן (Yael) — או שדי במה שיש?
- מתי להפעיל את `obsidian-bases` לראשונה? (אולי `vault/Meeting Notes/topics.base` שמציג את כל ה-topics לפי `owner`/`tags`?)

## Session Log

### 2026-05-13 — תיעוד שלושת הסקילים [planned]
- **What was done:** רישום שלושת הסקילים של Obsidian (כולל המקור והייעוד), תוך ציון `obsidian-vault-workflow` כפרוטוקול חובה לכל משימה.
- **Decisions:** הוגדר רק כ-topic תיעודי — לא לעדכן/לערוך את הסקילים עצמם. הם נשארים כפי שראובן התקין.
- **Notes / Caveats:** הסקילים האלו לא נדחפו עדיין ל-GitHub (הקומיט האחרון `3aebbe8` כלל רק Superpowers).
- **Related:** [[claude-config]], [[superpowers-skills]], [[vault-bootstrap]]
