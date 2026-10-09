import { createHash, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type NextFunction, type Request, type Response } from "express";
import { assertSafeToServe, defaultRepoRoot, loadConfig, type Config } from "./config.js";
import { registerTools } from "./tools.js";

export function buildServer(cfg: Config): McpServer {
  const server = new McpServer(
    { name: "five-agents", version: "0.1.0" },
    {
      instructions:
        "Content pipeline of the the-five-agents project. Areas: content (raw source articles), output (finished deliverables), " +
        "vault (long-term notes), yael/yuval/chen (agent working folders). Read tools are always available; write tools exist " +
        "only when the server runs in full mode.",
    },
  );
  registerTools(server, cfg);
  return server;
}

const digest = (s: string) => createHash("sha256").update(s).digest();

function rpcError(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: "2.0", error: { code, message }, id: null });
}

export function createApp(cfg: Config): express.Express {
  const app = express();
  app.disable("x-powered-by");

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, mode: cfg.mode });
  });

  // DNS-rebinding protection: browsers send Origin, server-to-server clients do not.
  const checkOrigin = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && !cfg.allowedOrigins.includes(origin)) return rpcError(res, 403, -32000, "Origin not allowed");
    next();
  };

  const checkAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!cfg.authToken) return next(); // only reachable with MCP_ALLOW_NO_AUTH=1
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
    if (!m || !timingSafeEqual(digest(m[1]!), digest(cfg.authToken))) {
      res.set("WWW-Authenticate", 'Bearer realm="five-agents"');
      return rpcError(res, 401, -32001, "Unauthorized");
    }
    next();
  };

  app.post("/mcp", checkOrigin, checkAuth, express.json({ limit: "2mb" }), async (req, res) => {
    // Stateless: a fresh server and transport per request.
    const server = buildServer(cfg);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error("mcp request failed:", e);
      if (!res.headersSent) rpcError(res, 500, -32603, "Internal server error");
    }
  });

  const methodNotAllowed = (_req: Request, res: Response) => {
    res.set("Allow", "POST");
    rpcError(res, 405, -32000, "Method not allowed");
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}

async function main(): Promise<void> {
  // The repo's .env holds OPENAI_API_KEY etc.; real environment variables win.
  try {
    process.loadEnvFile(path.join(process.env.REPO_ROOT ?? defaultRepoRoot(), ".env"));
  } catch {
    /* no .env file */
  }
  const cfg = loadConfig();
  assertSafeToServe(cfg);
  createApp(cfg).listen(cfg.port, () => {
    console.error(
      `five-agents MCP listening on :${cfg.port}/mcp (mode=${cfg.mode}, auth=${cfg.authToken ? "bearer" : "OFF"}, root=${cfg.repoRoot})`,
    );
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
