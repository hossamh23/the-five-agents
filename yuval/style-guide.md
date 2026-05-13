---
type: style-guide
owner: yuval
audience: yuval (the image-generation agent)
status: v1 defaults
---

# יובל — Style Guide

מסמך זה הוא ה-style guide של יובל. הוא נקרא בתחילת כל משימת יצירת תמונה ויחד עם `yuval/reference/`. כשייקבע מותג קונקרטי — לעדכן כאן (פלטה, טיפוגרפיה, סגנון צילום), לא בקובץ הסוכן.

## עקרונות עיצוב — ארבעת היסודות

1. **White space קודם.** בין כל פיסת מידע יש "שטח לנשום". אם דחוק — חתוך, אל תקטין.
2. **Photography over illustration** כשאפשר — אנשים אמיתיים, רגעים אמיתיים, אור טבעי. אילוסטרציה רק כשתמונה לא קיימת.
3. **2 משקלי טיפוגרפיה max.** Regular + Semibold. אין שלוש משפחות, אין חמישה משקלים.
4. **8px grid.** כל ריווח הוא כפולה של 8 (8, 16, 24, 32, 48, 64). מרווח שורה (margin) ≥ 64px במסך, ≥ 24px במובייל.

## פלטה — v1 default

צבעים שמתפקדים יחד עד שראובן יקבע מותג ספציפי:

| תפקיד | קוד | הערה |
|---|---|---|
| בסיס בהיר | `#FAFAF7` | off-white, לא לבן טהור |
| בסיס כהה | `#1A1A1A` | charcoal, לא שחור טהור |
| אקסנט יחיד | `#2E5C4F` | ירוק עמוק, מינימליסטי |
| טקסט עיקרי על בהיר | `#1A1A1A` | |
| טקסט משני | 60% opacity של העיקרי | |
| קווי הפרדה | `#E8E6E0` | 1px |

**כלל יחיד:** רק אקסנט אחד פעיל בכל קומפוזיציה. שני צבעים אקסנט = רעש.

## טיפוגרפיה — v1 default

- **משפחה ראשית:** [Heebo](https://fonts.google.com/specimen/Heebo) (עברית-first, פתוחה, חינמית).
- **חלופה:** [Assistant](https://fonts.google.com/specimen/Assistant).
- **בסיס לטיני (במקומות מעורבים):** מערכת — `-apple-system, "Segoe UI", Roboto`.

גדלים (desktop, px):

| תפקיד | גודל | משקל | line-height |
|---|---|---|---|
| H1 | 32 | Bold | 1.2 |
| H2 | 24 | Semibold | 1.2 |
| H3 | 20 | Semibold | 1.3 |
| Body | 16 | Regular | 1.5 |
| Caption | 14 | Regular | 1.4 |

מובייל: להוריד H1 ל-26, H2 ל-20. גוף ב-16 נשאר.

## סגנון צילום

כשמייצרים תמונה (צילום אמיתי, AI, סטוק):

- **תאורה:** אור יום טבעי. שעה זהובה (לפני שקיעה / אחרי זריחה) מעדיפים על אמצע יום קשה.
- **רוויה:** -10% עד -20% מנייטרל. **לא** נטרל לחלוטין (תרגיש דוקומנטרי) ולא רווי מדי (תרגיש סטוק).
- **פוקוס:** subject חד, רקע מטושטש קל (f/2.8 – f/4 equivalent).
- **אנשים:** רגעים לא מבוימים. בלי "סוכן מכירות מחייך למצלמה". פנים חתוכות מהפריים — מותר. ידיים בעבודה — מעולה.
- **קומפוזיציה:** rule-of-thirds או negative-space אסימטרי. מרכז מושלם — רק לסיבה.

## image-gen prompts — פורמט קבוע

כל prompt שיובל שולח ל-`gpt-image-gen` חייב להיות בפורמט הזה (באנגלית — gpt-image-2 עובד טוב יותר באנגלית):

```
Subject: <who/what is in the frame, age/context>
Composition: <rule-of-thirds-right | centered | negative-space-left | overhead>
Lighting: <natural soft window light | golden hour | overcast diffuse>
Medium: <photograph | editorial illustration | 3D matte render>
Style: <minimal documentary | editorial | studio clean>
Mood: <calm | focused | quiet confidence>
Palette: <neutral warm | cool muted | <accent from palette table>>
Aspect: <1:1 | 16:9 | 9:16 | 4:5>
Avoid: <stock cliché, gradients, drop shadows, uncanny AI faces, text in image>
```

תיעוד: ה-prompt ששימש נשמר תמיד ב-sidecar `.txt` ליד ה-PNG (כלל ב-flow של יובל), וגם ב-`vault/Publishing Log/<post>.md` אם התמונה נשלחה לפרסום.

## אסור (do-not list)

- ❌ סטוק-פוטו של handshakes, lightbulbs (= רעיון), arrows-on-graphs, "מגדלי זכוכית מהאוויר".
- ❌ Gradients זוהרים (אדום→ורוד, סגול→כחול) — אלא אם המותג ידרוש זאת מפורשות.
- ❌ Drop shadows חזקים, neumorphism, glassmorphism (כל ה-trends הקצרי-טווח).
- ❌ פנים שנוצרו ב-AI עם uncanny valley (אצבעות שגויות, עיניים אסימטריות, שיניים מוזרות).
- ❌ Emoji בתוך תמונה (השאר ל-caption של [[yael]]).
- ❌ אינטרסטיציאלים של "BEFORE / AFTER" סטיילד-יוטיוב.
- ❌ פנים של אנשים אמיתיים מזוהים (סלבים, פוליטיקאים) — סיכון משפטי.
- ❌ לוגואים של מותגים חיצוניים שלא נתנו אישור.
