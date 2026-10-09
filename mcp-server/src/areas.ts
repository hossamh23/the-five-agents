import fs from "node:fs/promises";
import path from "node:path";
import type { Config } from "./config.js";

/** Project areas the server may touch. Everything else in the repo (.env, .git, .claude, CLAUDE.md, mcp-server) is out of reach. */
export const AREAS = {
  content: { dir: "Content", deletable: true },
  output: { dir: "Output", deletable: true },
  vault: { dir: "vault", deletable: false },
  yael: { dir: "yael", deletable: false },
  yuval: { dir: "yuval", deletable: true },
  chen: { dir: "chen", deletable: false },
} as const;

export type AreaName = keyof typeof AREAS;
export const AREA_NAMES = Object.keys(AREAS) as [AreaName, ...AreaName[]];

export const TEXT_EXTENSIONS = new Set([".md", ".html", ".txt", ".json", ".base"]);
const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** An error whose message is safe and useful to show to the model. */
export class UserError extends Error {}

export interface Resolved {
  abs: string;
  /** Path relative to the area root, POSIX separators. */
  rel: string;
  root: string;
}

function isInside(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent + path.sep);
}

async function realpathOfDeepestExisting(p: string): Promise<string> {
  let cur = p;
  for (;;) {
    try {
      return await fs.realpath(cur);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      const parent = path.dirname(cur);
      if (parent === cur) throw e;
      cur = parent;
    }
  }
}

/** Resolve a relative path inside an area, rejecting traversal, absolute paths, hidden entries and symlink escapes. */
export async function resolveInArea(cfg: Config, area: AreaName, rel = ""): Promise<Resolved> {
  if (rel.includes("\0")) throw new UserError("Invalid path.");
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || rel.startsWith("\\")) {
    throw new UserError("Path must be relative to the area root.");
  }
  const segments = rel.split(/[\\/]+/).filter((s) => s && s !== ".");
  if (segments.includes("..")) throw new UserError("Path must not contain '..'.");
  if (segments.some((s) => s.startsWith("."))) {
    throw new UserError("Hidden files and folders (names starting with '.') are not accessible.");
  }
  const root = path.join(cfg.repoRoot, AREAS[area].dir);
  const abs = path.join(root, ...segments);
  const realRoot = await realpathOfDeepestExisting(root);
  const realTarget = await realpathOfDeepestExisting(abs);
  if (!isInside(realTarget, realRoot)) throw new UserError("Path escapes the area root.");
  return { abs, rel: segments.join("/"), root };
}

export function assertTextPath(rel: string): void {
  const ext = path.extname(rel).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) {
    throw new UserError(`Only text files are supported (${[...TEXT_EXTENSIONS].join(", ")}); got "${ext || "no extension"}".`);
  }
}

export function imageMime(rel: string): string | undefined {
  return IMAGE_MIME[path.extname(rel).toLowerCase()];
}
