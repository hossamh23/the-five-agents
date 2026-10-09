import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AREAS,
  AREA_NAMES,
  TEXT_EXTENSIONS,
  UserError,
  assertTextPath,
  imageMime,
  resolveInArea,
  type AreaName,
} from "./areas.js";
import type { Config } from "./config.js";

// Stay under claude.ai (~150k chars) and Claude Code (25k tokens) tool-result limits.
const MAX_RESULT_CHARS = 80_000;
const MAX_WRITE_CHARS = 400_000;
const MAX_LIST_ENTRIES = 300;
const MAX_SEARCH_FILE_BYTES = 1_000_000;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ONE_LINE = /^[^\r\n]+$/;

const FOLDERS = ["Meeting Notes", "Content Briefs", "Publishing Log", "Brand Guidelines"] as const;
const STATUSES = ["shipped", "spiked", "wip", "reverted", "planned", "debug"] as const;

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const ADD = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const OVERWRITE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false } as const;
const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } as const;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (text: string): ToolResult => ({ content: [{ type: "text", text }] });
const fail = (text: string): ToolResult => ({ isError: true, content: [{ type: "text", text }] });
const json = (v: unknown): ToolResult => ok(JSON.stringify(v, null, 2));

async function safe(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UserError) return fail(e.message);
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fail("Not found: the file or folder does not exist.");
    if (code === "EISDIR" || code === "ENOTDIR") return fail("The path points to a folder where a file was expected (or the reverse).");
    if (code === "EEXIST") return fail("Already exists. Use replace_file to overwrite an existing file.");
    console.error("tool error:", e);
    return fail("Unexpected server error. See the server logs.");
  }
}

const today = (cfg: Config) => cfg.now().toISOString().slice(0, 10);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const areaSchema = z
  .enum(AREA_NAMES)
  .describe(
    "Project area: content=Content/ (raw source articles), output=Output/ (finished deliverables), vault=vault/ (notes), " +
      "yael=yael/ (style guide), yuval=yuval/ (style guide, reference/, outputs/), chen=chen/ (search memory).",
  );

function truncate(text: string, offset = 0): string {
  if (text.length - offset <= MAX_RESULT_CHARS) return text.slice(offset);
  const end = offset + MAX_RESULT_CHARS;
  return `${text.slice(offset, end)}\n\n[truncated: showing characters ${offset}-${end} of ${text.length}; call again with offset=${end} for the rest]`;
}

interface Entry {
  path: string;
  type: "file" | "dir";
  bytes?: number;
  modified: string;
}

async function walk(dirAbs: string, relBase: string, depth: number, out: Entry[]): Promise<void> {
  const names = (await fs.readdir(dirAbs, { withFileTypes: true }))
    .filter((d) => !d.name.startsWith(".") && !d.isSymbolicLink())
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const d of names) {
    if (out.length >= MAX_LIST_ENTRIES) return;
    const rel = relBase ? `${relBase}/${d.name}` : d.name;
    const st = await fs.stat(path.join(dirAbs, d.name));
    if (d.isDirectory()) {
      out.push({ path: rel, type: "dir", modified: st.mtime.toISOString() });
      if (depth > 0) await walk(path.join(dirAbs, d.name), rel, depth - 1, out);
    } else if (d.isFile()) {
      out.push({ path: rel, type: "file", bytes: st.size, modified: st.mtime.toISOString() });
    }
  }
}

async function* textFiles(dirAbs: string, relBase: string): AsyncGenerator<{ abs: string; rel: string }> {
  const items = await fs.readdir(dirAbs, { withFileTypes: true }).catch(() => []);
  for (const d of items.sort((a, b) => a.name.localeCompare(b.name))) {
    if (d.name.startsWith(".") || d.isSymbolicLink()) continue;
    const abs = path.join(dirAbs, d.name);
    const rel = relBase ? `${relBase}/${d.name}` : d.name;
    if (d.isDirectory()) yield* textFiles(abs, rel);
    else if (d.isFile() && TEXT_EXTENSIONS.has(path.extname(d.name).toLowerCase())) yield { abs, rel };
  }
}

async function writeAtomic(abs: string, content: string): Promise<void> {
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, abs);
}

async function appendLine(abs: string, text: string): Promise<void> {
  let existing = "";
  try {
    existing = await fs.readFile(abs, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const sep = existing === "" || existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.appendFile(abs, sep + text);
}

export function registerTools(server: McpServer, cfg: Config): void {
  registerReadTools(server, cfg);
  if (cfg.mode === "full") registerWriteTools(server, cfg);
}

// ---------------------------------------------------------------------------
// Read tools
// ---------------------------------------------------------------------------

function registerReadTools(server: McpServer, cfg: Config): void {
  server.registerTool(
    "list_files",
    {
      title: "List files",
      description:
        "List files and folders inside one project area. Returns path, type, size in bytes and modified time. " +
        "Hidden entries are omitted and at most 300 entries are returned.",
      inputSchema: {
        area: areaSchema,
        path: z.string().default("").describe("Sub-folder inside the area, e.g. 'Meeting Notes'. Empty lists the area root."),
        recursive: z.boolean().default(false).describe("Also list nested folders (up to 6 levels deep)."),
      },
      annotations: READ,
    },
    ({ area, path: sub, recursive }) =>
      safe(async () => {
        const r = await resolveInArea(cfg, area, sub);
        const entries: Entry[] = [];
        await walk(r.abs, r.rel, recursive ? 6 : 0, entries);
        return json({ area, path: r.rel, count: entries.length, truncated: entries.length >= MAX_LIST_ENTRIES, entries });
      }),
  );

  server.registerTool(
    "read_file",
    {
      title: "Read file",
      description:
        "Read one text file (.md, .html, .txt, .json, .base) from a project area. Long files are returned in pages of " +
        "80,000 characters; use offset to continue. Images (.png, .jpg, .webp) return metadata only, not pixels.",
      inputSchema: {
        area: areaSchema,
        path: z.string().describe("File path relative to the area root, e.g. 'Meeting Notes/claude-config.md'."),
        offset: z.number().int().min(0).default(0).describe("Character offset to start reading from."),
      },
      annotations: READ,
    },
    ({ area, path: file, offset }) =>
      safe(async () => {
        const r = await resolveInArea(cfg, area, file);
        const mime = imageMime(r.rel);
        if (mime) {
          const st = await fs.stat(r.abs);
          return json({ path: r.rel, mimeType: mime, bytes: st.size, note: "Binary image; pixels are not returned. A same-named .txt sidecar may hold the prompt." });
        }
        assertTextPath(r.rel);
        return ok(truncate(await fs.readFile(r.abs, "utf8"), offset));
      }),
  );

  server.registerTool(
    "search_files",
    {
      title: "Search files",
      description:
        "Case-insensitive substring search over text files in the project areas. Returns up to `limit` matching lines " +
        "as area, path, line number and the line text. Does not search images or hidden files.",
      inputSchema: {
        query: z.string().min(2).max(200).describe("Text to look for (matched as a literal substring)."),
        areas: z.array(areaSchema).optional().describe("Areas to search. Defaults to all areas."),
        limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of matching lines."),
      },
      annotations: READ,
    },
    ({ query, areas, limit }) =>
      safe(async () => {
        const needle = query.toLowerCase();
        const hits: { area: AreaName; path: string; line: number; text: string }[] = [];
        search: for (const area of areas ?? AREA_NAMES) {
          const root = (await resolveInArea(cfg, area)).abs;
          for await (const f of textFiles(root, "")) {
            const st = await fs.stat(f.abs);
            if (st.size > MAX_SEARCH_FILE_BYTES) continue;
            const lines = (await fs.readFile(f.abs, "utf8")).split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i]!.toLowerCase().includes(needle)) {
                hits.push({ area, path: f.rel, line: i + 1, text: lines[i]!.trim().slice(0, 300) });
                if (hits.length >= limit) break search;
              }
            }
          }
        }
        return json({ query, count: hits.length, limitReached: hits.length >= limit, hits });
      }),
  );

  server.registerTool(
    "check_search_memory",
    {
      title: "Check Chen's search memory",
      description:
        "Look up chen/Memory/searches.md for earlier web searches whose entry mentions any of the given keywords and " +
        "whose date falls inside the last `days` days. Returns topic, date, age in days and the Content/ file saved. " +
        "Topics that change quickly (news, prices, statistics, regulation) can be stale even inside the window.",
      inputSchema: {
        keywords: z.array(z.string().min(2).max(80)).min(1).max(10).describe("Keywords or phrases to match, case-insensitive."),
        days: z.number().int().min(1).max(365).default(30).describe("Size of the look-back window in days."),
      },
      annotations: READ,
    },
    ({ keywords, days }) =>
      safe(async () => {
        const r = await resolveInArea(cfg, "chen", "Memory/searches.md");
        const lines = (await fs.readFile(r.abs, "utf8").catch(() => "")).split("\n");
        const entries: { date: string; time: string; topic: string; text: string }[] = [];
        for (const line of lines) {
          const m = /^## (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) \| (.+)$/.exec(line);
          if (m) entries.push({ date: m[1]!, time: m[2]!, topic: m[3]!, text: line });
          else if (entries.length) entries[entries.length - 1]!.text += "\n" + line;
        }
        const needles = keywords.map((k) => k.toLowerCase());
        const now = cfg.now().getTime();
        const matches = entries
          .map((e) => ({ ...e, age: Math.floor((now - Date.parse(`${e.date}T${e.time}:00Z`)) / 86_400_000) }))
          .filter((e) => e.age <= days && needles.some((n) => e.text.toLowerCase().includes(n)))
          .sort((a, b) => a.age - b.age)
          .map((e) => ({
            date: e.date,
            topic: e.topic,
            ageDays: e.age,
            contentFile: /\*\*קובץ ב-Content:\*\*\s*(.+)/.exec(e.text)?.[1]?.trim() ?? null,
          }));
        return json({ windowDays: days, count: matches.length, matches });
      }),
  );
}

// ---------------------------------------------------------------------------
// Write tools (registered only when MCP_MODE=full)
// ---------------------------------------------------------------------------

function registerWriteTools(server: McpServer, cfg: Config): void {
  server.registerTool(
    "create_file",
    {
      title: "Create file",
      description:
        "Create a new text file (.md, .html, .txt, .json, .base) in a project area, creating parent folders as needed. " +
        "Fails if the file already exists; use replace_file to overwrite one.",
      inputSchema: {
        area: areaSchema,
        path: z.string().describe("New file path relative to the area root, e.g. 'my-article.md'."),
        content: z.string().max(MAX_WRITE_CHARS).describe("Full file content, UTF-8."),
      },
      annotations: ADD,
    },
    ({ area, path: file, content }) =>
      safe(async () => {
        const r = await resolveInArea(cfg, area, file);
        assertTextPath(r.rel);
        await fs.mkdir(path.dirname(r.abs), { recursive: true });
        await fs.writeFile(r.abs, content, { encoding: "utf8", flag: "wx" });
        return ok(`Created ${AREAS[area].dir}/${r.rel} (${Buffer.byteLength(content)} bytes).`);
      }),
  );

  server.registerTool(
    "save_article",
    {
      title: "Save source article to Content",
      description:
        "Save a fetched web article as Content/<date>-<slug>.md in the format Yael's rewrite flow reads: YAML front matter " +
        "(source, fetched, original_title, original_author, published, language) plus a Source/Fetched/Original-title block. " +
        "Fails if the file already exists.",
      inputSchema: {
        slug: z.string().regex(SLUG).max(60).describe("Lowercase English slug with hyphens, e.g. 'claude-code-skills'."),
        source_url: z.string().url().describe("Full URL of the original article."),
        original_title: z.string().regex(ONE_LINE).max(300).describe("Title as published."),
        body_md: z.string().min(1).max(MAX_WRITE_CHARS).describe("Article body in Markdown, kept close to the original."),
        original_author: z.string().regex(ONE_LINE).max(200).default("—").describe("Author name, or '—' if unknown."),
        published: z.string().default("—").describe("Original publication date YYYY-MM-DD, or '—' if unknown."),
        language: z.string().regex(/^[a-z]{2,3}$/).default("en").describe("Language code, e.g. 'he' or 'en'."),
        date: z.string().regex(DATE).optional().describe("Fetch date YYYY-MM-DD. Defaults to today (UTC)."),
      },
      annotations: ADD,
    },
    (a) =>
      safe(async () => {
        const date = a.date ?? today(cfg);
        const rel = `${date}-${a.slug}.md`;
        const r = await resolveInArea(cfg, "content", rel);
        const doc =
          `---\nsource: ${a.source_url}\nfetched: ${date}\noriginal_title: ${a.original_title}\n` +
          `original_author: ${a.original_author}\npublished: ${a.published}\nlanguage: ${a.language}\n---\n\n` +
          `> **Source:** ${a.source_url}\n> **Fetched:** ${date}\n> **Original title:** ${a.original_title}\n\n` +
          `# ${a.original_title}\n\n${a.body_md.trim()}\n`;
        await fs.writeFile(r.abs, doc, { encoding: "utf8", flag: "wx" });
        return ok(`Saved Content/${rel} (${Buffer.byteLength(doc)} bytes).`);
      }),
  );

  server.registerTool(
    "append_session_log",
    {
      title: "Append vault session log entry",
      description:
        "Append a dated '### YYYY-MM-DD — title [status]' entry to the end of vault/<folder>/<topic>.md. If the topic file does " +
        "not exist it is created from the vault template (Overview, Open Questions, Session Log) and a line is added to the " +
        "folder's _index.md; that case needs topic_title, overview and index_description. Existing entries are never modified.",
      inputSchema: {
        folder: z.enum(FOLDERS).describe("Vault folder holding the topic."),
        topic: z.string().regex(SLUG).max(80).describe("Topic file name without .md, lowercase with hyphens."),
        title: z.string().regex(/^[^\r\n[\]]+$/).max(120).describe("Short session title."),
        status: z.enum(STATUSES).describe("State at the end of the session."),
        what_was_done: z.string().min(1).max(4000).describe("Compact summary of the work."),
        decisions: z.string().max(4000).optional().describe("Decisions taken and why."),
        notes: z.string().max(4000).optional().describe("Notes and caveats."),
        related: z.array(z.string().regex(/^[^[\]|#\r\n]+$/)).max(20).default([]).describe("Related vault note names without brackets. Required (at least one) for an existing topic."),
        topic_title: z.string().regex(ONE_LINE).max(120).optional().describe("H1 title. Only used when creating the topic."),
        overview: z.string().max(3000).optional().describe("2-6 sentence overview. Only used when creating the topic."),
        open_questions: z.array(z.string().regex(ONE_LINE)).max(20).optional().describe("Open questions for a new topic. Defaults to 'none'."),
        index_description: z.string().regex(ONE_LINE).max(200).optional().describe("One-line description for _index.md. Only used when creating the topic."),
        date: z.string().regex(DATE).optional().describe("Entry date YYYY-MM-DD. Defaults to today (UTC)."),
      },
      annotations: ADD,
    },
    (a) =>
      safe(async () => {
        const date = a.date ?? today(cfg);
        const r = await resolveInArea(cfg, "vault", `${a.folder}/${a.topic}.md`);
        const exists = await fs.stat(r.abs).then(() => true, () => false);
        if (exists && a.related.length === 0) {
          throw new UserError("related must list at least one vault note for an existing topic.");
        }
        const entry = [
          `### ${date} — ${a.title} [${a.status}]`,
          `- **What was done:** ${a.what_was_done}`,
          ...(a.decisions ? [`- **Decisions:** ${a.decisions}`] : []),
          ...(a.notes ? [`- **Notes / Caveats:** ${a.notes}`] : []),
          `- **Related:** ${a.related.length ? a.related.map((n) => `[[${n}]]`).join(", ") : "none (first entry on this topic)"}`,
        ].join("\n");

        if (exists) {
          await appendLine(r.abs, entry + "\n");
          return ok(`Appended entry to vault/${a.folder}/${a.topic}.md.`);
        }
        if (!a.topic_title || !a.overview || !a.index_description) {
          throw new UserError("Topic does not exist yet: topic_title, overview and index_description are required to create it.");
        }
        const questions = (a.open_questions?.length ? a.open_questions : ["none"]).map((q) => `- ${q}`).join("\n");
        const doc =
          `---\ntype: topic\n---\n\n# ${a.topic_title}\n\n## Overview\n\n${a.overview}\n\n` +
          `## Open Questions\n\n${questions}\n\n## Session Log\n\n${entry}\n`;
        await fs.mkdir(path.dirname(r.abs), { recursive: true });
        await fs.writeFile(r.abs, doc, { encoding: "utf8", flag: "wx" });
        await addToIndex(cfg, a.folder, a.topic, a.index_description);
        return ok(`Created vault/${a.folder}/${a.topic}.md and added it to ${a.folder}/_index.md.`);
      }),
  );

  server.registerTool(
    "log_search",
    {
      title: "Log a search to Chen's memory",
      description:
        "Append one entry to chen/Memory/searches.md in the fixed format (date, topic, keywords, queries, rated sources, chosen " +
        "source, Content/ file). Used after a web search so check_search_memory can find it later.",
      inputSchema: {
        topic: z.string().regex(ONE_LINE).max(200).describe("Search topic."),
        keywords: z.array(z.string().regex(ONE_LINE).max(80)).min(1).max(15).describe("Keywords used."),
        queries: z.array(z.string().regex(ONE_LINE).max(200)).min(1).max(10).describe("Web queries that were run."),
        sources: z
          .array(
            z.object({
              title: z.string().regex(ONE_LINE).max(300),
              url: z.string().url(),
              stars: z.number().int().min(1).max(5).describe("Quality rating 1-5."),
              note: z.string().regex(ONE_LINE).max(300).describe("Short remark on the source."),
            }),
          )
          .min(1)
          .max(10),
        chosen: z.string().regex(ONE_LINE).max(400).describe("The chosen source and why."),
        content_file: z.string().regex(ONE_LINE).max(200).describe("File saved in Content/, e.g. '2026-05-13-claude-code-skills.md'."),
      },
      annotations: ADD,
    },
    (a) =>
      safe(async () => {
        const now = cfg.now().toISOString();
        const entry =
          `## ${now.slice(0, 10)} ${now.slice(11, 16)} | ${a.topic}\n` +
          `**מילות מפתח:** ${a.keywords.join(", ")}\n` +
          `**שאילתות שנעשו:** ${a.queries.map((q) => `"${q}"`).join(", ")}\n` +
          `**מקורות שנמצאו:**\n` +
          a.sources.map((s) => `- [${s.title}](${s.url}) — איכות: ${"⭐".repeat(s.stars)} — ${s.note}`).join("\n") +
          `\n**נבחר:** ${a.chosen}\n**קובץ ב-Content:** ${a.content_file}\n---\n`;
        const r = await resolveInArea(cfg, "chen", "Memory/searches.md");
        await appendLine(r.abs, entry);
        return ok(`Logged search "${a.topic}" to chen/Memory/searches.md.`);
      }),
  );

  server.registerTool(
    "generate_image",
    {
      title: "Generate image (OpenAI gpt-image-2)",
      description:
        "Generate one PNG with OpenAI's gpt-image-2 model and save it as yuval/outputs/<date>-<slug>.png plus a .txt sidecar " +
        "holding the prompt, then copy both to Output/. Calls api.openai.com and costs money; a per-day cap applies. " +
        "Returns file paths, not pixels. Fails if the slug already exists for today.",
      inputSchema: {
        prompt: z.string().min(10).max(4000).describe("Full image prompt."),
        slug: z.string().regex(SLUG).max(60).describe("Lowercase English slug for the file name."),
        size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1024"),
        quality: z.enum(["low", "medium", "high"]).default("medium"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    ({ prompt, slug, size, quality }) =>
      safe(async () => {
        if (!cfg.openaiApiKey) throw new UserError("OPENAI_API_KEY is not configured on the server.");
        const date = today(cfg);
        const outDir = (await resolveInArea(cfg, "yuval", "outputs")).abs;
        const existing = await fs.readdir(outDir).catch(() => [] as string[]);
        const usedToday = existing.filter((f) => f.startsWith(`${date}-`) && f.endsWith(".png")).length;
        if (usedToday >= cfg.maxImagesPerDay) {
          throw new UserError(`Daily image cap reached (${usedToday}/${cfg.maxImagesPerDay}). Raise MAX_IMAGES_PER_DAY on the server to allow more.`);
        }

        const name = `${date}-${slug}`;
        const png = (await resolveInArea(cfg, "yuval", `outputs/${name}.png`)).abs;
        const txt = (await resolveInArea(cfg, "yuval", `outputs/${name}.txt`)).abs;
        const outPng = (await resolveInArea(cfg, "output", `${name}.png`)).abs;
        const outTxt = (await resolveInArea(cfg, "output", `${name}.txt`)).abs;
        if (await fs.stat(png).then(() => true, () => false)) {
          throw new UserError(`yuval/outputs/${name}.png already exists; choose a different slug.`);
        }

        let res: Response;
        try {
          res = await cfg.fetchImpl("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${cfg.openaiApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-image-2", prompt, size, quality, output_format: "png" }),
            signal: AbortSignal.timeout(180_000),
          });
        } catch (e) {
          throw new UserError(`Request to the OpenAI Images API failed: ${(e as Error).name}. Nothing was saved.`);
        }
        const data = (await res.json().catch(() => null)) as { data?: { b64_json?: string }[]; error?: { message?: string } } | null;
        if (!res.ok) {
          throw new UserError(
            `OpenAI Images API returned HTTP ${res.status}: ${data?.error?.message ?? "no details"}. ` +
              "401 means a bad key, 429 a rate or quota limit, 400 invalid size/quality.",
          );
        }
        const b64 = data?.data?.[0]?.b64_json;
        if (!b64) throw new UserError("OpenAI response contained no image data. Nothing was saved.");
        const buf = Buffer.from(b64, "base64");
        if (buf.length < 8 || buf.subarray(0, 4).toString("hex") !== "89504e47") {
          throw new UserError("OpenAI returned data that is not a PNG. Nothing was saved.");
        }

        await fs.mkdir(outDir, { recursive: true });
        await fs.mkdir(path.dirname(outPng), { recursive: true });
        await fs.writeFile(png, buf, { flag: "wx" });
        await fs.writeFile(txt, prompt + "\n", { flag: "wx" });
        await fs.copyFile(png, outPng, fs.constants.COPYFILE_EXCL);
        await fs.copyFile(txt, outTxt, fs.constants.COPYFILE_EXCL);
        return json({
          png: `yuval/outputs/${name}.png`,
          sidecar: `yuval/outputs/${name}.txt`,
          outputPng: `Output/${name}.png`,
          outputSidecar: `Output/${name}.txt`,
          bytes: buf.length,
          size,
          quality,
          imagesToday: usedToday + 1,
          dailyCap: cfg.maxImagesPerDay,
        });
      }),
  );

  server.registerTool(
    "replace_file",
    {
      title: "Replace file contents",
      description:
        "Overwrite an existing text file (.md, .html, .txt, .json, .base) with new content. The previous content is lost " +
        "unless it is committed in git. Fails if the file does not exist; use create_file for new files.",
      inputSchema: {
        area: areaSchema,
        path: z.string().describe("Existing file path relative to the area root."),
        content: z.string().max(MAX_WRITE_CHARS).describe("Complete new file content, UTF-8."),
      },
      annotations: OVERWRITE,
    },
    ({ area, path: file, content }) =>
      safe(async () => {
        const r = await resolveInArea(cfg, area, file);
        assertTextPath(r.rel);
        const st = await fs.stat(r.abs);
        if (!st.isFile()) throw new UserError("The path is not a file.");
        await writeAtomic(r.abs, content);
        return ok(`Replaced ${AREAS[area].dir}/${r.rel} (${Buffer.byteLength(content)} bytes).`);
      }),
  );

  server.registerTool(
    "delete_file",
    {
      title: "Delete file",
      description:
        "Permanently delete one file from content, output or yuval. Not permitted in vault, yael or chen, and folders cannot " +
        "be deleted. The file is not recoverable unless it is committed in git.",
      inputSchema: {
        area: areaSchema,
        path: z.string().describe("File path relative to the area root."),
      },
      annotations: DELETE,
    },
    ({ area, path: file }) =>
      safe(async () => {
        if (!AREAS[area].deletable) {
          throw new UserError(`Deleting is not permitted in the "${area}" area (allowed: ${AREA_NAMES.filter((n) => AREAS[n].deletable).join(", ")}).`);
        }
        const r = await resolveInArea(cfg, area, file);
        if (!r.rel) throw new UserError("A file path is required.");
        const st = await fs.stat(r.abs);
        if (!st.isFile()) throw new UserError("Only files can be deleted, not folders.");
        await fs.unlink(r.abs);
        return ok(`Deleted ${AREAS[area].dir}/${r.rel}.`);
      }),
  );
}

async function addToIndex(cfg: Config, folder: string, topic: string, description: string): Promise<void> {
  const r = await resolveInArea(cfg, "vault", `${folder}/_index.md`);
  let text = await fs.readFile(r.abs, "utf8").catch(() => `# ${folder} — Index\n\n## Topics\n\n`);
  if (text.includes(`[[${topic}]]`)) return;
  const line = `- [[${topic}]] — ${description}`;
  const lines = text.split("\n");
  const placeholder = lines.findIndex((l) => /^- _none yet_/.test(l));
  if (placeholder >= 0) {
    lines[placeholder] = line;
    text = lines.join("\n");
  } else {
    text = text.replace(/\s*$/, "\n") + line + "\n";
  }
  await fs.mkdir(path.dirname(r.abs), { recursive: true });
  await writeAtomic(r.abs, text);
}
