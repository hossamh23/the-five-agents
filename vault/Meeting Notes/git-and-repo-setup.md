---
type: topic
owner: ראובן
area: infra / git
tags: [git, github, infra, auth]
---

# Git & Repo Setup

## Overview

הפרויקט מקושר ל-repo: **https://github.com/hossamh23/the-five-agents** על branch `main`.

נוהל ה-auth שנקבע: **אין** טוקנים שמורים ב-`.git/config` ו**אין** SSH key מוגדר. כל push נעשה דרך URL חד-פעמי בפורמט `https://<user>:<token>@github.com/...` והטוקן לא נרשם בשום מקום קבוע. `git remote -v` חייב להישאר נקי מ-credentials.

> [!warning] טוקן שנחשף בעבר
> טוקן `ghp_vQVO...PF6` שותף בצ'אט ב-2026-05-13 — נחשב **חשוף**. יש לבטל ב-https://github.com/settings/tokens.

### קבצים ומצב

| פריט | מצב |
|---|---|
| Local repo | `/Users/hossam/Downloads/workspace/the-five-agents` |
| Remote `origin` | `https://github.com/hossamh23/the-five-agents.git` |
| Branch ראשי | `main` |
| Tracking | `main` ↔ `origin/main` |
| Credential helper | `osxkeychain` (מוגדר גלובלית, ריק לגבי github.com) |
| `gh` CLI | לא מותקן |
| SSH key | לא קיים |

## Open Questions

- האם להתקין `gh` CLI כדי להחליף את שיטת ה-token-in-URL? (`brew install gh` + `gh auth login`)
- האם להגדיר SSH key כדי להימנע מטוקנים בכלל?
- מתי `.env.example` והעדכון של `.gitignore` (משינוי קודם) ייכנסו לקומיט הבא?

## Session Log

### 2026-05-13 — אתחול repo ופוש ראשון [shipped]
- **What was done:** `git init`, branch `main`, יצירת `.gitignore`, קומיט ראשון `7f63e6f` (CLAUDE.md + settings.local.json + .gitignore), הוספת `origin`, push דרך URL חד-פעמי עם טוקן ששותף בצ'אט.
- **Decisions:** טוקן **לא** נרשם ב-`.git/config` — רק שימוש חד-פעמי. ה-remote נשאר נקי.
- **Notes / Caveats:** הטוקן נחשף בצ'אט → יש לבטל ולהחליף.
- **Related:** [[environment-variables]], [[team-structure]]

### 2026-05-13 — הוספת Superpowers ופוש שני [shipped]
- **What was done:** clone של `obra/superpowers` ל-temp, העתקת 14 sklls תחת `.claude/skills/`, קומיט `3aebbe8` ופוש ל-`main`. תיקיית ה-temp נמחקה.
- **Decisions:** רק `skills/` הועתק — `commands/` ו-`agents/` לא קיימים ב-repo המקור. השימוש ב-`cp -Rn` שמר על קבצים קיימים מדריסה.
- **Notes / Caveats:** טוקן ה-PAT עדיין לא בוטל; הקומיט עבר בהצלחה (`7f63e6f..3aebbe8`).
- **Related:** [[superpowers-skills]], [[claude-config]]
