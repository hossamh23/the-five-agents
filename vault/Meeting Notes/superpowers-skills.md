---
type: topic
owner: כל הצוות
area: tooling / skills
tags: [skills, superpowers, claude-code, tdd, debugging]
---

# Superpowers Skills

## Overview

ספריית `obra/superpowers` v5.1.0 הותקנה תחת `.claude/skills/`. מדובר ב-14 סקילים שמכסים טכניקות פיתוח, debugging, עבודת צוות, ותהליכי תכנון. השימוש מותר לכל אנשי הצוות — בעיקר רלוונטי לזרימת קוד וארכיטקטורה (ראובן/יעל) ופחות לתוכן גרידא.

מקור: https://github.com/obra/superpowers — clone והעתקה ידנית (לא דרך `/plugin`).

> [!tip] מתי להפעיל
> כל סקיל בא עם `description` ב-frontmatter שמתאר מתי הוא אמור לרוץ. ה-skill `using-superpowers` נועד לרוץ בתחילת כל שיחה כדי להזכיר איך משתמשים בשאר.

### הסקילים (14)

| Skill | תיאור קצר | בעלים תפעולי |
|---|---|---|
| `using-superpowers` | מבוא — מופעל בתחילת כל שיחה. מסביר איך לאתר ולהפעיל סקילים. | כולם |
| `brainstorming` | **חובה** לפני כל עבודה יצירתית — מברר כוונה ודרישות לפני יישום. | יעל, יובל |
| `writing-plans` | כתיבת תכנית רב-שלבית לפני קוד. | ראובן |
| `executing-plans` | הרצה של תוכנית כתובה עם נקודות review. | ראובן |
| `subagent-driven-development` | פיצול תכנית למשימות עצמאיות בתוך אותו סשן. | ראובן |
| `dispatching-parallel-agents` | מתי לפצל ל-2+ agents במקביל. | ראובן |
| `test-driven-development` | כל פיצ'ר/באג עם בדיקות לפני קוד. | ראובן |
| `systematic-debugging` | גישה שיטתית לכל באג/כשל טסט. | ראובן |
| `verification-before-completion` | חובה לאמת לפני להגיד "סיימתי". | כולם |
| `requesting-code-review` | בקשת ביקורת קוד לפני merge. | ראובן |
| `receiving-code-review` | תגובה לביקורת קוד — לא לקבל בעיוורון. | ראובן |
| `finishing-a-development-branch` | סגירת branch — merge / PR / cleanup. | ראובן |
| `using-git-worktrees` | בידוד workspace לפני עבודה חדשה. | ראובן |
| `writing-skills` | יצירה / עריכה של skill מותאם. | ראובן |

### קבצי משנה בסקילים

חלק מהסקילים מכילים קבצי עזר מעבר ל-`SKILL.md`:

- `brainstorming/` — `scripts/` (frame-template, helper.js, server.cjs, start/stop-server.sh), `spec-document-reviewer-prompt.md`, `visual-companion.md`.
- `subagent-driven-development/` — `code-quality-reviewer-prompt.md`, `implementer-prompt.md`, `spec-reviewer-prompt.md`.
- `systematic-debugging/` — `CREATION-LOG.md`, `condition-based-waiting{.md,-example.ts}`, `defense-in-depth.md`, `find-polluter.sh`, `root-cause-tracing.md`, ו-test files (`test-academic.md`, `test-pressure-1..3.md`).
- `requesting-code-review/` — `code-reviewer.md`.
- `test-driven-development/` — `testing-anti-patterns.md`.
- `using-superpowers/` — `references/{codex,copilot,gemini}-tools.md`.
- `writing-plans/` — `plan-document-reviewer-prompt.md`.
- `writing-skills/` — `anthropic-best-practices.md`, `examples/CLAUDE_MD_TESTING.md`, `graphviz-conventions.dot`, `persuasion-principles.md`, `render-graphs.js`, `testing-skills-with-subagents.md`.

סה"כ: **46 קבצים** ב-14 תיקיות סקיל.

## Open Questions

- חלק מהסקילים (`test-driven-development`, `using-git-worktrees`, `subagent-driven-development`) מניחים פרויקט עם קוד. כשהפרויקט עדיין בעיקר תוכן/קונפיג — האם הם בפועל רלוונטיים?
- האם להוסיף סקילים נוספים ספציפיים ליצירת תוכן (כתיבה, ניסוח, SEO)?
- האם לעדכן גרסה כש-Superpowers משחרר v5.2.0?

## Session Log

### 2026-05-13 — התקנת Superpowers v5.1.0 [shipped]
- **What was done:** clone של `obra/superpowers` ל-temp, `cp -Rn` של 14 תיקיות סקיל ל-`.claude/skills/`, קומיט `3aebbe8` ופוש ל-`origin/main`.
- **Decisions:** רק `skills/` הועתק (אין `commands/` או `agents/` ב-repo המקור). `cp -Rn` כדי לא לדרוס קבצים קיימים בכוונה.
- **Notes / Caveats:** טוקן ה-push נחשף בצ'אט ובוטל ידנית על ידי ראובן (צריך אישור).
- **Related:** [[git-and-repo-setup]], [[claude-config]], [[obsidian-skills]]
