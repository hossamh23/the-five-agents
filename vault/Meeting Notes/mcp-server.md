---
type: topic
owner: ראובן
area: tooling / mcp
tags: [mcp, infra, remote-server, security]
---

# MCP Server

## Overview

`mcp-server/` הוא שרת MCP מרוחק (TypeScript, SDK `@modelcontextprotocol/sdk` 1.32.1, Express 5, Streamable HTTP, stateless) שחושף ל-Claude את צינור התוכן של הפרויקט: `Content/`, `Output/`, `vault/`, תיקיות העבודה של יעל/יובל/חן, זיכרון החיפושים של חן, ויצירת תמונות דרך `gpt-image-2`. יש בו 11 כלים (4 קריאה, 5 כתיבה-תוספתית, 2 הרסניים) עם הרשאות מלאות כברירת מחדל ו-`MCP_MODE=readonly` כמתג בטיחות. הקוד נבנה ונבדק מקומית (19 טסטים + Inspector הרשמי מול הריפו האמיתי); **עדיין לא מאורח ולא חובר ל-claude.ai**. פירוט הכלים ומודל האבטחה ב-`mcp-server/README.md`.

### קבצים בנושא

| קובץ | תפקיד |
|---|---|
| `mcp-server/src/server.ts` | Express: `/mcp` (Bearer + Origin check), `/healthz`, שרת stateless לכל בקשה |
| `mcp-server/src/tools.ts` | 11 הכלים + הגבלות גודל + תקרת תמונות |
| `mcp-server/src/areas.ts` | "כלוב" נתיבים: 6 אזורים בלבד, בלי `..`/נתיב מוחלט/קבצים נסתרים/symlink החוצה |
| `mcp-server/src/config.ts` | משתני סביבה + סירוב להתחיל בלי אימות |
| `mcp-server/test/smoke.test.ts` | 19 טסטים מקצה לקצה דרך ה-SDK client |

## Open Questions

- **OAuth ל-claude.ai** — מחבר רגיל דורש OAuth (DCR או CIMD) + `401` עם `resource_metadata`; Bearer סטטי (`static_headers`) הוא בטא לארגונים מוגבלים בלבד. האם הארגון של המשתמש בבטא? אם כן — Bearer מספיק; אם לא — לבנות OAuth.
- **איפה לארח ועם איזה storage?** כרגע הכלים קוראים checkout בדיסק של המארח. לשקול backend של GitHub API אם אין checkout (Cloudflare Workers / Fly / Render).
- **הרשאות מלאות על URL ציבורי** — `replace_file`/`delete_file`/`generate_image` פעילים כברירת מחדל לפי בקשת המשתמש. מומלץ `MCP_MODE=readonly` לכל מארח לא נאמן.
- **`generate_image` חוסם הגשה ל-directory** של Anthropic (יצירת תמונות AI לא מתקבלת). נשאר custom connector, או להסיר את הכלי לפני הגשה.
- **תקרת התמונות (`MAX_IMAGES_PER_DAY`) חלה רק על נתיב ה-MCP** — יובל דרך Bash עדיין בלי תקרה (ראה Open Questions ב-[[claude-config]]).
- **לא נבדק מול claude.ai אמיתי** — רק Inspector ו-SDK client. נדרש בדיקת חיבור כ-custom connector.
- **MCP App widgets** (דפדפן מאמרים, גלריית תמונות) — דרך `build-mcp-app`, טרם נבנה.

## Session Log

### 2026-10-09 — בניית שרת MCP מרוחק (11 כלים, אימות חובה, כלוב נתיבים) [wip]
- **What was done:**
  - הרצת `build-mcp-server`: Phase 1 (שאלות) → המשתמש ענה "הכול, הרשאות הכי גדולות" → הוחלט על מבנה ונבנה `mcp-server/` (TypeScript + SDK 1.32.1 + zod 4 + Express 5).
  - 11 כלים: `list_files`, `read_file`, `search_files`, `check_search_memory` (קריאה); `create_file`, `save_article`, `append_session_log`, `log_search`, `generate_image` (כתיבה תוספתית); `replace_file`, `delete_file` (הרסניים). כל כלי עם `title`, `readOnlyHint`, `destructiveHint`.
  - `save_article` / `log_search` / `append_session_log` מקודדים את הפורמטים הקבועים של חן ושל פרוטוקול ה-vault; `generate_image` עוטף את ההרצה של `gpt-image-gen` (מודל `gpt-image-2`, בלי להחליף שם) ושומר ל-`yuval/outputs/` + עותק ל-`Output/`.
  - אימות: `tsc` נקי, 19/19 טסטים, בדיקת מוטציה (ביטול ה-realpath → טסט ה-symlink נכשל), הרצת ה-build כתהליך אמיתי ב-readonly מול הריפו + `inspector --cli tools/list` עבר.
  - עדכון `.gitignore`, `.env.example` (`MCP_AUTH_TOKEN`, `MCP_MODE`, `MAX_IMAGES_PER_DAY`), שורה ב-`CLAUDE.md`.
- **Decisions:**
  - **"הרשאות הכי גדולות" = הכול פעיל** (כתיבה, החלפה, מחיקה, תמונות) — אבל **אימות חובה**: שרת עם הרשאות כתיבה וכסף על URL ציבורי בלי אימות הוא פרצה; לכן הוא מסרב לעלות בלי `MCP_AUTH_TOKEN` (אלא עם `MCP_ALLOW_NO_AUTH=1` מפורש).
  - **Pattern A (כלי לכל פעולה)**, לא search+execute — 11 כלים הם "sweet spot" לפי `tool-design.md`; search+execute רק מ-30+.
  - **Remote + Express**, לא Workers/MCPB: ניתן לבדיקה מלאה כאן, נייד, ואותו קוד אפשר לעטוף ב-MCPB בעתיד.
  - **הפרדת קריאה / תוספת / הרסני** לכלים נפרדים — דרישת review של Anthropic וגם מה ש-Claude משתמש בו להרשאות אוטומטיות.
  - **מחיקה מותרת רק ב-`content`/`output`/`yuval`**, לא ב-vault/yael/chen (זיכרון ארוך-טווח); git הוא ה-undo.
  - **custom connector, לא directory** — בגלל `generate_image`.
- **Notes / Caveats:**
  - `llms-full.txt` של Claude הוא ~3.6M תווים — נקראו ישירות עמודי build / review-criteria / authentication במקום.
  - Bearer סטטי עובד היום עם Claude Code (`--header`), Inspector, וארגונים עם בטא `static_headers`. ל-claude.ai רגיל צריך OAuth (ראה Open Questions).
  - TypeScript 7.0.2 הותקן (הכי חדש ב-npm) — עובד עם `tsc` הרגיל; אין pinning נוסף מעבר ל-`package-lock.json`.
  - טווח IP יוצא של Anthropic: `160.79.104.0/21` — שכבת הגנה זולה לאירוח.
- **Related:** [[claude-config]], [[team-structure]], [[environment-variables]], [[git-and-repo-setup]]
