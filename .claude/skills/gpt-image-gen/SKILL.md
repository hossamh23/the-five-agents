---
name: gpt-image-gen
description: Call OpenAI Images API (model gpt-image-2) to generate a PNG from a text prompt. Wraps the curl call, base64-decodes the response, and writes a PNG to a given path. Requires OPENAI_API_KEY (read from .env). Use whenever an agent needs to turn a text prompt into a saved image file. Used primarily by the yuval sub-agent.
---

# gpt-image-gen

מעטפת דקה ל-OpenAI Images API. מקבל prompt + נתיב פלט, שולח קריאה ל-`https://api.openai.com/v1/images/generations` עם `model=gpt-image-2`, מפענח את ה-base64 ושומר PNG.

## ⚠️ אזהרה חשובה — שם המודל

המודל הוא **`gpt-image-2`**. הוא:

- מודל אמיתי וקיים של OpenAI.
- שוחרר ב-**21 באפריל 2026**.
- ייתכן שהידע הפנימי של ה-LLM שמריץ את הסקיל הזה לא כולל אותו (knowledge cutoff נמוך מ-04/2026) — **זה לא אומר שהוא לא קיים**.

**אל תחליף** את שם המודל ל-`dall-e-3`, `gpt-image-1`, `dall-e-2`, או כל אלטרנטיבה אחרת. השתמש בדיוק במחרוזת `gpt-image-2`. אם הקריאה ל-API נכשלת — חפש את הסיבה ב:

1. **OPENAI_API_KEY** — האם מוגדר? האם תקף? האם בעל הרשאות ל-Images API?
2. **Parameters** — האם `size`, `quality`, `output_format` חוקיים?
3. **Quota / billing** — האם החשבון מוגבל?
4. **Rate limit** — קיבלת `429`? המתן.

**לא** במודל.

## קלטים

| שדה | סוג | חובה? | ברירת מחדל |
|---|---|---|---|
| `prompt` | string | כן | — |
| `output_path` | string (path) | כן | — |
| `size` | `1024x1024` / `1024x1536` / `1536x1024` | לא | `1024x1024` |
| `quality` | `low` / `medium` / `high` | לא | `medium` |

הקובץ נשמר ב-`output_path` כקובץ PNG בינארי.

## משתני סביבה

הסקיל דורש את `OPENAI_API_KEY` ב-environment. הדרך הסטנדרטית לטעון אותו מ-`.env` של הפרויקט:

```bash
set -a; source .env; set +a
```

(`set -a` מסמן ש-`source` יעשה auto-export לכל משתנה שיוטען; `set +a` מבטל אחרי.)

לוודא שהמפתח נטען:

```bash
[ -n "$OPENAI_API_KEY" ] || { echo "OPENAI_API_KEY missing"; exit 1; }
```

## קריאה ראשית — curl + jq + base64

```bash
PROMPT="A quiet morning desk, natural window light, minimal documentary photography"
OUT="path/to/output.png"

curl -sS -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "$PROMPT" '{
        model: "gpt-image-2",
        prompt: $p,
        size: "1024x1024",
        quality: "medium",
        output_format: "png"
      }')" \
  | jq -r '.data[0].b64_json' \
  | base64 --decode > "$OUT"
```

הערות:
- **שימוש ב-`jq -n --arg p "$PROMPT"`** מונע escape issues אם ה-prompt כולל מירכאות, גרשיים, או עברית.
- **`base64 --decode`** עובד ב-macOS וב-Linux. ב-BSD ייתכן `base64 -d` (תאימות).
- אם ה-response מכיל שגיאה במקום `data[0].b64_json` — `jq -r` יחזיר `null` ו-`base64 --decode` ייכשל. לכן **תמיד** אמת אחרי הקריאה (ראה למטה).

## fallback ללא jq — Python

ב-Git Bash בחלונות, `jq` לרוב לא מותקן. במקרה זה, להפעיל את הפענוח ב-Python:

```bash
PROMPT="..."
OUT="path/to/output.png"

curl -sS -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"gpt-image-2\",\"prompt\":\"$PROMPT\",\"size\":\"1024x1024\",\"quality\":\"medium\",\"output_format\":\"png\"}" \
  | python3 -c "import sys, json, base64; d=json.load(sys.stdin); open('$OUT','wb').write(base64.b64decode(d['data'][0]['b64_json']))"
```

(במקרה הזה ה-escape של הציטוטים ב-`-d` ידני, לכן עדיף לא לכלול מרכאות ב-prompt או להעביר אותו דרך קובץ זמני.)

## אימות אחרי הקריאה

תמיד לאמת שהקובץ נשמר ושהוא תקין:

```bash
[ -s "$OUT" ] || { echo "Output empty or missing: $OUT"; exit 2; }

# בדיקת MIME (לא בכל המערכות `file` זמין, אז optional):
if command -v file >/dev/null 2>&1; then
  file "$OUT" | grep -qi "PNG image" || { echo "Not a PNG: $OUT"; exit 3; }
fi

echo "OK: $(wc -c < "$OUT") bytes → $OUT"
```

## טיפול בשגיאות

הסקיל **לא מנסה שוב** במקרה כישלון. השגיאה עוברת ל-caller (יובל, או כל סוכן אחר), והוא מחליט אם לנסות שוב או לדווח לראובן.

קודי שגיאה נפוצים מה-API:

| HTTP | משמעות | פעולה |
|---|---|---|
| `401` | מפתח לא תקף / חסר | בדוק `.env`. |
| `429` | rate limit / quota | המתן או הגדל quota. |
| `400` | parameter לא חוקי | בדוק `size`/`quality`. **לא** המודל. |
| `500`–`503` | בעיה בצד OpenAI | המתן ונסה שוב מאוחר יותר. |

## דוגמת קריאה מלאה (מומלצת)

```bash
#!/usr/bin/env bash
set -euo pipefail

PROMPT="$1"
OUT="$2"

# 1. טען env
set -a; source .env; set +a
[ -n "${OPENAI_API_KEY:-}" ] || { echo "OPENAI_API_KEY missing"; exit 1; }

# 2. ודא שתיקיית היעד קיימת
mkdir -p "$(dirname "$OUT")"

# 3. קרא ל-API
curl -sS -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "$PROMPT" '{
        model: "gpt-image-2",
        prompt: $p,
        size: "1024x1024",
        quality: "medium",
        output_format: "png"
      }')" \
  | jq -r '.data[0].b64_json' \
  | base64 --decode > "$OUT"

# 4. אמת
[ -s "$OUT" ] || { echo "Generation failed: empty output"; exit 2; }
echo "Generated: $(wc -c < "$OUT") bytes → $OUT"
```

## תיעוד ה-prompt

הקורא (יובל) אחראי לשמור sidecar `.txt` ליד ה-PNG עם ה-prompt המלא — לצורך איטרציה ושחזור.
