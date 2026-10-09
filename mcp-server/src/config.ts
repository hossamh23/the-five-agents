import path from "node:path";
import { fileURLToPath } from "node:url";

export type Mode = "full" | "readonly";

export interface Config {
  /** Root of the the-five-agents checkout the server reads and writes. */
  repoRoot: string;
  port: number;
  /** Bearer token required on /mcp. */
  authToken: string | undefined;
  /** Explicit opt-out of auth, for local experiments only. */
  allowNoAuth: boolean;
  /** "readonly" registers only the read tools. */
  mode: Mode;
  openaiApiKey: string | undefined;
  maxImagesPerDay: number;
  /** Browser origins allowed to call /mcp (requests without an Origin header are always accepted). */
  allowedOrigins: string[];
  fetchImpl: typeof fetch;
  now: () => Date;
}

const DEFAULT_ORIGINS = ["https://claude.ai", "https://www.claude.ai", "http://localhost:6274"];

export function defaultRepoRoot(): string {
  // src/config.ts and dist/config.js both sit one level below mcp-server/.
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, overrides: Partial<Config> = {}): Config {
  const mode = (env.MCP_MODE ?? "full").toLowerCase();
  if (mode !== "full" && mode !== "readonly") {
    throw new Error(`MCP_MODE must be "full" or "readonly", got "${env.MCP_MODE}"`);
  }
  const cap = Number(env.MAX_IMAGES_PER_DAY ?? 20);
  if (!Number.isInteger(cap) || cap < 0) {
    throw new Error("MAX_IMAGES_PER_DAY must be a non-negative integer");
  }
  return {
    repoRoot: path.resolve(env.REPO_ROOT ?? defaultRepoRoot()),
    port: Number(env.PORT ?? 3000),
    authToken: env.MCP_AUTH_TOKEN || undefined,
    allowNoAuth: env.MCP_ALLOW_NO_AUTH === "1",
    mode,
    openaiApiKey: env.OPENAI_API_KEY || undefined,
    maxImagesPerDay: cap,
    allowedOrigins: env.MCP_ALLOWED_ORIGINS
      ? env.MCP_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_ORIGINS,
    fetchImpl: fetch,
    now: () => new Date(),
    ...overrides,
  };
}

/** Fail fast on configurations that would expose write access without authentication. */
export function assertSafeToServe(cfg: Config): void {
  if (cfg.authToken) {
    if (cfg.authToken.length < 16) throw new Error("MCP_AUTH_TOKEN must be at least 16 characters");
    return;
  }
  if (!cfg.allowNoAuth) {
    throw new Error(
      "MCP_AUTH_TOKEN is not set. Refusing to start without authentication " +
        "(set MCP_ALLOW_NO_AUTH=1 only for local experiments).",
    );
  }
}
