# exactamente-mcp

Read-only MCP server built with `xmcp` for public academic data from [Exactamente](https://exactamente.com.ar).

It wraps the Exactamente REST API (`/api/v1/...`) and exposes stable agent-friendly tools for universities, faculties, careers, subjects and resources.

## Public endpoint

The server is live on Cloudflare Workers:

```
https://mcp.exactamente.com.ar/mcp
```

- Transport: Streamable HTTP
- Authentication: none (all data is public and read-only)
- Rate limit: 300 requests per minute per IP on `/mcp` (see [Rate limiting](#rate-limiting))

Add it to any MCP client that supports remote servers (Claude custom connectors, ChatGPT apps, MCP Inspector) by pasting that URL.

## Requirements

- Node.js 20+
- pnpm (`corepack enable`). Do not use npm: it breaks `gen:api`.
- Exactamente backend API (defaults to `https://api.exactamente.com.ar`)

## Configuration

1. Copy the env file:

```bash
cp .env.example .env
```

2. Configure as needed:

- `EXACTAMENTE_API_BASE_URL` (default `https://api.exactamente.com.ar`)
- `EXACTAMENTE_API_TIMEOUT_MS` (default `5000`)
- `EXACTAMENTE_API_RETRY_COUNT` (default `1`)
- `EXACTAMENTE_API_RETRY_DELAY_MS` (default `200`)
- `EXACTAMENTE_MAX_PAGE_LIMIT` (default `50`)
- `XMCP_HTTP_HOST` (default `127.0.0.1`)
- `XMCP_HTTP_PORT` (default `3001`)
- `XMCP_HTTP_ENDPOINT` (default `/mcp`)
- `XMCP_HTTP_CORS_ORIGIN` (default `*`)
- `OPENAI_APPS_VERIFICATION_TOKEN` (for ChatGPT Apps domain verification)

## Install and run

```bash
pnpm install
pnpm dev
```

`xmcp.config.ts` enables:

- STDIO transport with `silent: true` (to avoid protocol breakage from stdout logs)
- Streamable HTTP transport at `/mcp` (host/port via env locally; live in production at `https://mcp.exactamente.com.ar/mcp`)
- Server metadata (name, description, icons) for MCP clients

## Exposed tools

All tools are read-only, idempotent, and return structured payloads with agent hints. The full description each client sees lives in `metadata.description` of every file in `src/tools/`.

- `find-subject-materials` - Search subjects and fetch their materials in one call (recommended entry point; at most 10 subjects per call)
- `search-subjects` - Search and filter subjects by text, career, faculty, year or cuatrimestre
- `get-subject` - Details of one subject, including the careers and plans it belongs to
- `list-resources` - Page through the published resources of a subject
- `download-resource` - Public download URL of one resource (requires `resourceId` and `subjectId`)
- `list-universities` - List universities
- `list-faculties` - List faculties, optionally of one university
- `list-careers` - List careers, optionally of one faculty
- `health-check` - Diagnose backend availability

Tool responses include `structuredContent.agentHints.nextActions` where useful, so agents can chain calls without parsing the human-readable text.

## Exposed prompts

- `buscar-materiales-de-materia` - Guide agent to find published resources for a subject
- `descargar-parcial` - Guide agent to download a published exam
- `explorar-carrera` - Guide agent to navigate university/faculty/career/subjects
- `diagnosticar-conexion` - Guide agent to verify backend connectivity

## Agent workflows

Compact material search:

```json
{
  "tool": "find-subject-materials",
  "args": { "search": "algoritmos", "type": "parcial", "limit": 5 }
}
```

Manual resource lookup:

1. `search-subjects` with `search`, `careerId`, `facultyId`, `year` or `quadmester`.
2. Use the returned subject `id` as `subjectId`.
3. `list-resources` with `subjectId` and optional `type`.
4. Use the returned resource `id` as `resourceId`.
5. `download-resource` with `resourceId` and `subjectId` (both required).

ID map:

- `university.id` -> `list-faculties.universityId`
- `faculty.id` -> `list-careers.facultyId` and `search-subjects.facultyId`
- `career.id` -> `search-subjects.careerId`
- `subject.id` -> `get-subject.subjectId`, `list-resources.subjectId`, `find-subject-materials.subjectId`
- `resource.id` + `resource.subjectId` -> `download-resource.resourceId` + `download-resource.subjectId`

## Exposed resources

- `exactamente://meta` - Server metadata, domain model, tool list, canonical workflows, and agent guidance
- `subjects://{subjectId}/details` - Read-only subject details with career associations

## Deployment

### Cloudflare Workers

Production deploys run from GitHub Actions (`.github/workflows/deploy.yml`) after CI passes on `main`. Do not deploy by hand.

For OpenAI Apps verification:

```bash
pnpm deploy:secret
# Paste your OPENAI_APPS_VERIFICATION_TOKEN when prompted
```

The worker wrapper (`src/worker.ts`) adds:

- `/.well-known/openai-apps-challenge` route for domain verification
- Content Security Policy headers (`default-src 'none'; connect-src https://api.exactamente.com.ar`)
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`)
- Per-IP rate limiting on `/mcp`

### Rate limiting

`/mcp` is limited to **300 requests per minute per client IP** (`CF-Connecting-IP`) through the Workers Rate Limiting binding `MCP_RATE_LIMITER` (`wrangler.jsonc`, logic in `src/lib/rateLimit.ts`). Over the limit the worker answers HTTP 429 with `Retry-After: 60` and a JSON-RPC error (`code -32029`, message starting with `[rate_limited]`).

- The count is per Cloudflare location and eventually consistent: it stops abuse, it is not an exact quota.
- Remote connectors (Claude, ChatGPT) call from their own servers, so many end users can share one IP. Raise `simple.limit` in `wrangler.jsonc` if legitimate traffic gets throttled.
- `period` only accepts `10` or `60` and must match `RATE_LIMIT_PERIOD_SECONDS`.
- Without the binding (local dev, tests) the limiter is a no-op; it also fails open if the binding errors.

### Local development with Cloudflare

```bash
pnpm dev:cf
```

## Scripts

- `pnpm dev` - Local development with xmcp watcher
- `pnpm dev:cf` - Local development with Cloudflare output
- `pnpm build` - Compile transports to `dist/`
- `pnpm build:cf` - Build Cloudflare Workers bundle
- `pnpm deploy:secret` - Set OpenAI verification token as Wrangler secret
- `pnpm typecheck` - TypeScript validation
- `pnpm lint` / `pnpm format:check` - ESLint and Prettier
- `pnpm test` - Vitest tests
- `pnpm gen:api` / `pnpm check:api` - Regenerate / verify API types from the backend OpenAPI spec
- `pnpm start-stdio` - Run built stdio server
- `pnpm start-http` - Run built HTTP server

## Local smoke checklist

1. Ensure backend is running (`/health` and `/api/v1/*` reachable).
2. Run `pnpm dev`.
3. Connect an MCP client via stdio or HTTP.
4. Call `health-check` and `list-universities`.
5. Read `exactamente://meta` to inspect agent workflow guidance.

## Directory submissions

- Claude connectors directory: [DIRECTORY_SUBMISSION.md](./DIRECTORY_SUBMISSION.md)
- ChatGPT Apps: [CHATGPT_SUBMISSION.md](./CHATGPT_SUBMISSION.md)
- Official MCP Registry: [`server.json`](./server.json), published with `mcp-publisher` (steps in DIRECTORY_SUBMISSION.md)

Privacy policy: https://www.exactamente.com.ar/privacy · Terms: https://www.exactamente.com.ar/terms
