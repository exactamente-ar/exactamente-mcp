# exactamente-mcp

Read-only MCP server built with `xmcp` for public data from `exactamente-backend`.

It wraps the Exactamente REST API (`/api/v1/...`) and exposes stable agent-friendly tools for universities, faculties, careers, subjects and resources.

## Requirements

- Node.js 20+
- Running Exactamente backend API (local or remote)

## Configuration

1. Copy the env file:

```bash
cp .env.example .env
```

2. Set at least:

- `EXACTAMENTE_API_BASE_URL` (default `http://localhost:3000`)

Optional tuning:

- `EXACTAMENTE_API_TIMEOUT_MS`
- `EXACTAMENTE_API_RETRY_COUNT`
- `EXACTAMENTE_API_RETRY_DELAY_MS`
- `EXACTAMENTE_MAX_PAGE_LIMIT`
- `XMCP_HTTP_HOST`
- `XMCP_HTTP_PORT`
- `XMCP_HTTP_ENDPOINT`
- `XMCP_HTTP_CORS_ORIGIN`

## Install and run

```bash
npm install
npm run dev
```

`xmcp.config.ts` enables:

- STDIO transport with `silent: true` (to avoid protocol breakage from stdout logs)
- HTTP transport prepared at `/mcp` (host/port via env)

## Exposed tools

- `health-check`
- `list-universities`
- `list-faculties`
- `list-careers`
- `list-career-plans`
- `search-subjects`
- `get-subject`
- `list-resources`
- `find-subject-materials`
- `download-resource`

Most tools are read-only and return structured payloads. `download-resource` writes a file to the local downloads directory and is idempotent.

Tool responses include `structuredContent.agentHints.nextActions` where useful, so agents can chain calls without parsing the human-readable text.

## Exposed prompts

- `buscar-materiales-de-materia`
- `descargar-parcial`
- `explorar-carrera`
- `diagnosticar-conexion`

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

- `exactamente://meta`
- `subjects://{subjectId}/details`

## Scripts

- `npm run dev` - local development with xmcp watcher
- `npm run build` - compile transports to `dist/`
- `npm run typecheck` - TypeScript validation
- `npm run test` - Vitest tests
- `npm run start-stdio` - run built stdio server
- `npm run start-http` - run built HTTP server

## Local smoke checklist

1. Ensure backend is running (`/health` and `/api/v1/*` reachable).
2. Run `npm run dev`.
3. Connect an MCP client via stdio.
4. Call `health-check` and `list-universities`.
5. Read `exactamente://meta` to inspect agent workflow guidance.
