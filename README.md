# exactamente-mcp

Read-only MCP server built with `xmcp` for public academic data from [Exactamente](https://exactamente.com.ar).

It wraps the Exactamente REST API (`/api/v1/...`) and exposes stable agent-friendly tools for universities, faculties, careers, subjects and resources. Deployable to Cloudflare Workers for ChatGPT Apps integration.

## Requirements

- Node.js 20+
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
npm install
npm run dev
```

`xmcp.config.ts` enables:

- STDIO transport with `silent: true` (to avoid protocol breakage from stdout logs)
- HTTP transport prepared at `/mcp` (host/port via env)
- Server metadata (name, description, icons) for MCP clients

## Exposed tools

All tools are read-only, idempotent, and return structured payloads with agent hints:

- `health-check` - Check backend health status
- `list-universities` - List available universities
- `list-faculties` - List faculties, optionally filtered by university
- `list-careers` - List careers, optionally filtered by faculty
- `search-subjects` - Search and filter subjects by career, faculty, year, quadmester, or text
- `get-subject` - Get detailed subject information including career associations
- `list-resources` - List published study resources (summaries, partials, finals)
- `find-subject-materials` - Combined subject search and resource fetch in one call
- `download-resource` - Get download URL for a published resource file

Tool responses include `structuredContent.agentHints.nextActions` where useful, so agents can chain calls without parsing the human-readable text.

## Exposed prompts

- `buscar-materiales-de-materia` - Guide agent to find published resources for a subject
- `descargar-parcial` - Guide agent to download a published exam
- `explorar-carrera` - Guide agent to navigate university/faculty/career/subjects
- `diagnosticar-conexion` - Guide agent to verify backend connectivity

## Agent workflows

Compact material search:

```json
{ "tool": "find-subject-materials", "args": { "search": "algoritmos", "type": "parcial", "limit": 5 } }
```

Manual resource lookup:

1. `search-subjects` with `search`, `careerId`, `facultyId`, `year` or `quadmester`.
2. Use the returned subject `id` as `subjectId`.
3. `list-resources` with `subjectId` and optional `type`.
4. Use the returned resource `id` as `resourceId`.
5. `download-resource` with `resourceId` and `subjectId`.

ID map:

- `university.id` -> `list-faculties.universityId`
- `faculty.id` -> `list-careers.facultyId` and `search-subjects.facultyId`
- `career.id` -> `search-subjects.careerId`
- `subject.id` -> `get-subject.subjectId`, `list-resources.subjectId`, `find-subject-materials.subjectId`
- `resource.id` -> `download-resource.resourceId`

## Exposed resources

- `exactamente://meta` - Server metadata, domain model, tool list, canonical workflows, and agent guidance
- `subjects://{subjectId}/details` - Read-only subject details with career associations

## Deployment

### Cloudflare Workers

Build and deploy to Cloudflare Workers for production use:

```bash
npm run build:cf
npx wrangler deploy
```

For OpenAI Apps verification:

```bash
npm run deploy:secret
# Paste your OPENAI_APPS_VERIFICATION_TOKEN when prompted
```

The worker wrapper (`src/worker.ts`) adds:
- `/.well-known/openai-apps-challenge` route for domain verification
- Content Security Policy headers (`default-src 'none'; connect-src https://api.exactamente.com.ar`)
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`)

### Local development with Cloudflare

```bash
npm run dev:cf
npx wrangler dev
```

## Scripts

- `npm run dev` - Local development with xmcp watcher
- `npm run dev:cf` - Local development with Cloudflare output
- `npm run build` - Compile transports to `dist/`
- `npm run build:cf` - Build Cloudflare Workers bundle
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm run deploy:secret` - Set OpenAI verification token as Wrangler secret
- `npm run typecheck` - TypeScript validation
- `npm run test` - Vitest tests
- `npm run start-stdio` - Run built stdio server
- `npm run start-http` - Run built HTTP server

## Local smoke checklist

1. Ensure backend is running (`/health` and `/api/v1/*` reachable).
2. Run `npm run dev`.
3. Connect an MCP client via stdio or HTTP.
4. Call `health-check` and `list-universities`.
5. Read `exactamente://meta` to inspect agent workflow guidance.

## ChatGPT Apps submission

See [CHATGPT_SUBMISSION.md](./CHATGPT_SUBMISSION.md) for:
- Deployment steps
- Submission form field values
- Test prompts and expected responses
- Privacy policy requirements
- Tool annotations reference
