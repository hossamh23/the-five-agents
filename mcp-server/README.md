# five-agents MCP server

Remote MCP server (TypeScript, Streamable HTTP, stateless) that exposes the the-five-agents content
pipeline to Claude: raw articles in `Content/`, deliverables in `Output/`, the Obsidian `vault/`,
Chen's search memory, and image generation through OpenAI `gpt-image-2`.

## Tools (11)

| Tool | Kind | What it does |
|---|---|---|
| `list_files` | read | List files in an area (`content`, `output`, `vault`, `yael`, `yuval`, `chen`) |
| `read_file` | read | Read a text file, paged at 80,000 chars; images return metadata only |
| `search_files` | read | Case-insensitive substring search across areas |
| `check_search_memory` | read | Look up `chen/Memory/searches.md` for earlier searches inside a day window |
| `create_file` | write (add) | Create a new text file; fails if it exists |
| `save_article` | write (add) | Save an article to `Content/<date>-<slug>.md` in Chen's format |
| `append_session_log` | write (add) | Append a vault session entry; creates the topic + `_index.md` line when new |
| `log_search` | write (add) | Append an entry to Chen's search memory in the fixed format |
| `generate_image` | write (add, open world) | `gpt-image-2` → `yuval/outputs/` + copy to `Output/`; daily cap |
| `replace_file` | **destructive** | Overwrite an existing text file |
| `delete_file` | **destructive** | Delete a file (only in `content`, `output`, `yuval`) |

Every tool carries `title`, `readOnlyHint` and `destructiveHint`, and read / additive-write / destructive
operations are separate tools, so Claude's own permission prompts apply per kind of action.

## Security model

- **Auth is mandatory.** `/mcp` requires `Authorization: Bearer $MCP_AUTH_TOKEN` (min 16 chars). The server
  refuses to start without a token unless `MCP_ALLOW_NO_AUTH=1` (local experiments only).
- **Path jail.** Only six project areas are reachable. Absolute paths, `..`, hidden names (`.env`, `.git`,
  `.obsidian`) and symlinks leaving an area are rejected. `CLAUDE.md`, `.claude/`, `.env` and `mcp-server/`
  are unreachable. Writes are limited to text extensions (`.md .html .txt .json .base`).
- **Origin check** on `/mcp` (DNS-rebinding protection); requests without `Origin` (server-to-server) pass.
- **`MCP_MODE=readonly`** registers only the four read tools — use it for any host you do not fully trust.
- **Cost control.** `MAX_IMAGES_PER_DAY` (default 20) is counted from today's files in `yuval/outputs/`, so it
  survives restarts.
- Results are capped at 80,000 chars (claude.ai allows ~150,000; Claude Code 25,000 tokens).
- Deleting is not allowed in `vault`, `yael` or `chen`. Git history is the undo for everything else.

## Run

```bash
cd mcp-server
npm install
export MCP_AUTH_TOKEN=$(openssl rand -hex 32)   # or put it in the repo-root .env
npm run dev                                      # http://localhost:3000/mcp
npm test                                         # 19 tests
npm run build && npm start                       # production
```

The server reads the repo-root `.env` (real environment variables win). Config: `PORT`, `MCP_MODE`,
`REPO_ROOT` (defaults to the checkout containing `mcp-server/`), `OPENAI_API_KEY`, `MAX_IMAGES_PER_DAY`,
`MCP_ALLOWED_ORIGINS`.

Probe it:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:3000/mcp --transport http \
  --header "Authorization: Bearer $MCP_AUTH_TOKEN" --method tools/list
```

## Connect

| Client | How |
|---|---|
| Claude Code | `claude mcp add --transport http five-agents https://<host>/mcp --header "Authorization: Bearer <token>"` |
| claude.ai / Desktop / mobile | Settings → Connectors → Add custom connector. Needs OAuth (DCR or CIMD) **or** the beta *request headers* option for the organization — see "Not built yet" |

Claude connects from Anthropic's servers (egress range `160.79.104.0/21`), so the host must be reachable
from the internet; allow-listing that range is a cheap extra layer.

## Not built yet

- **OAuth 2.0 for claude.ai.** Claude needs a `401` with `WWW-Authenticate: Bearer resource_metadata=…`, protected
  resource metadata, an authorization server with S256 PKCE and DCR or CIMD, and the redirect
  `https://claude.ai/api/mcp/auth_callback` plus a loopback redirect for Claude Code. Until then the bearer token
  works for Claude Code, MCP Inspector and organizations with the `static_headers` beta.
- **Remote storage backend.** Tools read the checkout on the host's disk. For a host without a checkout, add a
  GitHub-API backend behind the same path rules.
- **MCP App widgets** (article browser, image gallery) via the `build-mcp-app` flow.
- **Directory submission** is incompatible with `generate_image` (AI image generation is not accepted) and with
  tools that proxy a third party's API; keep this server as a custom connector, or drop that tool first.
