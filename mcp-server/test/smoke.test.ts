import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdir, mkdtemp, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { assertSafeToServe, loadConfig, type Config } from "../src/config.js";
import { createApp } from "../src/server.js";

const TOKEN = "test-token-0123456789abcdef";
const NOW = new Date("2026-05-20T10:00:00Z");
// 1x1 transparent PNG
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const SEARCHES = `# Chen — Search Memory

## 2026-05-10 09:00 | Claude Code skills
**מילות מפתח:** claude code, skills
**שאילתות שנעשו:** "claude code skills"
**נבחר:** Anthropic docs
**קובץ ב-Content:** 2026-05-10-claude-code-skills.md
---

## 2026-03-01 09:00 | CRM for small business
**מילות מפתח:** crm
**קובץ ב-Content:** 2026-03-01-crm.md
---
`;

async function makeRepo(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "five-agents-"));
  const w = async (rel: string, content: string) => {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), content);
  };
  await w(".env", "OPENAI_API_KEY=secret-should-never-leak\n");
  await w(".git/config", "[core]\n");
  await w("CLAUDE.md", "brain");
  await w("Content/2026-05-01-existing.md", "# Existing\nhello world\n");
  await w("Output/_index.md", "# Output\n");
  await w(
    "vault/Meeting Notes/_index.md",
    "---\ntype: folder-index\n---\n\n# Meeting Notes — Index\n\n## Topics\n\n- [[old-topic]] — old\n",
  );
  await w(
    "vault/Meeting Notes/old-topic.md",
    "# Old\n\n## Overview\n\nx\n\n## Open Questions\n\n- none\n\n## Session Log\n\n### 2026-05-01 — first [shipped]\n- **What was done:** a\n- **Related:** none (first entry on this topic)\n",
  );
  await w("vault/Content Briefs/_index.md", "# Content Briefs — Index\n\n## Topics\n\n- _none yet_ — nothing\n");
  await w("chen/Memory/searches.md", SEARCHES);
  await mkdir(path.join(root, "yuval/outputs"), { recursive: true });
  return root;
}

async function start(over: Partial<Config> = {}, root?: string) {
  const repoRoot = root ?? (await makeRepo());
  const cfg = loadConfig({}, { repoRoot, authToken: TOKEN, now: () => NOW, ...over });
  const srv: Server = await new Promise((resolve) => {
    const s = createApp(cfg).listen(0, "127.0.0.1", () => resolve(s));
  });
  const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  return {
    cfg,
    root: repoRoot,
    url,
    close: () =>
      new Promise<void>((r) => {
        srv.closeAllConnections();
        srv.close(() => r());
      }),
  };
}

async function connect(url: string): Promise<Client> {
  const client = new Client({ name: "test", version: "0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${url}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
    }),
  );
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown>) {
  const r = await client.callTool({ name, arguments: args });
  const text = (r.content as { type: string; text: string }[]).map((c) => c.text).join("");
  return { isError: Boolean(r.isError), text };
}

const exists = (p: string) => stat(p).then(() => true, () => false);

describe("full mode", () => {
  let s: Awaited<ReturnType<typeof start>>;
  let client: Client;

  before(async () => {
    s = await start();
    client = await connect(s.url);
  });
  after(async () => {
    await client.close();
    await s.close();
  });

  it("registers the expected tools with complete annotations", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, [
      "append_session_log",
      "check_search_memory",
      "create_file",
      "delete_file",
      "generate_image",
      "list_files",
      "log_search",
      "read_file",
      "replace_file",
      "save_article",
      "search_files",
    ]);
    for (const t of tools) {
      assert.ok(t.title, `${t.name} has a title`);
      assert.ok(t.name.length <= 64);
      assert.equal(typeof t.annotations?.readOnlyHint, "boolean", `${t.name} readOnlyHint`);
      assert.equal(typeof t.annotations?.destructiveHint, "boolean", `${t.name} destructiveHint`);
      assert.ok(!(t.annotations?.readOnlyHint && t.annotations?.destructiveHint));
    }
    const destructive = tools.filter((t) => t.annotations?.destructiveHint).map((t) => t.name).sort();
    assert.deepEqual(destructive, ["delete_file", "replace_file"]);
    const readOnly = tools.filter((t) => t.annotations?.readOnlyHint).map((t) => t.name).sort();
    assert.deepEqual(readOnly, ["check_search_memory", "list_files", "read_file", "search_files"]);
  });

  it("lists and reads files", async () => {
    const list = await call(client, "list_files", { area: "content" });
    assert.ok(!list.isError);
    assert.match(list.text, /2026-05-01-existing\.md/);
    const read = await call(client, "read_file", { area: "content", path: "2026-05-01-existing.md" });
    assert.equal(read.text, "# Existing\nhello world\n");
  });

  it("recursive listing of the vault includes nested files", async () => {
    const r = await call(client, "list_files", { area: "vault", recursive: true });
    assert.match(r.text, /Meeting Notes\/old-topic\.md/);
  });

  it("blocks traversal, absolute paths, hidden files and secrets", async () => {
    const attempts: [string, string][] = [
      ["content", "../.env"],
      ["content", "a/../../.env"],
      ["content", "..\\.env"],
      ["content", "/etc/passwd"],
      ["content", ".env"],
      ["vault", ".obsidian/workspace.json"],
      ["yuval", "../CLAUDE.md"],
    ];
    for (const [area, p] of attempts) {
      const r = await call(client, "read_file", { area, path: p });
      assert.ok(r.isError, `${area}:${p} must be rejected`);
      assert.doesNotMatch(r.text, /secret-should-never-leak/);
    }
    const found = await call(client, "search_files", { query: "secret-should-never-leak" });
    assert.match(found.text, /"count": 0/);
  });

  it("does not follow symlinks out of an area", async () => {
    const outside = await mkdtemp(path.join(tmpdir(), "outside-"));
    await writeFile(path.join(outside, "secret.txt"), "outside-secret");
    await symlink(outside, path.join(s.root, "Content", "escape"));
    const read = await call(client, "read_file", { area: "content", path: "escape/secret.txt" });
    assert.ok(read.isError);
    const list = await call(client, "list_files", { area: "content", path: "escape" });
    assert.ok(list.isError);
    const found = await call(client, "search_files", { query: "outside-secret" });
    assert.match(found.text, /"count": 0/);
    const write = await call(client, "create_file", { area: "content", path: "escape/new.md", content: "x" });
    assert.ok(write.isError);
    assert.ok(!(await exists(path.join(outside, "new.md"))));
  });

  it("pages long files", async () => {
    const content = "x".repeat(80_000) + "MARKER" + "y".repeat(50_000);
    assert.ok(!(await call(client, "create_file", { area: "content", path: "long.md", content })).isError);
    const p1 = await call(client, "read_file", { area: "content", path: "long.md" });
    assert.match(p1.text, /\[truncated: .*offset=80000/);
    const p2 = await call(client, "read_file", { area: "content", path: "long.md", offset: 80_000 });
    assert.ok(p2.text.startsWith("MARKER"));
    assert.doesNotMatch(p2.text, /truncated/);
  });

  it("creates, replaces and deletes files with the right guards", async () => {
    const created = await call(client, "create_file", { area: "output", path: "nested/post.md", content: "v1" });
    assert.ok(!created.isError);
    assert.equal(await readFile(path.join(s.root, "Output/nested/post.md"), "utf8"), "v1");

    const dup = await call(client, "create_file", { area: "output", path: "nested/post.md", content: "v2" });
    assert.ok(dup.isError);
    assert.match(dup.text, /Already exists/);

    assert.ok((await call(client, "create_file", { area: "output", path: "run.sh", content: "#!/bin/sh" })).isError);
    assert.ok((await call(client, "replace_file", { area: "output", path: "missing.md", content: "x" })).isError);

    assert.ok(!(await call(client, "replace_file", { area: "output", path: "nested/post.md", content: "v2" })).isError);
    assert.equal(await readFile(path.join(s.root, "Output/nested/post.md"), "utf8"), "v2");

    const folder = await call(client, "delete_file", { area: "output", path: "nested" });
    assert.ok(folder.isError);
    const vault = await call(client, "delete_file", { area: "vault", path: "Meeting Notes/old-topic.md" });
    assert.ok(vault.isError);
    assert.ok(await exists(path.join(s.root, "vault/Meeting Notes/old-topic.md")));

    assert.ok(!(await call(client, "delete_file", { area: "output", path: "nested/post.md" })).isError);
    assert.ok(!(await exists(path.join(s.root, "Output/nested/post.md"))));
  });

  it("saves articles in Chen's Content format", async () => {
    const r = await call(client, "save_article", {
      slug: "claude-code-skills",
      source_url: "https://example.com/post",
      original_title: "Skills in Claude Code",
      body_md: "Body text.",
      language: "en",
    });
    assert.ok(!r.isError, r.text);
    const doc = await readFile(path.join(s.root, "Content/2026-05-20-claude-code-skills.md"), "utf8");
    assert.match(doc, /^---\nsource: https:\/\/example\.com\/post\nfetched: 2026-05-20\noriginal_title: Skills in Claude Code\n/);
    assert.match(doc, /> \*\*Source:\*\* https:\/\/example\.com\/post/);
    assert.match(doc, /# Skills in Claude Code\n\nBody text\.\n$/);
    const dup = await call(client, "save_article", {
      slug: "claude-code-skills",
      source_url: "https://example.com/post",
      original_title: "Skills in Claude Code",
      body_md: "Body text.",
    });
    assert.ok(dup.isError);
  });

  it("appends vault session entries and creates topics with an index line", async () => {
    const base = {
      folder: "Content Briefs",
      topic: "mcp-test",
      title: "First pass",
      status: "planned",
      what_was_done: "Drafted.",
      related: [],
    };
    const missing = await call(client, "append_session_log", base);
    assert.ok(missing.isError, "creating a topic needs overview etc.");

    const created = await call(client, "append_session_log", {
      ...base,
      topic_title: "MCP test",
      overview: "A test topic.",
      index_description: "test topic",
    });
    assert.ok(!created.isError, created.text);
    const file = path.join(s.root, "vault/Content Briefs/mcp-test.md");
    let doc = await readFile(file, "utf8");
    assert.match(doc, /# MCP test\n\n## Overview\n\nA test topic\.\n\n## Open Questions\n\n- none\n\n## Session Log\n\n### 2026-05-20 — First pass \[planned\]/);
    assert.match(doc, /none \(first entry on this topic\)/);
    const index = await readFile(path.join(s.root, "vault/Content Briefs/_index.md"), "utf8");
    assert.match(index, /- \[\[mcp-test\]\] — test topic/);
    assert.doesNotMatch(index, /_none yet_/);

    const noRelated = await call(client, "append_session_log", { ...base, title: "Second" });
    assert.ok(noRelated.isError, "existing topic requires related");

    const second = await call(client, "append_session_log", { ...base, title: "Second", status: "shipped", related: ["old-topic"] });
    assert.ok(!second.isError, second.text);
    doc = await readFile(file, "utf8");
    assert.ok(doc.indexOf("First pass") < doc.indexOf("Second"), "newest entry is at the bottom");
    assert.match(doc, /- \*\*Related:\*\* \[\[old-topic\]\]\n$/);

    const old = await call(client, "append_session_log", {
      folder: "Meeting Notes",
      topic: "old-topic",
      title: "Follow-up",
      status: "debug",
      what_was_done: "Looked.",
      related: ["claude-config"],
    });
    assert.ok(!old.isError, old.text);
    assert.match(await readFile(path.join(s.root, "vault/Meeting Notes/old-topic.md"), "utf8"), /### 2026-05-20 — Follow-up \[debug\][\s\S]*\[\[claude-config\]\]\n$/);
  });

  it("checks and logs Chen's search memory", async () => {
    const hit = await call(client, "check_search_memory", { keywords: ["Claude Code"] });
    const parsed = JSON.parse(hit.text);
    assert.equal(parsed.count, 1);
    assert.equal(parsed.matches[0].ageDays, 10);
    assert.equal(parsed.matches[0].contentFile, "2026-05-10-claude-code-skills.md");

    assert.equal(JSON.parse((await call(client, "check_search_memory", { keywords: ["crm"] })).text).count, 0);
    assert.equal(JSON.parse((await call(client, "check_search_memory", { keywords: ["crm"], days: 365 })).text).count, 1);

    const logged = await call(client, "log_search", {
      topic: "MCP servers",
      keywords: ["mcp", "connectors"],
      queries: ["build mcp server"],
      sources: [{ title: "Docs", url: "https://example.com/docs", stars: 4, note: "official" }],
      chosen: "Docs — primary source",
      content_file: "2026-05-20-mcp.md",
    });
    assert.ok(!logged.isError, logged.text);
    const mem = await readFile(path.join(s.root, "chen/Memory/searches.md"), "utf8");
    assert.match(mem, /## 2026-05-20 10:00 \| MCP servers\n\*\*מילות מפתח:\*\* mcp, connectors\n/);
    assert.match(mem, /- \[Docs\]\(https:\/\/example\.com\/docs\) — איכות: ⭐⭐⭐⭐ — official/);
    assert.equal(JSON.parse((await call(client, "check_search_memory", { keywords: ["mcp servers"] })).text).matches[0].ageDays, 0);
  });

  it("refuses image generation when no OpenAI key is configured", async () => {
    const r = await call(client, "generate_image", { prompt: "a quiet morning desk", slug: "desk" });
    assert.ok(r.isError);
    assert.match(r.text, /OPENAI_API_KEY/);
  });
});

describe("image generation", () => {
  const calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
  let status = 200;
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body)),
      auth: new Headers(init?.headers).get("authorization"),
    });
    return status === 200
      ? new Response(JSON.stringify({ data: [{ b64_json: PNG_B64 }] }), { status: 200 })
      : new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), { status });
  }) as typeof fetch;

  let s: Awaited<ReturnType<typeof start>>;
  let client: Client;
  before(async () => {
    s = await start({ openaiApiKey: "sk-test", maxImagesPerDay: 2, fetchImpl });
    client = await connect(s.url);
  });
  after(async () => {
    await client.close();
    await s.close();
  });

  it("calls gpt-image-2 and saves PNG + sidecar to yuval/outputs and Output", async () => {
    const r = await call(client, "generate_image", { prompt: "a quiet morning desk, window light", slug: "desk" });
    assert.ok(!r.isError, r.text);
    assert.equal(calls[0]?.url, "https://api.openai.com/v1/images/generations");
    assert.equal(calls[0]?.body.model, "gpt-image-2");
    assert.equal(calls[0]?.body.output_format, "png");
    assert.equal(calls[0]?.auth, "Bearer sk-test");
    for (const dir of ["yuval/outputs", "Output"]) {
      const png = await readFile(path.join(s.root, dir, "2026-05-20-desk.png"));
      assert.equal(png.subarray(0, 4).toString("hex"), "89504e47");
      assert.equal(await readFile(path.join(s.root, dir, "2026-05-20-desk.txt"), "utf8"), "a quiet morning desk, window light\n");
    }
    assert.doesNotMatch(r.text, /sk-test/);
  });

  it("rejects a duplicate slug and enforces the daily cap", async () => {
    const dup = await call(client, "generate_image", { prompt: "a quiet morning desk, window light", slug: "desk" });
    assert.ok(dup.isError);
    assert.match(dup.text, /already exists/);
    assert.ok(!(await call(client, "generate_image", { prompt: "second image prompt", slug: "second" })).isError);
    const capped = await call(client, "generate_image", { prompt: "third image prompt", slug: "third" });
    assert.ok(capped.isError);
    assert.match(capped.text, /Daily image cap reached \(2\/2\)/);
    assert.equal(calls.length, 2, "capped request never reached OpenAI");
  });

  it("surfaces API errors without saving anything or leaking the key", async () => {
    const s2 = await start({ openaiApiKey: "sk-test", fetchImpl });
    const c2 = await connect(s2.url);
    status = 401;
    const r = await call(c2, "generate_image", { prompt: "fails with a bad key", slug: "bad" });
    status = 200;
    assert.ok(r.isError);
    assert.match(r.text, /HTTP 401: Incorrect API key provided/);
    assert.doesNotMatch(r.text, /sk-test/);
    assert.ok(!(await exists(path.join(s2.root, "yuval/outputs/2026-05-20-bad.png"))));
    await c2.close();
    await s2.close();
  });
});

describe("readonly mode", () => {
  it("registers only the read tools", async () => {
    const s = await start({ mode: "readonly" });
    const client = await connect(s.url);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["check_search_memory", "list_files", "read_file", "search_files"]);
    await client.close();
    await s.close();
  });
});

describe("http security", () => {
  let s: Awaited<ReturnType<typeof start>>;
  before(async () => {
    s = await start();
  });
  after(() => s.close());

  const init = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "0" } },
  });
  const post = (headers: Record<string, string>) =>
    fetch(`${s.url}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
      body: init,
    });

  it("rejects missing and wrong bearer tokens", async () => {
    const none = await post({});
    assert.equal(none.status, 401);
    assert.match(none.headers.get("www-authenticate") ?? "", /Bearer/);
    assert.equal((await post({ Authorization: "Bearer wrong-token-wrong-token" })).status, 401);
    assert.equal((await post({ Authorization: TOKEN })).status, 401);
    assert.equal((await post({ Authorization: `Bearer ${TOKEN}` })).status, 200);
  });

  it("rejects disallowed browser origins even with a valid token", async () => {
    assert.equal((await post({ Authorization: `Bearer ${TOKEN}`, Origin: "https://evil.example" })).status, 403);
    assert.equal((await post({ Authorization: `Bearer ${TOKEN}`, Origin: "https://claude.ai" })).status, 200);
  });

  it("exposes an open health check and 405 on GET /mcp", async () => {
    const h = await fetch(`${s.url}/healthz`);
    assert.deepEqual(await h.json(), { ok: true, mode: "full" });
    assert.equal((await fetch(`${s.url}/mcp`)).status, 405);
  });

  it("refuses to start without authentication unless explicitly allowed", () => {
    assert.throws(() => assertSafeToServe(loadConfig({}, { authToken: undefined })), /MCP_AUTH_TOKEN/);
    assert.throws(() => assertSafeToServe(loadConfig({}, { authToken: "short" })), /at least 16/);
    assert.doesNotThrow(() => assertSafeToServe(loadConfig({}, { authToken: undefined, allowNoAuth: true })));
    assert.doesNotThrow(() => assertSafeToServe(loadConfig({}, { authToken: TOKEN })));
  });
});
